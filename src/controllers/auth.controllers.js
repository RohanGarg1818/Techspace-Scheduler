import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ErrorCodeEnum } from "../utils/constants.js";
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
 * POST /api/v1/auth/login
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(
      400,
      ErrorCodeEnum.VALIDATION_ERROR,
      "Email and password are required",
      {
        details: [
          ...(!email ? [{ field: "email", issue: "Email is required" }] : []),
          ...(!password
            ? [{ field: "password", issue: "Password is required" }]
            : []),
        ],
      },
    );
  }

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

  res
    .status(200)
    .json(new ApiResponse(200, userResponse, "User fetched successfully"));
});

/**
 * POST /api/v1/auth/change-password
 */
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new ApiError(
      400,
      ErrorCodeEnum.VALIDATION_ERROR,
      "Current password and new password are required",
      {
        details: [
          ...(!currentPassword
            ? [
              {
                field: "currentPassword",
                issue: "Current password is required",
              },
            ]
            : []),
          ...(!newPassword
            ? [{ field: "newPassword", issue: "New password is required" }]
            : []),
        ],
      },
    );
  }

  if (newPassword.length < 8) {
    throw new ApiError(
      400,
      ErrorCodeEnum.VALIDATION_ERROR,
      "New password must be at least 8 characters",
      {
        details: [
          { field: "newPassword", issue: "Must be at least 8 characters" },
        ],
      },
    );
  }

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

  res.status(204).send();
});
