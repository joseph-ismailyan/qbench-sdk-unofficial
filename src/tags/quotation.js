// File: src/tags/quotation.js
import { BaseHandler } from './baseHandler.js';

export class QuotationHandler extends BaseHandler {
  /**
   * Retrieves a list of quotations.
   * Corresponds to `GET /qbench/api/v2/quotations`
   * @param {object} [params] Query parameters for filtering/pagination (e.g., { page_num, page_size, date_created_start }) using API's casing.
   * @returns {Promise<object>} List response object (structure defined by QBench API).
   */
  async listQuotations(params) {
    return this._requestHandler.request('GET', '/qbench/api/v2/quotations', params);
  }

  /**
   * Retrieves a single quotation by its ID.
   * Corresponds to `GET /qbench/api/v2/quotations/{quotation_id}`
   * @param {number} quotation_id The ID of the quotation.
   * @returns {Promise<object>} The quotation object (structure defined by QBench API).
   */
  async getQuotationById(quotation_id) {
    if (!quotation_id) {
      throw new Error('Quotation ID is required.');
    }
    return this._requestHandler.request('GET', `/qbench/api/v2/quotations/${quotation_id}`);
  }
}

// --- End of File: src/tags/quotation.js ---
