import { body, query } from "express-validator";

export const createCommentValidator = () => {
  return [
    body("content")
      .trim()
      .notEmpty()
      .withMessage("Content is required")
      .isLength({ min: 1, max: 1000 })
      .withMessage("Content must be between 1 and 1000 characters"),
    body("parentCommentId")
      .optional({ nullable: true })
      .trim(),
  ];
};

export const updateCommentValidator = () => {
  return [
    body("content")
      .trim()
      .notEmpty()
      .withMessage("Content is required")
      .isLength({ min: 1, max: 1000 })
      .withMessage("Content must be between 1 and 1000 characters"),
  ];
};

export const getCommentsQueryValidator = () => {
  return [
    query("parentCommentId")
      .optional()
      .trim(),
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
