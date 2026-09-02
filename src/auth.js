import { QBenchAuthError } from './errors.js';
import { sharedMemoryTokenStore } from './token-stores/memory.js';
import { normalizeTokenRecord } from './token-stores/token-record.js';

const DEFAULT_TOKEN_EXPIRY_BUFFER_SECONDS = 120;
const DEFAULT_AUTH_TIMEOUT_MS = 30000;
const JWT_LIFETIME_SECONDS = 3500;
const MAX_REJECTED_TOKENS_TRACKED = 16;
const TEXT_ENCODER = new TextEncoder();
const BASE64_URL_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/**
 * Manages QBench JWT bearer authentication, expiry-aware token reuse, and an
 * optional environment-specific token store.
 */
export class AuthManager {
  #clientId;
  #clientSecret;
  #tokenEndpoint;
  #tokenStore;
  #tokenCacheKey;
  #tokenCacheKeyPromise = null;
  #tokenExpiryBufferMs;
  #authTimeoutMs;
  #fetch;
  #webCrypto;
  #now;
  #includeSensitiveErrorDetails;
  #accessToken = null;
  #tokenType = null;
  #tokenExpiryTime = null;
  #tokenRefreshTime = null;
  #authPromise = null;
  #rejectedAccessTokens = new Set();

  /**
   * @param {string} clientId QBench API Client ID.
   * @param {string} clientSecret QBench API Client Secret.
   * @param {string} baseUrl Base URL of the QBench instance.
   * @param {object} [options]
   * @param {{ get: Function, set: Function, deleteIfMatch?: Function }} [options.tokenStore]
   * @param {string} [options.tokenCacheKey] Override the derived credential cache key.
   * @param {number} [options.tokenExpiryBufferSeconds=120]
   * @param {number} [options.authTimeoutMs=30000]
   * @param {typeof fetch} [options.fetch=globalThis.fetch]
   * @param {Crypto} [options.webCrypto=globalThis.crypto] Web Crypto implementation.
   * @param {() => number} [options.now=Date.now] Injectable clock for testing.
   * @param {boolean} [options.includeSensitiveErrorDetails=false]
   */
  constructor(clientId, clientSecret, baseUrl, options = {}) {
    if (!clientId || !clientSecret || !baseUrl) {
      throw new QBenchAuthError(
        'Client ID, Client Secret, and Base URL are required for AuthManager.'
      );
    }

    this.#clientId = clientId;
    this.#clientSecret = clientSecret;

    try {
      const parsedUrl = new URL(baseUrl);
      if (!parsedUrl.hostname) throw new Error('URL must include a hostname.');
      if (parsedUrl.protocol !== 'https:') throw new Error('Base URL must use HTTPS.');
      this.#tokenEndpoint = new URL('/qbench/oauth2/v1/token', parsedUrl);
    } catch (error) {
      throw new QBenchAuthError(`Invalid Base URL provided. ${error.message}`);
    }

    const tokenStore = options.tokenStore ?? sharedMemoryTokenStore;
    if (!tokenStore || typeof tokenStore.get !== 'function' || typeof tokenStore.set !== 'function') {
      throw new QBenchAuthError('tokenStore must implement async get(key) and set(key, token).');
    }

    const expiryBufferSeconds =
      options.tokenExpiryBufferSeconds ?? DEFAULT_TOKEN_EXPIRY_BUFFER_SECONDS;
    if (!Number.isFinite(expiryBufferSeconds) || expiryBufferSeconds < 0) {
      throw new QBenchAuthError('tokenExpiryBufferSeconds must be a non-negative number.');
    }

    const fetchImplementation = options.fetch ?? globalThis.fetch;
    if (typeof fetchImplementation !== 'function') {
      throw new QBenchAuthError('A Fetch API-compatible implementation is required.');
    }

    const webCrypto = options.webCrypto ?? globalThis.crypto;
    if (
      !webCrypto?.subtle ||
      typeof webCrypto.subtle.digest !== 'function' ||
      typeof webCrypto.subtle.importKey !== 'function' ||
      typeof webCrypto.subtle.sign !== 'function'
    ) {
      throw new QBenchAuthError('A Web Crypto-compatible implementation is required.');
    }

    const now = options.now ?? Date.now;
    if (typeof now !== 'function') {
      throw new QBenchAuthError('The now option must be a function.');
    }

    const authTimeoutMs = options.authTimeoutMs ?? DEFAULT_AUTH_TIMEOUT_MS;
    if (!Number.isFinite(authTimeoutMs) || authTimeoutMs <= 0) {
      throw new QBenchAuthError('authTimeoutMs must be a positive number.');
    }

    if (
      options.includeSensitiveErrorDetails !== undefined &&
      typeof options.includeSensitiveErrorDetails !== 'boolean'
    ) {
      throw new QBenchAuthError('includeSensitiveErrorDetails must be a boolean.');
    }

    this.#tokenStore = tokenStore;
    if (
      options.tokenCacheKey !== undefined &&
      (typeof options.tokenCacheKey !== 'string' || options.tokenCacheKey.length === 0)
    ) {
      throw new QBenchAuthError('tokenCacheKey must be a non-empty string when provided.');
    }
    this.#tokenCacheKey = options.tokenCacheKey ?? null;
    this.#tokenExpiryBufferMs = expiryBufferSeconds * 1000;
    this.#authTimeoutMs = authTimeoutMs;
    this.#fetch = fetchImplementation;
    this.#webCrypto = webCrypto;
    this.#now = now;
    this.#includeSensitiveErrorDetails = options.includeSensitiveErrorDetails === true;
  }

