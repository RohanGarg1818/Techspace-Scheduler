import { v4 as uuidv4 } from "uuid";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ErrorCodeEnum, UserRolesEnum } from "../utils/constants.js";
import { formatTeamResponse } from "../utils/teamUtils.js";
import { isLeadPosition, hasLeadOrColeadPosition } from "../utils/userUtils.js";
import db from "../db/index.js";

/**
 * GET /api/v1/teams
 * Query param: type (optional: "core" | "subclub")
 */
export const getTeams = asyncHandler(async (req, res) => {
  const { type } = req.query;

  let teams = await db.getAllTeams();

  if (type) {
    teams = teams.filter((t) => t.type === type);
  }

  const allUsers = await db.getAllUsers();
  const items = await Promise.all(
    teams.map((t) => formatTeamResponse(t, false, allUsers)),
  );

  res.status(200).json(
    new ApiResponse(
      200,
      {
        items,
      },
      "Teams fetched successfully",
    ),
  );
});

/**
 * GET /api/v1/teams/:id
 */
export const getTeamById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const team = await db.getTeamById(id);
  if (!team) {
    throw new ApiError(404, ErrorCodeEnum.NOT_FOUND, "Team not found");
  }

  const teamResponse = await formatTeamResponse(team, true);

  res
    .status(200)
    .json(new ApiResponse(200, teamResponse, "Team fetched successfully"));
});

/**
 * POST /api/v1/teams (OB only)
 */
export const createTeam = asyncHandler(async (req, res) => {
  const { name, type, description } = req.body;

  const allTeams = await db.getAllTeams();
  const existing = allTeams.find(
    (t) => t.name.toLowerCase() === name.trim().toLowerCase(),
  );

  if (existing) {
    throw new ApiError(
      409,
      ErrorCodeEnum.CONFLICT,
      "Team with this name already exists",
    );
  }

  const newTeam = {
    id: uuidv4(),
    name: name.trim(),
    type,
    description: description ? description.trim() : null,
  };

  await db.createTeam(newTeam);

  const teamResponse = await formatTeamResponse(newTeam);

  res
    .status(201)
    .json(new ApiResponse(201, teamResponse, "Team created successfully"));
});

/**
 * PATCH /api/v1/teams/:id (OB only)
 */
export const updateTeam = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, type, description } = req.body;

  if (name === undefined && type === undefined && description === undefined) {
    throw new ApiError(
      400,
      ErrorCodeEnum.VALIDATION_ERROR,
      "At least one field is required to update",
    );
  }

  const team = await db.getTeamById(id);
  if (!team) {
    throw new ApiError(404, ErrorCodeEnum.NOT_FOUND, "Team not found");
  }

  if (
    name !== undefined &&
    name.trim().toLowerCase() !== team.name.toLowerCase()
  ) {
    const allTeams = await db.getAllTeams();
    const conflict = allTeams.find(
      (t) => t.id !== id && t.name.toLowerCase() === name.trim().toLowerCase(),
    );

    if (conflict) {
      throw new ApiError(
        409,
        ErrorCodeEnum.CONFLICT,
        "Team with this name already exists",
      );
    }
  }

  const updates = {
    ...(name !== undefined && { name: name.trim() }),
    ...(type !== undefined && { type }),
    ...(description !== undefined && {
      description: description ? description.trim() : null,
    }),
  };

  await db.updateTeam(id, updates);

  const updatedTeam = await db.getTeamById(id);
  const teamResponse = await formatTeamResponse(updatedTeam);

  res
    .status(200)
    .json(new ApiResponse(200, teamResponse, "Team updated successfully"));
});

/**
 * DELETE /api/v1/teams/:id (OB only)
 */
