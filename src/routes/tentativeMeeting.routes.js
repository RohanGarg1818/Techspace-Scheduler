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
import { authenticate, can } from "../middlewares/auth.middleware.js";
import { userParamValidator } from "../validators/index.js";

const router = Router();

router
  .route("/")
  .get(
    authenticate,
    can("tentativeMeetings.list"),
    getTentativeMeetingsQueryValidator(),
    validate,
    getTentativeMeetings,
  )
  .post(
    authenticate,
    can("tentativeMeetings.create"),
    createTentativeMeetingValidator(),
    validate,
    createTentativeMeeting,
  );

router
  .route("/:id")
  .get(
    authenticate,
    can("tentativeMeetings.view"),
    userParamValidator("id"),
    validate,
    getTentativeMeetingById,
  )
  .patch(
    authenticate,
    can("tentativeMeetings.update"),
    userParamValidator("id"),
    updateTentativeMeetingValidator(),
    validate,
    updateTentativeMeeting,
  )
  .delete(
    authenticate,
    can("tentativeMeetings.delete"),
    userParamValidator("id"),
    validate,
    deleteTentativeMeeting,
  );

router
  .route("/:id/cancel")
  .post(
    authenticate,
    can("tentativeMeetings.cancel"),
    userParamValidator("id"),
    validate,
    cancelTentativeMeeting,
  );

export default router;
