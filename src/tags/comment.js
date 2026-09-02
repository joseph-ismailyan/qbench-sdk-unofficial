// File: src/tags/comment.js
import { BaseHandler } from './baseHandler.js';

export class CommentHandler extends BaseHandler {
  /**
   * Retrieves a list of comments (requires filtering, e.g., by order_id, sample_id - check specific endpoints like order comments).
   * This generic endpoint might not be directly useful without filters provided by related entities.
   * The OpenAPI spec lists GET /comments under ORDER, SAMPLE, TEST tags, suggesting it's context-dependent.
   * @param {object} [params] Query parameters for filtering/pagination (e.g., { page_num, page_size, ids }) using API's casing.
   * @returns {Promise<object>} List response object (structure defined by QBench API).
   */
  async listComments(params) {
    // Note: Use specific handlers like order.listCommentsForOrder for better context.
    console.warn(
      'Listing comments via the generic /comments endpoint might require specific context filters (like order_id) not explicitly shown in the generic path spec. Consider using entity-specific comment endpoints.'
    );
    return this._requestHandler.request('GET', '/qbench/api/v2/comments', params); // Assuming a base path exists, though spec implies association
  }

  // Note: The OpenAPI spec doesn't show POST/PATCH/DELETE directly under /comments.
  // These actions are likely performed via related entities (e.g., POSTing to /orders/{order_id}/comments).
}

// --- End of File: src/tags/comment.js ---