export const deleteTeam = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const team = await db.getTeamById(id);
  if (!team) {
    throw new ApiError(404, ErrorCodeEnum.NOT_FOUND, "Team not found");
  }

  // Check if deleting this team would leave any team_lead with no lead/colead team
  const allUsers = await db.getAllUsers();
  const orphanedLeads = allUsers.filter(
    (u) =>
      u.role === UserRolesEnum.TEAM_LEAD &&
      Array.isArray(u.teams) &&
      u.teams.some((t) => t.teamId === id && isLeadPosition(t.position)) &&
      !u.teams.some((t) => t.teamId !== id && isLeadPosition(t.position)),
  );

  if (orphanedLeads.length > 0) {
    throw new ApiError(
      409,
      ErrorCodeEnum.CONFLICT,
      `Cannot delete team: ${orphanedLeads.map((u) => u.name).join(", ")} would have no lead/colead team left`,
    );
  }

  // Check if team has upcoming scheduled meetings
  const allMeetings = await db.getAllMeetings();
  const today = new Date().toISOString().slice(0, 10);
  const hasUpcomingScheduled = allMeetings.some(
    (m) =>
      m.team && m.team.id === id && m.status === "scheduled" && m.date >= today,
  );

  if (hasUpcomingScheduled) {
    throw new ApiError(
      409,
      ErrorCodeEnum.CONFLICT,
      "Cannot delete team with upcoming scheduled meetings",
    );
  }

  // Remove this team from any user who belongs to it
  for (const user of allUsers) {
    if (Array.isArray(user.teams) && user.teams.some((t) => t.teamId === id)) {
      user.teams = user.teams.filter((t) => t.teamId !== id);
      await db.updateUser(user.id, { teams: user.teams });
    }
  }

  await db.deleteTeam(id);

  res.status(204).send();
});

/**
 * PUT /api/v1/teams/:id/members/:userId (OB only)
 * Add a person to a team or update their position
 */
export const addOrUpdateTeamMember = asyncHandler(async (req, res) => {
  const { id, userId } = req.params;
  const { position } = req.body;

  const team = await db.getTeamById(id);
  if (!team) {
    throw new ApiError(404, ErrorCodeEnum.NOT_FOUND, "Team not found");
  }

  const user = await db.getUserById(userId);
  if (!user) {
    throw new ApiError(404, ErrorCodeEnum.NOT_FOUND, "User not found");
  }

  // Rule: A team position of lead or colead is only allowed if role = "team_lead"
  if (isLeadPosition(position) && user.role !== UserRolesEnum.TEAM_LEAD) {
    throw new ApiError(
      400,
      ErrorCodeEnum.VALIDATION_ERROR,
      "User must have role 'team_lead' to be assigned as lead or colead",
    );
  }

  const userTeams = Array.isArray(user.teams) ? [...user.teams] : [];
  const existingIndex = userTeams.findIndex((t) => t.teamId === id);

  if (existingIndex >= 0) {
    userTeams[existingIndex] = { teamId: id, position };
  } else {
    userTeams.push({ teamId: id, position });
  }

  await db.updateUser(user.id, { teams: userTeams });

  const updatedTeam = await db.getTeamById(id);
  const teamResponse = await formatTeamResponse(updatedTeam, true);

  res
    .status(200)
    .json(
      new ApiResponse(200, teamResponse, "Team member updated successfully"),
    );
});

/**
 * DELETE /api/v1/teams/:id/members/:userId (OB only)
 * Remove a person from a team
 */
export const removeTeamMember = asyncHandler(async (req, res) => {
  const { id, userId } = req.params;

  const team = await db.getTeamById(id);
  if (!team) {
    throw new ApiError(404, ErrorCodeEnum.NOT_FOUND, "Team not found");
  }

  const user = await db.getUserById(userId);
  if (!user) {
    throw new ApiError(404, ErrorCodeEnum.NOT_FOUND, "User not found");
  }

  const isMember =
    Array.isArray(user.teams) && user.teams.some((t) => t.teamId === id);

  if (!isMember) {
    throw new ApiError(
      404,
      ErrorCodeEnum.NOT_FOUND,
      "User is not a member of this team",
    );
  }

  // Rule: role = "team_lead" needs at least one team with position lead or colead
  const remainingTeams = user.teams.filter((t) => t.teamId !== id);

  if (
    user.role === UserRolesEnum.TEAM_LEAD &&
    !hasLeadOrColeadPosition(remainingTeams)
  ) {
    throw new ApiError(
      400,
      ErrorCodeEnum.VALIDATION_ERROR,
      "Cannot remove user from team: user with role team_lead must remain lead or colead of at least one team",
    );
  }

  await db.updateUser(user.id, { teams: remainingTeams });

  res.status(204).send();
});
