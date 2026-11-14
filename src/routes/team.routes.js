import { Router } from "express";
import {
  getTeams,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam,
  addOrUpdateTeamMember,
  removeTeamMember,
} from "../controllers/team.controllers.js";
import { authenticate, isOB } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validator.middleware.js";
import {
  createTeamValidator,
  updateTeamValidator,
  getTeamsQueryValidator,
  teamMemberValidator,
  teamMemberParamsValidator,
  userParamValidator,
} from "../validators/index.js";

const router = Router();

// Authenticated users can view teams
router.get("/", authenticate, getTeamsQueryValidator(), validate, getTeams);
router.get("/:id", authenticate, userParamValidator("id"), validate, getTeamById);

// OB only routes
router.post("/", authenticate, isOB, createTeamValidator(), validate, createTeam);
router.patch(
  "/:id",
  authenticate,
  isOB,
  userParamValidator("id"),
  updateTeamValidator(),
  validate,
  updateTeam,
);
router.delete(
  "/:id",
  authenticate,
  isOB,
  userParamValidator("id"),
  validate,
  deleteTeam,
);

// Member management on teams (OB only)
router.put(
  "/:id/members/:userId",
  authenticate,
  isOB,
  teamMemberParamsValidator(),
  teamMemberValidator(),
  validate,
  addOrUpdateTeamMember,
);
router.delete(
  "/:id/members/:userId",
  authenticate,
  isOB,
  teamMemberParamsValidator(),
  validate,
  removeTeamMember,
);

export default router;
