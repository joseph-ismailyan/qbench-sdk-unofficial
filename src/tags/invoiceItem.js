// File: src/tags/invoiceItem.js
import { BaseHandler } from './baseHandler.js';

export class InvoiceItemHandler extends BaseHandler {
  /**
   * Retrieves a list of invoice items.
   * Corresponds to `GET /qbench/api/v2/invoice-items`
   * @param {object} [params] Query parameters (e.g., { page_num, page_size }) - Note: Spec lacks specific filters here, might need invoice_id via invoice handler.
   * @returns {Promise<object>} List response object (structure defined by QBench API).
   */
  async listInvoiceItems(params) {
    // Warning: Listing all items without context (like invoice_id) might be inefficient or restricted.
    // Consider using invoice.listItemsForInvoice(invoice_id, params) instead.
    console.warn(
      'Listing all invoice items globally might be inefficient. Consider using invoice.listItemsForInvoice().'
    );
    return this._requestHandler.request('GET', '/qbench/api/v2/invoice-items', params);
  }

  /**
   * Creates a list of new invoice items.
   * Corresponds to `POST /qbench/api/v2/invoice-items`
   * @param {Array<object>} itemsData An array of invoice item objects to create (structure defined by CreateInvoiceItemSchema). Use API's casing for keys (e.g., invoice_id, name).
   * @returns {Promise<object>} Response object containing created items (structure defined by QBench API).
   */
  async createInvoiceItems(itemsData) {
    if (!Array.isArray(itemsData) || itemsData.length === 0) {
      throw new Error('itemsData must be a non-empty array.');
    }
    return this._requestHandler.request('POST', '/qbench/api/v2/invoice-items', null, itemsData);
  }

  /**
   * Updates a list of existing invoice items.
   * Corresponds to `PATCH /qbench/api/v2/invoice-items`
   * @param {Array<object>} itemsUpdates An array of invoice item update objects (must include 'id', structure defined by UpdateInvoiceItemSchema). Use API's casing for keys.
   * @returns {Promise<object>} Response object containing updated items (structure defined by QBench API).
   */
  async updateInvoiceItems(itemsUpdates) {
    if (!Array.isArray(itemsUpdates) || itemsUpdates.length === 0) {
      throw new Error('itemsUpdates must be a non-empty array.');
    }
    if (!itemsUpdates.every((item) => item && typeof item === 'object' && item.id !== undefined)) {
      throw new Error("Each item in itemsUpdates must be an object with an 'id' property.");
    }
    return this._requestHandler.request(
      'PATCH',
      '/qbench/api/v2/invoice-items',
      null,
      itemsUpdates
    );
  }

  /**
   * Retrieves a single invoice item by its ID.
   * Corresponds to `GET /qbench/api/v2/invoice-items/{invoice_item_id}`
   * @param {number} invoice_item_id The ID of the invoice item.
   * @returns {Promise<object>} The invoice item object (structure defined by QBench API).
   */
  async getInvoiceItemById(invoice_item_id) {
    if (!invoice_item_id) {
      throw new Error('Invoice Item ID is required.');
    }
    return this._requestHandler.request('GET', `/qbench/api/v2/invoice-items/${invoice_item_id}`);
  }

  /**
   * Deletes a single invoice item by its ID.
   * Corresponds to `DELETE /qbench/api/v2/invoice-items/{invoice_item_id}`
   * @param {number} invoice_item_id The ID of the invoice item to delete.
   * @returns {Promise<null>} Resolves with null on success (204 No Content).
   */
  async deleteInvoiceItem(invoice_item_id) {
    if (!invoice_item_id) {
      throw new Error('Invoice Item ID is required.');
    }
    return this._requestHandler.request(
      'DELETE',
      `/qbench/api/v2/invoice-items/${invoice_item_id}`
    );
  }
}

// --- End of File: src/tags/invoiceItem.js ---
