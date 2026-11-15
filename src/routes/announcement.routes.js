import { Router } from "express";
import {
  getAnnouncements,
  getAnnouncementById,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from "../controllers/announcement.controllers.js";
import { authenticate, can } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validator.middleware.js";
import {
  createAnnouncementValidator,
  updateAnnouncementValidator,
  getAnnouncementsQueryValidator,
  userParamValidator,
} from "../validators/index.js";

const router = Router();

router.get(
  "/",
  authenticate,
  can("announcements.list"),
  getAnnouncementsQueryValidator(),
  validate,
  getAnnouncements,
);

router.post(
  "/",
  authenticate,
  can("announcements.create"),
  createAnnouncementValidator(),
  validate,
  createAnnouncement,
);

router.get(
  "/:id",
  authenticate,
  can("announcements.view"),
  userParamValidator("id"),
  validate,
  getAnnouncementById,
);

// creator / ownerOr roles are enforced in the controller
router.patch(
  "/:id",
  authenticate,
  can("announcements.update"),
  userParamValidator("id"),
  updateAnnouncementValidator(),
  validate,
  updateAnnouncement,
);

router.delete(
  "/:id",
  authenticate,
  can("announcements.delete"),
  userParamValidator("id"),
  validate,
  deleteAnnouncement,
);

export default router;
