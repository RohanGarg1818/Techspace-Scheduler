import { Router } from "express";
import {
  getTentativeMeetings,
  getTentativeMeetingById,
  createTentativeMeeting,
  updateTentativeMeeting,
  cancelTentativeMeeting,
  deleteTentativeMeeting,
} from "../controllers/tentativeMeeting.controllers.js";
import {
  createTentativeMeetingValidator,
  updateTentativeMeetingValidator,
  getTentativeMeetingsQueryValidator,
} from "../validators/tentativeMeeting.validators.js";
import { validate } from "../middlewares/validator.middleware.js";
import {
  authenticate,
  isOB,
  isOBOrTeamLead,
} from "../middlewares/auth.middleware.js";
import { userParamValidator } from "../validators/index.js";

const router = Router();

// Public/Authenticated routes
router
  .route("/")
  .get(
    authenticate,
    getTentativeMeetingsQueryValidator(),
    validate,
    getTentativeMeetings,
  )
  .post(
    authenticate,
    isOBOrTeamLead,
    createTentativeMeetingValidator(),
    validate,
    createTentativeMeeting,
  );

router
  .route("/:id")
  .get(authenticate, userParamValidator("id"), validate, getTentativeMeetingById)
  .patch(
    authenticate,
    isOBOrTeamLead,
    userParamValidator("id"),
    updateTentativeMeetingValidator(),
    validate,
    updateTentativeMeeting,
  )
  .delete(
    authenticate,
    isOB,
    userParamValidator("id"),
    validate,
    deleteTentativeMeeting,
  );

router
  .route("/:id/cancel")
  .post(
    authenticate,
    isOBOrTeamLead,
    userParamValidator("id"),
    validate,
    cancelTentativeMeeting,
  );

export default router;
