// File: src/tags/order.js
import { BaseHandler } from './baseHandler.js';

export class OrderHandler extends BaseHandler {
  /**
   * Retrieves a list of orders.
   * Corresponds to `GET /qbench/api/v2/orders`
   * @param {object} [params] Query parameters for filtering/pagination (e.g., { page_num, page_size, customer_ids, statuses }) using API's casing.
   * @returns {Promise<object>} List response object (structure defined by QBench API).
   */
  async listOrders(params) {
    return this._requestHandler.request('GET', '/qbench/api/v2/orders', params);
  }

  /**
   * Creates a list of new orders.
   * Corresponds to `POST /qbench/api/v2/orders`
   * @param {Array<object>} ordersData An array of order objects to create (structure defined by CreateOrderSchema). Use API's casing for keys (e.g., customer_account_id).
   * @returns {Promise<object>} Response object containing created orders (structure defined by QBench API).
   */
  async createOrders(ordersData) {
    if (!Array.isArray(ordersData) || ordersData.length === 0) {
      throw new Error('ordersData must be a non-empty array.');
    }
    return this._requestHandler.request('POST', '/qbench/api/v2/orders', null, ordersData);
  }

  /**
   * Updates a list of existing orders.
   * Corresponds to `PATCH /qbench/api/v2/orders`
   * @param {Array<object>} ordersUpdates An array of order update objects (must include 'id', structure defined by UpdateOrderSchema). Use API's casing for keys.
   * @returns {Promise<object>} Response object containing updated orders (structure defined by QBench API).
   */
  async updateOrders(ordersUpdates) {
    if (!Array.isArray(ordersUpdates) || ordersUpdates.length === 0) {
      throw new Error('ordersUpdates must be a non-empty array.');
    }
    if (!ordersUpdates.every((item) => item && typeof item === 'object' && item.id !== undefined)) {
      throw new Error("Each item in ordersUpdates must be an object with an 'id' property.");
    }
    return this._requestHandler.request('PATCH', '/qbench/api/v2/orders', null, ordersUpdates);
  }

  /**
   * Retrieves a single order by its ID.
   * Corresponds to `GET /qbench/api/v2/orders/{order_id}`
   * @param {number} order_id The ID of the order.
   * @returns {Promise<object>} The order object (structure defined by QBench API).
   */
  async getOrderById(order_id) {
    if (!order_id) {
      throw new Error('Order ID is required.');
    }
    return this._requestHandler.request('GET', `/qbench/api/v2/orders/${order_id}`);
  }

  /**
   * Deletes a single order by its ID.
   * Corresponds to `DELETE /qbench/api/v2/orders/{order_id}`
   * @param {number} order_id The ID of the order to delete.
   * @returns {Promise<null>} Resolves with null on success (204 No Content).
   */
  async deleteOrder(order_id) {
    if (!order_id) {
      throw new Error('Order ID is required.');
    }
    return this._requestHandler.request('DELETE', `/qbench/api/v2/orders/${order_id}`);
  }

  /**
   * Retrieves a paginated list of Attachments associated with a specific Order.
   * Corresponds to `GET /qbench/api/v2/orders/{order_id}/attachments`
   * @param {number} order_id The ID of the order.
   * @param {object} [params] Query parameters for pagination (e.g., { page_num, page_size }) using API's casing.
   * @returns {Promise<object>} List response object containing attachments (structure defined by QBench API).
   */
  async listAttachmentsForOrder(order_id, params) {
    if (!order_id) {
      throw new Error('Order ID is required.');
    }
    return this._requestHandler.request(
      'GET',
      `/qbench/api/v2/orders/${order_id}/attachments`,
      params
    );
  }

  /**
   * Retrieves a paginated list of Comments associated with a specific Order.
   * Corresponds to `GET /qbench/api/v2/orders/{order_id}/comments`
   * @param {number} order_id The ID of the order.
   * @param {object} [params] Query parameters for pagination (e.g., { page_num, page_size }) using API's casing.
   * @returns {Promise<object>} List response object containing comments (structure defined by QBench API).
   */
  async listCommentsForOrder(order_id, params) {
    if (!order_id) {
      throw new Error('Order ID is required.');
    }
    return this._requestHandler.request(
      'GET',
      `/qbench/api/v2/orders/${order_id}/comments`,
      params
    );
  }

  /**
   * Retrieves a paginated list of Invoices associated with a specific Order.
   * Corresponds to `GET /qbench/api/v2/orders/{order_id}/invoices`
   * @param {number} order_id The ID of the order.
   * @param {object} [params] Query parameters for filtering/pagination (e.g., { page_num, page_size }) using API's casing.
   * @returns {Promise<object>} List response object containing invoices (structure defined by QBench API).
   */
  async listInvoicesForOrder(order_id, params) {
    if (!order_id) {
      throw new Error('Order ID is required.');
    }
    return this._requestHandler.request(
      'GET',
      `/qbench/api/v2/orders/${order_id}/invoices`,
      params
    );
  }

  /**
   * Retrieves a paginated list of Reports associated with a specific Order.
   * Corresponds to `GET /qbench/api/v2/orders/{order_id}/reports`
   * @param {number} order_id The ID of the order.
   * @param {object} [params] Query parameters for filtering/pagination (e.g., { page_num, page_size }) using API's casing.
   * @returns {Promise<object>} List response object containing reports (structure defined by QBench API).
   */
  async listReportsForOrder(order_id, params) {
    if (!order_id) {
      throw new Error('Order ID is required.');
    }
    return this._requestHandler.request('GET', `/qbench/api/v2/orders/${order_id}/reports`, params);
  }

  /**
   * Retrieves a paginated list of Samples associated with a specific Order.
   * Corresponds to `GET /qbench/api/v2/orders/{order_id}/samples`
   * @param {number} order_id The ID of the order.
   * @param {object} [params] Query parameters for filtering/pagination (e.g., { page_num, page_size }) using API's casing.
   * @returns {Promise<object>} List response object containing samples (structure defined by QBench API).
   */
  async listSamplesForOrder(order_id, params) {
    if (!order_id) {
      throw new Error('Order ID is required.');
    }
    return this._requestHandler.request('GET', `/qbench/api/v2/orders/${order_id}/samples`, params);
  }

  /**
   * Retrieves a paginated list of Tests associated with a specific Order.
   * Corresponds to `GET /qbench/api/v2/orders/{order_id}/tests`
   * @param {number} order_id The ID of the order.
   * @param {object} [params] Query parameters for filtering/pagination (e.g., { page_num, page_size }) using API's casing.
   * @returns {Promise<object>} List response object containing tests (structure defined by QBench API).
   */
  async listTestsForOrder(order_id, params) {
    if (!order_id) {
      throw new Error('Order ID is required.');
    }
    return this._requestHandler.request('GET', `/qbench/api/v2/orders/${order_id}/tests`, params);
  }
}

// --- End of File: src/tags/order.js ---
