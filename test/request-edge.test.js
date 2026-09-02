import test from 'node:test';
import assert from 'node:assert/strict';
import {
  QBenchClient,
  QBenchSdkError,
  QBenchAuthError,
  QBenchValidationError,
  QBenchForbiddenError,
  QBenchNotFoundError,
  QBenchRateLimitError,
} from '../index.js';
import { RequestHandler } from '../src/request.js';

const BASE_URL = 'https://request-edge.qbench.test';

test('QBenchClient requires a configuration object', () => {
  assert.throws(() => new QBenchClient(), /baseUrl is required/);
});

test('QBenchClient requires a base URL', () => {
  assert.throws(() => new QBenchClient({}), /baseUrl is required/);
});

test('QBenchClient requires credentials without a custom provider', () => {
  assert.throws(
    () => new QBenchClient({ baseUrl: BASE_URL }),
    /clientId and clientSecret are required/
  );
});

test('QBenchClient validates a custom access-token provider', () => {
  assert.throws(
    () => new QBenchClient({ baseUrl: BASE_URL, accessTokenProvider: {} }),
    /must implement async getAccessToken/
  );
});

for (const [name, config] of [
  ['built-in authentication over HTTP', { baseUrl: 'http://insecure.qbench.test', clientId: 'id', clientSecret: 'secret' }],
  ['a custom provider over HTTP', { baseUrl: 'http://insecure.qbench.test', accessTokenProvider: staticProvider() }],
  ['an invalid URL', { baseUrl: 'not a URL', accessTokenProvider: staticProvider() }],
]) {
  test(`QBenchClient rejects ${name}`, () => {
    assert.throws(() => new QBenchClient(config), /Invalid QBench baseUrl/);
  });
}

test('QBenchClient validates includeSensitiveErrorDetails', () => {
  assert.throws(
    () =>
      new QBenchClient({
        baseUrl: BASE_URL,
        accessTokenProvider: staticProvider(),
        includeSensitiveErrorDetails: 'yes',
      }),
    /must be a boolean/
  );
});

test('RequestHandler requires a Fetch API implementation', () => {
  assert.throws(
    () => new RequestHandler(staticProvider(), BASE_URL, { fetch: 42 }),
    /Fetch API-compatible/
  );
});

test('RequestHandler independently rejects an insecure base URL', () => {
  assert.throws(
    () => new RequestHandler(staticProvider(), 'http://insecure.qbench.test'),
    /must use HTTPS/
  );
});

test('encodes scalar, array, null, and undefined query parameters', async () => {
  let observedUrl;
  const client = customProviderClient({
    fetch: async (url) => {
      observedUrl = new URL(url);
      return jsonResponse({ ok: true });
    },
  });

  await client.customer.listCustomers({
    page_num: 2,
    statuses: ['CREATED', 'COMPLETED'],
    name_keyword: 'A & B',
    ignored_null: null,
    ignored_undefined: undefined,
  });

  assert.equal(observedUrl.pathname, '/qbench/api/v2/customers');
  assert.equal(observedUrl.searchParams.get('page_num'), '2');
  assert.deepEqual(observedUrl.searchParams.getAll('statuses'), ['CREATED', 'COMPLETED']);
  assert.equal(observedUrl.searchParams.get('name_keyword'), 'A & B');
  assert.equal(observedUrl.searchParams.has('ignored_null'), false);
  assert.equal(observedUrl.searchParams.has('ignored_undefined'), false);
});

test('accepts QBench page_size limit of 50', async () => {
  let observedUrl;
  const client = customProviderClient({
    fetch: async (url) => {
      observedUrl = new URL(url);
      return jsonResponse({ ok: true });
    },
  });

  await client.customer.listCustomers({ page_size: 50 });

  assert.equal(observedUrl.searchParams.get('page_size'), '50');
});

