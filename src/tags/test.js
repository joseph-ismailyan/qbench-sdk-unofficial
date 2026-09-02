// File: src/tags/test.js
import { BaseHandler } from './baseHandler.js';

export class TestHandler extends BaseHandler {
  /**
   * Retrieves a list of tests.
   * Corresponds to `GET /qbench/api/v2/tests`
   * @param {object} [params] Query parameters for filtering/pagination (e.g., { page_num, page_size, sample_ids, assay_ids, statuses }) using API's casing.
   * @returns {Promise<object>} List response object (structure defined by QBench API).
   */
  async listTests(params) {
    return this._requestHandler.request('GET', '/qbench/api/v2/tests', params);
  }

  /**
   * Creates a list of new tests.
   * Corresponds to `POST /qbench/api/v2/tests`
   * @param {Array<object>} testsData An array of test objects to create (structure defined by CreateTestSchema). Use API's casing for keys (e.g., sample_id, assay_id).
   * @returns {Promise<object>} Response object containing created tests (structure defined by QBench API).
   */
  async createTests(testsData) {
    if (!Array.isArray(testsData) || testsData.length === 0) {
      throw new Error('testsData must be a non-empty array.');
    }
    return this._requestHandler.request('POST', '/qbench/api/v2/tests', null, testsData);
  }

  /**
   * Updates a list of existing tests.
   * Corresponds to `PATCH /qbench/api/v2/tests`
   * @param {Array<object>} testsUpdates An array of test update objects (must include 'id', structure defined by UpdateTestSchema). Use API's casing for keys.
   * @returns {Promise<object>} Response object containing updated tests (structure defined by QBench API).
   */
  async updateTests(testsUpdates) {
    if (!Array.isArray(testsUpdates) || testsUpdates.length === 0) {
      throw new Error('testsUpdates must be a non-empty array.');
    }
    if (!testsUpdates.every((item) => item && typeof item === 'object' && item.id !== undefined)) {
      throw new Error("Each item in testsUpdates must be an object with an 'id' property.");
    }
    return this._requestHandler.request('PATCH', '/qbench/api/v2/tests', null, testsUpdates);
  }

  /**
   * Updates worksheet data for multiple tests using dynamic named cells.
   * Corresponds to `PATCH /qbench/api/v2/tests/worksheets/dynamic/named-cells`
   * @param {Array<object>} worksheetUpdates Array of objects, each containing test 'id' and 'qb_dynamic_spreadsheet_patch' data. Use API's casing.
   * @returns {Promise<null>} Resolves with null on success (204 No Content).
   */
  async updateTestWorksheetNamedCells(worksheetUpdates) {
    if (!Array.isArray(worksheetUpdates) || worksheetUpdates.length === 0) {
      throw new Error('worksheetUpdates must be a non-empty array.');
    }
    if (
      !worksheetUpdates.every(
        (item) =>
          item &&
          typeof item === 'object' &&
          item.id !== undefined &&
          item.qb_dynamic_spreadsheet_patch !== undefined
      )
    ) {
      throw new Error(
        "Each item in worksheetUpdates must be an object with 'id' and 'qb_dynamic_spreadsheet_patch' properties."
      );
    }
    return this._requestHandler.request(
      'PATCH',
      '/qbench/api/v2/tests/worksheets/dynamic/named-cells',
      null,
      worksheetUpdates
    );
  }

  /**
   * Retrieves a single test by its ID.
   * Corresponds to `GET /qbench/api/v2/tests/{test_id}`
   * @param {number} test_id The ID of the test.
   * @returns {Promise<object>} The test object (structure defined by QBench API).
   */
  async getTestById(test_id) {
    if (!test_id) {
      throw new Error('Test ID is required.');
    }
    return this._requestHandler.request('GET', `/qbench/api/v2/tests/${test_id}`);
  }

  /**
   * Deletes a single test by its ID.
   * Corresponds to `DELETE /qbench/api/v2/tests/{test_id}`
   * @param {number} test_id The ID of the test to delete.
   * @returns {Promise<null>} Resolves with null on success (204 No Content).
   */
  async deleteTest(test_id) {
    if (!test_id) {
      throw new Error('Test ID is required.');
    }
    return this._requestHandler.request('DELETE', `/qbench/api/v2/tests/${test_id}`);
  }

