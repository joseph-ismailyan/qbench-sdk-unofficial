// File: src/tags/project.js
import { BaseHandler } from './baseHandler.js';

export class ProjectHandler extends BaseHandler {
  /**
   * Retrieves a list of projects.
   * Corresponds to `GET /qbench/api/v2/projects`
   * @param {object} [params] Query parameters (e.g., { page_num, page_size }) using API's casing. Note: Spec lacks specific filters here.
   * @returns {Promise<object>} List response object (structure defined by QBench API).
   */
  async listProjects(params) {
    return this._requestHandler.request('GET', '/qbench/api/v2/projects', params);
  }

  /**
   * Retrieves a single project by its ID.
   * Corresponds to `GET /qbench/api/v2/projects/{project_id}`
   * @param {number} project_id The ID of the project.
   * @returns {Promise<object>} The project object (structure defined by QBench API).
   */
  async getProjectById(project_id) {
    if (!project_id) {
      throw new Error('Project ID is required.');
    }
    return this._requestHandler.request('GET', `/qbench/api/v2/projects/${project_id}`);
  }
}

// --- End of File: src/tags/project.js ---