test('accepts a numeric-string page_size at the QBench limit', async () => {
  let observedUrl;
  const client = customProviderClient({
    fetch: async (url) => {
      observedUrl = new URL(url);
      return jsonResponse({ ok: true });
    },
  });

  await client.customer.listCustomers({ page_size: '50' });

  assert.equal(observedUrl.searchParams.get('page_size'), '50');
});

for (const invalidPageSize of [0, 51, 100, 1.5, '100', '', 'many', [50]]) {
  test(`rejects invalid page_size ${JSON.stringify(invalidPageSize)} before calling QBench`, async () => {
    let fetchCalls = 0;
    const client = customProviderClient({
      fetch: async () => {
        fetchCalls++;
        return jsonResponse({ ok: true });
      },
    });

    await assert.rejects(
      () => client.customer.listCustomers({ page_size: invalidPageSize }),
      (error) =>
        error instanceof QBenchValidationError &&
        error.status === 400 &&
        error.message === 'page_size must be an integer between 1 and 50.'
    );
    assert.equal(fetchCalls, 0);
  });
}

test('serializes JSON request bodies and sends authorization headers', async () => {
  let observed;
  const client = customProviderClient({
    fetch: async (url, init) => {
      observed = { url: new URL(url), init };
      return jsonResponse({ created: true });
    },
  });

  await client.customer.createCustomers([{ name: 'Synthetic Customer' }]);

  assert.equal(observed.url.pathname, '/qbench/api/v2/customers');
  assert.equal(observed.init.method, 'POST');
  assert.equal(observed.init.headers.Authorization, 'Bearer static-token');
  assert.equal(observed.init.headers['Content-Type'], 'application/json');
  assert.equal(observed.init.headers['User-Agent'], 'qbench-sdk-unofficial/0.1.0');
  assert.deepEqual(JSON.parse(observed.init.body), [{ name: 'Synthetic Customer' }]);
});

test('returns null for 204 No Content responses', async () => {
  const client = customProviderClient({
    fetch: async () => new Response(null, { status: 204 }),
  });
  assert.equal(await client.customer.deleteCustomer(123), null);
});

test('returns successful non-JSON response bodies as text', async () => {
  const client = customProviderClient({
    fetch: async () => new Response('plain response', { status: 200 }),
  });
  assert.equal(await client.customer.listCustomers(), 'plain response');
});

