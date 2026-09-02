// File: src/tags/apiClient.js
import { BaseHandler } from './baseHandler.js';

export class ApiClientHandler extends BaseHandler {
  /**
   * Retrieves a list of API clients.
   * Corresponds to `GET /qbench/api/v2/api-clients`
   * @param {object} [params] Query parameters (e.g., { page_num, page_size }) using API's casing.
   * @returns {Promise<object>} List response object (structure defined by QBench API).
   */
  async listApiClients(params) {
    return this._requestHandler.request('GET', '/qbench/api/v2/api-clients', params);
  }

  /**
   * Retrieves a single API client by its ID.
   * Corresponds to `GET /qbench/api/v2/api-clients/{api_client_id}`
   * @param {string} api_client_id The ID of the API client.
   * @returns {Promise<object>} The API client object (structure defined by QBench API).
   */
  async getApiClientById(api_client_id) {
    if (!api_client_id) {
      throw new Error('API Client ID is required.');
    }
    return this._requestHandler.request('GET', `/qbench/api/v2/api-clients/${api_client_id}`);
  }

  /**
   * Retrieves a paginated list of Customers associated with a specific API Client.
   * Corresponds to `GET /qbench/api/v2/api-clients/{api_client_id}/customers`
   * @param {string} api_client_id The ID of the API client.
   * @param {object} [params] Query parameters for filtering/pagination (e.g., { page_num, page_size, name_keyword }) using API's casing.
   * @returns {Promise<object>} List response object containing customers (structure defined by QBench API).
   */
  async listCustomersForApiClient(api_client_id, params) {
    if (!api_client_id) {
      throw new Error('API Client ID is required.');
    }
    return this._requestHandler.request(
      'GET',
      `/qbench/api/v2/api-clients/${api_client_id}/customers`,
      params
    );
  }
}

// --- End of File: src/tags/apiClient.js ---
