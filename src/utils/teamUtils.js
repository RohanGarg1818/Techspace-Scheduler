import db from "../db/index.js";
import { isLeadPosition } from "./userUtils.js";

/**
 * Format a Team object for responses per specs:
 * - id, name, type, description
 * - leads: [{ id, name }] for leads and co-leads
 * - memberCount: number of active members
 * - members: [{ id, name, position }] (only if includeMembers is true)
 */
export const formatTeamResponse = async (team, includeMembers = false) => {
  if (!team) return null;

  const allUsers = await db.getAllUsers();

  const teamMembers = [];
  const leads = [];

  for (const user of allUsers) {
    if (Array.isArray(user.teams)) {
      const userTeam = user.teams.find((t) => t.teamId === team.id);
      if (userTeam) {
        teamMembers.push({
          id: user.id,
          name: user.name,
          position: userTeam.position,
        });

        if (isLeadPosition(userTeam.position)) {
          leads.push({
            id: user.id,
            name: user.name,
          });
        }
      }
    }
  }

  const response = {
    id: team.id,
    name: team.name,
    type: team.type,
    description: team.description ?? null,
    leads,
    memberCount: teamMembers.length,
  };

  if (includeMembers) {
    response.members = teamMembers;
  }

  return response;
};