// File: src/tags/integration.js
import { BaseHandler } from './baseHandler.js';

export class IntegrationHandler extends BaseHandler {
  // --- Assay Integration ---

  /**
   * Retrieves integration vendor relationships for assays.
   * Corresponds to `GET /qbench/api/v2/integrations/{integration_id}/assays`
   * @param {number} integration_id The ID of the integration.
   * @param {object} [params] Query parameters (e.g., { page_num, page_size, entity_ids, integration_vendor_ids }) using API's casing.
   * @returns {Promise<object>} List response object.
   */
  async listAssayIntegrationRelationships(integration_id, params) {
    if (!integration_id) throw new Error('Integration ID is required.');
    return this._requestHandler.request(
      'GET',
      `/qbench/api/v2/integrations/${integration_id}/assays`,
      params
    );
  }

  /**
   * Creates integration vendor relationships for assays.
   * Corresponds to `POST /qbench/api/v2/integrations/{integration_id}/assays`
   * @param {number} integration_id The ID of the integration.
   * @param {Array<object>} relationshipsData Array of relationship objects (e.g., [{ entity_id, integration_vendor_id }]). Use API's casing.
   * @returns {Promise<object>} Response object containing created relationships.
   */
  async createAssayIntegrationRelationships(integration_id, relationshipsData) {
    if (!integration_id) throw new Error('Integration ID is required.');
    if (!Array.isArray(relationshipsData) || relationshipsData.length === 0)
      throw new Error('relationshipsData must be a non-empty array.');
    return this._requestHandler.request(
      'POST',
      `/qbench/api/v2/integrations/${integration_id}/assays`,
      null,
      relationshipsData
    );
  }

  /**
   * Retrieves a specific assay integration vendor relationship.
   * Corresponds to `GET /qbench/api/v2/integrations/{integration_id}/assays/{entity_id}`
   * @param {number} integration_id The ID of the integration.
   * @param {number} entity_id The ID of the assay (entity).
   * @returns {Promise<object>} The relationship object.
   */
  async getAssayIntegrationRelationship(integration_id, entity_id) {
    if (!integration_id) throw new Error('Integration ID is required.');
    if (!entity_id) throw new Error('Entity (Assay) ID is required.');
    return this._requestHandler.request(
      'GET',
      `/qbench/api/v2/integrations/${integration_id}/assays/${entity_id}`
    );
  }

  // --- Contact Integration ---

  /**
   * Retrieves integration vendor relationships for contacts.
   * Corresponds to `GET /qbench/api/v2/integrations/{integration_id}/contacts`
   * @param {number} integration_id The ID of the integration.
   * @param {object} [params] Query parameters. Use API's casing.
   * @returns {Promise<object>} List response object.
   */
  async listContactIntegrationRelationships(integration_id, params) {
    if (!integration_id) throw new Error('Integration ID is required.');
    return this._requestHandler.request(
      'GET',
      `/qbench/api/v2/integrations/${integration_id}/contacts`,
      params
    );
  }

  /**
   * Creates integration vendor relationships for contacts.
   * Corresponds to `POST /qbench/api/v2/integrations/{integration_id}/contacts`
   * @param {number} integration_id The ID of the integration.
   * @param {Array<object>} relationshipsData Array of relationship objects. Use API's casing.
   * @returns {Promise<object>} Response object containing created relationships.
   */
  async createContactIntegrationRelationships(integration_id, relationshipsData) {
    if (!integration_id) throw new Error('Integration ID is required.');
    if (!Array.isArray(relationshipsData) || relationshipsData.length === 0)
      throw new Error('relationshipsData must be a non-empty array.');
    return this._requestHandler.request(
      'POST',
      `/qbench/api/v2/integrations/${integration_id}/contacts`,
      null,
      relationshipsData
    );
  }

  /**
   * Retrieves a specific contact integration vendor relationship.
   * Corresponds to `GET /qbench/api/v2/integrations/{integration_id}/contacts/{entity_id}`
   * @param {number} integration_id The ID of the integration.
   * @param {number} entity_id The ID of the contact (entity).
   * @returns {Promise<object>} The relationship object.
   */
  async getContactIntegrationRelationship(integration_id, entity_id) {
    if (!integration_id) throw new Error('Integration ID is required.');
    if (!entity_id) throw new Error('Entity (Contact) ID is required.');
    return this._requestHandler.request(
      'GET',
      `/qbench/api/v2/integrations/${integration_id}/contacts/${entity_id}`
    );
  }

  // --- Customer Integration ---

