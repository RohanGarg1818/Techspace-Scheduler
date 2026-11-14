import { Router } from "express";
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} from "../controllers/user.controllers.js";
import { authenticate, isOB } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validator.middleware.js";
import {
  createUserValidator,
  updateUserValidator,
  getUsersQueryValidator,
  userParamValidator,
} from "../validators/index.js";

const router = Router();

// Authenticated users can view users
router.get("/", authenticate, getUsersQueryValidator(), validate, getUsers);
router.get(
  "/:id",
  authenticate,
  userParamValidator("id"),
  validate,
  getUserById,
);

// OB only routes
router.post(
  "/",
  authenticate,
  isOB,
  createUserValidator(),
  validate,
  createUser,
);
router.patch(
  "/:id",
  authenticate,
  isOB,
  userParamValidator("id"),
  updateUserValidator(),
  validate,
  updateUser,
);
router.delete(
  "/:id",
  authenticate,
  isOB,
  userParamValidator("id"),
  validate,
  deleteUser,
);

export default router;
