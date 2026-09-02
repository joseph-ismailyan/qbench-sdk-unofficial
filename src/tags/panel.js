// File: src/tags/panel.js
import { BaseHandler } from './baseHandler.js';

export class PanelHandler extends BaseHandler {
  /**
   * Retrieves a list of panels.
   * Corresponds to `GET /qbench/api/v2/panels`
   * @param {object} [params] Query parameters for filtering/pagination (e.g., { page_num, page_size, title_keyword }) using API's casing.
   * @returns {Promise<object>} List response object (structure defined by QBench API).
   */
  async listPanels(params) {
    return this._requestHandler.request('GET', '/qbench/api/v2/panels', params);
  }

  /**
   * Creates a list of new panels.
   * Corresponds to `POST /qbench/api/v2/panels`
   * @param {Array<object>} panelsData An array of panel objects to create (structure defined by CreatePanelSchema). Use API's casing for keys (e.g., title).
   * @returns {Promise<object>} Response object containing created panels (structure defined by QBench API).
   */
  async createPanels(panelsData) {
    if (!Array.isArray(panelsData) || panelsData.length === 0) {
      throw new Error('panelsData must be a non-empty array.');
    }
    return this._requestHandler.request('POST', '/qbench/api/v2/panels', null, panelsData);
  }

  /**
   * Updates a list of existing panels.
   * Corresponds to `PATCH /qbench/api/v2/panels`
   * @param {Array<object>} panelsUpdates An array of panel update objects (must include 'id', structure defined by UpdatePanelSchema). Use API's casing for keys.
   * @returns {Promise<object>} Response object containing updated panels (structure defined by QBench API).
   */
  async updatePanels(panelsUpdates) {
    if (!Array.isArray(panelsUpdates) || panelsUpdates.length === 0) {
      throw new Error('panelsUpdates must be a non-empty array.');
    }
    if (!panelsUpdates.every((item) => item && typeof item === 'object' && item.id !== undefined)) {
      throw new Error("Each item in panelsUpdates must be an object with an 'id' property.");
    }
    return this._requestHandler.request('PATCH', '/qbench/api/v2/panels', null, panelsUpdates);
  }

  /**
   * Retrieves a single panel by its ID.
   * Corresponds to `GET /qbench/api/v2/panels/{panel_id}`
   * @param {number} panel_id The ID of the panel.
   * @returns {Promise<object>} The panel object (structure defined by QBench API).
   */
  async getPanelById(panel_id) {
    if (!panel_id) {
      throw new Error('Panel ID is required.');
    }
    return this._requestHandler.request('GET', `/qbench/api/v2/panels/${panel_id}`);
  }

  /**
   * Deletes a single panel by its ID.
   * Corresponds to `DELETE /qbench/api/v2/panels/{panel_id}`
   * @param {number} panel_id The ID of the panel to delete.
   * @returns {Promise<null>} Resolves with null on success (204 No Content).
   */
  async deletePanel(panel_id) {
    if (!panel_id) {
      throw new Error('Panel ID is required.');
    }
    return this._requestHandler.request('DELETE', `/qbench/api/v2/panels/${panel_id}`);
  }

  /**
   * Retrieves a paginated list of Assays associated with a specific Panel.
   * Corresponds to `GET /qbench/api/v2/panels/{panel_id}/assays`
   * @param {number} panel_id The ID of the panel.
   * @param {object} [params] Query parameters for filtering/pagination (e.g., { page_num, page_size, active }) using API's casing.
   * @returns {Promise<object>} List response object containing assays (structure defined by QBench API).
   */
  async listAssaysForPanel(panel_id, params) {
    if (!panel_id) {
      throw new Error('Panel ID is required.');
    }
    return this._requestHandler.request('GET', `/qbench/api/v2/panels/${panel_id}/assays`, params);
  }
}

// --- End of File: src/tags/panel.js ---
