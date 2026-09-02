// File: src/tags/epic.js
import { BaseHandler } from './baseHandler.js';

export class EpicHandler extends BaseHandler {
  /**
   * Retrieves a list of epics.
   * Corresponds to `GET /qbench/api/v2/epics`
   * @param {object} [params] Query parameters (e.g., { page_num, page_size }) using API's casing.
   * @returns {Promise<object>} List response object (structure defined by QBench API).
   */
  async listEpics(params) {
    return this._requestHandler.request('GET', '/qbench/api/v2/epics', params);
  }

  /**
   * Retrieves a single epic by its ID.
   * Corresponds to `GET /qbench/api/v2/epics/{epic_id}`
   * @param {number} epic_id The ID of the epic.
   * @returns {Promise<object>} The epic object (structure defined by QBench API).
   */
  async getEpicById(epic_id) {
    if (!epic_id) {
      throw new Error('Epic ID is required.');
    }
    return this._requestHandler.request('GET', `/qbench/api/v2/epics/${epic_id}`);
  }
}

// --- End of File: src/tags/epic.js ---