test('rejects malformed JSON responses without including the raw body', async () => {
  const client = customProviderClient({
    fetch: async () =>
      new Response('sensitive malformed body', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
  });
  await assert.rejects(
    () => client.customer.listCustomers(),
    (error) =>
      error instanceof QBenchSdkError &&
      error.message.includes('Failed to parse JSON') &&
      !error.message.includes('sensitive malformed body')
  );
});

test('rejects circular JSON request data before calling fetch', async () => {
  const circular = {};
  circular.self = circular;
  let fetchCalls = 0;
  const handler = new RequestHandler(staticProvider(), BASE_URL, {
    fetch: async () => {
      fetchCalls++;
      return jsonResponse({});
    },
  });

  await assert.rejects(
    () => handler.request('POST', '/qbench/api/v2/test', null, circular),
    /Failed to stringify request data/
  );
  assert.equal(fetchCalls, 0);
});

test('raw request bodies require an explicit content type', async () => {
  const handler = new RequestHandler(staticProvider(), BASE_URL, {
    fetch: async () => jsonResponse({}),
  });
  await assert.rejects(
    () =>
      handler.request('POST', '/qbench/api/v2/raw', null, new Uint8Array([1, 2]), 0, {
        isRawBody: true,
      }),
    /contentType is required/
  );
});

test('raw request bodies pass through unchanged', async () => {
  const rawBody = new Uint8Array([1, 2, 3]);
  let observedInit;
  const handler = new RequestHandler(staticProvider(), BASE_URL, {
    fetch: async (_url, init) => {
      observedInit = init;
      return jsonResponse({ ok: true });
    },
  });

  await handler.request('POST', '/qbench/api/v2/raw', null, rawBody, 0, {
    isRawBody: true,
    contentType: 'application/octet-stream',
  });

  assert.equal(observedInit.body, rawBody);
  assert.equal(observedInit.headers['Content-Type'], 'application/octet-stream');
});

for (const [status, ErrorClass] of [
  [400, QBenchValidationError],
  [403, QBenchForbiddenError],
  [404, QBenchNotFoundError],
  [429, QBenchRateLimitError],
]) {
  test(`maps HTTP ${status} to ${ErrorClass.name}`, async () => {
    const client = customProviderClient({
      maxRetries: 0,
      fetch: async () => jsonResponse({ error_description: `Synthetic ${status}` }, status),
    });

    await assert.rejects(
      () => client.customer.listCustomers({ page_num: 2 }),
      (error) =>
        error instanceof ErrorClass &&
        error.status === status &&
        error.requestDetails.path === '/qbench/api/v2/customers' &&
        !('params' in error.requestDetails) &&
        error.responseBody === null
    );
  });
}

test('API errors redact request data, response details, and unsafe headers by default', async () => {
  const client = customProviderClient({
    maxRetries: 0,
    fetch: async () =>
      jsonResponse(
        {
          error_type: 'VALIDATION_ERROR',
          qb_error_code: 'QB-TEST',
          error_description: 'sensitive patient description',
          error_token: 'sensitive-error-token',
          errors: [{ field: 'sensitive field value' }],
        },
        400,
        { 'x-request-id': 'request-123', 'set-cookie': 'sensitive-cookie' }
      ),
  });

  await assert.rejects(
    () => client.customer.createCustomers([{ name: 'Sensitive Customer' }]),
    (error) => {
      assert.equal(error.message, 'QBench API request failed with status 400.');
      assert.deepEqual(error.requestDetails, {
        method: 'POST',
        path: '/qbench/api/v2/customers',
      });
      assert.deepEqual(error.responseBody, {
        error_type: 'VALIDATION_ERROR',
        qb_error_code: 'QB-TEST',
      });
      assert.deepEqual(error.responseHeaders, { 'x-request-id': 'request-123' });
      assert.equal(error.errorDescription, undefined);
      assert.equal(error.errorToken, undefined);
      assert.equal(error.errors, undefined);
      assert.doesNotMatch(JSON.stringify(error), /Sensitive Customer|sensitive patient|cookie/);
      return true;
    }
  );
});

test('sensitive API error details require an explicit opt-in', async () => {
  const responseBody = {
    error_description: 'Detailed synthetic rejection',
    error_token: 'synthetic-error-token',
  };
  const client = customProviderClient({
    maxRetries: 0,
    includeSensitiveErrorDetails: true,
    fetch: async () => jsonResponse(responseBody, 400, { 'x-debug': 'full-header' }),
  });
  const data = [{ name: 'Synthetic Customer' }];

  await assert.rejects(
    () => client.customer.createCustomers(data),
    (error) => {
      assert.equal(error.message, 'Detailed synthetic rejection');
      assert.deepEqual(error.responseBody, responseBody);
      assert.equal(error.responseHeaders['x-debug'], 'full-header');
      assert.equal(error.requestDetails.data, data);
      assert.equal(error.errorToken, 'synthetic-error-token');
      return true;
    }
  );
});

test('plain-text API error bodies are never exposed by default', async () => {
  const client = customProviderClient({
    maxRetries: 0,
    fetch: async () => new Response('sensitive plain text', { status: 403 }),
  });

  await assert.rejects(
    () => client.customer.listCustomers(),
    (error) =>
      error instanceof QBenchForbiddenError &&
      error.responseBody === null &&
      !error.message.includes('sensitive plain text')
  );
});

test('retries transient 500 responses and eventually succeeds', async () => {
  let calls = 0;
  const client = customProviderClient({
    maxRetries: 2,
    initialBackoffMs: 0,
    fetch: async () => {
      calls++;
      return calls < 3
        ? jsonResponse({ error: 'temporary' }, 500)
        : jsonResponse({ recovered: true });
    },
  });

  await withMutedWarning(async () => {
    assert.deepEqual(await client.customer.listCustomers(), { recovered: true });
  });
  assert.equal(calls, 3);
});

test('stops retrying transient responses at maxRetries', async () => {
  let calls = 0;
  const client = customProviderClient({
    maxRetries: 2,
    initialBackoffMs: 0,
    fetch: async () => {
      calls++;
      return jsonResponse({ error: 'still failing' }, 503);
    },
  });

  await withMutedWarning(async () => {
    await assert.rejects(() => client.customer.listCustomers(), /status 503/);
  });
  assert.equal(calls, 3);
});

test('does not retry POST mutations after a transient server response', async () => {
  let calls = 0;
  const client = customProviderClient({
    maxRetries: 3,
    initialBackoffMs: 0,
    fetch: async () => {
      calls++;
      return jsonResponse({ error: 'synthetic transient failure' }, 503);
    },
  });

  await assert.rejects(
    () => client.customer.createCustomers([{ name: 'One write only' }]),
    /status 503/
  );
  assert.equal(calls, 1);
});

test('does not retry PATCH mutations after rate limiting', async () => {
  let calls = 0;
  const client = customProviderClient({
    maxRetries: 3,
    initialBackoffMs: 0,
    fetch: async () => {
      calls++;
      return jsonResponse(
        { error: 'synthetic rate limit' },
        429,
        { 'x-qbapi-throttle-ttl': '1' }
      );
    },
  });

  await assert.rejects(() => client.customer.updateCustomers([{ id: 1 }]), /status 429/);
  assert.equal(calls, 1);
});

test('does not retry DELETE mutations after a connection reset', async () => {
  let calls = 0;
  const client = customProviderClient({
    maxRetries: 3,
    initialBackoffMs: 0,
    fetch: async () => {
      calls++;
      throw new Error('ECONNRESET');
    },
  });

  await assert.rejects(() => client.customer.deleteCustomer(1), /ECONNRESET/);
  assert.equal(calls, 1);
});

test('retries 429 responses with an unusable throttle TTL via normal backoff', async () => {
  let calls = 0;
  const client = customProviderClient({
    maxRetries: 1,
    initialBackoffMs: 0,
    fetch: async () => {
      calls++;
      return calls === 1
        ? jsonResponse({ error: 'rate limited' }, 429, { 'x-qbapi-throttle-ttl': '0' })
        : jsonResponse({ recovered: true });
    },
  });

  await withMutedWarning(() => client.customer.listCustomers());
  assert.equal(calls, 2);
});

test('retries connection-reset network failures', async () => {
  let calls = 0;
  const client = customProviderClient({
    maxRetries: 1,
    initialBackoffMs: 0,
    fetch: async () => {
      calls++;
      if (calls === 1) throw new Error('ECONNRESET');
      return jsonResponse({ recovered: true });
    },
  });

  await withMutedWarning(() => client.customer.listCustomers());
  assert.equal(calls, 2);
});

test('does not retry ordinary network failures', async () => {
  let calls = 0;
  const client = customProviderClient({
    maxRetries: 3,
    initialBackoffMs: 0,
    fetch: async () => {
      calls++;
      throw new Error('synthetic DNS failure');
    },
  });

  await assert.rejects(() => client.customer.listCustomers(), /synthetic DNS failure/);
  assert.equal(calls, 1);
});

test('aborts API requests at timeoutMs', async () => {
  const client = customProviderClient({
    timeoutMs: 5,
    fetch: async (_url, init) =>
      new Promise((_resolve, reject) => {
        init.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
      }),
  });

  await assert.rejects(() => client.customer.listCustomers(), /timed out after 5ms/);
});

test('enforces maxConcurrentRequests for one client', async () => {
  let active = 0;
  let observedMax = 0;
  const client = customProviderClient({
    maxConcurrentRequests: 2,
    fetch: async () => {
      active++;
      observedMax = Math.max(observedMax, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active--;
      return jsonResponse({ ok: true });
    },
  });

  await Promise.all(Array.from({ length: 8 }, () => client.customer.listCustomers()));
  assert.equal(observedMax, 2);
});

test('propagates access-token-provider authentication errors', async () => {
  const client = new QBenchClient({
    baseUrl: BASE_URL,
    accessTokenProvider: {
      async getAccessToken() {
        throw new QBenchAuthError('synthetic provider failure');
      },
    },
    fetch: async () => jsonResponse({}),
  });

  await assert.rejects(() => client.customer.listCustomers(), /synthetic provider failure/);
});

test('uses a newer provider token when invalidation reports a race', async () => {
  let currentToken = 'old-token';
  const forceRefreshValues = [];
  const provider = {
    async getAccessToken({ forceRefresh }) {
      forceRefreshValues.push(forceRefresh);
      return currentToken;
    },
    async invalidateAccessToken() {
      currentToken = 'newer-token';
      return false;
    },
  };
  const client = customProviderClient({
    accessTokenProvider: provider,
    fetch: async (_url, init) =>
      init.headers.Authorization === 'Bearer old-token'
        ? jsonResponse({ error: 'old token' }, 401)
        : jsonResponse({ ok: true }),
  });

  assert.deepEqual(await client.customer.listCustomers(), { ok: true });
  assert.deepEqual(forceRefreshValues, [false, false]);
});

test('forces refresh after 401 when the provider has no invalidation method', async () => {
  const forceRefreshValues = [];
  const provider = {
    async getAccessToken({ forceRefresh }) {
      forceRefreshValues.push(forceRefresh);
      return forceRefresh ? 'new-token' : 'old-token';
    },
  };
  const client = customProviderClient({
    accessTokenProvider: provider,
    fetch: async (_url, init) =>
      init.headers.Authorization === 'Bearer old-token'
        ? jsonResponse({ error: 'old token' }, 401)
        : jsonResponse({ ok: true }),
  });

  assert.deepEqual(await client.customer.listCustomers(), { ok: true });
  assert.deepEqual(forceRefreshValues, [false, true]);
});

test('401 recovery does not consume the transient retry budget', async () => {
  let tokenCalls = 0;
  let apiCalls = 0;
  let currentToken = 'old-token';
  const provider = {
    async getAccessToken({ forceRefresh }) {
      tokenCalls++;
      if (forceRefresh) currentToken = 'new-token';
      return currentToken;
    },
  };
  const client = customProviderClient({
    accessTokenProvider: provider,
    maxRetries: 1,
    initialBackoffMs: 0,
    fetch: async (_url, init) => {
      apiCalls++;
      if (init.headers.Authorization === 'Bearer old-token') {
        return jsonResponse({ error: 'old token' }, 401);
      }
      return apiCalls === 2
        ? jsonResponse({ error: 'temporary' }, 500)
        : jsonResponse({ ok: true });
    },
  });

  await withMutedWarning(async () => {
    assert.deepEqual(await client.customer.listCustomers(), { ok: true });
  });
  assert.equal(tokenCalls, 3);
  assert.equal(apiCalls, 3);
});

function customProviderClient(options = {}) {
  return new QBenchClient({
    baseUrl: BASE_URL,
    accessTokenProvider: options.accessTokenProvider ?? staticProvider(),
    fetch: options.fetch ?? (async () => jsonResponse({ ok: true })),
    maxRetries: options.maxRetries,
    initialBackoffMs: options.initialBackoffMs,
    maxConcurrentRequests: options.maxConcurrentRequests,
    timeoutMs: options.timeoutMs,
    includeSensitiveErrorDetails: options.includeSensitiveErrorDetails,
  });
}

function staticProvider(token = 'static-token') {
  return {
    async getAccessToken() {
      return token;
    },
  };
}

function jsonResponse(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

async function withMutedWarning(operation) {
  const originalWarn = console.warn;
  console.warn = () => {};
  try {
    return await operation();
  } finally {
    console.warn = originalWarn;
  }
}
