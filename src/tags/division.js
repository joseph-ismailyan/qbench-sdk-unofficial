// File: src/tags/division.js
import { BaseHandler } from './baseHandler.js';

export class DivisionHandler extends BaseHandler {
  /**
   * Retrieves a list of divisions.
   * Corresponds to `GET /qbench/api/v2/divisions`
   * @param {object} [params] Query parameters (e.g., { page_num, page_size }) using API's casing.
   * @returns {Promise<object>} List response object (structure defined by QBench API).
   */
  async listDivisions(params) {
    return this._requestHandler.request('GET', '/qbench/api/v2/divisions', params);
  }

  /**
   * Retrieves a single division by its ID.
   * Corresponds to `GET /qbench/api/v2/divisions/{division_id}`
   * @param {number} division_id The ID of the division.
   * @returns {Promise<object>} The division object (structure defined by QBench API).
   */
  async getDivisionById(division_id) {
    if (!division_id) {
      throw new Error('Division ID is required.');
    }
    return this._requestHandler.request('GET', `/qbench/api/v2/divisions/${division_id}`);
  }
}

// --- End of File: src/tags/division.js ---
