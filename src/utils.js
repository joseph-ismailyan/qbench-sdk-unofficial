// File: src/utils.js
import { QBenchValidationError } from './errors.js';

const MIN_PAGE_SIZE = 1;
const MAX_PAGE_SIZE = 50;

/**
 * Simple promise-based delay.
 * @param {number} ms Milliseconds to delay.
 * @returns {Promise<void>}
 */
export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Builds a query string from an object.
 * Keys are used directly (no case conversion).
 * Excludes undefined or null values.
 * @param {object} params The parameters object (keys should match API expected case, e.g., snake_case).
 * @returns {string} The query string (including leading '?') or empty string.
 */
export function buildQueryString(params) {
  if (!params || typeof params !== 'object') return '';
  validatePageSize(params.page_size);
  const query = Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null) // Filter out null/undefined
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        // Handle array query parameters (repeat the key for each value)
        return value
          .filter((v) => v !== undefined && v !== null) // Ensure array values are valid
          .map((v) => `${encodeURIComponent(key)}=${encodeURIComponent(v)}`)
          .join('&');
      }
      // Handle non-array values
      return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
    })
    .filter((part) => part !== '') // Remove empty parts from arrays
    .join('&');
  return query ? `?${query}` : '';
}

function validatePageSize(pageSize) {
  if (pageSize === undefined || pageSize === null) return;

  const normalizedPageSize =
    typeof pageSize === 'string' && pageSize.trim() !== '' ? Number(pageSize) : pageSize;

  if (
    !Number.isInteger(normalizedPageSize) ||
    normalizedPageSize < MIN_PAGE_SIZE ||
    normalizedPageSize > MAX_PAGE_SIZE
  ) {
    throw new QBenchValidationError(
      `page_size must be an integer between ${MIN_PAGE_SIZE} and ${MAX_PAGE_SIZE}.`,
      400
    );
  }
}

// --- End of File: src/utils.js ---
