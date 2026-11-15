import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { verifyToken } from "../utils/jwtUtils.js";
import { ErrorCodeEnum } from "../utils/constants.js";
import { assertCan, getPermission } from "../utils/access.js";
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
    if (user.passwordChangedAt && decoded.pwv !== user.passwordChangedAt) {
      throw new ApiError(
        401,
        ErrorCodeEnum.UNAUTHENTICATED,
        "Password was changed. Please log in again.",
      );
    }
    const { password: _password, ...safeUser } = user;
    req.user = safeUser;
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

export const can = (action) => {
  getPermission(action);
  return asyncHandler(async (req, res, next) => {
    assertCan(req.user, action);
    next();
  });
};
