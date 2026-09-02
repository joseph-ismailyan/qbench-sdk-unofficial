// File: src/tags/assay.js
import { BaseHandler } from './baseHandler.js';

export class AssayHandler extends BaseHandler {
  /**
   * Retrieves a list of assays.
   * Corresponds to `GET /qbench/api/v2/assays`
   * @param {object} [params] Query parameters for filtering/pagination (e.g., { page_num, page_size, title_keyword, active }) using API's casing.
   * @returns {Promise<object>} List response object (structure defined by QBench API).
   */
  async listAssays(params) {
    return this._requestHandler.request('GET', '/qbench/api/v2/assays', params);
  }

  /**
   * Creates a list of new assays.
   * Corresponds to `POST /qbench/api/v2/assays`
   * @param {Array<object>} assaysData An array of assay objects to create (structure defined by CreateAssaySchema). Use API's casing for keys.
   * @returns {Promise<object>} Response object containing created assays (structure defined by QBench API).
   */
  async createAssays(assaysData) {
    if (!Array.isArray(assaysData) || assaysData.length === 0) {
      throw new Error('assaysData must be a non-empty array.');
    }
    return this._requestHandler.request('POST', '/qbench/api/v2/assays', null, assaysData);
  }

  /**
   * Updates a list of existing assays.
   * Corresponds to `PATCH /qbench/api/v2/assays`
   * @param {Array<object>} assaysUpdates An array of assay update objects (must include 'id', structure defined by UpdateAssaySchema). Use API's casing for keys.
   * @returns {Promise<object>} Response object containing updated assays (structure defined by QBench API).
   */
  async updateAssays(assaysUpdates) {
    if (!Array.isArray(assaysUpdates) || assaysUpdates.length === 0) {
      throw new Error('assaysUpdates must be a non-empty array.');
    }
    // Ensure all items have an 'id'
    if (!assaysUpdates.every((item) => item && typeof item === 'object' && item.id !== undefined)) {
      throw new Error("Each item in assaysUpdates must be an object with an 'id' property.");
    }
    return this._requestHandler.request('PATCH', '/qbench/api/v2/assays', null, assaysUpdates);
  }

  /**
   * Retrieves a single assay by its ID.
   * Corresponds to `GET /qbench/api/v2/assays/{assay_id}`
   * @param {number} assay_id The ID of the assay.
   * @returns {Promise<object>} The assay object (structure defined by QBench API).
   */
  async getAssayById(assay_id) {
    if (!assay_id) {
      throw new Error('Assay ID is required.');
    }
    return this._requestHandler.request('GET', `/qbench/api/v2/assays/${assay_id}`);
  }

  /**
   * Deletes a single assay by its ID.
   * Corresponds to `DELETE /qbench/api/v2/assays/{assay_id}`
   * @param {number} assay_id The ID of the assay to delete.
   * @returns {Promise<null>} Resolves with null on success (204 No Content).
   */
  async deleteAssay(assay_id) {
    if (!assay_id) {
      throw new Error('Assay ID is required.');
    }
    // Expecting 204 No Content on success, RequestHandler handles parsing
    return this._requestHandler.request('DELETE', `/qbench/api/v2/assays/${assay_id}`);
  }

  /**
   * Retrieves a paginated list of Accessioning Types associated with a specific Assay.
   * Corresponds to `GET /qbench/api/v2/assays/{assay_id}/accessioning-types`
   * @param {number} assay_id The ID of the assay.
   * @param {object} [params] Query parameters for pagination (e.g., { page_num, page_size }) using API's casing.
   * @returns {Promise<object>} List response object containing accessioning types (structure defined by QBench API).
   */
  async listAccessioningTypesForAssay(assay_id, params) {
    if (!assay_id) {
      throw new Error('Assay ID is required.');
    }
    return this._requestHandler.request(
      'GET',
      `/qbench/api/v2/assays/${assay_id}/accessioning-types`,
      params
    );
  }

  /**
   * Retrieves a paginated list of Attachments associated with a specific Assay.
   * Corresponds to `GET /qbench/api/v2/assays/{assay_id}/attachments`
   * @param {number} assay_id The ID of the assay.
   * @param {object} [params] Query parameters for pagination (e.g., { page_num, page_size }) using API's casing.
   * @returns {Promise<object>} List response object containing attachments (structure defined by QBench API).
   */
  async listAttachmentsForAssay(assay_id, params) {
    if (!assay_id) {
      throw new Error('Assay ID is required.');
    }
    return this._requestHandler.request(
      'GET',
      `/qbench/api/v2/assays/${assay_id}/attachments`,
      params
    );
  }

  /**
   * Retrieves a paginated list of Divisions associated with a specific Assay.
   * Corresponds to `GET /qbench/api/v2/assays/{assay_id}/divisions`
   * @param {number} assay_id The ID of the assay.
   * @param {object} [params] Query parameters for pagination (e.g., { page_num, page_size }) using API's casing.
   * @returns {Promise<object>} List response object containing divisions (structure defined by QBench API).
   */
  async listDivisionsForAssay(assay_id, params) {
    if (!assay_id) {
      throw new Error('Assay ID is required.');
    }
    return this._requestHandler.request(
      'GET',
      `/qbench/api/v2/assays/${assay_id}/divisions`,
      params
    );
  }

  /**
   * Retrieves a paginated list of Panels associated with a specific Assay.
   * Corresponds to `GET /qbench/api/v2/assays/{assay_id}/panels`
   * @param {number} assay_id The ID of the assay.
   * @param {object} [params] Query parameters for filtering/pagination (e.g., { page_num, page_size, title_keyword }) using API's casing.
   * @returns {Promise<object>} List response object containing panels (structure defined by QBench API).
   */
  async listPanelsForAssay(assay_id, params) {
    if (!assay_id) {
      throw new Error('Assay ID is required.');
    }
    return this._requestHandler.request('GET', `/qbench/api/v2/assays/${assay_id}/panels`, params);
  }

  /**
   * Retrieves a paginated list of Turnarounds associated with a specific Assay.
   * Corresponds to `GET /qbench/api/v2/assays/{assay_id}/turnarounds`
   * @param {number} assay_id The ID of the assay.
   * @param {object} [params] Query parameters for pagination (e.g., { page_num, page_size }) using API's casing.
   * @returns {Promise<object>} List response object containing turnarounds (structure defined by QBench API).
   */
  async listTurnaroundsForAssay(assay_id, params) {
    if (!assay_id) {
      throw new Error('Assay ID is required.');
    }
    return this._requestHandler.request(
      'GET',
      `/qbench/api/v2/assays/${assay_id}/turnarounds`,
      params
    );
  }
}

// --- End of File: src/tags/assay.js ---
