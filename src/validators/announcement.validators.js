import { body, query } from "express-validator";
import {
  AvailableAnnouncementTypes,
  AvailableAnnouncementPriorities,
} from "../utils/constants.js";

export const createAnnouncementValidator = () => {
  return [
    body("title")
      .trim()
      .notEmpty()
      .withMessage("Title is required")
      .isLength({ min: 1, max: 150 })
      .withMessage("Title must be between 1 and 150 characters"),
    body("content").trim().notEmpty().withMessage("Content is required"),
    body("priority")
      .optional()
      .isIn(AvailableAnnouncementPriorities)
      .withMessage(
        `Priority must be one of: ${AvailableAnnouncementPriorities.join(", ")}`,
      ),
    body("isPinned")
      .optional()
      .isBoolean()
      .withMessage("isPinned must be a boolean"),
    body("teamId").optional({ nullable: true }).trim(),
  ];
};

export const updateAnnouncementValidator = () => {
  return [
    body("title")
      .optional()
      .trim()
      .notEmpty()
      .withMessage("Title cannot be empty")
      .isLength({ min: 1, max: 150 })
      .withMessage("Title must be between 1 and 150 characters"),
    body("content")
      .optional()
      .trim()
      .notEmpty()
      .withMessage("Content cannot be empty"),
    body("priority")
      .optional()
      .isIn(AvailableAnnouncementPriorities)
      .withMessage(
        `Priority must be one of: ${AvailableAnnouncementPriorities.join(", ")}`,
      ),
    body("isPinned")
      .optional()
      .isBoolean()
      .withMessage("isPinned must be a boolean"),
  ];
};

export const getAnnouncementsQueryValidator = () => {
  return [
    query("type")
      .optional()
      .isIn(AvailableAnnouncementTypes)
      .withMessage(
        `Type must be one of: ${AvailableAnnouncementTypes.join(", ")}`,
      ),
    query("teamId").optional().trim(),
    query("isPinned")
      .optional()
      .isIn(["true", "false"])
      .withMessage("isPinned must be 'true' or 'false'"),
    query("priority")
      .optional()
      .isIn(AvailableAnnouncementPriorities)
      .withMessage(
        `Priority must be one of: ${AvailableAnnouncementPriorities.join(", ")}`,
      ),
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
