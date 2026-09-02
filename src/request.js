import {
  QBenchSdkError,
  QBenchAuthError,
  createApiError,
  QBenchApiError,
  QBenchRateLimitError,
} from './errors.js';
import { delay, buildQueryString } from './utils.js';

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_INITIAL_BACKOFF_MS = 1000;
const DEFAULT_CONCURRENT_REQUESTS = 10;
const DEFAULT_TIMEOUT_MS = 30000;
const RETRYABLE_METHODS = new Set(['GET', 'HEAD']);
const USER_AGENT = 'qbench-sdk-unofficial/0.1.0';

/**
 * Handles QBench API requests, including authentication, retries, one-time 401
 * recovery, rate limiting, and per-client concurrency limiting.
 */
export class RequestHandler {
  #authManager;
  #baseUrl;
  #maxRetries;
  #initialBackoffMs;
  #maxConcurrentRequests;
  #timeoutMs;
  #includeSensitiveErrorDetails;
  #fetch;
  #activeRequests = 0;
  #requestQueue = [];

  constructor(authManager, baseUrl, options = {}) {
    this.#authManager = authManager;
    try {
      const parsedBaseUrl = new URL(baseUrl);
      if (parsedBaseUrl.protocol !== 'https:') {
        throw new Error('baseUrl must use HTTPS.');
      }
      this.#baseUrl = parsedBaseUrl;
    } catch (error) {
      throw new QBenchSdkError(`Invalid QBench baseUrl. ${safeErrorMessage(error)}`);
    }
    this.#maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.#initialBackoffMs = options.initialBackoffMs ?? DEFAULT_INITIAL_BACKOFF_MS;
    this.#maxConcurrentRequests =
      options.maxConcurrentRequests ?? DEFAULT_CONCURRENT_REQUESTS;
    this.#timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    if (
      options.includeSensitiveErrorDetails !== undefined &&
      typeof options.includeSensitiveErrorDetails !== 'boolean'
    ) {
      throw new QBenchSdkError('includeSensitiveErrorDetails must be a boolean.');
    }
    this.#includeSensitiveErrorDetails = options.includeSensitiveErrorDetails === true;
    this.#fetch = options.fetch ?? globalThis.fetch;

