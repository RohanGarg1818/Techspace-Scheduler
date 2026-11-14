import { validationResult } from "express-validator";
import { ApiError } from "../utils/apiError.js";
import { ErrorCodeEnum } from "../utils/constants.js";

export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }

  const details = errors.array().map((err) => ({
    field: err.path || err.param,
    issue: err.msg,
  }));

  throw new ApiError(
    400,
    ErrorCodeEnum.VALIDATION_ERROR,
    details[0]?.issue || "Validation failed",
    { details },
  );
};
