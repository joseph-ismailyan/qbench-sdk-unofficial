import test from 'node:test';
import assert from 'node:assert/strict';
import { AuthManager } from '../src/auth.js';
import { QBenchAuthError } from '../src/errors.js';
import { MemoryTokenStore } from '../src/token-stores/memory.js';

const BASE_URL = 'https://auth-edge.qbench.test';
const CLIENT_ID = 'synthetic-client-id';
const CLIENT_SECRET = 'synthetic-client-secret';

for (const [name, args] of [
  ['missing client ID', ['', CLIENT_SECRET, BASE_URL]],
  ['missing client secret', [CLIENT_ID, '', BASE_URL]],
  ['missing base URL', [CLIENT_ID, CLIENT_SECRET, '']],
]) {
  test(`AuthManager rejects ${name}`, () => {
    assert.throws(() => new AuthManager(...args), QBenchAuthError);
  });
}

test('AuthManager rejects an invalid base URL', () => {
  assert.throws(
    () => new AuthManager(CLIENT_ID, CLIENT_SECRET, 'not-a-url'),
    /Invalid Base URL/
  );
});

test('AuthManager rejects an insecure base URL', () => {
  assert.throws(
    () => new AuthManager(CLIENT_ID, CLIENT_SECRET, 'http://auth-edge.qbench.test'),
    /must use HTTPS/
  );
});

for (const [name, options, message] of [
  ['invalid token store', { tokenStore: {} }, /tokenStore must implement/],
  ['negative expiry buffer', { tokenExpiryBufferSeconds: -1 }, /non-negative/],
  ['non-function fetch', { fetch: 42 }, /Fetch API-compatible/],
  ['invalid Web Crypto implementation', { webCrypto: {} }, /Web Crypto-compatible/],
  ['non-function clock', { now: 42 }, /now option must be a function/],
  ['zero auth timeout', { authTimeoutMs: 0 }, /positive number/],
  ['empty token cache key', { tokenCacheKey: '' }, /non-empty string/],
  ['non-boolean sensitive error option', { includeSensitiveErrorDetails: 'yes' }, /boolean/],
]) {
  test(`AuthManager rejects ${name}`, () => {
    assert.throws(
      () => new AuthManager(CLIENT_ID, CLIENT_SECRET, BASE_URL, options),
      message
    );
  });
}

test('returns a valid stored token without calling the authentication endpoint', async () => {
  const now = 1_700_000_000_000;
  const tokenStore = new MemoryTokenStore({ now: () => now });
  await tokenStore.set('shared-key', {
    accessToken: 'stored-token',
    tokenType: 'Bearer',
    expiresAt: now + 3_600_000,
    refreshAt: now + 3_480_000,
  });
  let fetchCalls = 0;
  const auth = createAuth({
    tokenStore,
    tokenCacheKey: 'shared-key',
    now: () => now,
    fetch: async () => {
      fetchCalls++;
      return tokenResponse('unexpected');
    },
  });

  assert.equal(await auth.getAccessToken(), 'stored-token');
  assert.equal(fetchCalls, 0);
  assert.equal(auth.isTokenValid(), true);
});

test('applies the configured expiry buffer to stored tokens without refreshAt', async () => {
  const now = 1_700_000_000_000;
  const records = new Map([
    [
      'shared-key',
      { accessToken: 'stored-token', tokenType: 'Bearer', expiresAt: now + 121_000 },
    ],
  ]);
  const auth = createAuth({
    tokenStore: mapStore(records),
    tokenCacheKey: 'shared-key',
    now: () => now,
    fetch: async () => {
      throw new Error('authentication should not run');
    },
  });

  assert.equal(await auth.getAccessToken(), 'stored-token');
});

test('refreshes a stored token inside the expiry buffer', async () => {
  const now = 1_700_000_000_000;
  const records = new Map([
    [
      'shared-key',
      { accessToken: 'old-token', tokenType: 'Bearer', expiresAt: now + 120_000 },
    ],
  ]);
  let authCalls = 0;
  const auth = createAuth({
    tokenStore: mapStore(records),
    tokenCacheKey: 'shared-key',
    now: () => now,
    fetch: async () => {
      authCalls++;
      return tokenResponse('new-token');
    },
  });

  assert.equal(await auth.getAccessToken(), 'new-token');
  assert.equal(authCalls, 1);
});

test('malformed stored records are ignored and replaced', async () => {
  let authCalls = 0;
  const auth = createAuth({
    tokenStore: {
      async get() {
        return { accessToken: '', expiresAt: 'bad' };
      },
      async set() {},
    },
    fetch: async () => {
      authCalls++;
      return tokenResponse('replacement-token');
    },
  });

  await withMutedWarning(async () => {
    assert.equal(await auth.getAccessToken(), 'replacement-token');
  });
  assert.equal(authCalls, 1);
});

test('token-store read failures fall back to QBench authentication', async () => {
  const auth = createAuth({
    tokenStore: {
      async get() {
        throw new Error('synthetic store failure');
      },
      async set() {},
    },
    fetch: async () => tokenResponse('fallback-token'),
  });

  await withMutedWarning(async () => {
    assert.equal(await auth.getAccessToken(), 'fallback-token');
  });
});

