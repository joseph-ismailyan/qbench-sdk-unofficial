// File: src/tags/turnaround.js
import { BaseHandler } from './baseHandler.js';

export class TurnaroundHandler extends BaseHandler {
  /**
   * Retrieves a list of turnarounds.
   * Corresponds to `GET /qbench/api/v2/turnarounds`
   * @param {object} [params] Query parameters (e.g., { page_num, page_size }) using API's casing.
   * @returns {Promise<object>} List response object (structure defined by QBench API).
   */
  async listTurnarounds(params) {
    return this._requestHandler.request('GET', '/qbench/api/v2/turnarounds', params);
  }

  /**
   * Creates a list of new turnarounds.
   * Corresponds to `POST /qbench/api/v2/turnarounds`
   * @param {Array<object>} turnaroundsData An array of turnaround objects to create (structure defined by CreateTurnaroundSchema). Use API's casing for keys (e.g., name, default_duration).
   * @returns {Promise<object>} Response object containing created turnarounds (structure defined by QBench API).
   */
  async createTurnarounds(turnaroundsData) {
    if (!Array.isArray(turnaroundsData) || turnaroundsData.length === 0) {
      throw new Error('turnaroundsData must be a non-empty array.');
    }
    return this._requestHandler.request(
      'POST',
      '/qbench/api/v2/turnarounds',
      null,
      turnaroundsData
    );
  }

  /**
   * Updates a list of existing turnarounds.
   * Corresponds to `PATCH /qbench/api/v2/turnarounds`
   * @param {Array<object>} turnaroundsUpdates An array of turnaround update objects (must include 'id', structure defined by UpdateTurnaroundSchema). Use API's casing for keys.
   * @returns {Promise<object>} Response object containing updated turnarounds (structure defined by QBench API).
   */
  async updateTurnarounds(turnaroundsUpdates) {
    if (!Array.isArray(turnaroundsUpdates) || turnaroundsUpdates.length === 0) {
      throw new Error('turnaroundsUpdates must be a non-empty array.');
    }
    if (
      !turnaroundsUpdates.every((item) => item && typeof item === 'object' && item.id !== undefined)
    ) {
      throw new Error("Each item in turnaroundsUpdates must be an object with an 'id' property.");
    }
    return this._requestHandler.request(
      'PATCH',
      '/qbench/api/v2/turnarounds',
      null,
      turnaroundsUpdates
    );
  }

  /**
   * Retrieves a single turnaround by its ID.
   * Corresponds to `GET /qbench/api/v2/turnarounds/{turnaround_id}`
   * @param {number} turnaround_id The ID of the turnaround.
   * @returns {Promise<object>} The turnaround object (structure defined by QBench API).
   */
  async getTurnaroundById(turnaround_id) {
    if (!turnaround_id) {
      throw new Error('Turnaround ID is required.');
    }
    return this._requestHandler.request('GET', `/qbench/api/v2/turnarounds/${turnaround_id}`);
  }

  /**
   * Deletes a single turnaround by its ID.
   * Corresponds to `DELETE /qbench/api/v2/turnarounds/{turnaround_id}`
   * @param {number} turnaround_id The ID of the turnaround to delete.
   * @returns {Promise<null>} Resolves with null on success (204 No Content).
   */
  async deleteTurnaround(turnaround_id) {
    if (!turnaround_id) {
      throw new Error('Turnaround ID is required.');
    }
    return this._requestHandler.request('DELETE', `/qbench/api/v2/turnarounds/${turnaround_id}`);
  }

  /**
   * Retrieves a paginated list of Divisions associated with a specific Turnaround.
   * Corresponds to `GET /qbench/api/v2/turnarounds/{turnaround_id}/divisions`
   * @param {number} turnaround_id The ID of the turnaround.
   * @param {object} [params] Query parameters for pagination (e.g., { page_num, page_size }) using API's casing.
   * @returns {Promise<object>} List response object containing divisions (structure defined by QBench API).
   */
  async listDivisionsForTurnaround(turnaround_id, params) {
    if (!turnaround_id) {
      throw new Error('Turnaround ID is required.');
    }
    return this._requestHandler.request(
      'GET',
      `/qbench/api/v2/turnarounds/${turnaround_id}/divisions`,
      params
    );
  }
}

// --- End of File: src/tags/turnaround.js ---
