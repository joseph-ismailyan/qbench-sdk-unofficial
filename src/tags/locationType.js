// File: src/tags/locationType.js
import { BaseHandler } from './baseHandler.js';

export class LocationTypeHandler extends BaseHandler {
  /**
   * Retrieves a list of location types.
   * Corresponds to `GET /qbench/api/v2/location-types`
   * @param {object} [params] Query parameters (e.g., { page_num, page_size }) using API's casing.
   * @returns {Promise<object>} List response object (structure defined by QBench API).
   */
  async listLocationTypes(params) {
    return this._requestHandler.request('GET', '/qbench/api/v2/location-types', params);
  }

  /**
   * Retrieves a single location type by its ID.
   * Corresponds to `GET /qbench/api/v2/location-types/{location_type_id}`
   * @param {number} location_type_id The ID of the location type.
   * @returns {Promise<object>} The location type object (structure defined by QBench API).
   */
  async getLocationTypeById(location_type_id) {
    if (!location_type_id) {
      throw new Error('Location Type ID is required.');
    }
    return this._requestHandler.request('GET', `/qbench/api/v2/location-types/${location_type_id}`);
  }
}

// --- End of File: src/tags/locationType.js ---