test('token-store write failures retain and reuse the in-memory token', async () => {
  let authCalls = 0;
  const auth = createAuth({
    tokenStore: {
      async get() {
        return null;
      },
      async set() {
        throw new Error('synthetic store failure');
      },
    },
    fetch: async () => {
      authCalls++;
      return tokenResponse('memory-only-token');
    },
  });

  await withMutedWarning(async () => {
    assert.equal(await auth.getAccessToken(), 'memory-only-token');
    assert.equal(await auth.getAccessToken(), 'memory-only-token');
  });
  assert.equal(authCalls, 1);
});

test('conditional invalidation failures do not block a forced refresh', async () => {
  let authCalls = 0;
  const auth = createAuth({
    tokenStore: {
      async get() {
        return null;
      },
      async set() {},
      async deleteIfMatch() {
        throw new Error('synthetic delete failure');
      },
    },
    fetch: async () => {
      authCalls++;
      return tokenResponse(`token-${authCalls}`);
    },
  });

  const firstToken = await auth.getAccessToken();
  await withMutedWarning(async () => {
    assert.equal(await auth.invalidateAccessToken(firstToken), true);
  });
  assert.equal(await auth.getAccessToken({ forceRefresh: true }), 'token-2');
});

test('empty invalidation input is ignored', async () => {
  const auth = createAuth({ fetch: async () => tokenResponse('unused') });
  assert.equal(await auth.invalidateAccessToken(''), false);
});

test('short-lived access tokens use half their lifetime as the maximum buffer', async () => {
  let now = 1_700_000_000_000;
  let authCalls = 0;
  const auth = createAuth({
    now: () => now,
    tokenExpiryBufferSeconds: 120,
    fetch: async () => {
      authCalls++;
      return tokenResponse(`short-${authCalls}`, 60);
    },
  });

  assert.equal(await auth.getAccessToken(), 'short-1');
  now += 29_000;
  assert.equal(await auth.getAccessToken(), 'short-1');
  now += 2_000;
  assert.equal(await auth.getAccessToken(), 'short-2');
});

for (const [name, body] of [
  ['missing access token', { token_type: 'Bearer', expires_in: 3600 }],
  ['non-numeric expiry', { access_token: 'token', token_type: 'Bearer', expires_in: '3600' }],
  ['zero expiry', { access_token: 'token', token_type: 'Bearer', expires_in: 0 }],
  ['missing token type', { access_token: 'token', expires_in: 3600 }],
]) {
  test(`rejects token responses with ${name}`, async () => {
    const auth = createAuth({ fetch: async () => jsonResponse(body) });
    await assert.rejects(() => auth.getAccessToken(), /Invalid token response/);
  });
}

test('rejects invalid JSON from the authentication endpoint without echoing the body', async () => {
  const auth = createAuth({
    fetch: async () => new Response('sensitive-raw-body', { status: 200 }),
  });

  await assert.rejects(
    () => auth.getAccessToken(),
    (error) =>
      error instanceof QBenchAuthError &&
      error.message.includes('invalid JSON') &&
      !error.message.includes('sensitive-raw-body')
  );
});

test('rejects an empty successful authentication response', async () => {
  const auth = createAuth({ fetch: async () => new Response(null, { status: 200 }) });
  await assert.rejects(() => auth.getAccessToken(), /empty body/);
});

test('redacts QBench authentication descriptions but preserves stable error codes', async () => {
  const auth = createAuth({
    fetch: async () =>
      jsonResponse(
        { error_description: 'Synthetic authentication rejection', qb_error_code: 'QB-TEST' },
        401
      ),
  });

  await assert.rejects(
    () => auth.getAccessToken(),
    (error) =>
      error.message === 'QBench authentication failed with status 401 (QB Error: QB-TEST)' &&
      !error.message.includes('Synthetic authentication rejection')
  );
});

test('authentication descriptions require an explicit sensitive-details opt-in', async () => {
  const auth = createAuth({
    includeSensitiveErrorDetails: true,
    fetch: async () =>
      jsonResponse(
        { error_description: 'Synthetic authentication rejection', qb_error_code: 'QB-TEST' },
        401
      ),
  });

  await assert.rejects(
    () => auth.getAccessToken(),
    /Synthetic authentication rejection \(QB Error: QB-TEST\)/
  );
});

test('uses a generic message for authentication errors without a JSON description', async () => {
  const auth = createAuth({ fetch: async () => new Response(null, { status: 503 }) });
  await assert.rejects(() => auth.getAccessToken(), /status 503/);
});

test('wraps authentication network failures', async () => {
  const auth = createAuth({
    fetch: async () => {
      throw new Error('synthetic network failure');
    },
  });
  await assert.rejects(() => auth.getAccessToken(), /authentication request failed/);
});

test('aborts authentication requests at authTimeoutMs', async () => {
  const auth = createAuth({
    authTimeoutMs: 5,
    fetch: async (_url, init) =>
      new Promise((_resolve, reject) => {
        init.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
      }),
  });
  await assert.rejects(() => auth.getAccessToken(), /timed out after 5ms/);
});

