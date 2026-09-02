// File: src/tags/team.js
import { BaseHandler } from './baseHandler.js';

export class TeamHandler extends BaseHandler {
  /**
   * Retrieves a list of teams.
   * Corresponds to `GET /qbench/api/v2/teams`
   * @param {object} [params] Query parameters (e.g., { page_num, page_size }) using API's casing.
   * @returns {Promise<object>} List response object (structure defined by QBench API).
   */
  async listTeams(params) {
    return this._requestHandler.request('GET', '/qbench/api/v2/teams', params);
  }

  /**
   * Retrieves a single team by its ID.
   * Corresponds to `GET /qbench/api/v2/teams/{team_id}`
   * @param {number} team_id The ID of the team.
   * @returns {Promise<object>} The team object (structure defined by QBench API).
   */
  async getTeamById(team_id) {
    if (!team_id) {
      throw new Error('Team ID is required.');
    }
    return this._requestHandler.request('GET', `/qbench/api/v2/teams/${team_id}`);
  }
}

// --- End of File: src/tags/team.js ---
