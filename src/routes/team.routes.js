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
import { authenticate, can } from "../middlewares/auth.middleware.js";
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

router.get(
  "/",
  authenticate,
  can("teams.list"),
  getTeamsQueryValidator(),
  validate,
  getTeams,
);
router.get(
  "/:id",
  authenticate,
  can("teams.view"),
  userParamValidator("id"),
  validate,
  getTeamById,
);

router.post(
  "/",
  authenticate,
  can("teams.create"),
  createTeamValidator(),
  validate,
  createTeam,
);
router.patch(
  "/:id",
  authenticate,
  can("teams.update"),
  userParamValidator("id"),
  updateTeamValidator(),
  validate,
  updateTeam,
);
router.delete(
  "/:id",
  authenticate,
  can("teams.delete"),
  userParamValidator("id"),
  validate,
  deleteTeam,
);

router.put(
  "/:id/members/:userId",
  authenticate,
  can("teams.manageMembers"),
  teamMemberParamsValidator(),
  teamMemberValidator(),
  validate,
  addOrUpdateTeamMember,
);
router.delete(
  "/:id/members/:userId",
  authenticate,
  can("teams.manageMembers"),
  teamMemberParamsValidator(),
  validate,
  removeTeamMember,
);

export default router;
