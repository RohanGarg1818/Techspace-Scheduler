import { v4 as uuidv4 } from "uuid";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import {
  ErrorCodeEnum,
  UserRolesEnum,
  TeamTypeEnum,
  MeetingTypeEnum,
  MeetingColorEnum,
  MeetingStatusEnum,
} from "../utils/constants.js";
import { userLeadsTeam } from "../utils/userUtils.js";
import {
  isEndTimeAfterStartTime,
  findMeetingClashes,
} from "../utils/meetingUtils.js";
import db from "../db/index.js";

/**
 * GET /api/v1/meetings
 * Query params: from (req), to (req), type, teamId, status
 */
export const getMeetings = asyncHandler(async (req, res) => {
  const { from, to, type, teamId, status } = req.query;

  const fromDate = new Date(from);
  const toDate = new Date(to);

  if (fromDate > toDate) {
    throw new ApiError(
      400,
      ErrorCodeEnum.VALIDATION_ERROR,
      "'from' date must be on or before 'to' date",
    );
  }

  const diffDays = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24));
  if (diffDays > 62) {
    throw new ApiError(
      400,
      ErrorCodeEnum.VALIDATION_ERROR,
      "Date range cannot exceed 62 days",
    );
  }

  let meetings = await db.getAllMeetings();

  // Date range filter
  meetings = meetings.filter((m) => m.date >= from && m.date <= to);

  // Type filter (ob, core, subclub)
  if (type) {
    meetings = meetings.filter((m) => m.type === type);
  }

  // Team filter
  if (teamId) {
    meetings = meetings.filter((m) => m.team && m.team.id === teamId);
  }

  // Status filter: cancelled meetings are hidden unless status=cancelled or status=all
  if (status === MeetingStatusEnum.CANCELLED) {
    meetings = meetings.filter((m) => m.status === MeetingStatusEnum.CANCELLED);
  } else if (status === "all") {
    // Return all meetings
  } else {
    // Default: show only scheduled meetings
    meetings = meetings.filter((m) => m.status === MeetingStatusEnum.SCHEDULED);
  }

  // Sort by date and startTime ascending
  meetings.sort(
    (a, b) =>
      a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime),
  );

  res.status(200).json(
    new ApiResponse(
      200,
      {
        items: meetings,
      },
      "Meetings fetched successfully",
    ),
  );
});

/**
 * GET /api/v1/meetings/:id
 */
export const getMeetingById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const meeting = await db.getMeetingById(id);
  if (!meeting) {
    throw new ApiError(404, ErrorCodeEnum.NOT_FOUND, "Meeting not found");
  }

  res
    .status(200)
    .json(new ApiResponse(200, meeting, "Meeting fetched successfully"));
});

/**
 * POST /api/v1/meetings/check-clash
 * Live check for clashes without saving
 */
export const checkMeetingClash = asyncHandler(async (req, res) => {
  const { date, startTime, endTime, excludeMeetingId } = req.body;

  // Format already validated by checkClashValidator; only check the cross-field rule
  if (!isEndTimeAfterStartTime(startTime, endTime)) {
    throw new ApiError(
      400,
      ErrorCodeEnum.VALIDATION_ERROR,
      "endTime must be after startTime",
    );
  }

  const clashes = await findMeetingClashes({
    date,
    startTime,
    endTime,
    excludeMeetingId: excludeMeetingId || null,
  });

  res.status(200).json(
    new ApiResponse(
      200,
      {
        hasClash: clashes.length > 0,
        clashes,
      },
      "Clash check completed",
    ),
  );
});

/**
 * POST /api/v1/meetings (OB or team_lead)
 */
export const createMeeting = asyncHandler(async (req, res) => {
  const { topic, date, startTime, endTime, teamId, note, location, link } =
    req.body;
  const isTeamLead = req.user.role === UserRolesEnum.TEAM_LEAD;

  if (!isEndTimeAfterStartTime(startTime, endTime)) {
    throw new ApiError(
      400,
      ErrorCodeEnum.VALIDATION_ERROR,
      "endTime must be after startTime",
    );
  }

  // Team lead rules: teamId is required and must be a team they lead
  if (isTeamLead) {
    if (!teamId) {
      throw new ApiError(
        400,
        ErrorCodeEnum.VALIDATION_ERROR,
        "teamId is required for team leads",
      );
    }

    if (!userLeadsTeam(req.user, teamId)) {
      throw new ApiError(
        403,
        ErrorCodeEnum.FORBIDDEN,
        "You can only create meetings for teams you lead or co-lead",
      );
    }
  }

  // Resolve team, type, and color
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

  // Clash check unless acknowledged
  if (req.query.acknowledgeClash !== "true") {
    const clashes = await findMeetingClashes({ date, startTime, endTime });

    if (clashes.length > 0) {
      throw new ApiError(
        409,
        ErrorCodeEnum.MEETING_CLASH,
        `This overlaps with ${clashes.length} meeting${clashes.length > 1 ? "s" : ""}`,
        { clashes },
      );
    }
  }

  const newMeeting = {
    id: uuidv4(),
    type: meetingType,
    color: meetingColor,
    team: teamObj,
    topic: topic.trim(),
    date,
    startTime,
    endTime,
    note: note ? note.trim() : null,
    location: location ? location.trim() : null,
    link: link ? link.trim() : null,
    createdBy: { id: req.user.id, name: req.user.name },
    status: MeetingStatusEnum.SCHEDULED,
  };

  await db.createMeeting(newMeeting);

  res
    .status(201)
    .json(new ApiResponse(201, newMeeting, "Meeting created successfully"));
});

