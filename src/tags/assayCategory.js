// File: src/tags/assayCategory.js
import { BaseHandler } from './baseHandler.js';

export class AssayCategoryHandler extends BaseHandler {
  /**
   * Retrieves a list of assay categories.
   * Corresponds to `GET /qbench/api/v2/assay-categories`
   * @param {object} [params] Query parameters (e.g., { page_num, page_size }) using API's casing.
   * @returns {Promise<object>} List response object (structure defined by QBench API).
   */
  async listAssayCategories(params) {
    return this._requestHandler.request('GET', '/qbench/api/v2/assay-categories', params);
  }

  /**
   * Retrieves a single assay category by its ID.
   * Corresponds to `GET /qbench/api/v2/assay-categories/{assay_category_id}`
   * @param {number} assay_category_id The ID of the assay category.
   * @returns {Promise<object>} The assay category object (structure defined by QBench API).
   */
  async getAssayCategoryById(assay_category_id) {
    if (!assay_category_id) {
      throw new Error('Assay Category ID is required.');
    }
    return this._requestHandler.request(
      'GET',
      `/qbench/api/v2/assay-categories/${assay_category_id}`
    );
  }
}

// --- End of File: src/tags/assayCategory.js ---
