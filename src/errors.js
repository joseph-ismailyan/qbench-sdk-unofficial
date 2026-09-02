// File: src/errors.js
/**
 * Base error class for all SDK-specific errors.
 */
export class QBenchSdkError extends Error {
  constructor(message) {
    super(message);
    this.name = 'QBenchSdkError';
  }
}

/**
 * Error class for issues during authentication or token refresh.
 */
export class QBenchAuthError extends QBenchSdkError {
  constructor(message) {
    super(message);
    this.name = 'QBenchAuthError';
  }
}

/**
 * Error class for API errors returned by QBench (4xx, 5xx).
 */
export class QBenchApiError extends QBenchSdkError {
  /**
   * @param {string} message The error message.
   * @param {number} status The HTTP status code.
   * @param {object} [responseBody] A redacted API response body unless sensitive details were enabled.
   * @param {object} [responseHeaders] Redacted response headers unless sensitive details were enabled.
   * @param {object} [requestDetails] Redacted details about the original request.
   */
  constructor(message, status, responseBody = null, responseHeaders = null, requestDetails = null) {
    super(message);
    this.name = 'QBenchApiError';
    this.status = status;
    this.responseBody = responseBody;
    this.responseHeaders = responseHeaders;
    this.requestDetails = requestDetails;

    // Extract QBench specific error details if available
    if (responseBody && typeof responseBody === 'object') {
      this.errorType = responseBody.error_type;
      this.errorDescription = responseBody.error_description;
      this.errorToken = responseBody.error_token;
      this.errors = responseBody.errors;
    }
  }
}

/**
 * Error class specifically for rate limit errors (429) after retries.
 */
export class QBenchRateLimitError extends QBenchApiError {
  constructor(message, status, responseBody = null, responseHeaders = null, requestDetails = null) {
    super(message, status, responseBody, responseHeaders, requestDetails);
    this.name = 'QBenchRateLimitError';
  }
}

/**
 * Error class for validation errors (typically 400 Bad Request).
 */
export class QBenchValidationError extends QBenchApiError {
  constructor(message, status, responseBody = null, responseHeaders = null, requestDetails = null) {
    super(message, status, responseBody, responseHeaders, requestDetails);
    this.name = 'QBenchValidationError';
  }
}

/**
 * Error class for Forbidden errors (typically 403).
 */
export class QBenchForbiddenError extends QBenchApiError {
  constructor(message, status, responseBody = null, responseHeaders = null, requestDetails = null) {
    super(message, status, responseBody, responseHeaders, requestDetails);
    this.name = 'QBenchForbiddenError';
  }
}

/**
 * Error class for Not Found errors (typically 404).
 */
export class QBenchNotFoundError extends QBenchApiError {
  constructor(message, status, responseBody = null, responseHeaders = null, requestDetails = null) {
    super(message, status, responseBody, responseHeaders, requestDetails);
    this.name = 'QBenchNotFoundError';
  }
}

// --- Utility function to create specific error instances ---
export function createApiError(status, responseBody, responseHeaders, options = {}) {
  const includeSensitiveDetails = options.includeSensitiveDetails === true;
  const exposedBody = includeSensitiveDetails ? responseBody : redactResponseBody(responseBody);
  const exposedHeaders = includeSensitiveDetails
    ? responseHeaders
    : redactResponseHeaders(responseHeaders);
  const detailedMessage =
    includeSensitiveDetails && responseBody && typeof responseBody === 'object'
      ? responseBody.error_description || responseBody.error || responseBody.message
      : null;
  const message = detailedMessage || `QBench API request failed with status ${status}.`;

  switch (status) {
    case 400:
      return new QBenchValidationError(
        message,
        status,
        exposedBody,
        exposedHeaders,
        options.requestDetails
      );
    case 403:
      return new QBenchForbiddenError(
        message,
        status,
        exposedBody,
        exposedHeaders,
        options.requestDetails
      );
    case 404:
      return new QBenchNotFoundError(
        message,
        status,
        exposedBody,
        exposedHeaders,
        options.requestDetails
      );
    case 429:
      // This specific instance is created if retries fail
      return new QBenchRateLimitError(
        message,
        status,
        exposedBody,
        exposedHeaders,
        options.requestDetails
      );
    // Add other specific status codes if needed (e.g., 401 for Unauthorized if not handled by auth refresh)
    default:
      // Generic API error for other 4xx/5xx
      return new QBenchApiError(
        message,
        status,
        exposedBody,
        exposedHeaders,
        options.requestDetails
      );
  }
}

function redactResponseBody(responseBody) {
  if (!responseBody || typeof responseBody !== 'object' || Array.isArray(responseBody)) {
    return null;
  }

  const safeBody = {};
  for (const key of ['error_type', 'qb_error_code', 'error_code', 'code']) {
    const value = responseBody[key];
    if (typeof value === 'string' || typeof value === 'number') safeBody[key] = value;
  }
  return Object.keys(safeBody).length > 0 ? safeBody : null;
}

function redactResponseHeaders(responseHeaders) {
  if (!responseHeaders || typeof responseHeaders !== 'object') return null;

  const safeHeaders = {};
  for (const key of ['x-qbapi-throttle-ttl', 'retry-after', 'x-request-id']) {
    if (responseHeaders[key] !== undefined) safeHeaders[key] = responseHeaders[key];
  }
  return Object.keys(safeHeaders).length > 0 ? safeHeaders : null;
}

// --- End of File: src/errors.js ---