  /**
   * Retrieves a paginated list of Attachments associated with a specific Test.
   * Corresponds to `GET /qbench/api/v2/tests/{test_id}/attachments`
   * @param {number} test_id The ID of the test.
   * @param {object} [params] Query parameters for pagination (e.g., { page_num, page_size }) using API's casing.
   * @returns {Promise<object>} List response object containing attachments (structure defined by QBench API).
   */
  async listAttachmentsForTest(test_id, params) {
    if (!test_id) {
      throw new Error('Test ID is required.');
    }
    return this._requestHandler.request(
      'GET',
      `/qbench/api/v2/tests/${test_id}/attachments`,
      params
    );
  }

  /**
   * Retrieves a paginated list of Batches associated with a specific Test.
   * Corresponds to `GET /qbench/api/v2/tests/{test_id}/batches`
   * @param {number} test_id The ID of the test.
   * @param {object} [params] Query parameters for filtering/pagination (e.g., { page_num, page_size }) using API's casing.
   * @returns {Promise<object>} List response object containing batches (structure defined by QBench API).
   */
  async listBatchesForTest(test_id, params) {
    if (!test_id) {
      throw new Error('Test ID is required.');
    }
    return this._requestHandler.request('GET', `/qbench/api/v2/tests/${test_id}/batches`, params);
  }

  /**
   * Retrieves a paginated list of Reports associated with a specific Test.
   * Corresponds to `GET /qbench/api/v2/tests/{test_id}/reports`
   * @param {number} test_id The ID of the test.
   * @param {object} [params] Query parameters for filtering/pagination (e.g., { page_num, page_size }) using API's casing.
   * @returns {Promise<object>} List response object containing reports (structure defined by QBench API).
   */
  async listReportsForTest(test_id, params) {
    if (!test_id) {
      throw new Error('Test ID is required.');
    }
    return this._requestHandler.request('GET', `/qbench/api/v2/tests/${test_id}/reports`, params);
  }

  /**
   * Retrieves worksheet data associated with a specific Test.
   *
   * Corresponds to `GET /qbench/api/v2/tests/{test_id}/worksheet/data`
   *
   * Response shape (verified against sandbox 2026-04):
   *   {
   *     data: {
   *       id: <test_id>,
   *       worksheet_data: {
   *         <field_name>: { html_style, value, ...formula bits },
   *         ...
   *       },
   *       worksheet_processed: boolean,
   *       worksheet_processed_error: boolean,
   *       worksheet_processed_error_msg: string|null,
   *     }
   *   }
   *
   * Each cell is wrapped — the actual value lives at
   * `data.worksheet_data[field].value`. For most callers it's easier to use
   * {@link TestHandler#getTestWorksheetCells}, which unwraps this for you.
   *
   * @param {number} test_id
   * @param {object} [params] e.g. `{ raw_worksheet_data, worksheet_config }`
   * @returns {Promise<object>} Wrapped raw response.
   */
  async getTestWorksheetData(test_id, params) {
    if (!test_id) {
      throw new Error('Test ID is required.');
    }
    return this._requestHandler.request(
      'GET',
      `/qbench/api/v2/tests/${test_id}/worksheet/data`,
      params
    );
  }

  /**
   * Convenience wrapper around {@link TestHandler#getTestWorksheetData} that
   * returns a flat `{ <field>: <value> }` map of the worksheet cells. Each
   * value is the inner `.value` of QBench's `{ html_style, value }` cell —
   * a string when populated or `null` when the cell is empty.
   *
   * @param {number} test_id
   * @returns {Promise<Record<string, string|null>>}
   */
  async getTestWorksheetCells(test_id) {
    const wrapped = await this.getTestWorksheetData(test_id);
    const inner = wrapped && typeof wrapped === 'object' && wrapped.data && typeof wrapped.data === 'object'
      ? wrapped.data
      : wrapped;
    const cells = inner && typeof inner === 'object' ? inner.worksheet_data : undefined;
    if (!cells || typeof cells !== 'object') return {};

    const flat = {};
    for (const [name, cell] of Object.entries(cells)) {
      if (cell && typeof cell === 'object' && 'value' in cell) {
        flat[name] = cell.value === undefined ? null : cell.value;
      } else {
        // Defensive: if the cell isn't shaped like {value, ...}, surface
        // whatever it is so the caller can decide what to do.
        flat[name] = cell ?? null;
      }
    }
    return flat;
  }
}

// --- End of File: src/tags/test.js ---
