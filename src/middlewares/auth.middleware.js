import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { verifyToken } from "../utils/jwtUtils.js";
import { ErrorCodeEnum } from "../utils/constants.js";
import db from "../db/index.js";

export const authenticate = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new ApiError(
      401,
      ErrorCodeEnum.UNAUTHENTICATED,
      "Authentication required",
    );
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = verifyToken(token);
    const user = await db.getUserById(decoded.id);

    if (!user) {
      throw new ApiError(
        401,
        ErrorCodeEnum.UNAUTHENTICATED,
        "User no longer exists",
      );
    }
    req.user = user;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      throw new ApiError(401, ErrorCodeEnum.UNAUTHENTICATED, "Invalid token");
    }
    if (error.name === "TokenExpiredError") {
      throw new ApiError(401, ErrorCodeEnum.UNAUTHENTICATED, "Token expired");
    }
    throw error;
  }
});

/**
 * Middleware to check if user has required role(s)
 * @param {string[]} allowedRoles - Array of allowed roles
 */
export const authorize = (...allowedRoles) => {
  return asyncHandler(async (req, res, next) => {
    if (!req.user) {
      throw new ApiError(
        401,
        ErrorCodeEnum.UNAUTHENTICATED,
        "Authentication required",
      );
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new ApiError(
        403,
        ErrorCodeEnum.FORBIDDEN,
        "You don't have permission to perform this action",
      );
    }

    next();
  });
};

export const isOB = authorize("ob");

export const isOBOrTeamLead = authorize("ob", "team_lead");
