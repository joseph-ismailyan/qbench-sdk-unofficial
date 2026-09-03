import test from 'node:test';
import assert from 'node:assert/strict';
import {
  QBenchClient,
  QBenchApiError,
  MemoryTokenStore,
  CloudflareKvTokenStore,
  DynamoDbTokenStore,
} from '../index.js';

const BASE_URL = 'https://synthetic.qbench.test';

test('reuses one access token for repeated API requests', async () => {
  const calls = { auth: 0, api: 0 };
  const fetch = createQBenchFetch(calls);
  const client = createClient({ fetch, tokenStore: new MemoryTokenStore() });

  await client.customer.listCustomers();
  await client.customer.listCustomers();

  assert.deepEqual(calls, { auth: 1, api: 2 });
});

test('coalesces concurrent authentication in one client', async () => {
  const calls = { auth: 0, api: 0 };
  const fetch = createQBenchFetch(calls, { authDelayMs: 5 });
  const client = createClient({ fetch, tokenStore: new MemoryTokenStore() });

  await Promise.all(Array.from({ length: 8 }, () => client.customer.listCustomers()));

  assert.deepEqual(calls, { auth: 1, api: 8 });
});

test('shares a stored token across separate QBenchClient instances', async () => {
  const calls = { auth: 0, api: 0 };
  const fetch = createQBenchFetch(calls);
  const tokenStore = new MemoryTokenStore();

  await createClient({ fetch, tokenStore }).customer.listCustomers();
  await createClient({ fetch, tokenStore }).customer.listCustomers();

  assert.deepEqual(calls, { auth: 1, api: 2 });
});

test('refreshes before expiry using the configured safety buffer', async () => {
  let now = 1_700_000_000_000;
  const calls = { auth: 0, api: 0 };
  const fetch = createQBenchFetch(calls, { expiresIn: 300 });
  const tokenStore = new MemoryTokenStore({ now: () => now });
  const client = createClient({ fetch, tokenStore, now: () => now });

  await client.customer.listCustomers();
  now += 179_000;
  await client.customer.listCustomers();
  now += 2_000;
  await client.customer.listCustomers();

  assert.deepEqual(calls, { auth: 2, api: 3 });
});

test('refreshes and retries an API request once after a 401', async () => {
  const calls = { auth: 0, api: 0 };
  const fetch = createQBenchFetch(calls, { rejectFirstToken: true });
  const client = createClient({ fetch, tokenStore: new MemoryTokenStore() });

  const response = await client.customer.listCustomers();

  assert.equal(response.ok, true);
  assert.deepEqual(calls, { auth: 2, api: 2 });
});

test('refreshes and retries once after QBench rejects a token with 400 AuthError', async () => {
  const calls = { auth: 0, api: 0 };
  const fetch = createQBenchFetch(calls, {
    rejectFirstToken: true,
    rejectionStatus: 400,
    rejectionBody: { error_type: 'AuthError' },
  });
  const client = createClient({ fetch, tokenStore: new MemoryTokenStore() });

  const response = await client.customer.listCustomers();

  assert.equal(response.ok, true);
  assert.deepEqual(calls, { auth: 2, api: 2 });
});

test('does not retry authentication more than once after repeated 401 responses', async () => {
  const calls = { auth: 0, api: 0 };
  const fetch = createQBenchFetch(calls, { alwaysUnauthorized: true });
  const client = createClient({ fetch, tokenStore: new MemoryTokenStore() });

  await assert.rejects(
    () => client.customer.listCustomers(),
    (error) => error instanceof QBenchApiError && error.status === 401
  );
  assert.deepEqual(calls, { auth: 2, api: 2 });
});

test('does not retry authentication more than once after repeated 400 AuthError responses', async () => {
  const calls = { auth: 0, api: 0 };
  const fetch = createQBenchFetch(calls, {
    alwaysUnauthorized: true,
    rejectionStatus: 400,
    rejectionBody: { error_type: 'AuthError' },
  });
  const client = createClient({ fetch, tokenStore: new MemoryTokenStore() });

  await assert.rejects(
    () => client.customer.listCustomers(),
    (error) => error instanceof QBenchApiError && error.status === 400
  );
  assert.deepEqual(calls, { auth: 2, api: 2 });
});

test('does not refresh authentication after an ordinary validation 400', async () => {
  const calls = { auth: 0, api: 0 };
  const fetch = createQBenchFetch(calls, {
    alwaysUnauthorized: true,
    rejectionStatus: 400,
    rejectionBody: { error_type: 'ValidationError' },
  });
  const client = createClient({ fetch, tokenStore: new MemoryTokenStore() });

  await assert.rejects(
    () => client.customer.listCustomers(),
    (error) => error instanceof QBenchApiError && error.status === 400
  );
  assert.deepEqual(calls, { auth: 1, api: 1 });
});

test('does not refresh authentication after a permission 403', async () => {
  const calls = { auth: 0, api: 0 };
  const fetch = createQBenchFetch(calls, { alwaysUnauthorized: true, rejectionStatus: 403 });
  const client = createClient({ fetch, tokenStore: new MemoryTokenStore() });

  await assert.rejects(
    () => client.customer.listCustomers(),
    (error) => error instanceof QBenchApiError && error.status === 403
  );
  assert.deepEqual(calls, { auth: 1, api: 1 });
});

