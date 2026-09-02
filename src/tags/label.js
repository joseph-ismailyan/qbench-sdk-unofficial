// File: src/tags/label.js
import { BaseHandler } from './baseHandler.js';

export class LabelHandler extends BaseHandler {
  /**
   * Generates and potentially prints labels for specified entities.
   * Corresponds to `POST /qbench/api/v2/labels/{label_id}/{data_type}`
   * @param {number} label_id The ID of the label template.
   * @param {string} data_type The type of entity to print labels for (e.g., 'orders', 'samples', 'tests', 'batches', 'projects', 'locations').
   * @param {Array<object>} entities An array of objects specifying the entities and counts (e.g., [{ id: 123, count: 1 }]). Use API's casing.
   * @returns {Promise<any>} The response from the API, potentially a file stream or job status (structure defined by QBench API, might vary).
   */
  async generateLabels(label_id, data_type, entities) {
    if (!label_id) throw new Error('Label ID is required.');
    if (!data_type) throw new Error('Data type is required.');
    if (!Array.isArray(entities) || entities.length === 0)
      throw new Error('Entities array must be non-empty.');
    if (!entities.every((e) => e && typeof e === 'object' && e.id !== undefined))
      throw new Error("Each entity must be an object with an 'id'.");

    // The response might be a file or JSON, RequestHandler attempts JSON parse.
    // If it's a file, the raw data might be returned if JSON parse fails.
    // User might need specific handling based on expected Content-Type.
    return this._requestHandler.request(
      'POST',
      `/qbench/api/v2/labels/${label_id}/${data_type}`,
      null,
      entities
    );
  }
}

// --- End of File: src/tags/label.js ---
