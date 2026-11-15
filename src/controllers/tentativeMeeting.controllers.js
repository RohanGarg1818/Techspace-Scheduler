import { v4 as uuidv4 } from "uuid";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import {
  ErrorCodeEnum,
  TeamTypeEnum,
  MeetingTypeEnum,
  MeetingColorEnum,
  MeetingStatusEnum,
} from "../utils/constants.js";
import { assertOwnerOrRole, assertTeamScope } from "../utils/access.js";
import { RULES } from "../config/permissions.js";
import {
  isEndDateAfterStartDate,
  isTimeRangeValid,
  isEndTimeAfterStartTime,
  findTentativeMeetingOverlaps,
} from "../utils/tentativeMeetingUtils.js";
import db from "../db/index.js";

/**
 * GET /api/v1/tentative-meetings
 * Query params: from, to, teamId, status
 */
export const getTentativeMeetings = asyncHandler(async (req, res) => {
  const { from, to, teamId, status } = req.query;

  let tentativeMeetings = await db.getAllTentativeMeetings();
  if (from && to) {
    const fromDate = from;
    const toDate = to;
    tentativeMeetings = tentativeMeetings.filter(
      (tm) => tm.startDate <= toDate && tm.endDate >= fromDate,
    );
  }

  if (teamId) {
    tentativeMeetings = tentativeMeetings.filter(
      (tm) => tm.team && tm.team.id === teamId,
    );
  }

  if (status === MeetingStatusEnum.CANCELLED) {
    tentativeMeetings = tentativeMeetings.filter(
      (tm) => tm.status === MeetingStatusEnum.CANCELLED,
    );
  } else if (status === "all") {
    // empty
  } else {
    tentativeMeetings = tentativeMeetings.filter(
      (tm) => tm.status === MeetingStatusEnum.SCHEDULED,
    );
  }

  tentativeMeetings.sort((a, b) => a.startDate.localeCompare(b.startDate));

  res.status(200).json(
    new ApiResponse(
      200,
      {
        items: tentativeMeetings,
      },
      "Tentative meetings fetched successfully",
    ),
  );
});

/**
 * GET /api/v1/tentative-meetings/:id
 */
export const getTentativeMeetingById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const tentativeMeeting = await db.getTentativeMeetingById(id);
  if (!tentativeMeeting) {
    throw new ApiError(
      404,
      ErrorCodeEnum.NOT_FOUND,
      "Tentative meeting not found",
    );
  }

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        tentativeMeeting,
        "Tentative meeting fetched successfully",
      ),
    );
});

/**
 * POST /api/v1/tentative-meetings (OB or team_lead)
 */
