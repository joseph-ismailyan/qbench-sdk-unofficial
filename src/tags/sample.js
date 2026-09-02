// File: src/tags/sample.js
import { BaseHandler } from './baseHandler.js';

export class SampleHandler extends BaseHandler {
  /**
   * Retrieves a list of samples.
   * Corresponds to `GET /qbench/api/v2/samples`
   * @param {object} [params] Query parameters for filtering/pagination (e.g., { page_num, page_size, order_ids, customer_ids, received }) using API's casing.
   * @returns {Promise<object>} List response object (structure defined by QBench API).
   */
  async listSamples(params) {
    return this._requestHandler.request('GET', '/qbench/api/v2/samples', params);
  }

  /**
   * Creates a list of new samples.
   * Corresponds to `POST /qbench/api/v2/samples`
   * @param {Array<object>} samplesData An array of sample objects to create (structure defined by CreateSampleSchema). Use API's casing for keys (e.g., description, sample_type, order_id).
   * @returns {Promise<object>} Response object containing created samples (structure defined by QBench API).
   */
  async createSamples(samplesData) {
    if (!Array.isArray(samplesData) || samplesData.length === 0) {
      throw new Error('samplesData must be a non-empty array.');
    }
    return this._requestHandler.request('POST', '/qbench/api/v2/samples', null, samplesData);
  }

  /**
   * Updates a list of existing samples.
   * Corresponds to `PATCH /qbench/api/v2/samples`
   * @param {Array<object>} samplesUpdates An array of sample update objects (must include 'id', structure defined by UpdateSampleSchema). Use API's casing for keys.
   * @returns {Promise<object>} Response object containing updated samples (structure defined by QBench API).
   */
  async updateSamples(samplesUpdates) {
    if (!Array.isArray(samplesUpdates) || samplesUpdates.length === 0) {
      throw new Error('samplesUpdates must be a non-empty array.');
    }
    if (
      !samplesUpdates.every((item) => item && typeof item === 'object' && item.id !== undefined)
    ) {
      throw new Error("Each item in samplesUpdates must be an object with an 'id' property.");
    }
    return this._requestHandler.request('PATCH', '/qbench/api/v2/samples', null, samplesUpdates);
  }

  /**
   * Retrieves a single sample by its ID.
   * Corresponds to `GET /qbench/api/v2/samples/{sample_id}`
   * @param {number} sample_id The ID of the sample.
   * @returns {Promise<object>} The sample object (structure defined by QBench API).
   */
  async getSampleById(sample_id) {
    if (!sample_id) {
      throw new Error('Sample ID is required.');
    }
    return this._requestHandler.request('GET', `/qbench/api/v2/samples/${sample_id}`);
  }

  /**
   * Deletes a single sample by its ID.
   * Corresponds to `DELETE /qbench/api/v2/samples/{sample_id}`
   * @param {number} sample_id The ID of the sample to delete.
   * @returns {Promise<null>} Resolves with null on success (204 No Content).
   */
  async deleteSample(sample_id) {
    if (!sample_id) {
      throw new Error('Sample ID is required.');
    }
    return this._requestHandler.request('DELETE', `/qbench/api/v2/samples/${sample_id}`);
  }

  /**
   * Retrieves a paginated list of Attachments associated with a specific Sample.
   * Corresponds to `GET /qbench/api/v2/samples/{sample_id}/attachments`
   * @param {number} sample_id The ID of the sample.
   * @param {object} [params] Query parameters for pagination (e.g., { page_num, page_size }) using API's casing.
   * @returns {Promise<object>} List response object containing attachments (structure defined by QBench API).
   */
  async listAttachmentsForSample(sample_id, params) {
    if (!sample_id) {
      throw new Error('Sample ID is required.');
    }
    return this._requestHandler.request(
      'GET',
      `/qbench/api/v2/samples/${sample_id}/attachments`,
      params
    );
  }

  /**
   * Retrieves a paginated list of Batches associated with a specific Sample.
   * Corresponds to `GET /qbench/api/v2/samples/{sample_id}/batches`
   * @param {number} sample_id The ID of the sample.
   * @param {object} [params] Query parameters for filtering/pagination (e.g., { page_num, page_size }) using API's casing.
   * @returns {Promise<object>} List response object containing batches (structure defined by QBench API).
   */
  async listBatchesForSample(sample_id, params) {
    if (!sample_id) {
      throw new Error('Sample ID is required.');
    }
    return this._requestHandler.request(
      'GET',
      `/qbench/api/v2/samples/${sample_id}/batches`,
      params
    );
  }

  /**
   * Retrieves a paginated list of Reports associated with a specific Sample.
   * Corresponds to `GET /qbench/api/v2/samples/{sample_id}/reports`
   * @param {number} sample_id The ID of the sample.
   * @param {object} [params] Query parameters for filtering/pagination (e.g., { page_num, page_size }) using API's casing.
   * @returns {Promise<object>} List response object containing reports (structure defined by QBench API).
   */
  async listReportsForSample(sample_id, params) {
    if (!sample_id) {
      throw new Error('Sample ID is required.');
    }
    return this._requestHandler.request(
      'GET',
      `/qbench/api/v2/samples/${sample_id}/reports`,
      params
    );
  }

  /**
   * Retrieves a paginated list of sub-Samples for a specific Sample.
   * Corresponds to `GET /qbench/api/v2/samples/{sample_id}/sub-samples`
   * @param {number} sample_id The ID of the parent sample.
   * @param {object} [params] Query parameters for filtering/pagination (e.g., { page_num, page_size }) using API's casing.
   * @returns {Promise<object>} List response object containing sub-samples (structure defined by QBench API).
   */
  async listSubSamples(sample_id, params) {
    if (!sample_id) {
      throw new Error('Sample ID is required.');
    }
    return this._requestHandler.request(
      'GET',
      `/qbench/api/v2/samples/${sample_id}/sub-samples`,
      params
    );
  }

  /**
   * Retrieves a paginated list of Tests associated with a specific Sample.
   * Corresponds to `GET /qbench/api/v2/samples/{sample_id}/tests`
   * @param {number} sample_id The ID of the sample.
   * @param {object} [params] Query parameters for filtering/pagination (e.g., { page_num, page_size }) using API's casing.
   * @returns {Promise<object>} List response object containing tests (structure defined by QBench API).
   */
  async listTestsForSample(sample_id, params) {
    if (!sample_id) {
      throw new Error('Sample ID is required.');
    }
    return this._requestHandler.request('GET', `/qbench/api/v2/samples/${sample_id}/tests`, params);
  }
}

// --- End of File: src/tags/sample.js ---
