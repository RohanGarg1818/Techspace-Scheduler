import { Router } from "express";
import {
  getCommentById,
  updateComment,
  deleteComment,
} from "../controllers/comment.controllers.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validator.middleware.js";
import {
  updateCommentValidator,
  userParamValidator,
} from "../validators/index.js";

const router = Router();

// GET /api/v1/comments/:id (authenticated users)
router.get(
  "/:id",
  authenticate,
  userParamValidator("id"),
  validate,
  getCommentById,
);

// PATCH /api/v1/comments/:id (author only)
router.patch(
  "/:id",
  authenticate,
  userParamValidator("id"),
  updateCommentValidator(),
  validate,
  updateComment,
);

// DELETE /api/v1/comments/:id (author or OB)
router.delete(
  "/:id",
  authenticate,
  userParamValidator("id"),
  validate,
  deleteComment,
);

export default router;