    if (typeof this.#fetch !== 'function') {
      throw new QBenchSdkError('A Fetch API-compatible implementation is required.');
    }
  }

  /**
   * Makes a request to the QBench API.
   *
   * @param {string} method HTTP method.
   * @param {string} path API endpoint path.
   * @param {object} [params] Query parameters using QBench's native casing.
   * @param {object|Array|string|Buffer} [data] Request body.
   * @param {number} [retryCount=0] Initial transient retry count.
   * @param {object} [requestOptions]
   */
  async request(method, path, params = null, data = null, retryCount = 0, requestOptions = {}) {
    await this.#acquireSlot();

    try {
      return await this.#requestWithRetries(
        method,
        path,
        params,
        data,
        retryCount,
        requestOptions
      );
    } finally {
      this.#releaseSlot();
    }
  }

  async #requestWithRetries(method, path, params, data, initialRetryCount, requestOptions) {
    const upperMethod = method.toUpperCase();
    const requestDetails = this.#includeSensitiveErrorDetails
      ? { method: upperMethod, path, params, data }
      : { method: upperMethod, path };
    let retryCount = initialRetryCount;
    let authRetryCount = 0;
    let forceAuthRefresh = false;

    while (true) {
      const accessToken = await this.#authManager.getAccessToken({
        forceRefresh: forceAuthRefresh,
      });
      forceAuthRefresh = false;

      const queryString = buildQueryString(params);
      const url = new URL(path + queryString, this.#baseUrl);
      const { headers, body } = this.#buildRequestBody(accessToken, data, requestOptions);

      try {
        const response = await this.#makeHttpRequest(url, upperMethod, headers, body);
        return response.body;
      } catch (error) {
        if (error instanceof QBenchApiError && error.status === 401 && authRetryCount === 0) {
          authRetryCount++;
          const rejectedCurrentToken =
            typeof this.#authManager.invalidateAccessToken === 'function'
              ? await this.#authManager.invalidateAccessToken(accessToken)
              : true;
          forceAuthRefresh = rejectedCurrentToken !== false;
          continue;
        }

        const retryDelayMs = this.#getRetryDelay(error, retryCount, url, upperMethod);
        if (retryDelayMs !== null && retryCount < this.#maxRetries) {
          retryCount++;
          await delay(retryDelayMs);
          continue;
        }

        if (error instanceof QBenchApiError) {
          error.requestDetails = requestDetails;
          throw error;
        }
        if (error instanceof QBenchAuthError || error instanceof QBenchSdkError) {
          throw error;
        }
        throw new QBenchSdkError(`Unexpected error during request: ${safeErrorMessage(error)}`);
      }
    }
  }

  #buildRequestBody(accessToken, data, requestOptions) {
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'User-Agent': USER_AGENT,
    };

    if (data === null || data === undefined) {
      return { headers, body: null };
    }

    if (requestOptions.isRawBody) {
      if (!requestOptions.contentType) {
        throw new QBenchSdkError(
          'requestOptions.contentType is required when isRawBody is true'
        );
      }
      headers['Content-Type'] = requestOptions.contentType;
      return { headers, body: data };
    }

    try {
      headers['Content-Type'] = 'application/json';
      return { headers, body: JSON.stringify(data) };
    } catch (error) {
      throw new QBenchSdkError(`Failed to stringify request data: ${safeErrorMessage(error)}`);
    }
  }

  #getRetryDelay(error, retryCount, url, method) {
    if (!RETRYABLE_METHODS.has(method)) return null;
    if (retryCount >= this.#maxRetries) return null;

    if (
      error instanceof QBenchRateLimitError &&
      error.responseHeaders?.['x-qbapi-throttle-ttl']
    ) {
      const ttlSeconds = Number.parseInt(
        error.responseHeaders['x-qbapi-throttle-ttl'],
        10
      );
      if (Number.isFinite(ttlSeconds) && ttlSeconds > 0) {
        console.warn(
          `QBench rate limit hit. Retrying ${url.pathname} in ${ttlSeconds}s ` +
            `(attempt ${retryCount + 1}/${this.#maxRetries}).`
        );
        return ttlSeconds * 1000;
      }
    }

    if (
      error instanceof QBenchApiError &&
      (error.status === 429 || error.status >= 500)
    ) {
      const retryDelayMs = jitter(this.#initialBackoffMs * 2 ** retryCount);
      console.warn(
        `QBench API error ${error.status}. Retrying ${url.pathname} in ` +
          `${Math.round(retryDelayMs)}ms (attempt ${retryCount + 1}/${this.#maxRetries}).`
      );
      return retryDelayMs;
    }

    if (error instanceof QBenchSdkError && error.message.includes('ECONNRESET')) {
      const retryDelayMs = jitter(this.#initialBackoffMs * 2 ** retryCount);
      console.warn(
        `QBench network connection reset. Retrying ${url.pathname} in ` +
          `${Math.round(retryDelayMs)}ms (attempt ${retryCount + 1}/${this.#maxRetries}).`
      );
      return retryDelayMs;
    }

    return null;
  }

  #acquireSlot() {
    if (this.#activeRequests < this.#maxConcurrentRequests) {
      this.#activeRequests++;
      return Promise.resolve();
    }
    return new Promise((resolve) => this.#requestQueue.push(resolve));
  }

  #releaseSlot() {
    this.#activeRequests--;
    if (this.#requestQueue.length === 0) return;

    // Reserve the released slot before waking the next caller so a concurrent
    // request cannot claim it between promise resolution and continuation.
    this.#activeRequests++;
    const nextResolve = this.#requestQueue.shift();
    queueMicrotask(nextResolve);
  }

  async #makeHttpRequest(url, method, headers, body) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.#timeoutMs);

    try {
      const response = await this.#fetch(url, {
        method,
        headers,
        body,
        signal: controller.signal,
      });
      const responseHeaders = Object.fromEntries(response.headers.entries());
      const contentType = response.headers.get('content-type') || '';
      let responseBody = null;

      if (response.status !== 204) {
        const rawBody = await response.text();
        if (rawBody && contentType.includes('application/json')) {
          try {
            responseBody = JSON.parse(rawBody);
          } catch {
            throw new QBenchSdkError(
              `Failed to parse JSON response. Status: ${response.status}.`
            );
          }
        } else {
          responseBody = rawBody;
        }
      }

      if (response.ok) {
        return { body: responseBody, headers: responseHeaders };
      }
      throw createApiError(response.status, responseBody, responseHeaders, {
        includeSensitiveDetails: this.#includeSensitiveErrorDetails,
      });
    } catch (error) {
      if (controller.signal.aborted) {
        throw new QBenchSdkError(`Request timed out after ${this.#timeoutMs}ms`);
      }
      if (error instanceof QBenchApiError || error instanceof QBenchSdkError) {
        throw error;
      }
      throw new QBenchSdkError(`Request failed: ${safeErrorMessage(error)}`);
    } finally {
      clearTimeout(timeout);
    }
  }
}

function jitter(value) {
  return value * (1 + (Math.random() * 0.4 - 0.2));
}

function safeErrorMessage(error) {
  return error instanceof Error && error.message ? error.message : 'Unknown error';
}