  /** Checks whether the current in-memory access token can safely be used. */
  isTokenValid() {
    return this.#isTokenRecordValid(this.#getLocalTokenRecord());
  }

  /**
   * Returns a valid bearer token. A forced refresh skips persisted storage but
   * still joins an authentication request already in progress in this client.
   *
   * @param {object} [options]
   * @param {boolean} [options.forceRefresh=false]
   * @returns {Promise<string>}
   */
  async getAccessToken({ forceRefresh = false } = {}) {
    if (!forceRefresh && this.isTokenValid()) {
      return this.#accessToken;
    }

    if (this.#authPromise) {
      return this.#waitForAuthentication();
    }

    if (!forceRefresh) {
      const storedToken = await this.#readStoredToken();
      if (this.#isTokenRecordValid(storedToken)) {
        this.#setLocalToken(storedToken);
        return this.#accessToken;
      }
    }

    // Another caller may have started authentication while this caller awaited
    // the shared token store.
    if (this.#authPromise) {
      return this.#waitForAuthentication();
    }

    this.#authPromise = this.#performAuthentication();
    try {
      return await this.#waitForAuthentication();
    } finally {
      this.#authPromise = null;
    }
  }

  /**
   * Marks a rejected bearer token unusable. The shared store is conditionally
   * cleared only when its adapter can do that safely.
   *
   * @returns {Promise<boolean>} Whether this token was still the local token.
   */
  async invalidateAccessToken(rejectedAccessToken) {
    if (typeof rejectedAccessToken !== 'string' || rejectedAccessToken.length === 0) {
      return false;
    }

    this.#rememberRejectedToken(rejectedAccessToken);
    const matchedLocalToken = this.#accessToken === rejectedAccessToken;
    if (matchedLocalToken) this.#clearLocalToken();

    if (typeof this.#tokenStore.deleteIfMatch === 'function') {
      try {
        const cacheKey = await this.#getTokenCacheKey();
        await this.#tokenStore.deleteIfMatch(cacheKey, rejectedAccessToken);
      } catch {
        console.warn('QBench token store invalidation failed; continuing with a forced refresh.');
      }
    }

    return matchedLocalToken;
  }