export const createTentativeMeeting = asyncHandler(async (req, res) => {
  const {
    topic,
    startDate,
    endDate,
    startTime,
    endTime,
    teamId,
    note,
    location,
    link,
  } = req.body;

  if (!isEndDateAfterStartDate(startDate, endDate)) {
    throw new ApiError(
      400,
      ErrorCodeEnum.VALIDATION_ERROR,
      "endDate must be on or after startDate",
    );
  }

  if (!isTimeRangeValid(startTime, endTime)) {
    throw new ApiError(
      400,
      ErrorCodeEnum.VALIDATION_ERROR,
      "Both startTime and endTime must be provided, or both must be omitted",
    );
  }

  if (startTime && endTime && !isEndTimeAfterStartTime(startTime, endTime)) {
    throw new ApiError(
      400,
      ErrorCodeEnum.VALIDATION_ERROR,
      "endTime must be after startTime",
    );
  }

  // Team rules come from TEAM_SCOPE in config/permissions.js
  assertTeamScope(req.user, "tentativeMeetings", teamId);

  let meetingType;
  let meetingColor;
  let teamObj = null;

  if (teamId) {
    const team = await db.getTeamById(teamId);
    if (!team) {
      throw new ApiError(404, ErrorCodeEnum.NOT_FOUND, "Team not found");
    }

    meetingType = team.type;
    meetingColor =
      team.type === TeamTypeEnum.CORE
        ? MeetingColorEnum.CORE
        : MeetingColorEnum.SUBCLUB;
    teamObj = { id: team.id, name: team.name };
  } else {
    meetingType = MeetingTypeEnum.OB;
    meetingColor = MeetingColorEnum.OB;
  }

  const { regularClashes, tentativeClashes } =
    await findTentativeMeetingOverlaps({
      startDate,
      endDate,
      startTime: startTime || null,
      endTime: endTime || null,
    });

  const totalClashes = regularClashes.length + tentativeClashes.length;
  if (totalClashes > 0 && req.query.force !== "true") {
    throw new ApiError(
      409,
      ErrorCodeEnum.MEETING_CLASH,
      `This tentative meeting overlaps with ${regularClashes.length} regular meeting(s) and ${tentativeClashes.length} tentative meeting(s). Use ?force=true to save anyway.`,
      {
        regularClashes,
        tentativeClashes,
        hint: "Add ?force=true query parameter to save despite overlaps",
      },
    );
  }

  let warningMessage = null;
  if (totalClashes > 0) {
    warningMessage = `Saved with overlaps: ${regularClashes.length} regular meeting(s) and ${tentativeClashes.length} tentative meeting(s)`;
  }

  const newTentativeMeeting = {
    id: uuidv4(),
    type: meetingType,
    color: meetingColor,
    team: teamObj,
    topic: topic.trim(),
    startDate,
    endDate,
    startTime: startTime || null,
    endTime: endTime || null,
    note: note ? note.trim() : null,
    location: location ? location.trim() : null,
    link: link ? link.trim() : null,
    createdBy: { id: req.user.id, name: req.user.name },
    status: MeetingStatusEnum.SCHEDULED,
  };

  await db.createTentativeMeeting(newTentativeMeeting);

  res.status(201).json(
    new ApiResponse(
      201,
      {
        ...newTentativeMeeting,
        warning: warningMessage,
        overlaps: {
          regularMeetings: regularClashes,
          tentativeMeetings: tentativeClashes,
        },
      },
      "Tentative meeting created successfully",
    ),
  );
});

/**
 * PATCH /api/v1/tentative-meetings/:id (creator or OB)
 */
