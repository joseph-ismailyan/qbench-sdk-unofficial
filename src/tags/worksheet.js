// File: src/tags/worksheet.js
import { BaseHandler } from './baseHandler.js';

export class WorksheetHandler extends BaseHandler {
  /**
   * Retrieves a list of worksheets (templates).
   * Corresponds to `GET /qbench/api/v2/worksheets`
   * @param {object} [params] Query parameters (e.g., { page_num, page_size }) using API's casing.
   * @returns {Promise<object>} List response object (structure defined by QBench API).
   */
  async listWorksheets(params) {
    return this._requestHandler.request('GET', '/qbench/api/v2/worksheets', params);
  }

  /**
   * Retrieves a single worksheet (template) by its ID.
   * Corresponds to `GET /qbench/api/v2/worksheets/{worksheet_id}`
   * @param {number} worksheet_id The ID of the worksheet template.
   * @returns {Promise<object>} The worksheet object (structure defined by QBench API).
   */
  async getWorksheetById(worksheet_id) {
    if (!worksheet_id) {
      throw new Error('Worksheet ID is required.');
    }
    return this._requestHandler.request('GET', `/qbench/api/v2/worksheets/${worksheet_id}`);
  }

  // Note: Endpoints for getting specific BATCH or TEST worksheet data are under the respective BatchHandler and TestHandler.
  // This handler is for the worksheet *templates*.
}

// --- End of File: src/tags/worksheet.js ---