test('a failed authentication can be retried successfully', async () => {
  let calls = 0;
  const auth = createAuth({
    fetch: async () => {
      calls++;
      return calls === 1
        ? jsonResponse({ error: 'synthetic failure' }, 500)
        : tokenResponse('recovered-token');
    },
  });

  await assert.rejects(() => auth.getAccessToken(), /status 500/);
  assert.equal(await auth.getAccessToken(), 'recovered-token');
  assert.equal(calls, 2);
});

test('credential identities derive separate token-store keys', async () => {
  const keys = [];
  const tokenStore = {
    async get(key) {
      keys.push(key);
      return null;
    },
    async set() {},
  };
  await new AuthManager('client-a', CLIENT_SECRET, BASE_URL, {
    tokenStore,
    fetch: async () => tokenResponse('token-a'),
  }).getAccessToken();
  await new AuthManager('client-b', CLIENT_SECRET, BASE_URL, {
    tokenStore,
    fetch: async () => tokenResponse('token-b'),
  }).getAccessToken();

  assert.equal(keys.length, 2);
  assert.notEqual(keys[0], keys[1]);
  assert.match(keys[0], /^[a-f0-9]{64}$/);
});

test('an explicit tokenCacheKey can share a token across managers', async () => {
  const records = new Map();
  let authCalls = 0;
  const tokenStore = mapStore(records);
  const options = {
    tokenStore,
    tokenCacheKey: 'explicit-shared-key',
    fetch: async () => {
      authCalls++;
      return tokenResponse('shared-token');
    },
  };

  assert.equal(await createAuth(options).getAccessToken(), 'shared-token');
  assert.equal(await createAuth(options).getAccessToken(), 'shared-token');
  assert.equal(authCalls, 1);
});

test('creates a verifiable HS256 JWT with an injected Web Crypto implementation', async () => {
  const now = 1_700_000_000_000;
  const calls = { digest: 0, importKey: 0, sign: 0 };
  const webCrypto = {
    subtle: {
      async digest(...args) {
        calls.digest++;
        return globalThis.crypto.subtle.digest(...args);
      },
      async importKey(...args) {
        calls.importKey++;
        return globalThis.crypto.subtle.importKey(...args);
      },
      async sign(...args) {
        calls.sign++;
        return globalThis.crypto.subtle.sign(...args);
      },
    },
  };
  let assertion;
  const auth = createAuth({
    now: () => now,
    webCrypto,
    fetch: async (_url, init) => {
      assertion = new URLSearchParams(init.body).get('assertion');
      return tokenResponse('web-crypto-token');
    },
  });

  assert.equal(await auth.getAccessToken(), 'web-crypto-token');
  assert.deepEqual(calls, { digest: 1, importKey: 1, sign: 1 });

  const [encodedHeader, encodedClaims, encodedSignature] = assertion.split('.');
  assert.deepEqual(decodeJwtPart(encodedHeader), { alg: 'HS256', typ: 'JWT' });
  assert.deepEqual(decodeJwtPart(encodedClaims), {
    iat: Math.floor(now / 1000),
    sub: CLIENT_ID,
    exp: Math.floor(now / 1000) + 3500,
  });

  const verificationKey = await globalThis.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(CLIENT_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );
  assert.equal(
    await globalThis.crypto.subtle.verify(
      'HMAC',
      verificationKey,
      decodeBase64Url(encodedSignature),
      new TextEncoder().encode(`${encodedHeader}.${encodedClaims}`)
    ),
    true
  );
});

test('an explicit cache key avoids a Web Crypto digest while retaining Web Crypto signing', async () => {
  const webCrypto = {
    subtle: {
      async digest() {
        throw new Error('digest should not be called');
      },
      importKey: (...args) => globalThis.crypto.subtle.importKey(...args),
      sign: (...args) => globalThis.crypto.subtle.sign(...args),
    },
  };
  const auth = createAuth({
    tokenCacheKey: 'explicit-key',
    webCrypto,
    fetch: async () => tokenResponse('explicit-key-token'),
  });

  assert.equal(await auth.getAccessToken(), 'explicit-key-token');
});

function createAuth(options = {}) {
  return new AuthManager(CLIENT_ID, CLIENT_SECRET, BASE_URL, {
    tokenStore: options.tokenStore ?? new MemoryTokenStore({ now: options.now }),
    fetch: options.fetch ?? (async () => tokenResponse('default-token')),
    ...options,
  });
}

function mapStore(records) {
  return {
    async get(key) {
      return records.get(key) ?? null;
    },
    async set(key, token) {
      records.set(key, { ...token });
    },
    async deleteIfMatch(key, rejectedToken) {
      if (records.get(key)?.accessToken !== rejectedToken) return false;
      records.delete(key);
      return true;
    },
  };
}

function tokenResponse(accessToken, expiresIn = 3600) {
  return jsonResponse({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: expiresIn,
  });
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function decodeJwtPart(value) {
  return JSON.parse(new TextDecoder().decode(decodeBase64Url(value)));
}

function decodeBase64Url(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
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
