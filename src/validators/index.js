import { body, query, param } from "express-validator";
import {
  AvailableUserRoles,
  AvailableTeamPositions,
  AvailableTeamTypes,
  AvailableMeetingTypes,
  AvailableMeetingStatuses,
} from "../utils/constants.js";

export const userLoginValidator = () => {
  return [
    body("email")
      .trim()
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Invalid email address"),
    body("password")
      .trim()
      .notEmpty()
      .withMessage("Password is required"),
  ];
};

export const userChangeCurrentPasswordValidator = () => {
  return [
    body("currentPassword")
      .trim()
      .notEmpty()
      .withMessage("Current password is required"),
    body("newPassword")
      .trim()
      .notEmpty()
      .withMessage("New password is required")
      .isLength({ min: 8, max: 100 })
      .withMessage("New password must be at least 8 characters"),
  ];
};

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

export const createTeamValidator = () => {
  return [
    body("name")
      .trim()
      .notEmpty()
      .withMessage("Team name is required")
      .isLength({ min: 1, max: 100 })
      .withMessage("Team name must be between 1 and 100 characters"),
    body("type")
      .trim()
      .notEmpty()
      .withMessage("Team type is required")
      .isIn(AvailableTeamTypes)
      .withMessage(`Team type must be one of: ${AvailableTeamTypes.join(", ")}`),
    body("description")
      .optional({ nullable: true })
      .trim(),
  ];
};

export const updateTeamValidator = () => {
  return [
    body("name")
      .optional()
      .trim()
      .notEmpty()
      .withMessage("Team name cannot be empty")
      .isLength({ min: 1, max: 100 })
      .withMessage("Team name must be between 1 and 100 characters"),
    body("type")
      .optional()
      .trim()
      .notEmpty()
      .withMessage("Team type cannot be empty")
      .isIn(AvailableTeamTypes)
      .withMessage(`Team type must be one of: ${AvailableTeamTypes.join(", ")}`),
    body("description")
      .optional({ nullable: true })
      .trim(),
  ];
};

export const getTeamsQueryValidator = () => {
  return [
    query("type")
      .optional()
      .isIn(AvailableTeamTypes)
      .withMessage(`Type must be one of: ${AvailableTeamTypes.join(", ")}`),
  ];
};

export const teamMemberValidator = () => {
  return [
    body("position")
      .trim()
      .notEmpty()
      .withMessage("Position is required")
      .isIn(AvailableTeamPositions)
      .withMessage(
        `Position must be one of: ${AvailableTeamPositions.join(", ")}`,
      ),
  ];
};

export const teamMemberParamsValidator = () => {
  return [
    param("id")
      .trim()
      .notEmpty()
      .withMessage("Team ID is required"),
    param("userId")
      .trim()
      .notEmpty()
      .withMessage("User ID is required"),
  ];
};

export const createMeetingValidator = () => {
  return [
    body("topic")
      .trim()
      .notEmpty()
      .withMessage("Topic is required")
      .isLength({ min: 1, max: 200 })
      .withMessage("Topic must be between 1 and 200 characters"),
    body("date")
      .trim()
      .notEmpty()
      .withMessage("Date is required")
      .matches(/^\d{4}-\d{2}-\d{2}$/)
      .withMessage("Date must be in YYYY-MM-DD format"),
    body("startTime")
      .trim()
      .notEmpty()
      .withMessage("Start time is required")
      .matches(/^([01]\d|2[0-3]):[0-5]\d$/)
      .withMessage("Start time must be in HH:mm 24-hour format"),
    body("endTime")
      .trim()
      .notEmpty()
      .withMessage("End time is required")
      .matches(/^([01]\d|2[0-3]):[0-5]\d$/)
      .withMessage("End time must be in HH:mm 24-hour format"),
    body("teamId")
      .optional({ nullable: true })
      .trim(),
    body("note")
      .optional({ nullable: true })
      .trim(),
    body("location")
      .optional({ nullable: true })
      .trim(),
    body("link")
      .optional({ nullable: true })
      .trim(),
  ];
};

export const updateMeetingValidator = () => {
  return [
    body("topic")
      .optional()
      .trim()
      .notEmpty()
      .withMessage("Topic cannot be empty")
      .isLength({ min: 1, max: 200 })
      .withMessage("Topic must be between 1 and 200 characters"),
    body("date")
      .optional()
      .trim()
      .matches(/^\d{4}-\d{2}-\d{2}$/)
      .withMessage("Date must be in YYYY-MM-DD format"),
    body("startTime")
      .optional()
      .trim()
      .matches(/^([01]\d|2[0-3]):[0-5]\d$/)
      .withMessage("Start time must be in HH:mm 24-hour format"),
    body("endTime")
      .optional()
      .trim()
      .matches(/^([01]\d|2[0-3]):[0-5]\d$/)
      .withMessage("End time must be in HH:mm 24-hour format"),
    body("teamId")
      .optional({ nullable: true })
      .trim(),
    body("note")
      .optional({ nullable: true })
      .trim(),
    body("location")
      .optional({ nullable: true })
      .trim(),
    body("link")
      .optional({ nullable: true })
      .trim(),
  ];
};

export const checkClashValidator = () => {
  return [
    body("date")
      .trim()
      .notEmpty()
      .withMessage("Date is required")
      .matches(/^\d{4}-\d{2}-\d{2}$/)
      .withMessage("Date must be in YYYY-MM-DD format"),
    body("startTime")
      .trim()
      .notEmpty()
      .withMessage("Start time is required")
      .matches(/^([01]\d|2[0-3]):[0-5]\d$/)
      .withMessage("Start time must be in HH:mm 24-hour format"),
    body("endTime")
      .trim()
      .notEmpty()
      .withMessage("End time is required")
      .matches(/^([01]\d|2[0-3]):[0-5]\d$/)
      .withMessage("End time must be in HH:mm 24-hour format"),
    body("excludeMeetingId")
      .optional({ nullable: true })
      .trim(),
  ];
};

export const getMeetingsQueryValidator = () => {
  return [
    query("from")
      .trim()
      .notEmpty()
      .withMessage("'from' query parameter is required (YYYY-MM-DD)")
      .matches(/^\d{4}-\d{2}-\d{2}$/)
      .withMessage("'from' must be in YYYY-MM-DD format"),
    query("to")
      .trim()
      .notEmpty()
      .withMessage("'to' query parameter is required (YYYY-MM-DD)")
      .matches(/^\d{4}-\d{2}-\d{2}$/)
      .withMessage("'to' must be in YYYY-MM-DD format"),
    query("type")
      .optional()
      .isIn(AvailableMeetingTypes)
      .withMessage(`Type must be one of: ${AvailableMeetingTypes.join(", ")}`),
    query("teamId")
      .optional()
      .trim(),
    query("status")
      .optional()
      .isIn([...AvailableMeetingStatuses, "all"])
      .withMessage(`Status must be one of: ${[...AvailableMeetingStatuses, "all"].join(", ")}`),
  ];
};


