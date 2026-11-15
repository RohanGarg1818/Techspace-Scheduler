import { Router } from "express";
import {
  getMeetings,
  getMeetingById,
  checkMeetingClash,
  createMeeting,
  updateMeeting,
  cancelMeeting,
  deleteMeeting,
} from "../controllers/meeting.controllers.js";
import { authenticate, can } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validator.middleware.js";
import {
  createMeetingValidator,
  updateMeetingValidator,
  checkClashValidator,
  getMeetingsQueryValidator,
  userParamValidator,
} from "../validators/index.js";

const router = Router();

router.post(
  "/check-clash",
  authenticate,
  can("meetings.checkClash"),
  checkClashValidator(),
  validate,
  checkMeetingClash,
);

router.get(
  "/",
  authenticate,
  can("meetings.list"),
  getMeetingsQueryValidator(),
  validate,
  getMeetings,
);

router.post(
  "/",
  authenticate,
  can("meetings.create"),
  createMeetingValidator(),
  validate,
  createMeeting,
);

router.get(
  "/:id",
  authenticate,
  can("meetings.view"),
  userParamValidator("id"),
  validate,
  getMeetingById,
);

// creator / ownerOr roles are enforced in the controller
router.patch(
  "/:id",
  authenticate,
  can("meetings.update"),
  userParamValidator("id"),
  updateMeetingValidator(),
  validate,
  updateMeeting,
);

router.post(
  "/:id/cancel",
  authenticate,
  can("meetings.cancel"),
  userParamValidator("id"),
  validate,
  cancelMeeting,
);

router.delete(
  "/:id",
  authenticate,
  can("meetings.delete"),
  userParamValidator("id"),
  validate,
  deleteMeeting,
);

export default router;
