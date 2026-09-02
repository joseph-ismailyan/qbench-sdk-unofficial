// File: src/tags/source.js
import { BaseHandler } from './baseHandler.js';

export class SourceHandler extends BaseHandler {
  /**
   * Retrieves a list of sources.
   * Corresponds to `GET /qbench/api/v2/sources`
   * @param {object} [params] Query parameters (e.g., { page_num, page_size }) using API's casing. Note: Spec lacks specific filters here.
   * @returns {Promise<object>} List response object (structure defined by QBench API).
   */
  async listSources(params) {
    return this._requestHandler.request('GET', '/qbench/api/v2/sources', params);
  }

  /**
   * Retrieves a single source by its ID.
   * Corresponds to `GET /qbench/api/v2/sources/{source_id}`
   * @param {number} source_id The ID of the source.
   * @returns {Promise<object>} The source object (structure defined by QBench API).
   */
  async getSourceById(source_id) {
    if (!source_id) {
      throw new Error('Source ID is required.');
    }
    return this._requestHandler.request('GET', `/qbench/api/v2/sources/${source_id}`);
  }
}

// --- End of File: src/tags/source.js ---
