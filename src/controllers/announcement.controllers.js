import { v4 as uuidv4 } from "uuid";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import {
  ErrorCodeEnum,
  UserRolesEnum,
  AnnouncementTypeEnum,
  AnnouncementPriorityEnum,
} from "../utils/constants.js";
import { userLeadsTeam } from "../utils/userUtils.js";
import db from "../db/index.js";

/**
 * GET /api/v1/announcements
 * Query params: type, teamId, isPinned, priority, page, limit
 */
export const getAnnouncements = asyncHandler(async (req, res) => {
  const { type, teamId, isPinned, priority, page = 1, limit = 20 } = req.query;

  let announcements = await db.getAllAnnouncements();

  if (type) {
    announcements = announcements.filter((a) => a.type === type);
  }

  if (teamId) {
    announcements = announcements.filter(
      (a) => a.team && a.team.id === teamId,
    );
  }

  if (isPinned !== undefined) {
    const pinnedBool = isPinned === "true" || isPinned === true;
    announcements = announcements.filter((a) => a.isPinned === pinnedBool);
  }

  if (priority) {
    announcements = announcements.filter((a) => a.priority === priority);
  }

  // Sorting: Pinned first (createdAt DESC), then unpinned (createdAt DESC)
  announcements.sort((a, b) => {
    if (a.isPinned !== b.isPinned) {
      return a.isPinned ? -1 : 1;
    }
    return b.createdAt.localeCompare(a.createdAt);
  });

  const total = announcements.length;
  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const totalPages = Math.ceil(total / parsedLimit) || 1;
  const startIndex = (parsedPage - 1) * parsedLimit;
  const items = announcements.slice(startIndex, startIndex + parsedLimit);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        announcements: items,
        items,
        pagination: {
          currentPage: parsedPage,
          limit: parsedLimit,
          totalAnnouncements: total,
          totalPages,
          hasNextPage: parsedPage < totalPages,
          hasPreviousPage: parsedPage > 1,
        },
      },
      "Announcements fetched successfully",
    ),
  );
});

/**
 * GET /api/v1/announcements/:id
 */
export const getAnnouncementById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const announcement = await db.getAnnouncementById(id);
  if (!announcement) {
    throw new ApiError(404, ErrorCodeEnum.NOT_FOUND, "Announcement not found");
  }

  res.status(200).json(
    new ApiResponse(
      200,
      announcement,
      "Announcement fetched successfully",
    ),
  );
});

/**
 * POST /api/v1/announcements (OB or team_lead)
 */
export const createAnnouncement = asyncHandler(async (req, res) => {
  const { title, content, priority, isPinned, teamId } = req.body;

  const isOB = req.user.role === UserRolesEnum.OB;
  const isTeamLead = req.user.role === UserRolesEnum.TEAM_LEAD;

  if (!isOB && !isTeamLead) {
    throw new ApiError(
      403,
      ErrorCodeEnum.FORBIDDEN,
      "Only OBs and team leads can create announcements",
    );
  }

  let announcementType;
  let teamObj = null;

  if (teamId) {
    const team = await db.getTeamById(teamId);
    if (!team) {
      throw new ApiError(404, ErrorCodeEnum.NOT_FOUND, "Team not found");
    }

    if (isTeamLead) {
      if (!userLeadsTeam(req.user, teamId)) {
        throw new ApiError(
          403,
          ErrorCodeEnum.FORBIDDEN,
          "You can only create announcements for teams you lead or co-lead",
        );
      }
    }

    announcementType = AnnouncementTypeEnum.TEAM;
    teamObj = { id: team.id, name: team.name };
  } else {
    // If teamId is omitted or null, only OB can create a society-wide announcement
    if (!isOB) {
      throw new ApiError(
        403,
        ErrorCodeEnum.FORBIDDEN,
        "Only OBs can create society-wide announcements",
      );
    }

    announcementType = AnnouncementTypeEnum.SOCIETY;
  }

  const newAnnouncement = {
    id: uuidv4(),
    type: announcementType,
    team: teamObj,
    title: title.trim(),
    content: content.trim(),
    priority: priority || AnnouncementPriorityEnum.NORMAL,
    isPinned: Boolean(isPinned),
    createdBy: { id: req.user.id, name: req.user.name },
    createdAt: new Date().toISOString(),
    updatedAt: null,
  };

  await db.createAnnouncement(newAnnouncement);

  res.status(201).json(
    new ApiResponse(
      201,
      newAnnouncement,
      "Announcement created successfully",
    ),
  );
});

/**
 * PATCH /api/v1/announcements/:id (creator or OB)
 */
export const updateAnnouncement = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, content, priority, isPinned } = req.body;

  const announcement = await db.getAnnouncementById(id);
  if (!announcement) {
    throw new ApiError(404, ErrorCodeEnum.NOT_FOUND, "Announcement not found");
  }

  const isOB = req.user.role === UserRolesEnum.OB;
  const isCreator =
    announcement.createdBy && announcement.createdBy.id === req.user.id;

  if (!isOB && !isCreator) {
    throw new ApiError(
      403,
      ErrorCodeEnum.FORBIDDEN,
      "Only the creator or an OB can edit this announcement",
    );
  }

  const hasUpdates = [title, content, priority, isPinned].some(
    (field) => field !== undefined,
  );

  if (!hasUpdates) {
    throw new ApiError(
      400,
      ErrorCodeEnum.VALIDATION_ERROR,
      "At least one field is required to update",
    );
  }

  const updates = {
    ...(title !== undefined && { title: title.trim() }),
    ...(content !== undefined && { content: content.trim() }),
    ...(priority !== undefined && { priority }),
    ...(isPinned !== undefined && { isPinned: Boolean(isPinned) }),
    updatedAt: new Date().toISOString(),
  };

  await db.updateAnnouncement(id, updates);

  const updatedAnnouncement = await db.getAnnouncementById(id);

  res.status(200).json(
    new ApiResponse(
      200,
      updatedAnnouncement,
      "Announcement updated successfully",
    ),
  );
});

/**
 * DELETE /api/v1/announcements/:id (creator or OB)
 * Permanently deletes the announcement and all comments on it
 */
export const deleteAnnouncement = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const announcement = await db.getAnnouncementById(id);
  if (!announcement) {
    throw new ApiError(404, ErrorCodeEnum.NOT_FOUND, "Announcement not found");
  }

  const isOB = req.user.role === UserRolesEnum.OB;
  const isCreator =
    announcement.createdBy && announcement.createdBy.id === req.user.id;

  if (!isOB && !isCreator) {
    throw new ApiError(
      403,
      ErrorCodeEnum.FORBIDDEN,
      "Only the creator or an OB can delete this announcement",
    );
  }

  // Cascade delete all comments on this announcement
  const allComments = await db.getAllComments();
  for (const c of allComments) {
    if (c.announcementId === id) {
      await db.deleteComment(c.id);
    }
  }

  await db.deleteAnnouncement(id);

  res.status(204).send();
});