export const updateTentativeMeeting = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    topic,
    startDate,
    endDate,
    startTime,
    endTime,
    teamId,
    note,
    location,
    link,
  } = req.body;

  const tentativeMeeting = await db.getTentativeMeetingById(id);
  if (!tentativeMeeting) {
    throw new ApiError(
      404,
      ErrorCodeEnum.NOT_FOUND,
      "Tentative meeting not found",
    );
  }

  assertOwnerOrRole(
    req.user,
    "tentativeMeetings.update",
    tentativeMeeting.createdBy?.id,
  );

  if (
    tentativeMeeting.status === MeetingStatusEnum.CANCELLED &&
    !RULES.tentativeMeetings.allowEditCancelled
  ) {
    throw new ApiError(
      409,
      ErrorCodeEnum.CONFLICT,
      "Cannot edit a cancelled tentative meeting",
    );
  }

  const hasUpdates = [
    topic,
    startDate,
    endDate,
    startTime,
    endTime,
    teamId,
    note,
    location,
    link,
  ].some((field) => field !== undefined);

  if (!hasUpdates) {
    throw new ApiError(
      400,
      ErrorCodeEnum.VALIDATION_ERROR,
      "At least one field is required to update",
    );
  }

  const finalStartDate =
    startDate !== undefined ? startDate : tentativeMeeting.startDate;
  const finalEndDate =
    endDate !== undefined ? endDate : tentativeMeeting.endDate;
  const finalStartTime =
    startTime !== undefined ? startTime : tentativeMeeting.startTime;
  const finalEndTime =
    endTime !== undefined ? endTime : tentativeMeeting.endTime;

  if (!isEndDateAfterStartDate(finalStartDate, finalEndDate)) {
    throw new ApiError(
      400,
      ErrorCodeEnum.VALIDATION_ERROR,
      "endDate must be on or after startDate",
    );
  }
  if (!isTimeRangeValid(finalStartTime, finalEndTime)) {
    throw new ApiError(
      400,
      ErrorCodeEnum.VALIDATION_ERROR,
      "Both startTime and endTime must be provided, or both must be omitted",
    );
  }

  if (
    finalStartTime &&
    finalEndTime &&
    !isEndTimeAfterStartTime(finalStartTime, finalEndTime)
  ) {
    throw new ApiError(
      400,
      ErrorCodeEnum.VALIDATION_ERROR,
      "endTime must be after startTime",
    );
  }

  let teamUpdates = {};
  if (teamId !== undefined) {
    if (teamId === null) {
      assertTeamScope(req.user, "tentativeMeetings", null);
      teamUpdates = {
        team: null,
        type: MeetingTypeEnum.OB,
        color: MeetingColorEnum.OB,
      };
    } else {
      const team = await db.getTeamById(teamId);
      if (!team) {
        throw new ApiError(404, ErrorCodeEnum.NOT_FOUND, "Team not found");
      }

      assertTeamScope(req.user, "tentativeMeetings", team.id);

      teamUpdates = {
        team: { id: team.id, name: team.name },
        type: team.type,
        color:
          team.type === TeamTypeEnum.CORE
            ? MeetingColorEnum.CORE
            : MeetingColorEnum.SUBCLUB,
      };
    }
  }

  const { regularClashes, tentativeClashes } =
    await findTentativeMeetingOverlaps({
      startDate: finalStartDate,
      endDate: finalEndDate,
      startTime: finalStartTime || null,
      endTime: finalEndTime || null,
      excludeTentativeMeetingId: tentativeMeeting.id,
    });
  const totalClashes = regularClashes.length + tentativeClashes.length;
  if (totalClashes > 0 && req.query.force !== "true") {
    throw new ApiError(
      409,
      ErrorCodeEnum.MEETING_CLASH,
      `This tentative meeting overlaps with ${regularClashes.length} regular meeting(s) and ${tentativeClashes.length} tentative meeting(s). Use ?force=true to update anyway.`,
      {
        regularClashes,
        tentativeClashes,
        hint: "Add ?force=true query parameter to update despite overlaps",
      },
    );
  }

  let warningMessage = null;
  if (totalClashes > 0) {
    warningMessage = `Updated with overlaps: ${regularClashes.length} regular meeting(s) and ${tentativeClashes.length} tentative meeting(s)`;
  }

  const updates = {
    ...(topic !== undefined && { topic: topic.trim() }),
    startDate: finalStartDate,
    endDate: finalEndDate,
    startTime: finalStartTime || null,
    endTime: finalEndTime || null,
    ...(note !== undefined && { note: note ? note.trim() : null }),
    ...(location !== undefined && {
      location: location ? location.trim() : null,
    }),
    ...(link !== undefined && { link: link ? link.trim() : null }),
    ...teamUpdates,
  };

  await db.updateTentativeMeeting(tentativeMeeting.id, updates);

  const updatedTentativeMeeting = await db.getTentativeMeetingById(
    tentativeMeeting.id,
  );

  res.status(200).json(
    new ApiResponse(
      200,
      {
        ...updatedTentativeMeeting,
        warning: warningMessage,
        overlaps: {
          regularMeetings: regularClashes,
          tentativeMeetings: tentativeClashes,
        },
      },
      "Tentative meeting updated successfully",
    ),
  );
});

/**
 * POST /api/v1/tentative-meetings/:id/cancel (creator or OB)
 */
export const cancelTentativeMeeting = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const tentativeMeeting = await db.getTentativeMeetingById(id);
  if (!tentativeMeeting) {
    throw new ApiError(
      404,
      ErrorCodeEnum.NOT_FOUND,
      "Tentative meeting not found",
    );
  }

  assertOwnerOrRole(
    req.user,
    "tentativeMeetings.cancel",
    tentativeMeeting.createdBy?.id,
  );

  if (tentativeMeeting.status === MeetingStatusEnum.CANCELLED) {
    throw new ApiError(
      409,
      ErrorCodeEnum.CONFLICT,
      "Tentative meeting is already cancelled",
    );
  }

  await db.updateTentativeMeeting(tentativeMeeting.id, {
    status: MeetingStatusEnum.CANCELLED,
  });

  const updated = await db.getTentativeMeetingById(tentativeMeeting.id);

  res
    .status(200)
    .json(
      new ApiResponse(200, updated, "Tentative meeting cancelled successfully"),
    );
});

/**
 * DELETE /api/v1/tentative-meetings/:id (OB only)
 * Hard deletes the tentative meeting
 */
export const deleteTentativeMeeting = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const tentativeMeeting = await db.getTentativeMeetingById(id);
  if (!tentativeMeeting) {
    throw new ApiError(
      404,
      ErrorCodeEnum.NOT_FOUND,
      "Tentative meeting not found",
    );
  }

  await db.deleteTentativeMeeting(id);

  res.status(204).send();
});
