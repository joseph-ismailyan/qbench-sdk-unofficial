// File: src/tags/location.js
import { BaseHandler } from './baseHandler.js';

export class LocationHandler extends BaseHandler {
  /**
   * Retrieves a list of locations.
   * Corresponds to `GET /qbench/api/v2/locations`
   * @param {object} [params] Query parameters (e.g., { page_num, page_size }) using API's casing.
   * @returns {Promise<object>} List response object (structure defined by QBench API).
   */
  async listLocations(params) {
    return this._requestHandler.request('GET', '/qbench/api/v2/locations', params);
  }

  /**
   * Retrieves a single location by its ID.
   * Corresponds to `GET /qbench/api/v2/locations/{location_id}`
   * @param {number} location_id The ID of the location.
   * @returns {Promise<object>} The location object (structure defined by QBench API).
   */
  async getLocationById(location_id) {
    if (!location_id) {
      throw new Error('Location ID is required.');
    }
    return this._requestHandler.request('GET', `/qbench/api/v2/locations/${location_id}`);
  }
}

// --- End of File: src/tags/location.js ---
