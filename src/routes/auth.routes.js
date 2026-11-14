import { Router } from "express";
import {
  login,
  getCurrentUser,
  changePassword,
} from "../controllers/auth.controllers.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import {
  userLoginValidator,
  userChangeCurrentPasswordValidator,
} from "../validators/index.js";
import { validate } from "../middlewares/validator.middleware.js";

const router = Router();

// Public routes
router.post("/login", userLoginValidator(), validate, login);

// Protected routes
router.get("/me", authenticate, getCurrentUser);
router.post(
  "/change-password",
  authenticate,
  userChangeCurrentPasswordValidator(),
  validate,
  changePassword,
);

export default router;
