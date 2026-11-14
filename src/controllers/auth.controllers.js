import { v4 as uuidv4 } from "uuid";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ErrorCodeEnum, UserRolesEnum } from "../utils/constants.js";
import { hashPassword, comparePassword } from "../utils/passwordUtils.js";
import { generateToken } from "../utils/jwtUtils.js";
import db from "../db/index.js";

const formatUserResponse = async (user) => {
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
 * POST /api/v1/auth/signup
 */
export const signup = asyncHandler(async (req, res) => {
  const { email, name, password, role, obTitle, teams } = req.body;

  const existingUser = await db.getUserByEmail(email);
  if (existingUser) {
    throw new ApiError(
      409,
      ErrorCodeEnum.CONFLICT,
      "User with this email already exists",
    );
  }

  const hashedPassword = await hashPassword(password);
  const userRole = role || UserRolesEnum.MEMBER;
  const userObTitle = userRole === UserRolesEnum.OB ? obTitle || null : null;

  const newUser = {
    id: uuidv4(),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password: hashedPassword,
    role: userRole,
    obTitle: userObTitle,
    teams: Array.isArray(teams) ? teams : [],
    deletedAt: null,
  };

  await db.createUser(newUser);

  const token = generateToken({
    id: newUser.id,
    email: newUser.email,
    role: newUser.role,
  });

  const userResponse = await formatUserResponse(newUser);

  res.status(201).json(
    new ApiResponse(
      201,
      {
        token,
        user: userResponse,
      },
      "User registered successfully",
    ),
  );
});

/**
 * POST /api/v1/auth/login
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await db.getUserByEmail(email);
  if (!user) {
    throw new ApiError(
      401,
      ErrorCodeEnum.UNAUTHENTICATED,
      "Invalid email or password",
    );
  }

  const isPasswordValid = await comparePassword(password, user.password);
  if (!isPasswordValid) {
    throw new ApiError(
      401,
      ErrorCodeEnum.UNAUTHENTICATED,
      "Invalid email or password",
    );
  }

  const token = generateToken({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  const userResponse = await formatUserResponse(user);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        token,
        user: userResponse,
      },
      "Login successful",
    ),
  );
});

/**
 * GET /api/v1/auth/me
 */
export const getCurrentUser = asyncHandler(async (req, res) => {
  const userResponse = await formatUserResponse(req.user);

  return res
    .status(200)
    .json(new ApiResponse(200, userResponse, "User fetched successfully"));
});

/**
 * POST /api/v1/auth/change-password
 */
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const isPasswordValid = await comparePassword(
    currentPassword,
    req.user.password,
  );

  if (!isPasswordValid) {
    throw new ApiError(
      401,
      ErrorCodeEnum.UNAUTHENTICATED,
      "Current password is incorrect",
    );
  }

  const hashedPassword = await hashPassword(newPassword);
  await db.updateUser(req.user.id, { password: hashedPassword });

  return res
    .status(204)
    .json(new ApiResponse(204, {}, "Password changed successfully"));
});
