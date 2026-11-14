import { Router } from "express";
import {
  login,
  getCurrentUser,
  changePassword,
} from "../controllers/auth.controllers.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = Router();

// Public routes
router.post("/login", login);

// authenticated routes
router.get("/me", authenticate, getCurrentUser);
router.post("/change-password", authenticate, changePassword);

export default router;