/**
 * PATCH /api/v1/meetings/:id (creator or OB)
 */
export const updateMeeting = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { topic, date, startTime, endTime, teamId, note, location, link } =
    req.body;

  const meeting = await db.getMeetingById(id);
  if (!meeting) {
    throw new ApiError(404, ErrorCodeEnum.NOT_FOUND, "Meeting not found");
  }

  const isOB = req.user.role === UserRolesEnum.OB;
  const isCreator = meeting.createdBy && meeting.createdBy.id === req.user.id;

  if (!isOB && !isCreator) {
    throw new ApiError(
      403,
      ErrorCodeEnum.FORBIDDEN,
      "Only the creator or an OB can edit this meeting",
    );
  }

  if (meeting.status === MeetingStatusEnum.CANCELLED) {
    throw new ApiError(
      409,
      ErrorCodeEnum.CONFLICT,
      "Cannot edit a cancelled meeting",
    );
  }

  const hasUpdates = [
    topic,
    date,
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

  const finalDate = date !== undefined ? date : meeting.date;
  const finalStartTime =
    startTime !== undefined ? startTime : meeting.startTime;
  const finalEndTime = endTime !== undefined ? endTime : meeting.endTime;

  if (!isEndTimeAfterStartTime(finalStartTime, finalEndTime)) {
    throw new ApiError(
      400,
      ErrorCodeEnum.VALIDATION_ERROR,
      "endTime must be after startTime",
    );
  }

  let teamUpdates = {};
  if (teamId !== undefined) {
    if (teamId === null) {
      if (!isOB) {
        throw new ApiError(
          403,
          ErrorCodeEnum.FORBIDDEN,
          "Only OBs can create or change a meeting to an OB meeting",
        );
      }
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

      if (!isOB) {
        if (!userLeadsTeam(req.user, teamId)) {
          throw new ApiError(
            403,
            ErrorCodeEnum.FORBIDDEN,
            "You can only assign meetings to teams you lead or co-lead",
          );
        }
      }

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

  // Clash check unless acknowledged
  if (req.query.acknowledgeClash !== "true") {
    const clashes = await findMeetingClashes({
      date: finalDate,
      startTime: finalStartTime,
      endTime: finalEndTime,
      excludeMeetingId: meeting.id,
    });

    if (clashes.length > 0) {
      throw new ApiError(
        409,
        ErrorCodeEnum.MEETING_CLASH,
        `This overlaps with ${clashes.length} meeting${clashes.length > 1 ? "s" : ""}`,
        { clashes },
      );
    }
  }

  const updates = {
    ...(topic !== undefined && { topic: topic.trim() }),
    date: finalDate,
    startTime: finalStartTime,
    endTime: finalEndTime,
    ...(note !== undefined && { note: note ? note.trim() : null }),
    ...(location !== undefined && {
      location: location ? location.trim() : null,
    }),
    ...(link !== undefined && { link: link ? link.trim() : null }),
    ...teamUpdates,
  };

  await db.updateMeeting(meeting.id, updates);

  const updatedMeeting = await db.getMeetingById(meeting.id);

  res
    .status(200)
    .json(new ApiResponse(200, updatedMeeting, "Meeting updated successfully"));
});

/**
 * POST /api/v1/meetings/:id/cancel (creator or OB)
 */
export const cancelMeeting = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const meeting = await db.getMeetingById(id);
  if (!meeting) {
    throw new ApiError(404, ErrorCodeEnum.NOT_FOUND, "Meeting not found");
  }

  const isOB = req.user.role === UserRolesEnum.OB;
  const isCreator = meeting.createdBy && meeting.createdBy.id === req.user.id;

  if (!isOB && !isCreator) {
    throw new ApiError(
      403,
      ErrorCodeEnum.FORBIDDEN,
      "Only the creator or an OB can cancel this meeting",
    );
  }

  if (meeting.status === MeetingStatusEnum.CANCELLED) {
    throw new ApiError(
      409,
      ErrorCodeEnum.CONFLICT,
      "Meeting is already cancelled",
    );
  }

  await db.updateMeeting(meeting.id, {
    status: MeetingStatusEnum.CANCELLED,
  });

  const updated = await db.getMeetingById(meeting.id);

  res
    .status(200)
    .json(new ApiResponse(200, updated, "Meeting cancelled successfully"));
});

/**
 * DELETE /api/v1/meetings/:id (OB only)
 * Hard deletes the meeting and all associated comments
 */
export const deleteMeeting = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const meeting = await db.getMeetingById(id);
  if (!meeting) {
    throw new ApiError(404, ErrorCodeEnum.NOT_FOUND, "Meeting not found");
  }

  // Delete all comments associated with this meeting
  const allComments = await db.getAllComments();
  for (const c of allComments) {
    if (c.meetingId === id) {
      await db.deleteComment(c.id);
    }
  }

  await db.deleteMeeting(id);

  res.status(204).send();
});
