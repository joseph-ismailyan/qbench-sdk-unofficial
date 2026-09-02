// File: src/tags/accessioningType.js
import { BaseHandler } from './baseHandler.js';

export class AccessioningTypeHandler extends BaseHandler {
  /**
   * Retrieves a list of accessioning types.
   * Corresponds to `GET /qbench/api/v2/accessioning-types`
   * @param {object} [params] Query parameters (e.g., { page_num, page_size }) using API's casing.
   * @returns {Promise<object>} List response object (structure defined by QBench API).
   */
  async listAccessioningTypes(params) {
    return this._requestHandler.request('GET', '/qbench/api/v2/accessioning-types', params);
  }

  /**
   * Retrieves a single accessioning type by its ID.
   * Corresponds to `GET /qbench/api/v2/accessioning-types/{accessioning_type_id}`
   * @param {number} accessioning_type_id The ID of the accessioning type.
   * @returns {Promise<object>} The accessioning type object (structure defined by QBench API).
   */
  async getAccessioningTypeById(accessioning_type_id) {
    if (!accessioning_type_id) {
      throw new Error('Accessioning Type ID is required.');
    }
    return this._requestHandler.request(
      'GET',
      `/qbench/api/v2/accessioning-types/${accessioning_type_id}`
    );
  }
}

// --- End of File: src/tags/accessioningType.js ---
