// File: src/tags/batch.js
import { BaseHandler } from './baseHandler.js';

export class BatchHandler extends BaseHandler {
  /**
   * Retrieves a list of batches.
   * Corresponds to `GET /qbench/api/v2/batches`
   * @param {object} [params] Query parameters for filtering/pagination (e.g., { page_num, page_size, assay_ids, sample_ids }) using API's casing.
   * @returns {Promise<object>} List response object (structure defined by QBench API).
   */
  async listBatches(params) {
    return this._requestHandler.request('GET', '/qbench/api/v2/batches', params);
  }

  /**
   * Retrieves a single batch by its ID.
   * Corresponds to `GET /qbench/api/v2/batches/{batch_id}`
   * @param {number} batch_id The ID of the batch.
   * @returns {Promise<object>} The batch object (structure defined by QBench API).
   */
  async getBatchById(batch_id) {
    if (!batch_id) {
      throw new Error('Batch ID is required.');
    }
    return this._requestHandler.request('GET', `/qbench/api/v2/batches/${batch_id}`);
  }

  /**
   * Retrieves a paginated list of Attachments associated with a specific Batch.
   * Corresponds to `GET /qbench/api/v2/batches/{batch_id}/attachments`
   * @param {number} batch_id The ID of the batch.
   * @param {object} [params] Query parameters for pagination (e.g., { page_num, page_size }) using API's casing.
   * @returns {Promise<object>} List response object containing attachments (structure defined by QBench API).
   */
  async listAttachmentsForBatch(batch_id, params) {
    if (!batch_id) {
      throw new Error('Batch ID is required.');
    }
    return this._requestHandler.request(
      'GET',
      `/qbench/api/v2/batches/${batch_id}/attachments`,
      params
    );
  }

  /**
   * Retrieves a paginated list of child Batches for a specific Batch.
   * Corresponds to `GET /qbench/api/v2/batches/{batch_id}/children`
   * @param {number} batch_id The ID of the parent batch.
   * @param {object} [params] Query parameters for filtering/pagination (e.g., { page_num, page_size }) using API's casing.
   * @returns {Promise<object>} List response object containing child batches (structure defined by QBench API).
   */
  async listChildBatches(batch_id, params) {
    if (!batch_id) {
      throw new Error('Batch ID is required.');
    }
    return this._requestHandler.request(
      'GET',
      `/qbench/api/v2/batches/${batch_id}/children`,
      params
    );
  }

  /**
   * Retrieves a paginated list of parent Batches for a specific Batch.
   * Corresponds to `GET /qbench/api/v2/batches/{batch_id}/parents`
   * @param {number} batch_id The ID of the child batch.
   * @param {object} [params] Query parameters for filtering/pagination (e.g., { page_num, page_size }) using API's casing.
   * @returns {Promise<object>} List response object containing parent batches (structure defined by QBench API).
   */
  async listParentBatches(batch_id, params) {
    if (!batch_id) {
      throw new Error('Batch ID is required.');
    }
    return this._requestHandler.request(
      'GET',
      `/qbench/api/v2/batches/${batch_id}/parents`,
      params
    );
  }

  /**
   * Retrieves a paginated list of Samples associated with a specific Batch.
   * Corresponds to `GET /qbench/api/v2/batches/{batch_id}/samples`
   * @param {number} batch_id The ID of the batch.
   * @param {object} [params] Query parameters for filtering/pagination (e.g., { page_num, page_size, received }) using API's casing.
   * @returns {Promise<object>} List response object containing samples (structure defined by QBench API).
   */
  async listSamplesForBatch(batch_id, params) {
    if (!batch_id) {
      throw new Error('Batch ID is required.');
    }
    return this._requestHandler.request(
      'GET',
      `/qbench/api/v2/batches/${batch_id}/samples`,
      params
    );
  }

  /**
   * Retrieves a paginated list of Tests associated with a specific Batch.
   * Corresponds to `GET /qbench/api/v2/batches/{batch_id}/tests`
   * @param {number} batch_id The ID of the batch.
   * @param {object} [params] Query parameters for filtering/pagination (e.g., { page_num, page_size, statuses }) using API's casing.
   * @returns {Promise<object>} List response object containing tests (structure defined by QBench API).
   */
  async listTestsForBatch(batch_id, params) {
    if (!batch_id) {
      throw new Error('Batch ID is required.');
    }
    return this._requestHandler.request('GET', `/qbench/api/v2/batches/${batch_id}/tests`, params);
  }

  /**
   * Retrieves worksheet data associated with a specific Batch.
   * Corresponds to `GET /qbench/api/v2/batches/{batch_id}/worksheet/data`
   * @param {number} batch_id The ID of the batch.
   * @param {object} [params] Query parameters (e.g., { raw_worksheet_data, worksheet_config }) using API's casing.
   * @returns {Promise<object>} The worksheet data object (structure defined by QBench API).
   */
  async getBatchWorksheetData(batch_id, params) {
    if (!batch_id) {
      throw new Error('Batch ID is required.');
    }
    return this._requestHandler.request(
      'GET',
      `/qbench/api/v2/batches/${batch_id}/worksheet/data`,
      params
    );
  }
}

// --- End of File: src/tags/batch.js ---
