import { normalizeTokenRecord } from './token-record.js';

/**
 * Process-local token storage.
 *
 * This is the SDK default. It is useful for long-running Node processes and
 * warm serverless runtimes, but it does not coordinate separate processes,
 * Lambda execution environments, or Cloudflare Worker isolates.
 */
export class MemoryTokenStore {
  #tokens = new Map();
  #now;

  /**
   * @param {object} [options]
   * @param {() => number} [options.now=Date.now] Injectable clock for testing.
   */
  constructor({ now = Date.now } = {}) {
    if (typeof now !== 'function') {
      throw new TypeError('MemoryTokenStore option "now" must be a function.');
    }
    this.#now = now;
  }

  async get(key) {
    const value = this.#tokens.get(key);
    if (!value) return null;

    if (value.expiresAt <= this.#now()) {
      this.#tokens.delete(key);
      return null;
    }

    return { ...value };
  }

  async set(key, token) {
    this.#tokens.set(key, normalizeTokenRecord(token));
  }

  /**
   * Deletes a token only when it is still the token rejected by QBench.
   * This prevents a delayed 401 response from deleting a newer token.
   */
  async deleteIfMatch(key, rejectedAccessToken) {
    const current = this.#tokens.get(key);
    if (!current || current.accessToken !== rejectedAccessToken) return false;

    this.#tokens.delete(key);
    return true;
  }

  async clear() {
    this.#tokens.clear();
  }
}

// Reuse tokens across QBenchClient instances in the same JavaScript process.
export const sharedMemoryTokenStore = new MemoryTokenStore();