test('Cloudflare KV adapter stores the token until its actual expiry', async () => {
  const values = new Map();
  const puts = [];
  const namespace = {
    async get(key, type) {
      const value = values.get(key);
      if (value === undefined) return null;
      return type === 'json' ? JSON.parse(value) : value;
    },
    async put(key, value, options) {
      values.set(key, value);
      puts.push({ key, value, options });
    },
  };
  const now = 1_700_000_000_000;
  const tokenStore = new CloudflareKvTokenStore(namespace, {
    keyPrefix: 'test:',
    now: () => now,
  });
  const token = {
    accessToken: 'sensitive-token',
    tokenType: 'Bearer',
    expiresAt: now + 3_600_000,
    refreshAt: now + 3_480_000,
  };

  await tokenStore.set('credential-key', token);

  assert.equal(puts.length, 1);
  assert.equal(puts[0].key, 'test:credential-key');
  assert.deepEqual(puts[0].options, { expiration: Math.floor(token.expiresAt / 1000) });
  assert.deepEqual(await tokenStore.get('credential-key'), token);
  assert.equal(typeof tokenStore.deleteIfMatch, 'undefined');
});

test('Cloudflare KV adapter skips tokens too short-lived for KV expiration', async () => {
  let writes = 0;
  const now = 1_700_000_000_000;
  const namespace = {
    async get() {
      return null;
    },
    async put() {
      writes++;
    },
  };
  const tokenStore = new CloudflareKvTokenStore(namespace, { now: () => now });

  await tokenStore.set('key', {
    accessToken: 'short-token',
    tokenType: 'Bearer',
    expiresAt: now + 59_000,
  });

  assert.equal(writes, 0);
});

test('DynamoDB adapter reads, writes, and conditionally deletes token records', async () => {
  class GetCommand {
    constructor(input) {
      this.input = input;
    }
  }
  class PutCommand {
    constructor(input) {
      this.input = input;
    }
  }
  class DeleteCommand {
    constructor(input) {
      this.input = input;
    }
  }

  let item = null;
  const client = {
    async send(command) {
      if (command instanceof GetCommand) return { Item: item };
      if (command instanceof PutCommand) {
        item = command.input.Item;
        return {};
      }
      if (command instanceof DeleteCommand) {
        if (item?.token?.accessToken !== command.input.ExpressionAttributeValues[':rejectedAccessToken']) {
          const error = new Error('condition failed');
          error.name = 'ConditionalCheckFailedException';
          throw error;
        }
        item = null;
        return {};
      }
      throw new Error('Unexpected command');
    },
  };
  const tokenStore = new DynamoDbTokenStore({
    client,
    tableName: 'synthetic-token-cache',
    commands: { GetCommand, PutCommand, DeleteCommand },
  });
  const token = {
    accessToken: 'sensitive-token',
    tokenType: 'Bearer',
    expiresAt: 1_700_003_600_000,
    refreshAt: 1_700_003_480_000,
  };

  await tokenStore.set('credential-key', token);

  assert.equal(item.pk, 'qbench-token#credential-key');
  assert.equal(item.expiresAtEpochSeconds, Math.floor(token.expiresAt / 1000));
  assert.deepEqual(await tokenStore.get('credential-key'), token);
  assert.equal(await tokenStore.deleteIfMatch('credential-key', 'different-token'), false);
  assert.notEqual(item, null);
  assert.equal(await tokenStore.deleteIfMatch('credential-key', token.accessToken), true);
  assert.equal(item, null);
});

test('a fully custom access token provider can replace built-in authentication', async () => {
  let providerCalls = 0;
  let apiCalls = 0;
  const accessTokenProvider = {
    async getAccessToken() {
      providerCalls++;
      return 'provided-token';
    },
  };
  const client = new QBenchClient({
    baseUrl: BASE_URL,
    accessTokenProvider,
    fetch: async (url, init) => {
      apiCalls++;
      assert.equal(new URL(url).pathname, '/qbench/api/v2/customers');
      assert.equal(init.headers.Authorization, 'Bearer provided-token');
      return jsonResponse({ ok: true });
    },
  });

  await client.customer.listCustomers();

  assert.equal(providerCalls, 1);
  assert.equal(apiCalls, 1);
});

function createClient({ fetch, tokenStore, now }) {
  return new QBenchClient({
    clientId: 'synthetic-client-id',
    clientSecret: 'synthetic-client-secret',
    baseUrl: BASE_URL,
    tokenStore,
    tokenExpiryBufferSeconds: 120,
    fetch,
    now,
  });
}

function createQBenchFetch(
  calls,
  {
    expiresIn = 3600,
    authDelayMs = 0,
    rejectFirstToken = false,
    alwaysUnauthorized = false,
    rejectionStatus = 401,
    rejectionBody = { error: 'invalid_token' },
  } = {}
) {
  return async (url, init) => {
    const parsedUrl = new URL(url);
    if (parsedUrl.pathname === '/qbench/oauth2/v1/token') {
      calls.auth++;
      if (authDelayMs > 0) await new Promise((resolve) => setTimeout(resolve, authDelayMs));

      assert.equal(init.method, 'POST');
      const form = new URLSearchParams(init.body);
      assert.equal(form.get('grant_type'), 'urn:ietf:params:oauth:grant-type:jwt-bearer');
      assert.equal(form.get('assertion')?.split('.').length, 3);
      return jsonResponse({
        access_token: `token-${calls.auth}`,
        token_type: 'Bearer',
        expires_in: expiresIn,
      });
    }

    calls.api++;
    assert.equal(parsedUrl.pathname, '/qbench/api/v2/customers');
    const accessToken = init.headers.Authorization.replace('Bearer ', '');
    if (alwaysUnauthorized || (rejectFirstToken && accessToken === 'token-1')) {
      return jsonResponse(rejectionBody, rejectionStatus);
    }
    return jsonResponse({ ok: true, accessToken });
  };
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
