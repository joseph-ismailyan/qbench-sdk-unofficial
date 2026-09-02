// File: src/tags/baseHandler.js
/**
 * Base class for API tag handlers to ensure they have access to the request handler.
 */
export class BaseHandler {
  _requestHandler;

  /**
   * @param {RequestHandler} requestHandler Instance of the RequestHandler.
   */
  constructor(requestHandler) {
    if (!requestHandler) {
      throw new Error('RequestHandler instance is required.');
    }
    this._requestHandler = requestHandler;
  }
}

// --- End of File: src/tags/baseHandler.js ---
