import { body, query, param } from "express-validator";
import {
  AvailableTeamPositions,
  AvailableTeamTypes,
} from "../utils/constants.js";

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
