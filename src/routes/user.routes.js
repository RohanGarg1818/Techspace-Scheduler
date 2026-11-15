import { Router } from "express";
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} from "../controllers/user.controllers.js";
import { authenticate, can } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validator.middleware.js";
import {
  createUserValidator,
  updateUserValidator,
  getUsersQueryValidator,
  userParamValidator,
} from "../validators/index.js";

const router = Router();

router.get(
  "/",
  authenticate,
  can("users.list"),
  getUsersQueryValidator(),
  validate,
  getUsers,
);
router.get(
  "/:id",
  authenticate,
  can("users.view"),
  userParamValidator("id"),
  validate,
  getUserById,
);

router.post(
  "/",
  authenticate,
  can("users.create"),
  createUserValidator(),
  validate,
  createUser,
);
router.patch(
  "/:id",
  authenticate,
  can("users.update"),
  userParamValidator("id"),
  updateUserValidator(),
  validate,
  updateUser,
);
router.delete(
  "/:id",
  authenticate,
  can("users.delete"),
  userParamValidator("id"),
  validate,
  deleteUser,
);

export default router;
