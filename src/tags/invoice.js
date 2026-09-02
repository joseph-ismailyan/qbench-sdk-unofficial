// File: src/tags/invoice.js
import { BaseHandler } from './baseHandler.js';

export class InvoiceHandler extends BaseHandler {
  /**
   * Retrieves a list of invoices.
   * Corresponds to `GET /qbench/api/v2/invoices`
   * @param {object} [params] Query parameters for filtering/pagination (e.g., { page_num, page_size, customer_ids, statuses, paid_statuses }) using API's casing.
   * @returns {Promise<object>} List response object (structure defined by QBench API).
   */
  async listInvoices(params) {
    return this._requestHandler.request('GET', '/qbench/api/v2/invoices', params);
  }

  /**
   * Creates a list of new invoices.
   * Corresponds to `POST /qbench/api/v2/invoices`
   * @param {Array<object>} invoicesData An array of invoice objects to create (structure defined by CreateInvoiceSchema). Use API's casing for keys (e.g., order_id, template_id).
   * @returns {Promise<object>} Response object containing created invoices (structure defined by QBench API).
   */
  async createInvoices(invoicesData) {
    if (!Array.isArray(invoicesData) || invoicesData.length === 0) {
      throw new Error('invoicesData must be a non-empty array.');
    }
    return this._requestHandler.request('POST', '/qbench/api/v2/invoices', null, invoicesData);
  }

  /**
   * Updates a list of existing invoices.
   * Corresponds to `PATCH /qbench/api/v2/invoices`
   * @param {Array<object>} invoicesUpdates An array of invoice update objects (must include 'id', structure defined by UpdateInvoiceSchema). Use API's casing for keys.
   * @returns {Promise<object>} Response object containing updated invoices (structure defined by QBench API).
   */
  async updateInvoices(invoicesUpdates) {
    if (!Array.isArray(invoicesUpdates) || invoicesUpdates.length === 0) {
      throw new Error('invoicesUpdates must be a non-empty array.');
    }
    if (
      !invoicesUpdates.every((item) => item && typeof item === 'object' && item.id !== undefined)
    ) {
      throw new Error("Each item in invoicesUpdates must be an object with an 'id' property.");
    }
    return this._requestHandler.request('PATCH', '/qbench/api/v2/invoices', null, invoicesUpdates);
  }

  /**
   * Retrieves a single invoice by its ID.
   * Corresponds to `GET /qbench/api/v2/invoices/{invoice_id}`
   * @param {number} invoice_id The ID of the invoice.
   * @returns {Promise<object>} The invoice object (structure defined by QBench API).
   */
  async getInvoiceById(invoice_id) {
    if (!invoice_id) {
      throw new Error('Invoice ID is required.');
    }
    return this._requestHandler.request('GET', `/qbench/api/v2/invoices/${invoice_id}`);
  }

  /**
   * Deletes a single invoice by its ID.
   * Corresponds to `DELETE /qbench/api/v2/invoices/{invoice_id}`
   * @param {number} invoice_id The ID of the invoice to delete.
   * @returns {Promise<null>} Resolves with null on success (204 No Content).
   */
  async deleteInvoice(invoice_id) {
    if (!invoice_id) {
      throw new Error('Invoice ID is required.');
    }
    return this._requestHandler.request('DELETE', `/qbench/api/v2/invoices/${invoice_id}`);
  }

  /**
   * Retrieves a paginated list of Invoice Items associated with a specific Invoice.
   * Corresponds to `GET /qbench/api/v2/invoices/{invoice_id}/invoice-items`
   * @param {number} invoice_id The ID of the invoice.
   * @param {object} [params] Query parameters for pagination (e.g., { page_num, page_size }) using API's casing.
   * @returns {Promise<object>} List response object containing invoice items (structure defined by QBench API).
   */
  async listItemsForInvoice(invoice_id, params) {
    if (!invoice_id) {
      throw new Error('Invoice ID is required.');
    }
    return this._requestHandler.request(
      'GET',
      `/qbench/api/v2/invoices/${invoice_id}/invoice-items`,
      params
    );
  }

  /**
   * Retrieves a paginated list of Orders associated with a specific Invoice.
   * Corresponds to `GET /qbench/api/v2/invoices/{invoice_id}/orders`
   * @param {number} invoice_id The ID of the invoice.
   * @param {object} [params] Query parameters for filtering/pagination (e.g., { page_num, page_size }) using API's casing.
   * @returns {Promise<object>} List response object containing orders (structure defined by QBench API).
   */
  async listOrdersForInvoice(invoice_id, params) {
    if (!invoice_id) {
      throw new Error('Invoice ID is required.');
    }
    return this._requestHandler.request(
      'GET',
      `/qbench/api/v2/invoices/${invoice_id}/orders`,
      params
    );
  }

  /**
   * Retrieves a paginated list of Payments applied to a specific Invoice.
   * Corresponds to `GET /qbench/api/v2/invoices/{invoice_id}/payments`
   * @param {number} invoice_id The ID of the invoice.
   * @param {object} [params] Query parameters for pagination (e.g., { page_num, page_size }) using API's casing.
   * @returns {Promise<object>} List response object containing payments (structure defined by QBench API).
   */
  async listPaymentsForInvoice(invoice_id, params) {
    if (!invoice_id) {
      throw new Error('Invoice ID is required.');
    }
    return this._requestHandler.request(
      'GET',
      `/qbench/api/v2/invoices/${invoice_id}/payments`,
      params
    );
  }

  /**
   * Sends an email for a specific invoice.
   * Corresponds to `POST /qbench/api/v2/invoices/{invoice_id}/send-email`
   * @param {number} invoice_id The ID of the invoice.
   * @param {object} [emailData] Optional data for the email (e.g., { emails: ['recipient@example.com'] }). Use API's casing.
   * @returns {Promise<object>} Response object, likely indicating queuing status (structure defined by QBench API).
   */
  async sendInvoiceEmail(invoice_id, emailData = {}) {
    if (!invoice_id) {
      throw new Error('Invoice ID is required.');
    }
    // Expecting 202 Accepted
    return this._requestHandler.request(
      'POST',
      `/qbench/api/v2/invoices/${invoice_id}/send-email`,
      null,
      emailData
    );
  }

  /**
   * Triggers a sync operation for a specific invoice (likely with an external system like QBD).
   * Corresponds to `POST /qbench/api/v2/invoices/{invoice_id}/sync`
   * @param {number} invoice_id The ID of the invoice to sync.
   * @returns {Promise<null>} Resolves with null on success (204 No Content).
   */
  async syncInvoice(invoice_id) {
    if (!invoice_id) {
      throw new Error('Invoice ID is required.');
    }
    // Expecting 204 No Content
    return this._requestHandler.request('POST', `/qbench/api/v2/invoices/${invoice_id}/sync`);
  }
}

// --- End of File: src/tags/invoice.js ---
