// File: src/tags/customer.js
import { BaseHandler } from './baseHandler.js';

export class CustomerHandler extends BaseHandler {
  /**
   * Retrieves a list of customers.
   * Corresponds to `GET /qbench/api/v2/customers`
   * @param {object} [params] Query parameters for filtering/pagination (e.g., { page_num, page_size, name_keyword, statuses }) using API's casing.
   * @returns {Promise<object>} List response object (structure defined by QBench API).
   */
  async listCustomers(params) {
    return this._requestHandler.request('GET', '/qbench/api/v2/customers', params);
  }

  /**
   * Creates a list of new customers.
   * Corresponds to `POST /qbench/api/v2/customers`
   * @param {Array<object>} customersData An array of customer objects to create (structure defined by CreateCustomerSchema). Use API's casing for keys.
   * @returns {Promise<object>} Response object containing created customers (structure defined by QBench API).
   */
  async createCustomers(customersData) {
    if (!Array.isArray(customersData) || customersData.length === 0) {
      throw new Error('customersData must be a non-empty array.');
    }
    return this._requestHandler.request('POST', '/qbench/api/v2/customers', null, customersData);
  }

  /**
   * Updates a list of existing customers.
   * Corresponds to `PATCH /qbench/api/v2/customers`
   * @param {Array<object>} customersUpdates An array of customer update objects (must include 'id', structure defined by UpdateCustomerSchema). Use API's casing for keys.
   * @returns {Promise<object>} Response object containing updated customers (structure defined by QBench API).
   */
  async updateCustomers(customersUpdates) {
    if (!Array.isArray(customersUpdates) || customersUpdates.length === 0) {
      throw new Error('customersUpdates must be a non-empty array.');
    }
    if (
      !customersUpdates.every((item) => item && typeof item === 'object' && item.id !== undefined)
    ) {
      throw new Error("Each item in customersUpdates must be an object with an 'id' property.");
    }
    return this._requestHandler.request(
      'PATCH',
      '/qbench/api/v2/customers',
      null,
      customersUpdates
    );
  }

  /**
   * Retrieves a single customer by its ID.
   * Corresponds to `GET /qbench/api/v2/customers/{customer_id}`
   * @param {number} customer_id The ID of the customer.
   * @returns {Promise<object>} The customer object (structure defined by QBench API).
   */
  async getCustomerById(customer_id) {
    if (!customer_id) {
      throw new Error('Customer ID is required.');
    }
    return this._requestHandler.request('GET', `/qbench/api/v2/customers/${customer_id}`);
  }

  /**
   * Deletes a single customer by its ID.
   * Corresponds to `DELETE /qbench/api/v2/customers/{customer_id}`
   * @param {number} customer_id The ID of the customer to delete.
   * @returns {Promise<null>} Resolves with null on success (204 No Content).
   */
  async deleteCustomer(customer_id) {
    if (!customer_id) {
      throw new Error('Customer ID is required.');
    }
    return this._requestHandler.request('DELETE', `/qbench/api/v2/customers/${customer_id}`);
  }

  /**
   * Retrieves a paginated list of Attachments associated with a specific Customer.
   * Corresponds to `GET /qbench/api/v2/customers/{customer_id}/attachments`
   * @param {number} customer_id The ID of the customer.
   * @param {object} [params] Query parameters for pagination (e.g., { page_num, page_size }) using API's casing.
   * @returns {Promise<object>} List response object containing attachments (structure defined by QBench API).
   */
  async listAttachmentsForCustomer(customer_id, params) {
    if (!customer_id) {
      throw new Error('Customer ID is required.');
    }
    return this._requestHandler.request(
      'GET',
      `/qbench/api/v2/customers/${customer_id}/attachments`,
      params
    );
  }

  /**
   * Retrieves a paginated list of Contacts associated with a specific Customer.
   * Corresponds to `GET /qbench/api/v2/customers/{customer_id}/contacts`
   * @param {number} customer_id The ID of the customer.
   * @param {object} [params] Query parameters for filtering/pagination (e.g., { page_num, page_size }) using API's casing.
   * @returns {Promise<object>} List response object containing contacts (structure defined by QBench API).
   */
  async listContactsForCustomer(customer_id, params) {
    if (!customer_id) {
      throw new Error('Customer ID is required.');
    }
    return this._requestHandler.request(
      'GET',
      `/qbench/api/v2/customers/${customer_id}/contacts`,
      params
    );
  }

  /**
   * Associates a Customer with one or more Contacts, optionally setting preferences.
   * Corresponds to `POST /qbench/api/v2/customers/{customer_id}/contacts`
   * @param {number} customer_id The ID of the customer.
   * @param {Array<object>} contactAssociations Array of objects specifying contact associations (e.g., [{ contact_id, portal_user, send_portal_invite }]). Use API's casing.
   * @returns {Promise<null>} Resolves with null on success (204 No Content).
   */
  async associateCustomerWithContacts(customer_id, contactAssociations) {
    if (!customer_id) {
      throw new Error('Customer ID is required.');
    }
    if (!Array.isArray(contactAssociations) || contactAssociations.length === 0) {
      throw new Error('contactAssociations must be a non-empty array.');
    }
    return this._requestHandler.request(
      'POST',
      `/qbench/api/v2/customers/${customer_id}/contacts`,
      null,
      contactAssociations
    );
  }

  /**
   * Removes the association between a specific Customer and Contact.
   * Corresponds to `DELETE /qbench/api/v2/customers/{customer_id}/contacts/{contact_id}`
   * @param {number} customer_id The ID of the customer.
   * @param {number} contact_id The ID of the contact to disassociate.
   * @returns {Promise<null>} Resolves with null on success (204 No Content).
   */
  async disassociateContactFromCustomer(customer_id, contact_id) {
    if (!customer_id) {
      throw new Error('Customer ID is required.');
    }
    if (!contact_id) {
      throw new Error('Contact ID is required.');
    }
    return this._requestHandler.request(
      'DELETE',
      `/qbench/api/v2/customers/${customer_id}/contacts/${contact_id}`
    );
  }

  /**
   * Retrieves a paginated list of Divisions associated with a specific Customer.
   * Corresponds to `GET /qbench/api/v2/customers/{customer_id}/divisions`
   * @param {number} customer_id The ID of the customer.
   * @param {object} [params] Query parameters for pagination (e.g., { page_num, page_size }) using API's casing.
   * @returns {Promise<object>} List response object containing divisions (structure defined by QBench API).
   */
  async listDivisionsForCustomer(customer_id, params) {
    if (!customer_id) {
      throw new Error('Customer ID is required.');
    }
    return this._requestHandler.request(
      'GET',
      `/qbench/api/v2/customers/${customer_id}/divisions`,
      params
    );
  }

  /**
   * Retrieves a paginated list of Sources associated with a specific Customer.
   * Corresponds to `GET /qbench/api/v2/customers/{customer_id}/sources`
   * @param {number} customer_id The ID of the customer.
   * @param {object} [params] Query parameters for pagination (e.g., { page_num, page_size }) using API's casing.
   * @returns {Promise<object>} List response object containing sources (structure defined by QBench API).
   */
  async listSourcesForCustomer(customer_id, params) {
    if (!customer_id) {
      throw new Error('Customer ID is required.');
    }
    return this._requestHandler.request(
      'GET',
      `/qbench/api/v2/customers/${customer_id}/sources`,
      params
    );
  }
}

// --- End of File: src/tags/customer.js ---
