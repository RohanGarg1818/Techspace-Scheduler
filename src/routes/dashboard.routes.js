import { Router } from "express";
import { getDashboardData } from "../controllers/dashboard.controllers.js";
import { authenticate, can } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", authenticate, can("dashboard.view"), getDashboardData);

export default router;
