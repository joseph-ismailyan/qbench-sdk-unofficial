import { normalizeTokenRecord } from './token-record.js';

const MINIMUM_KV_EXPIRATION_SECONDS = 60;

/**
 * Cloudflare Workers KV token storage.
 *
 * Workers KV is eventually consistent. This adapter deliberately does not
 * implement compare-and-delete invalidation because KV cannot make that
 * operation atomic. A forced refresh overwrites the value instead.
 */
export class CloudflareKvTokenStore {
  #namespace;
  #keyPrefix;
  #now;

  /**
   * @param {object} namespace A Workers KV namespace binding.
   * @param {object} [options]
   * @param {string} [options.keyPrefix='qbench:oauth:']
   * @param {() => number} [options.now=Date.now] Injectable clock for testing.
   */
  constructor(namespace, { keyPrefix = 'qbench:oauth:', now = Date.now } = {}) {
    if (!namespace || typeof namespace.get !== 'function' || typeof namespace.put !== 'function') {
      throw new TypeError('CloudflareKvTokenStore requires a Workers KV namespace binding.');
    }
    if (typeof keyPrefix !== 'string') {
      throw new TypeError('CloudflareKvTokenStore option "keyPrefix" must be a string.');
    }
    if (typeof now !== 'function') {
      throw new TypeError('CloudflareKvTokenStore option "now" must be a function.');
    }

    this.#namespace = namespace;
    this.#keyPrefix = keyPrefix;
    this.#now = now;
  }

  async get(key) {
    const value = await this.#namespace.get(this.#storageKey(key), 'json');
    if (value === null || value === undefined) return null;

    return normalizeTokenRecord(value);
  }

  async set(key, token) {
    const record = normalizeTokenRecord(token);
    const nowSeconds = Math.floor(this.#now() / 1000);
    const expiration = Math.floor(record.expiresAt / 1000);

    // Workers KV requires expiration to be at least 60 seconds in the future.
    // Very short-lived tokens still work from AuthManager's in-memory copy; we
    // simply avoid a KV write that the platform would reject.
    if (expiration < nowSeconds + MINIMUM_KV_EXPIRATION_SECONDS) return;

    await this.#namespace.put(this.#storageKey(key), JSON.stringify(record), { expiration });
  }

  #storageKey(key) {
    return `${this.#keyPrefix}${key}`;
  }
}
