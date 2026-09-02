import {
  CloudflareKvTokenStore,
  QBenchClient,
} from 'qbench-sdk-unofficial';

const TOKEN_PATH = '/qbench/oauth2/v1/token';
const ORDER_PATH = '/qbench/api/v2/orders';
const SUITE_CACHE_PREFIX = 'qbench:oauth:live-suite-20260829-v1:';
const CONCURRENT_TEN_CACHE_PREFIX = 'qbench:oauth:concurrent-ten-20260829-v1:';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/health') {
      return json({ ok: true });
    }

    if (
      request.method !== 'POST' ||
      !['/smoke/order', '/smoke/suite', '/smoke/concurrent-ten'].includes(url.pathname)
    ) {
      return json({ ok: false, error: 'Not found.' }, 404);
    }

    if (!(await hasValidAuthorization(request, env.SMOKE_TOKEN))) {
      return json({ ok: false, error: 'Unauthorized.' }, 401);
    }

    if (url.pathname === '/smoke/suite') {
      return runReadOnlySuite(env);
    }

    if (url.pathname === '/smoke/concurrent-ten') {
      return runConcurrentTenGets(env);
    }

    return fetchOneOrder(env);
  },
};

async function fetchOneOrder(env) {
  const requestCounter = createQBenchRequestCounter(env.QBENCH_BASE_URL);

  try {
    const client = createClient(
      env,
      new CloudflareKvTokenStore(env.QBENCH_TOKEN_CACHE),
      requestCounter.fetch,
    );

    const result = await client.order.listOrders({ page_num: 1, page_size: 1 });
    const orderCount = countReturnedOrders(result);

    console.log(JSON.stringify({
      event: 'qbench_sdk_smoke_complete',
      ok: true,
      ...requestCounter.counts,
      orderFound: orderCount > 0,
    }));

    return json({
      ok: true,
      ...requestCounter.counts,
      orderFound: orderCount > 0,
      pageSize: 1,
    });
  } catch (error) {
    return smokeFailure(error, requestCounter.counts);
  }
}

async function runReadOnlySuite(env) {
  const requestCounter = createQBenchRequestCounter(env.QBENCH_BASE_URL);
  const suiteStore = new CloudflareKvTokenStore(env.QBENCH_TOKEN_CACHE, {
    keyPrefix: SUITE_CACHE_PREFIX,
  });

  try {
    const concurrentStart = snapshotCounts(requestCounter.counts);
    const concurrentClient = createClient(env, suiteStore, requestCounter.fetch);
    const concurrentResults = await Promise.all([
      concurrentClient.order.listOrders({ page_num: 1, page_size: 1 }),
      concurrentClient.order.listOrders({ page_num: 1, page_size: 1 }),
      concurrentClient.order.listOrders({ page_num: 1, page_size: 1 }),
    ]);
    const concurrentCounts = countDelta(requestCounter.counts, concurrentStart);
    const concurrentOrderResponses = concurrentResults.filter(
      (result) => countReturnedOrders(result) > 0,
    ).length;

    const newClientStart = snapshotCounts(requestCounter.counts);
    const newClient = createClient(env, suiteStore, requestCounter.fetch);
    const newClientResult = await newClient.order.listOrders({ page_num: 1, page_size: 1 });
    const newClientCounts = countDelta(requestCounter.counts, newClientStart);

    const pageSize50Start = snapshotCounts(requestCounter.counts);
    const pageSize50Result = await newClient.order.listOrders({ page_num: 1, page_size: 50 });
    const pageSize50Counts = countDelta(requestCounter.counts, pageSize50Start);
    const pageSize50OrderCount = countReturnedOrders(pageSize50Result);

    const pageSize100 = await verifyOversizedPageIsRejectedLocally(env.QBENCH_BASE_URL);

    const checks = {
      concurrentSingleClient: {
        passed:
          concurrentCounts.oauthRequests <= 1 &&
          concurrentCounts.apiRequests === 3 &&
          concurrentOrderResponses === 3,
        ...concurrentCounts,
        orderResponses: concurrentOrderResponses,
      },
      newClientKvReuse: {
        passed:
          newClientCounts.oauthRequests === 0 &&
          newClientCounts.apiRequests === 1 &&
          countReturnedOrders(newClientResult) > 0,
        ...newClientCounts,
        orderFound: countReturnedOrders(newClientResult) > 0,
      },
      pageSize50Boundary: {
        passed:
          pageSize50Counts.oauthRequests === 0 &&
          pageSize50Counts.apiRequests === 1 &&
          pageSize50OrderCount >= 0 &&
          pageSize50OrderCount <= 50,
        ...pageSize50Counts,
        returnedOrders: pageSize50OrderCount,
      },
      pageSize100RejectedLocally: pageSize100,
    };
    const passed = Object.values(checks).every((check) => check.passed);

    console.log(JSON.stringify({
      event: 'qbench_sdk_read_only_suite_complete',
      ok: passed,
      ...requestCounter.counts,
      checks,
    }));

    return json({
      ok: passed,
      cacheState: requestCounter.counts.oauthRequests === 0 ? 'warm' : 'cold',
      totals: requestCounter.counts,
      checks,
    }, passed ? 200 : 502);
  } catch (error) {
    return smokeFailure(error, requestCounter.counts);
  }
}