  /**
   * Retrieves integration vendor relationships for customers.
   * Corresponds to `GET /qbench/api/v2/integrations/{integration_id}/customers`
   * @param {number} integration_id The ID of the integration.
   * @param {object} [params] Query parameters. Use API's casing.
   * @returns {Promise<object>} List response object.
   */
  async listCustomerIntegrationRelationships(integration_id, params) {
    if (!integration_id) throw new Error('Integration ID is required.');
    return this._requestHandler.request(
      'GET',
      `/qbench/api/v2/integrations/${integration_id}/customers`,
      params
    );
  }

  /**
   * Creates integration vendor relationships for customers.
   * Corresponds to `POST /qbench/api/v2/integrations/{integration_id}/customers`
   * @param {number} integration_id The ID of the integration.
   * @param {Array<object>} relationshipsData Array of relationship objects. Use API's casing.
   * @returns {Promise<object>} Response object containing created relationships.
   */
  async createCustomerIntegrationRelationships(integration_id, relationshipsData) {
    if (!integration_id) throw new Error('Integration ID is required.');
    if (!Array.isArray(relationshipsData) || relationshipsData.length === 0)
      throw new Error('relationshipsData must be a non-empty array.');
    return this._requestHandler.request(
      'POST',
      `/qbench/api/v2/integrations/${integration_id}/customers`,
      null,
      relationshipsData
    );
  }

  /**
   * Retrieves a specific customer integration vendor relationship.
   * Corresponds to `GET /qbench/api/v2/integrations/{integration_id}/customers/{entity_id}`
   * @param {number} integration_id The ID of the integration.
   * @param {number} entity_id The ID of the customer (entity).
   * @returns {Promise<object>} The relationship object.
   */
  async getCustomerIntegrationRelationship(integration_id, entity_id) {
    if (!integration_id) throw new Error('Integration ID is required.');
    if (!entity_id) throw new Error('Entity (Customer) ID is required.');
    return this._requestHandler.request(
      'GET',
      `/qbench/api/v2/integrations/${integration_id}/customers/${entity_id}`
    );
  }

  // --- Invoice Payment Integration ---

  /**
   * Retrieves integration vendor relationships for invoice payments.
   * Corresponds to `GET /qbench/api/v2/integrations/{integration_id}/invoice-payments`
   * @param {number} integration_id The ID of the integration.
   * @param {object} [params] Query parameters. Use API's casing.
   * @returns {Promise<object>} List response object.
   */
  async listInvoicePaymentIntegrationRelationships(integration_id, params) {
    if (!integration_id) throw new Error('Integration ID is required.');
    return this._requestHandler.request(
      'GET',
      `/qbench/api/v2/integrations/${integration_id}/invoice-payments`,
      params
    );
  }

  /**
   * Creates integration vendor relationships for invoice payments.
   * Corresponds to `POST /qbench/api/v2/integrations/{integration_id}/invoice-payments`
   * @param {number} integration_id The ID of the integration.
   * @param {Array<object>} relationshipsData Array of relationship objects. Use API's casing.
   * @returns {Promise<object>} Response object containing created relationships.
   */
  async createInvoicePaymentIntegrationRelationships(integration_id, relationshipsData) {
    if (!integration_id) throw new Error('Integration ID is required.');
    if (!Array.isArray(relationshipsData) || relationshipsData.length === 0)
      throw new Error('relationshipsData must be a non-empty array.');
    return this._requestHandler.request(
      'POST',
      `/qbench/api/v2/integrations/${integration_id}/invoice-payments`,
      null,
      relationshipsData
    );
  }

  /**
   * Retrieves a specific invoice payment integration vendor relationship.
   * Corresponds to `GET /qbench/api/v2/integrations/{integration_id}/invoice-payments/{entity_id}`
   * @param {number} integration_id The ID of the integration.
   * @param {number} entity_id The ID of the invoice payment (entity).
   * @returns {Promise<object>} The relationship object.
   */
  async getInvoicePaymentIntegrationRelationship(integration_id, entity_id) {
    if (!integration_id) throw new Error('Integration ID is required.');
    if (!entity_id) throw new Error('Entity (Invoice Payment) ID is required.');
    return this._requestHandler.request(
      'GET',
      `/qbench/api/v2/integrations/${integration_id}/invoice-payments/${entity_id}`
    );
  }

  /**
   * Deletes a specific invoice payment integration vendor relationship.
   * Corresponds to `DELETE /qbench/api/v2/integrations/{integration_id}/invoice-payments/{entity_id}`
   * @param {number} integration_id The ID of the integration.
   * @param {number} entity_id The ID of the invoice payment (entity) to remove relationship for.
   * @returns {Promise<null>} Resolves with null on success (204 No Content).
   */
  async deleteInvoicePaymentIntegrationRelationship(integration_id, entity_id) {
    if (!integration_id) throw new Error('Integration ID is required.');
    if (!entity_id) throw new Error('Entity (Invoice Payment) ID is required.');
    return this._requestHandler.request(
      'DELETE',
      `/qbench/api/v2/integrations/${integration_id}/invoice-payments/${entity_id}`
    );
  }

