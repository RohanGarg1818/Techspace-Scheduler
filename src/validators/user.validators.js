import { body, query, param } from "express-validator";
import {
  AvailableUserRoles,
  AvailableTeamPositions,
} from "../utils/constants.js";

export const createUserValidator = () => {
  return [
    body("name")
      .trim()
      .notEmpty()
      .withMessage("Name is required")
      .isLength({ min: 1, max: 100 })
      .withMessage("Name must be between 1 and 100 characters"),
    body("email")
      .trim()
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Invalid email address"),
    body("password")
      .trim()
      .notEmpty()
      .withMessage("Password is required")
      .isLength({ min: 8, max: 100 })
      .withMessage("Password must be at least 8 characters"),
    body("role")
      .trim()
      .notEmpty()
      .withMessage("Role is required")
      .isIn(AvailableUserRoles)
      .withMessage(`Role must be one of: ${AvailableUserRoles.join(", ")}`),
    body("obTitle")
      .optional({ nullable: true })
      .trim(),
    body("teams")
      .optional()
      .isArray()
      .withMessage("teams must be an array"),
    body("teams.*.teamId")
      .trim()
      .notEmpty()
      .withMessage("teamId is required for each team"),
    body("teams.*.position")
      .trim()
      .notEmpty()
      .withMessage("position is required for each team")
      .isIn(AvailableTeamPositions)
      .withMessage(
        `Position must be one of: ${AvailableTeamPositions.join(", ")}`,
      ),
  ];
};

export const updateUserValidator = () => {
  return [
    body("name")
      .optional()
      .trim()
      .notEmpty()
      .withMessage("Name cannot be empty")
      .isLength({ min: 1, max: 100 })
      .withMessage("Name must be between 1 and 100 characters"),
    body("email")
      .optional()
      .trim()
      .notEmpty()
      .withMessage("Email cannot be empty")
      .isEmail()
      .withMessage("Invalid email address"),
    body("password")
      .optional()
      .trim()
      .notEmpty()
      .withMessage("Password cannot be empty")
      .isLength({ min: 8, max: 100 })
      .withMessage("Password must be at least 8 characters"),
    body("role")
      .optional()
      .trim()
      .notEmpty()
      .withMessage("Role cannot be empty")
      .isIn(AvailableUserRoles)
      .withMessage(`Role must be one of: ${AvailableUserRoles.join(", ")}`),
    body("obTitle")
      .optional({ nullable: true })
      .trim(),
    body("teams")
      .optional()
      .isArray()
      .withMessage("teams must be an array"),
    body("teams.*.teamId")
      .trim()
      .notEmpty()
      .withMessage("teamId is required for each team"),
    body("teams.*.position")
      .trim()
      .notEmpty()
      .withMessage("position is required for each team")
      .isIn(AvailableTeamPositions)
      .withMessage(
        `Position must be one of: ${AvailableTeamPositions.join(", ")}`,
      ),
  ];
};

export const getUsersQueryValidator = () => {
  return [
    query("role")
      .optional()
      .isIn(AvailableUserRoles)
      .withMessage(`Role must be one of: ${AvailableUserRoles.join(", ")}`),
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
  ];
};

export const userParamValidator = (paramName = "id") => {
  return [
    param(paramName)
      .trim()
      .notEmpty()
      .withMessage(`${paramName} is required`),
  ];
};
