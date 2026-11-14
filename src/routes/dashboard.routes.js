import { Router } from "express";
import { getDashboardData } from "../controllers/dashboard.controllers.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = Router();

// Authenticated users can view the dashboard
router.get("/", authenticate, getDashboardData);

export default router;