  // --- Invoice Integration ---

  /**
   * Retrieves integration vendor relationships for invoices.
   * Corresponds to `GET /qbench/api/v2/integrations/{integration_id}/invoices`
   * @param {number} integration_id The ID of the integration.
   * @param {object} [params] Query parameters. Use API's casing.
   * @returns {Promise<object>} List response object.
   */
  async listInvoiceIntegrationRelationships(integration_id, params) {
    if (!integration_id) throw new Error('Integration ID is required.');
    return this._requestHandler.request(
      'GET',
      `/qbench/api/v2/integrations/${integration_id}/invoices`,
      params
    );
  }

  /**
   * Creates integration vendor relationships for invoices.
   * Corresponds to `POST /qbench/api/v2/integrations/{integration_id}/invoices`
   * @param {number} integration_id The ID of the integration.
   * @param {Array<object>} relationshipsData Array of relationship objects. Use API's casing.
   * @returns {Promise<object>} Response object containing created relationships.
   */
  async createInvoiceIntegrationRelationships(integration_id, relationshipsData) {
    if (!integration_id) throw new Error('Integration ID is required.');
    if (!Array.isArray(relationshipsData) || relationshipsData.length === 0)
      throw new Error('relationshipsData must be a non-empty array.');
    return this._requestHandler.request(
      'POST',
      `/qbench/api/v2/integrations/${integration_id}/invoices`,
      null,
      relationshipsData
    );
  }

  /**
   * Retrieves a specific invoice integration vendor relationship.
   * Corresponds to `GET /qbench/api/v2/integrations/{integration_id}/invoices/{entity_id}`
   * @param {number} integration_id The ID of the integration.
   * @param {number} entity_id The ID of the invoice (entity).
   * @returns {Promise<object>} The relationship object.
   */
  async getInvoiceIntegrationRelationship(integration_id, entity_id) {
    if (!integration_id) throw new Error('Integration ID is required.');
    if (!entity_id) throw new Error('Entity (Invoice) ID is required.');
    return this._requestHandler.request(
      'GET',
      `/qbench/api/v2/integrations/${integration_id}/invoices/${entity_id}`
    );
  }

  // --- Payment Integration ---

  /**
   * Retrieves integration vendor relationships for payments.
   * Corresponds to `GET /qbench/api/v2/integrations/{integration_id}/payments`
   * @param {number} integration_id The ID of the integration.
   * @param {object} [params] Query parameters. Use API's casing.
   * @returns {Promise<object>} List response object.
   */
  async listPaymentIntegrationRelationships(integration_id, params) {
    if (!integration_id) throw new Error('Integration ID is required.');
    return this._requestHandler.request(
      'GET',
      `/qbench/api/v2/integrations/${integration_id}/payments`,
      params
    );
  }

  /**
   * Creates integration vendor relationships for payments.
   * Corresponds to `POST /qbench/api/v2/integrations/{integration_id}/payments`
   * @param {number} integration_id The ID of the integration.
   * @param {Array<object>} relationshipsData Array of relationship objects. Use API's casing.
   * @returns {Promise<object>} Response object containing created relationships.
   */
  async createPaymentIntegrationRelationships(integration_id, relationshipsData) {
    if (!integration_id) throw new Error('Integration ID is required.');
    if (!Array.isArray(relationshipsData) || relationshipsData.length === 0)
      throw new Error('relationshipsData must be a non-empty array.');
    return this._requestHandler.request(
      'POST',
      `/qbench/api/v2/integrations/${integration_id}/payments`,
      null,
      relationshipsData
    );
  }

  /**
   * Retrieves a specific payment integration vendor relationship.
   * Corresponds to `GET /qbench/api/v2/integrations/{integration_id}/payments/{entity_id}`
   * @param {number} integration_id The ID of the integration.
   * @param {number} entity_id The ID of the payment (entity).
   * @returns {Promise<object>} The relationship object.
   */
  async getPaymentIntegrationRelationship(integration_id, entity_id) {
    if (!integration_id) throw new Error('Integration ID is required.');
    if (!entity_id) throw new Error('Entity (Payment) ID is required.');
    return this._requestHandler.request(
      'GET',
      `/qbench/api/v2/integrations/${integration_id}/payments/${entity_id}`
    );
  }
}

// --- End of File: src/tags/integration.js ---
