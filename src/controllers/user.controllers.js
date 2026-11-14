import { v4 as uuidv4 } from "uuid";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ErrorCodeEnum, UserRolesEnum } from "../utils/constants.js";
import { hashPassword } from "../utils/passwordUtils.js";
import {
  formatUserResponse,
  validateUserCrossFieldRules,
} from "../utils/userUtils.js";
import db from "../db/index.js";

/**
 * GET /api/v1/users
 * Query params: role, teamId, q, page, limit
 */
export const getUsers = asyncHandler(async (req, res) => {
  const { role, teamId, q, page = 1, limit = 20 } = req.query;

  let users = await db.getAllUsers();

  if (role) {
    users = users.filter((u) => u.role === role);
  }

  if (teamId) {
    users = users.filter(
      (u) => Array.isArray(u.teams) && u.teams.some((t) => t.teamId === teamId),
    );
  }

  if (q) {
    const query = q.trim().toLowerCase();
    users = users.filter(
      (u) =>
        u.name.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query),
    );
  }

  const totalUsers = users.length;
  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const totalPages = Math.ceil(totalUsers / parsedLimit) || 1;
  const startIndex = (parsedPage - 1) * parsedLimit;
  const paginatedUsers = users.slice(startIndex, startIndex + parsedLimit);

  const items = await Promise.all(
    paginatedUsers.map((u) => formatUserResponse(u)),
  );

  res.status(200).json(
    new ApiResponse(
      200,
      {
        items,
        pagination: {
          page: parsedPage,
          limit: parsedLimit,
          total: totalUsers,
          totalPages,
          hasNextPage: parsedPage < totalPages,
          hasPreviousPage: parsedPage > 1,
        },
      },
      "Users fetched successfully",
    ),
  );
});

/**
 * GET /api/v1/users/:id
 */
export const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await db.getUserById(id);

  if (!user) {
    throw new ApiError(404, ErrorCodeEnum.NOT_FOUND, "User not found");
  }

  const userResponse = await formatUserResponse(user);

  res
    .status(200)
    .json(new ApiResponse(200, userResponse, "User fetched successfully"));
});

/**
 * POST /api/v1/users (OB only)
 */
export const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, obTitle, teams = [] } = req.body;

  // Cross-field rules validation
  await validateUserCrossFieldRules(role, obTitle, teams);

  // Email uniqueness
  const existingUser = await db.getUserByEmail(email);
  if (existingUser) {
    throw new ApiError(409, ErrorCodeEnum.CONFLICT, "Email already in use");
  }

  const hashedPassword = await hashPassword(password);
  const userObTitle = role === UserRolesEnum.OB ? obTitle || null : null;

  const newUser = {
    id: uuidv4(),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password: hashedPassword,
    role,
    obTitle: userObTitle,
    teams: Array.isArray(teams) ? teams : [],
    deletedAt: null,
  };

  await db.createUser(newUser);

  const userResponse = await formatUserResponse(newUser);

  res
    .status(201)
    .json(new ApiResponse(201, userResponse, "User created successfully"));
});

/**
 * PATCH /api/v1/users/:id (OB only)
 */
export const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, email, password, role, obTitle, teams } = req.body;

  // At least one allowed field must be provided
  const hasUpdates = [name, email, password, role, obTitle, teams].some(
    (field) => field !== undefined,
  );

  if (!hasUpdates) {
    throw new ApiError(
      400,
      ErrorCodeEnum.VALIDATION_ERROR,
      "At least one field is required to update",
    );
  }

  const user = await db.getUserById(id);
  if (!user) {
    throw new ApiError(404, ErrorCodeEnum.NOT_FOUND, "User not found");
  }

  // An OB cannot change their own role
  if (role !== undefined && req.user.id === user.id && role !== user.role) {
    throw new ApiError(
      403,
      ErrorCodeEnum.FORBIDDEN,
      "You cannot change your own role",
    );
  }

  // Cannot demote the last remaining OB
  if (
    role !== undefined &&
    user.role === UserRolesEnum.OB &&
    role !== UserRolesEnum.OB
  ) {
    const allUsers = await db.getAllUsers();
    const obCount = allUsers.filter((u) => u.role === UserRolesEnum.OB).length;
    if (obCount <= 1) {
      throw new ApiError(
        409,
        ErrorCodeEnum.CONFLICT,
        "Cannot demote the last remaining OB",
      );
    }
  }

  // Email uniqueness if email is changed
  if (email !== undefined && email.trim().toLowerCase() !== user.email) {
    const existing = await db.getUserByEmail(email);
    if (existing && existing.id !== user.id) {
      throw new ApiError(409, ErrorCodeEnum.CONFLICT, "Email already in use");
    }
  }

  // Compute final values for cross-field validation
  const finalRole = role !== undefined ? role : user.role;
  const finalObTitle =
    finalRole === UserRolesEnum.OB
      ? obTitle !== undefined
        ? obTitle
        : user.obTitle
      : null; // Changing role away from ob clears obTitle automatically

  const finalTeams = teams !== undefined ? teams : user.teams || [];

  // Validate cross-field rules on final result
  await validateUserCrossFieldRules(finalRole, finalObTitle, finalTeams);

  // Prepare updates
  const updates = {
    ...(name !== undefined && { name: name.trim() }),
    ...(email !== undefined && { email: email.trim().toLowerCase() }),
    ...(password !== undefined && {
      password: await hashPassword(password),
    }),
    role: finalRole,
    obTitle: finalObTitle,
    teams: finalTeams,
  };

  await db.updateUser(user.id, updates);

  const updatedUser = await db.getUserById(user.id);
  const userResponse = await formatUserResponse(updatedUser);

  res
    .status(200)
    .json(new ApiResponse(200, userResponse, "User updated successfully"));
});

/**
 * DELETE /api/v1/users/:id (OB only)
 */
export const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await db.getUserById(id);
  if (!user) {
    throw new ApiError(404, ErrorCodeEnum.NOT_FOUND, "User not found");
  }

  // You cannot delete yourself
  if (req.user.id === user.id) {
    throw new ApiError(
      409,
      ErrorCodeEnum.CONFLICT,
      "You cannot delete yourself",
    );
  }

  // Cannot delete the last remaining OB
  if (user.role === UserRolesEnum.OB) {
    const allUsers = await db.getAllUsers();
    const obCount = allUsers.filter((u) => u.role === UserRolesEnum.OB).length;
    if (obCount <= 1) {
      throw new ApiError(
        409,
        ErrorCodeEnum.CONFLICT,
        "You cannot delete the last OB",
      );
    }
  }

  await db.deleteUser(user.id);

  res.status(204).send();
});
