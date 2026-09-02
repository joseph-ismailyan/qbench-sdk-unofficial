// File: src/tags/user.js
import { BaseHandler } from './baseHandler.js';

export class UserHandler extends BaseHandler {
  /**
   * Retrieves a list of users.
   * Corresponds to `GET /qbench/api/v2/users`
   * @param {object} [params] Query parameters (e.g., { page_num, page_size }) using API's casing.
   * @returns {Promise<object>} List response object (structure defined by QBench API).
   */
  async listUsers(params) {
    return this._requestHandler.request('GET', '/qbench/api/v2/users', params);
  }

  /**
   * Retrieves a single user by their ID.
   * Corresponds to `GET /qbench/api/v2/users/{user_id}`
   * @param {number} user_id The ID of the user.
   * @returns {Promise<object>} The user object (structure defined by QBench API).
   */
  async getUserById(user_id) {
    if (!user_id) {
      throw new Error('User ID is required.');
    }
    return this._requestHandler.request('GET', `/qbench/api/v2/users/${user_id}`);
  }
}

// --- End of File: src/tags/user.js ---
