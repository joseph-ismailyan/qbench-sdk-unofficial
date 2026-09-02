// File: src/tags/contact.js
import { BaseHandler } from './baseHandler.js';

export class ContactHandler extends BaseHandler {
  /**
   * Retrieves a list of contacts.
   * Corresponds to `GET /qbench/api/v2/contacts`
   * @param {object} [params] Query parameters for filtering/pagination (e.g., { page_num, page_size, customer_id, email_addresses }) using API's casing.
   * @returns {Promise<object>} List response object (structure defined by QBench API).
   */
  async listContacts(params) {
    return this._requestHandler.request('GET', '/qbench/api/v2/contacts', params);
  }

  /**
   * Creates a list of new contacts.
   * Corresponds to `POST /qbench/api/v2/contacts`
   * @param {Array<object>} contactsData An array of contact objects to create (structure defined by CreateContactSchema). Use API's casing for keys.
   * @returns {Promise<object>} Response object containing created contacts (structure defined by QBench API).
   */
  async createContacts(contactsData) {
    if (!Array.isArray(contactsData) || contactsData.length === 0) {
      throw new Error('contactsData must be a non-empty array.');
    }
    return this._requestHandler.request('POST', '/qbench/api/v2/contacts', null, contactsData);
  }

  /**
   * Updates a list of existing contacts.
   * Corresponds to `PATCH /qbench/api/v2/contacts`
   * @param {Array<object>} contactsUpdates An array of contact update objects (must include 'id', structure defined by UpdateContactSchema). Use API's casing for keys.
   * @returns {Promise<object>} Response object containing updated contacts (structure defined by QBench API).
   */
  async updateContacts(contactsUpdates) {
    if (!Array.isArray(contactsUpdates) || contactsUpdates.length === 0) {
      throw new Error('contactsUpdates must be a non-empty array.');
    }
    if (
      !contactsUpdates.every((item) => item && typeof item === 'object' && item.id !== undefined)
    ) {
      throw new Error("Each item in contactsUpdates must be an object with an 'id' property.");
    }
    return this._requestHandler.request('PATCH', '/qbench/api/v2/contacts', null, contactsUpdates);
  }

  /**
   * Retrieves a single contact by its ID.
   * Corresponds to `GET /qbench/api/v2/contacts/{contact_id}`
   * @param {number} contact_id The ID of the contact.
   * @returns {Promise<object>} The contact object (structure defined by QBench API).
   */
  async getContactById(contact_id) {
    if (!contact_id) {
      throw new Error('Contact ID is required.');
    }
    return this._requestHandler.request('GET', `/qbench/api/v2/contacts/${contact_id}`);
  }

  /**
   * Deletes a single contact by its ID.
   * Corresponds to `DELETE /qbench/api/v2/contacts/{contact_id}`
   * @param {number} contact_id The ID of the contact to delete.
   * @returns {Promise<null>} Resolves with null on success (204 No Content).
   */
  async deleteContact(contact_id) {
    if (!contact_id) {
      throw new Error('Contact ID is required.');
    }
    return this._requestHandler.request('DELETE', `/qbench/api/v2/contacts/${contact_id}`);
  }

  /**
   * Retrieves a paginated list of Customers associated with a specific Contact.
   * Corresponds to `GET /qbench/api/v2/contacts/{contact_id}/customers`
   * @param {number} contact_id The ID of the contact.
   * @param {object} [params] Query parameters for filtering/pagination (e.g., { page_num, page_size, name_keyword }) using API's casing.
   * @returns {Promise<object>} List response object containing customers (structure defined by QBench API).
   */
  async listCustomersForContact(contact_id, params) {
    if (!contact_id) {
      throw new Error('Contact ID is required.');
    }
    return this._requestHandler.request(
      'GET',
      `/qbench/api/v2/contacts/${contact_id}/customers`,
      params
    );
  }

  /**
   * Associates a Contact with one or more Customers, optionally setting preferences.
   * Corresponds to `POST /qbench/api/v2/contacts/{contact_id}/customers`
   * @param {number} contact_id The ID of the contact.
   * @param {Array<object>} customerAssociations Array of objects specifying customer associations (e.g., [{ customer_id, portal_user, send_portal_invite }]). Use API's casing.
   * @returns {Promise<null>} Resolves with null on success (204 No Content).
   */
  async associateContactWithCustomers(contact_id, customerAssociations) {
    if (!contact_id) {
      throw new Error('Contact ID is required.');
    }
    if (!Array.isArray(customerAssociations) || customerAssociations.length === 0) {
      throw new Error('customerAssociations must be a non-empty array.');
    }
    return this._requestHandler.request(
      'POST',
      `/qbench/api/v2/contacts/${contact_id}/customers`,
      null,
      customerAssociations
    );
  }
}

// --- End of File: src/tags/contact.js ---
