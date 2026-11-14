import db from "../db/index.js";
import { ApiError } from "./apiError.js";
import {
  ErrorCodeEnum,
  UserRolesEnum,
  TeamPositionEnum,
} from "./constants.js";

/**
 * Checks whether a position is a lead or co-lead position.
 * @param {string} position
 * @returns {boolean}
 */
export const isLeadPosition = (position) =>
  position === TeamPositionEnum.LEAD || position === TeamPositionEnum.COLEAD;

/**
 * Checks whether a teams array has at least one lead or colead position.
 * @param {Array} teams
 * @returns {boolean}
 */
export const hasLeadOrColeadPosition = (teams) =>
  Array.isArray(teams) && teams.some((t) => isLeadPosition(t.position));

/**
 * Checks whether a user leads or co-leads a specific team.
 * @param {object} user - User object with teams array.
 * @param {string} teamId - Target team ID.
 * @returns {boolean}
 */
export const userLeadsTeam = (user, teamId) =>
  Array.isArray(user?.teams) &&
  user.teams.some((t) => t.teamId === teamId && isLeadPosition(t.position));

/**
 * Format a user object for API responses:
 * - Omits password and deletedAt
 * - Expands teams with teamId, teamName, position
 */
export const formatUserResponse = async (user) => {
  if (!user) return null;

  const { password: _password, deletedAt: _deletedAt, ...userWithoutPassword } = user;

  const userTeams = [];
  if (user.teams && user.teams.length > 0) {
    for (const userTeam of user.teams) {
      const team = await db.getTeamById(userTeam.teamId);
      if (team) {
        userTeams.push({
          teamId: team.id,
          teamName: team.name,
          position: userTeam.position,
        });
      }
    }
  }

  return {
    ...userWithoutPassword,
    teams: userTeams,
  };
};

/**
 * Validates cross-field rules for user creation and update per specs:
 * 1. role = "team_lead" needs at least one team with position lead or colead.
 * 2. A team with position lead or colead is only allowed if role = "team_lead".
 * 3. obTitle is only allowed when role = "ob".
 * 4. Every teamId must exist (else 404 NOT_FOUND).
 */
export const validateUserCrossFieldRules = async (role, obTitle, teams = []) => {
  const details = [];

  const hasLeadOrColead = hasLeadOrColeadPosition(teams);

  // 1. role = "team_lead" needs at least one team with position lead or colead.
  if (role === UserRolesEnum.TEAM_LEAD && !hasLeadOrColead) {
    details.push({
      field: "teams",
      issue: "role team_lead needs at least one team with position lead or colead",
    });
  }

  // 2. A team with position lead or colead is only allowed if role = "team_lead".
  if (role !== UserRolesEnum.TEAM_LEAD && hasLeadOrColead) {
    details.push({
      field: "teams",
      issue: "position lead or colead is only allowed if role is team_lead",
    });
  }

  // 3. obTitle is only allowed when role = "ob".
  if (role !== UserRolesEnum.OB && obTitle) {
    details.push({
      field: "obTitle",
      issue: "obTitle is only allowed when role is ob",
    });
  }

  if (details.length > 0) {
    throw new ApiError(
      400,
      ErrorCodeEnum.VALIDATION_ERROR,
      "Invalid user data",
      { details },
    );
  }

  // 4. Every teamId must exist (else 404 NOT_FOUND).
  if (Array.isArray(teams) && teams.length > 0) {
    for (const t of teams) {
      const team = await db.getTeamById(t.teamId);
      if (!team) {
        throw new ApiError(
          404,
          ErrorCodeEnum.NOT_FOUND,
          `Team with id '${t.teamId}' not found`,
        );
      }
    }
  }
};