  async #waitForAuthentication() {
    try {
      const token = await this.#authPromise;
      if (!this.#isTokenRecordValid(token)) {
        throw new QBenchAuthError('QBench returned an access token that is not safely reusable.');
      }
      return token.accessToken;
    } catch (error) {
      throw error instanceof QBenchAuthError
        ? error
        : new QBenchAuthError(`Authentication process failed: ${safeErrorMessage(error)}`);
    }
  }

  async #readStoredToken() {
    try {
      const cacheKey = await this.#getTokenCacheKey();
      const value = await this.#tokenStore.get(cacheKey);
      return value === null || value === undefined ? null : normalizeTokenRecord(value);
    } catch {
      // Token caching is an optimization. A cache outage must not prevent a
      // fresh QBench authentication request.
      console.warn('QBench token store read failed; authenticating directly.');
      return null;
    }
  }

  async #performAuthentication() {
    try {
      const assertion = await this.#generateJwt();
      const body = new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      });

      const responseBody = await this.#requestToken(body);
      const token = this.#processTokenResponse(responseBody);
      this.#setLocalToken(token);
      this.#rejectedAccessTokens.clear();

      try {
        const cacheKey = await this.#getTokenCacheKey();
        await this.#tokenStore.set(cacheKey, token);
      } catch {
        // Preserve the valid local token even if shared caching is unavailable.
        console.warn('QBench token store write failed; using the in-memory token.');
      }

      return token;
    } catch (error) {
      this.#clearLocalToken();
      throw error instanceof QBenchAuthError
        ? error
        : new QBenchAuthError(`Authentication process failed: ${safeErrorMessage(error)}`);
    }
  }

  async #generateJwt() {
    const nowSeconds = Math.floor(this.#now() / 1000);
    const header = { alg: 'HS256', typ: 'JWT' };
    const claims = {
      iat: nowSeconds,
      sub: this.#clientId,
      exp: nowSeconds + JWT_LIFETIME_SECONDS,
    };

    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedClaims = base64UrlEncode(JSON.stringify(claims));
    const signingInput = `${encodedHeader}.${encodedClaims}`;
    const signingKey = await this.#webCrypto.subtle.importKey(
      'raw',
      TEXT_ENCODER.encode(this.#clientSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await this.#webCrypto.subtle.sign(
      'HMAC',
      signingKey,
      TEXT_ENCODER.encode(signingInput)
    );

    return `${signingInput}.${base64UrlEncode(signature)}`;
  }

  async #getTokenCacheKey() {
    if (this.#tokenCacheKey) return this.#tokenCacheKey;
    if (!this.#tokenCacheKeyPromise) {
      this.#tokenCacheKeyPromise = createTokenCacheKey(
        this.#tokenEndpoint,
        this.#clientId,
        this.#webCrypto
      );
    }
    this.#tokenCacheKey = await this.#tokenCacheKeyPromise;
    return this.#tokenCacheKey;
  }

  async #requestToken(body) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.#authTimeoutMs);

    try {
      const response = await this.#fetch(this.#tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: body.toString(),
        signal: controller.signal,
      });

      const rawBody = await response.text();
      let responseBody = null;
      if (rawBody) {
        try {
          responseBody = JSON.parse(rawBody);
        } catch {
          throw new QBenchAuthError(
            `QBench authentication returned invalid JSON with status ${response.status}.`
          );
        }
      }

      if (!response.ok) {
        const detailedMessage =
          this.#includeSensitiveErrorDetails && responseBody && typeof responseBody === 'object'
            ? responseBody.error_description || responseBody.error || responseBody.message
            : null;
        const qbErrorCode = responseBody?.qb_error_code
          ? ` (QB Error: ${responseBody.qb_error_code})`
          : '';
        throw new QBenchAuthError(
          `${detailedMessage || `QBench authentication failed with status ${response.status}`}${qbErrorCode}`
        );
      }

      if (!responseBody) {
        throw new QBenchAuthError(
          `QBench authentication returned status ${response.status} with an empty body.`
        );
      }

      return responseBody;
    } catch (error) {
      if (controller.signal.aborted) {
        throw new QBenchAuthError(
          `QBench authentication timed out after ${this.#authTimeoutMs}ms.`
        );
      }
      throw error instanceof QBenchAuthError
        ? error
        : new QBenchAuthError(`QBench authentication request failed: ${safeErrorMessage(error)}`);
    } finally {
      clearTimeout(timeout);
    }
  }

  #processTokenResponse(responseBody) {
    const accessToken = responseBody?.access_token;
    const expiresIn = responseBody?.expires_in;
    const tokenType = responseBody?.token_type;

    if (
      typeof accessToken !== 'string' ||
      accessToken.length === 0 ||
      typeof expiresIn !== 'number' ||
      !Number.isFinite(expiresIn) ||
      expiresIn <= 0 ||
      typeof tokenType !== 'string' ||
      tokenType.length === 0
    ) {
      throw new QBenchAuthError(
        'Invalid token response received from QBench (missing access_token, expires_in, or token_type).'
      );
    }

    const obtainedAt = this.#now();
    const lifetimeMs = expiresIn * 1000;
    const effectiveBufferMs = Math.min(this.#tokenExpiryBufferMs, lifetimeMs / 2);

    return {
      accessToken,
      tokenType,
      expiresAt: obtainedAt + lifetimeMs,
      refreshAt: obtainedAt + lifetimeMs - effectiveBufferMs,
    };
  }

  #isTokenRecordValid(token) {
    if (!token) return false;

    let record;
    try {
      record = normalizeTokenRecord(token);
    } catch {
      return false;
    }

    if (this.#rejectedAccessTokens.has(record.accessToken)) return false;
    const refreshAt = record.refreshAt ?? record.expiresAt - this.#tokenExpiryBufferMs;
    return this.#now() < refreshAt;
  }

  #getLocalTokenRecord() {
    if (!this.#accessToken || !this.#tokenType || !this.#tokenExpiryTime) return null;
    return {
      accessToken: this.#accessToken,
      tokenType: this.#tokenType,
      expiresAt: this.#tokenExpiryTime,
      refreshAt: this.#tokenRefreshTime ?? undefined,
    };
  }

  #setLocalToken(token) {
    const record = normalizeTokenRecord(token);
    this.#accessToken = record.accessToken;
    this.#tokenType = record.tokenType;
    this.#tokenExpiryTime = record.expiresAt;
    this.#tokenRefreshTime = record.refreshAt ?? null;
  }

  #clearLocalToken() {
    this.#accessToken = null;
    this.#tokenType = null;
    this.#tokenExpiryTime = null;
    this.#tokenRefreshTime = null;
  }

  #rememberRejectedToken(token) {
    this.#rejectedAccessTokens.add(token);
    if (this.#rejectedAccessTokens.size <= MAX_REJECTED_TOKENS_TRACKED) return;

    const oldestToken = this.#rejectedAccessTokens.values().next().value;
    this.#rejectedAccessTokens.delete(oldestToken);
  }
}

