// File: src/tags/authentication.js
import { BaseHandler } from './baseHandler.js';

/**
 * WARNING: Authentication is typically handled internally by the QBenchClient's AuthManager.
 * These methods expose the raw authentication endpoints but should generally not be called directly
 * unless you need to bypass the internal token management.
 */
export class AuthenticationHandler extends BaseHandler {
  /**
   * Attempts to get an access token using assertion grant type.
   * Corresponds to `POST /qbench/api/v2/auth/token`
   * WARNING: Requires manual construction of multipart/form-data body, including the 'assertion'.
   * The internal AuthManager handles this; direct use is complex and discouraged.
   * @param {object} formData Object representing form data (e.g., { grant_type, assertion }). Use API's casing.
   * @returns {Promise<object>} Token response object (structure defined by QBench API).
   */
  async getAccessToken(formData) {
    // This endpoint expects multipart/form-data which is complex to handle manually here.
    // The internal AuthManager implements this. Direct usage is not recommended via this simplified handler.
    console.warn(
      'Directly calling getAccessToken is discouraged. Authentication is handled internally.'
    );
    throw new Error(
      "Direct use of getAccessToken requires manual multipart/form-data handling, which is not implemented in this simplified handler. Use the client's internal auth."
    );
    // If you *must* implement it here, you'd need logic similar to AuthManager's #performAuthentication
    // to build the multipart body manually based on the formData input.
    // return this._requestHandler.request('POST', '/qbench/api/v2/auth/token', null, formData, { contentType: 'multipart/form-data' }); // Need to signal multipart
  }

  /**
   * Refreshes an access token using a refresh token ID.
   * Corresponds to `POST /qbench/api/v2/auth/token/refresh`
   * WARNING: Requires manual construction of multipart/form-data body.
   * The internal AuthManager handles this; direct use is complex and discouraged.
   * @param {object} formData Object representing form data (e.g., { refresh_token_id }). Use API's casing.
   * @returns {Promise<object>} Token response object (structure defined by QBench API).
   */
  async refreshAccessToken(formData) {
    // This endpoint expects multipart/form-data. Direct usage discouraged.
    console.warn(
      'Directly calling refreshAccessToken is discouraged. Authentication is handled internally.'
    );
    throw new Error(
      "Direct use of refreshAccessToken requires manual multipart/form-data handling, which is not implemented in this simplified handler. Use the client's internal auth."
    );
    // Similar to getAccessToken, requires manual multipart construction.
    // return this._requestHandler.request('POST', '/qbench/api/v2/auth/token/refresh', null, formData, { contentType: 'multipart/form-data' });
  }

  /**
   * Gets information about the current token.
   * Corresponds to `GET /qbench/api/v2/auth/token/info`
   * @returns {Promise<object>} Token info object (structure defined by QBench API).
   */
  async getTokenInfo() {
    // This uses the currently active token managed by RequestHandler
    return this._requestHandler.request('GET', '/qbench/api/v2/auth/token/info');
  }
}

// --- End of File: src/tags/authentication.js ---
