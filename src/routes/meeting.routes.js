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
import {
  authenticate,
  isOB,
  isOBOrTeamLead,
} from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validator.middleware.js";
import {
  createMeetingValidator,
  updateMeetingValidator,
  checkClashValidator,
  getMeetingsQueryValidator,
  userParamValidator,
} from "../validators/index.js";

const router = Router();

// 1. Live clash checking (accessible to all authenticated users)
router.post(
  "/check-clash",
  authenticate,
  checkClashValidator(),
  validate,
  checkMeetingClash,
);

// 2. Query meetings in date range (authenticated users)
router.get(
  "/",
  authenticate,
  getMeetingsQueryValidator(),
  validate,
  getMeetings,
);

// 3. Create meeting (OB or team_lead)
router.post(
  "/",
  authenticate,
  isOBOrTeamLead,
  createMeetingValidator(),
  validate,
  createMeeting,
);

// 4. Get meeting by ID
router.get(
  "/:id",
  authenticate,
  userParamValidator("id"),
  validate,
  getMeetingById,
);

// 5. Update meeting (creator or OB)
router.patch(
  "/:id",
  authenticate,
  userParamValidator("id"),
  updateMeetingValidator(),
  validate,
  updateMeeting,
);

// 6. Cancel meeting (creator or OB)
router.post(
  "/:id/cancel",
  authenticate,
  userParamValidator("id"),
  validate,
  cancelMeeting,
);

// 7. Delete meeting permanently (OB only)
router.delete(
  "/:id",
  authenticate,
  isOB,
  userParamValidator("id"),
  validate,
  deleteMeeting,
);

export default router;
