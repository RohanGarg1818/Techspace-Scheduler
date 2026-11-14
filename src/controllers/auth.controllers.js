import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ErrorCodeEnum } from "../utils/constants.js";
import { hashPassword, comparePassword } from "../utils/passwordUtils.js";
import { generateTokenWithPasswordVersion } from "../utils/jwtUtils.js";
import { formatUserResponse } from "../utils/userUtils.js";
import db from "../db/index.js";

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

  const token = generateTokenWithPasswordVersion(user);

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

  const userWithPassword = await db.getUserByEmail(req.user.email);

  const isPasswordValid = await comparePassword(
    currentPassword,
    userWithPassword.password,
  );

  if (!isPasswordValid) {
    throw new ApiError(
      401,
      ErrorCodeEnum.UNAUTHENTICATED,
      "Current password is incorrect",
    );
  }

  const hashedPassword = await hashPassword(newPassword);
  await db.updateUser(req.user.id, {
    password: hashedPassword,
    passwordChangedAt: Date.now(),
  });

  res.status(204).send();
});