async function runConcurrentTenGets(env) {
  const requestCounter = createQBenchRequestCounter(env.QBENCH_BASE_URL);
  const tokenStore = new CloudflareKvTokenStore(env.QBENCH_TOKEN_CACHE, {
    keyPrefix: CONCURRENT_TEN_CACHE_PREFIX,
  });

  try {
    const client = createClient(env, tokenStore, requestCounter.fetch);
    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        client.order.listOrders({ page_num: 1, page_size: 1 }),
      ),
    );
    const orderResponses = results.filter(
      (result) => countReturnedOrders(result) > 0,
    ).length;
    const passed =
      requestCounter.counts.oauthRequests <= 1 &&
      requestCounter.counts.apiRequests === 10 &&
      orderResponses === 10;

    console.log(JSON.stringify({
      event: 'qbench_sdk_concurrent_ten_complete',
      ok: passed,
      ...requestCounter.counts,
      orderResponses,
    }));

    return json({
      ok: passed,
      cacheState: requestCounter.counts.oauthRequests === 0 ? 'warm' : 'cold',
      ...requestCounter.counts,
      concurrentGets: 10,
      orderResponses,
    }, passed ? 200 : 502);
  } catch (error) {
    return smokeFailure(error, requestCounter.counts);
  }
}

async function verifyOversizedPageIsRejectedLocally(baseUrl) {
  let outboundRequests = 0;
  let caughtError = null;
  const client = new QBenchClient({
    baseUrl,
    accessTokenProvider: {
      async getAccessToken() {
        return 'not-sent-to-qbench';
      },
    },
    fetch: async (input, init) => {
      outboundRequests += 1;
      return fetch(input, init);
    },
    maxRetries: 0,
    includeSensitiveErrorDetails: false,
  });

  try {
    await client.order.listOrders({ page_num: 1, page_size: 100 });
  } catch (error) {
    caughtError = error;
  }

  return {
    passed:
      caughtError?.name === 'QBenchValidationError' &&
      caughtError?.status === 400 &&
      outboundRequests === 0,
    errorName: caughtError?.name ?? null,
    status: caughtError?.status ?? null,
    outboundRequests,
  };
}

function createClient(env, tokenStore, instrumentedFetch) {
  return new QBenchClient({
    baseUrl: env.QBENCH_BASE_URL,
    clientId: env.QBENCH_CLIENT_ID,
    clientSecret: env.QBENCH_CLIENT_SECRET,
    tokenStore,
    fetch: instrumentedFetch,
    maxRetries: 0,
    includeSensitiveErrorDetails: false,
  });
}

function createQBenchRequestCounter(baseUrl) {
  const counts = { oauthRequests: 0, apiRequests: 0 };
  const qbenchOrigin = new URL(baseUrl).origin;

  return {
    counts,
    async fetch(input, init) {
      const outboundUrl = new URL(input instanceof Request ? input.url : String(input));

      if (outboundUrl.origin === qbenchOrigin && outboundUrl.pathname === TOKEN_PATH) {
        counts.oauthRequests += 1;
      } else if (
        outboundUrl.origin === qbenchOrigin &&
        outboundUrl.pathname === ORDER_PATH
      ) {
        counts.apiRequests += 1;
      }

      return fetch(input, init);
    },
  };
}

function snapshotCounts(counts) {
  return { ...counts };
}

function countDelta(counts, before) {
  return {
    oauthRequests: counts.oauthRequests - before.oauthRequests,
    apiRequests: counts.apiRequests - before.apiRequests,
  };
}

function smokeFailure(error, counts) {
  const status = Number.isInteger(error?.status) ? error.status : 500;

  console.error(JSON.stringify({
    event: 'qbench_sdk_smoke_failed',
    ok: false,
    errorName: error?.name ?? 'Error',
    status,
    ...counts,
  }));

  return json({
    ok: false,
    error: 'QBench smoke request failed.',
    errorName: error?.name ?? 'Error',
    status,
    ...counts,
  }, 502);
}

async function hasValidAuthorization(request, expectedToken) {
  if (typeof expectedToken !== 'string' || expectedToken.length === 0) return false;

  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return false;

  const suppliedToken = authorization.slice('Bearer '.length);
  const encoder = new TextEncoder();
  const [suppliedDigest, expectedDigest] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(suppliedToken)),
    crypto.subtle.digest('SHA-256', encoder.encode(expectedToken)),
  ]);

  return crypto.subtle.timingSafeEqual(suppliedDigest, expectedDigest);
}

function countReturnedOrders(result) {
  if (Array.isArray(result)) return result.length;
  if (!result || typeof result !== 'object') return 0;

  for (const key of ['results', 'data', 'items', 'orders']) {
    if (Array.isArray(result[key])) return result[key].length;
  }

  return 0;
}

function json(body, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