async function createTokenCacheKey(tokenEndpoint, clientId, webCrypto) {
  const digest = await webCrypto.subtle.digest(
    'SHA-256',
    TEXT_ENCODER.encode(`${tokenEndpoint.toString()}\0${clientId}`)
  );
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join(
    ''
  );
}

function base64UrlEncode(input) {
  const bytes =
    typeof input === 'string'
      ? TEXT_ENCODER.encode(input)
      : input instanceof Uint8Array
        ? input
        : input instanceof ArrayBuffer
          ? new Uint8Array(input)
          : ArrayBuffer.isView(input)
            ? new Uint8Array(input.buffer, input.byteOffset, input.byteLength)
            : null;

  if (!bytes) throw new TypeError('Expected text or binary data for base64url encoding.');

  let output = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index];
    const hasSecond = index + 1 < bytes.length;
    const hasThird = index + 2 < bytes.length;
    const second = hasSecond ? bytes[index + 1] : 0;
    const third = hasThird ? bytes[index + 2] : 0;

    output += BASE64_URL_ALPHABET[first >> 2];
    output += BASE64_URL_ALPHABET[((first & 0x03) << 4) | (second >> 4)];
    if (hasSecond) {
      output += BASE64_URL_ALPHABET[((second & 0x0f) << 2) | (third >> 6)];
    }
    if (hasThird) output += BASE64_URL_ALPHABET[third & 0x3f];
  }
  return output;
}

function safeErrorMessage(error) {
  return error instanceof Error && error.message ? error.message : 'Unknown error';
}
