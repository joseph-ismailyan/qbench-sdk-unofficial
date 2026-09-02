// File: src/tags/payment.js
import { BaseHandler } from './baseHandler.js';

export class PaymentHandler extends BaseHandler {
  /**
   * Retrieves a list of payments.
   * Corresponds to `GET /qbench/api/v2/payments`
   * @param {object} [params] Query parameters for filtering/pagination (e.g., { page_num, page_size, integration_ids }) using API's casing.
   * @returns {Promise<object>} List response object (structure defined by QBench API).
   */
  async listPayments(params) {
    return this._requestHandler.request('GET', '/qbench/api/v2/payments', params);
  }

  /**
   * Creates a list of new payments.
   * Corresponds to `POST /qbench/api/v2/payments`
   * @param {Array<object>} paymentsData An array of payment objects to create (structure defined by CreatePaymentSchema). Use API's casing for keys (e.g., customer_id, amount, template_id).
   * @returns {Promise<object>} Response object containing created payments (structure defined by QBench API).
   */
  async createPayments(paymentsData) {
    if (!Array.isArray(paymentsData) || paymentsData.length === 0) {
      throw new Error('paymentsData must be a non-empty array.');
    }
    return this._requestHandler.request('POST', '/qbench/api/v2/payments', null, paymentsData);
  }

  /**
   * Updates a list of existing payments.
   * Corresponds to `PATCH /qbench/api/v2/payments`
   * @param {Array<object>} paymentsUpdates An array of payment update objects (must include 'id', structure defined by UpdatePaymentSchema). Use API's casing for keys.
   * @returns {Promise<object>} Response object containing updated payments (structure defined by QBench API).
   */
  async updatePayments(paymentsUpdates) {
    if (!Array.isArray(paymentsUpdates) || paymentsUpdates.length === 0) {
      throw new Error('paymentsUpdates must be a non-empty array.');
    }
    if (
      !paymentsUpdates.every((item) => item && typeof item === 'object' && item.id !== undefined)
    ) {
      throw new Error("Each item in paymentsUpdates must be an object with an 'id' property.");
    }
    return this._requestHandler.request('PATCH', '/qbench/api/v2/payments', null, paymentsUpdates);
  }

  /**
   * Retrieves a single payment by its ID.
   * Corresponds to `GET /qbench/api/v2/payments/{payment_id}`
   * @param {number} payment_id The ID of the payment.
   * @returns {Promise<object>} The payment object (structure defined by QBench API).
   */
  async getPaymentById(payment_id) {
    if (!payment_id) {
      throw new Error('Payment ID is required.');
    }
    return this._requestHandler.request('GET', `/qbench/api/v2/payments/${payment_id}`);
  }

  /**
   * Deletes a single payment by its ID.
   * Corresponds to `DELETE /qbench/api/v2/payments/{payment_id}`
   * @param {number} payment_id The ID of the payment to delete.
   * @returns {Promise<null>} Resolves with null on success (204 No Content).
   */
  async deletePayment(payment_id) {
    if (!payment_id) {
      throw new Error('Payment ID is required.');
    }
    return this._requestHandler.request('DELETE', `/qbench/api/v2/payments/${payment_id}`);
  }

  /**
   * Retrieves a paginated list of Invoices associated with a specific Payment.
   * Corresponds to `GET /qbench/api/v2/payments/{payment_id}/invoices`
   * @param {number} payment_id The ID of the payment.
   * @param {object} [params] Query parameters for filtering/pagination (e.g., { page_num, page_size }) using API's casing.
   * @returns {Promise<object>} List response object containing invoices (structure defined by QBench API).
   */
  async listInvoicesForPayment(payment_id, params) {
    if (!payment_id) {
      throw new Error('Payment ID is required.');
    }
    return this._requestHandler.request(
      'GET',
      `/qbench/api/v2/payments/${payment_id}/invoices`,
      params
    );
  }

  /**
   * Applies a payment to one or more invoices.
   * Corresponds to `POST /qbench/api/v2/payments/{payment_id}/invoices`
   * @param {number} payment_id The ID of the payment.
   * @param {Array<object>} applications Array of objects specifying invoices and amounts (e.g., [{ invoice_id, applied_amount }]). Use API's casing.
   * @returns {Promise<null>} Resolves with null on success (204 No Content).
   */
  async applyPaymentToInvoices(payment_id, applications) {
    if (!payment_id) throw new Error('Payment ID is required.');
    if (!Array.isArray(applications) || applications.length === 0)
      throw new Error('Applications array must be non-empty.');
    if (
      !applications.every(
        (a) =>
          a && typeof a === 'object' && a.invoice_id !== undefined && a.applied_amount !== undefined
      )
    ) {
      throw new Error("Each application must be an object with 'invoice_id' and 'applied_amount'.");
    }
    return this._requestHandler.request(
      'POST',
      `/qbench/api/v2/payments/${payment_id}/invoices`,
      null,
      applications
    );
  }

  /**
   * Updates the applied amounts for invoices associated with a payment.
   * Corresponds to `PATCH /qbench/api/v2/payments/{payment_id}/invoices`
   * @param {number} payment_id The ID of the payment.
   * @param {Array<object>} updates Array of objects specifying invoice IDs and potentially new applied amounts (structure from InvoicePaymentUpdateSchema). Use API's casing.
   * @returns {Promise<null>} Resolves with null on success (204 No Content).
   */
  async updateInvoicePaymentApplications(payment_id, updates) {
    if (!payment_id) throw new Error('Payment ID is required.');
    if (!Array.isArray(updates) || updates.length === 0)
      throw new Error('Updates array must be non-empty.');
    if (
      !updates.every((item) => item && typeof item === 'object' && item.invoice_id !== undefined)
    ) {
      throw new Error("Each item in updates must be an object with an 'invoice_id' property.");
    }
    return this._requestHandler.request(
      'PATCH',
      `/qbench/api/v2/payments/${payment_id}/invoices`,
      null,
      updates
    );
  }

  /**
   * Unapplies a payment from a specific invoice.
   * Corresponds to `DELETE /qbench/api/v2/payments/{payment_id}/invoices/{invoice_id}`
   * @param {number} payment_id The ID of the payment.
   * @param {number} invoice_id The ID of the invoice to unapply the payment from.
   * @returns {Promise<null>} Resolves with null on success (204 No Content).
   */
  async unapplyPaymentFromInvoice(payment_id, invoice_id) {
    if (!payment_id) throw new Error('Payment ID is required.');
    if (!invoice_id) throw new Error('Invoice ID is required.');
    return this._requestHandler.request(
      'DELETE',
      `/qbench/api/v2/payments/${payment_id}/invoices/${invoice_id}`
    );
  }

  /**
   * Sends a payment receipt email.
   * Corresponds to `POST /qbench/api/v2/payments/{payment_id}/send-email`
   * @param {number} payment_id The ID of the payment.
   * @param {object} emailData Data for the email (e.g., { emails: ['recipient@example.com'], email_message: '...' }). Use API's casing.
   * @returns {Promise<null>} Resolves with null on success (204 No Content).
   */
  async sendPaymentEmail(payment_id, emailData) {
    if (!payment_id) throw new Error('Payment ID is required.');
    if (!emailData || !Array.isArray(emailData.emails) || emailData.emails.length === 0) {
      throw new Error("emailData must be an object with a non-empty 'emails' array.");
    }
    return this._requestHandler.request(
      'POST',
      `/qbench/api/v2/payments/${payment_id}/send-email`,
      null,
      emailData
    );
  }
}

// --- End of File: src/tags/payment.js ---
