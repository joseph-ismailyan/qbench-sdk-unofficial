// File: src/tags/printdoc.js
import { BaseHandler } from './baseHandler.js';

export class PrintDocHandler extends BaseHandler {
  /**
   * Creates a list of new print documents (e.g., CoCs, Labels based on config).
   * Corresponds to `POST /qbench/api/v2/printdocs`
   * @param {Array<object>} printDocsData An array of print document request objects (structure defined by CreatePrintDocSchema). Use API's casing for keys (e.g., printdoc_config_id, order_id OR sample_id etc.).
   * @returns {Promise<object>} Response object containing created print document metadata (structure defined by QBench API).
   */
  async createPrintDocs(printDocsData) {
    if (!Array.isArray(printDocsData) || printDocsData.length === 0) {
      throw new Error('printDocsData must be a non-empty array.');
    }
    return this._requestHandler.request('POST', '/qbench/api/v2/printdocs', null, printDocsData);
  }

  /**
   * Retrieves a single print document's metadata by its ID.
   * Corresponds to `GET /qbench/api/v2/printdocs/{printdoc_id}`
   * @param {number} printdoc_id The ID of the print document.
   * @returns {Promise<object>} The print document metadata object (structure defined by QBench API). Does not contain file content.
   */
  async getPrintDocById(printdoc_id) {
    if (!printdoc_id) {
      throw new Error('PrintDoc ID is required.');
    }
    return this._requestHandler.request('GET', `/qbench/api/v2/printdocs/${printdoc_id}`);
  }

  // Note: Like attachments, the spec doesn't explicitly define a download endpoint.
  // The 'url' field in the response from getPrintDocById likely contains the download link.
}

// --- End of File: src/tags/printdoc.js ---
