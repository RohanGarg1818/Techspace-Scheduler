import { Router } from "express";
import {
  getAnnouncements,
  getAnnouncementById,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from "../controllers/announcement.controllers.js";
import {
  authenticate,
  isOBOrTeamLead,
} from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validator.middleware.js";
import {
  createAnnouncementValidator,
  updateAnnouncementValidator,
  getAnnouncementsQueryValidator,
  userParamValidator,
} from "../validators/index.js";

const router = Router();

// 1. Get announcements (all authenticated users)
router.get(
  "/",
  authenticate,
  getAnnouncementsQueryValidator(),
  validate,
  getAnnouncements,
);

// 2. Create announcement (OB or team_lead)
router.post(
  "/",
  authenticate,
  isOBOrTeamLead,
  createAnnouncementValidator(),
  validate,
  createAnnouncement,
);

// 3. Get announcement by ID
router.get(
  "/:id",
  authenticate,
  userParamValidator("id"),
  validate,
  getAnnouncementById,
);

// 4. Update announcement (creator or OB)
router.patch(
  "/:id",
  authenticate,
  userParamValidator("id"),
  updateAnnouncementValidator(),
  validate,
  updateAnnouncement,
);

// 5. Delete announcement permanently (creator or OB)
router.delete(
  "/:id",
  authenticate,
  userParamValidator("id"),
  validate,
  deleteAnnouncement,
);

export default router;
