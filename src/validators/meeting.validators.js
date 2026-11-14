import { body, query } from "express-validator";
import {
  AvailableMeetingTypes,
  AvailableMeetingStatuses,
} from "../utils/constants.js";

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
    body("teamId").optional({ nullable: true }).trim(),
    body("note").optional({ nullable: true }).trim(),
    body("location").optional({ nullable: true }).trim(),
    body("link")
      .optional({ nullable: true })
      .trim()
      .isURL()
      .withMessage("link must be a valid URL"),
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
    body("teamId").optional({ nullable: true }).trim(),
    body("note").optional({ nullable: true }).trim(),
    body("location").optional({ nullable: true }).trim(),
    body("link")
      .optional({ nullable: true })
      .trim()
      .isURL()
      .withMessage("link must be a valid URL"),
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
    body("excludeMeetingId").optional({ nullable: true }).trim(),
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
    query("teamId").optional().trim(),
    query("status")
      .optional()
      .isIn([...AvailableMeetingStatuses, "all"])
      .withMessage(
        `Status must be one of: ${[...AvailableMeetingStatuses, "all"].join(", ")}`,
      ),
  ];
};
