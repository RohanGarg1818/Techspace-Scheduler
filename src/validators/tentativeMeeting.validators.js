import { body, query } from "express-validator";

export const createTentativeMeetingValidator = () => {
  return [
    body("topic")
      .trim()
      .notEmpty()
      .withMessage("Topic is required")
      .isLength({ min: 1, max: 200 })
      .withMessage("Topic must be between 1 and 200 characters"),
    body("startDate")
      .trim()
      .notEmpty()
      .withMessage("Start date is required")
      .matches(/^\d{4}-\d{2}-\d{2}$/)
      .withMessage("Start date must be in YYYY-MM-DD format"),
    body("endDate")
      .trim()
      .notEmpty()
      .withMessage("End date is required")
      .matches(/^\d{4}-\d{2}-\d{2}$/)
      .withMessage("End date must be in YYYY-MM-DD format"),
    body("startTime")
      .optional({ nullable: true })
      .trim()
      .matches(/^([01]\d|2[0-3]):[0-5]\d$/)
      .withMessage("Start time must be in HH:mm 24-hour format"),
    body("endTime")
      .optional({ nullable: true })
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

export const updateTentativeMeetingValidator = () => {
  return [
    body("topic")
      .optional()
      .trim()
      .notEmpty()
      .withMessage("Topic cannot be empty")
      .isLength({ min: 1, max: 200 })
      .withMessage("Topic must be between 1 and 200 characters"),
    body("startDate")
      .optional()
      .trim()
      .matches(/^\d{4}-\d{2}-\d{2}$/)
      .withMessage("Start date must be in YYYY-MM-DD format"),
    body("endDate")
      .optional()
      .trim()
      .matches(/^\d{4}-\d{2}-\d{2}$/)
      .withMessage("End date must be in YYYY-MM-DD format"),
    body("startTime")
      .optional({ nullable: true })
      .trim()
      .matches(/^([01]\d|2[0-3]):[0-5]\d$/)
      .withMessage("Start time must be in HH:mm 24-hour format"),
    body("endTime")
      .optional({ nullable: true })
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

export const getTentativeMeetingsQueryValidator = () => {
  return [
    query("from")
      .optional()
      .trim()
      .matches(/^\d{4}-\d{2}-\d{2}$/)
      .withMessage("'from' must be in YYYY-MM-DD format"),
    query("to")
      .optional()
      .trim()
      .matches(/^\d{4}-\d{2}-\d{2}$/)
      .withMessage("'to' must be in YYYY-MM-DD format"),
    query("teamId").optional().trim(),
    query("status")
      .optional()
      .isIn(["scheduled", "cancelled", "all"])
      .withMessage("Status must be one of: scheduled, cancelled, all"),
  ];
};
