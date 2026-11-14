import { v4 as uuidv4 } from "uuid";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ErrorCodeEnum, UserRolesEnum } from "../utils/constants.js";
import db from "../db/index.js";

/**
 * GET /api/v1/announcements/:id/comments
 * Fetch all comments for an announcement (sorted chronologically createdAt ASC)
 */
export const getAnnouncementComments = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { parentCommentId, page = 1, limit = 20 } = req.query;

  const announcement = await db.getAnnouncementById(id);
  if (!announcement) {
    throw new ApiError(404, ErrorCodeEnum.NOT_FOUND, "Announcement not found");
  }

  let comments = await db.getAllComments();

  // Filter for this announcement
  comments = comments.filter((c) => c.announcementId === id);

  // Optional filter by parentCommentId: "null" for top-level, or a specific parent ID
  if (parentCommentId !== undefined) {
    if (parentCommentId === "null" || parentCommentId === "none") {
      comments = comments.filter((c) => c.parentCommentId === null);
    } else {
      comments = comments.filter((c) => c.parentCommentId === parentCommentId);
    }
  }

  // Sort chronologically ascending
  comments.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const total = comments.length;
  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const totalPages = Math.ceil(total / parsedLimit) || 1;
  const startIndex = (parsedPage - 1) * parsedLimit;
  const items = comments.slice(startIndex, startIndex + parsedLimit);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        items,
        pagination: {
          page: parsedPage,
          limit: parsedLimit,
          total,
          totalPages,
          hasNextPage: parsedPage < totalPages,
          hasPreviousPage: parsedPage > 1,
        },
      },
      "Comments fetched successfully",
    ),
  );
});

/**
 * POST /api/v1/announcements/:id/comments (any authenticated user)
 */
export const createAnnouncementComment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { content, parentCommentId } = req.body;

  const announcement = await db.getAnnouncementById(id);
  if (!announcement) {
    throw new ApiError(404, ErrorCodeEnum.NOT_FOUND, "Announcement not found");
  }

  let validParentId = null;

  if (parentCommentId) {
    const parentComment = await db.getCommentById(parentCommentId);
    if (!parentComment || parentComment.announcementId !== id) {
      throw new ApiError(
        404,
        ErrorCodeEnum.NOT_FOUND,
        "Parent comment not found on this announcement",
      );
    }

    // Strict 1-level nesting: a reply cannot be replied to
    if (parentComment.parentCommentId !== null) {
      throw new ApiError(
        400,
        ErrorCodeEnum.VALIDATION_ERROR,
        "Cannot reply to a reply; threads are strictly one level deep",
      );
    }

    validParentId = parentComment.id;
  }

  const newComment = {
    id: uuidv4(),
    announcementId: id,
    meetingId: null,
    content: content.trim(),
    parentCommentId: validParentId,
    createdBy: { id: req.user.id, name: req.user.name },
    createdAt: new Date().toISOString(),
    updatedAt: null,
  };

  await db.createComment(newComment);

  res
    .status(201)
    .json(new ApiResponse(201, newComment, "Comment posted successfully"));
});

/**
 * GET /api/v1/meetings/:id/comments
 * Fetch all comments for a meeting (sorted chronologically createdAt ASC)
 */
export const getMeetingComments = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { parentCommentId, page = 1, limit = 20 } = req.query;

  const meeting = await db.getMeetingById(id);
  if (!meeting) {
    throw new ApiError(404, ErrorCodeEnum.NOT_FOUND, "Meeting not found");
  }

  let comments = await db.getAllComments();

  // Filter for this meeting
  comments = comments.filter((c) => c.meetingId === id);

  // Optional filter by parentCommentId
  if (parentCommentId !== undefined) {
    if (parentCommentId === "null" || parentCommentId === "none") {
      comments = comments.filter((c) => c.parentCommentId === null);
    } else {
      comments = comments.filter((c) => c.parentCommentId === parentCommentId);
    }
  }

  // Sort chronologically ascending
  comments.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const total = comments.length;
  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const totalPages = Math.ceil(total / parsedLimit) || 1;
  const startIndex = (parsedPage - 1) * parsedLimit;
  const items = comments.slice(startIndex, startIndex + parsedLimit);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        items,
        pagination: {
          page: parsedPage,
          limit: parsedLimit,
          total,
          totalPages,
          hasNextPage: parsedPage < totalPages,
          hasPreviousPage: parsedPage > 1,
        },
      },
      "Comments fetched successfully",
    ),
  );
});

/**
 * POST /api/v1/meetings/:id/comments (any authenticated user)
 */
export const createMeetingComment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { content, parentCommentId } = req.body;

  const meeting = await db.getMeetingById(id);
  if (!meeting) {
    throw new ApiError(404, ErrorCodeEnum.NOT_FOUND, "Meeting not found");
  }

  let validParentId = null;

  if (parentCommentId) {
    const parentComment = await db.getCommentById(parentCommentId);
    if (!parentComment || parentComment.meetingId !== id) {
      throw new ApiError(
        404,
        ErrorCodeEnum.NOT_FOUND,
        "Parent comment not found on this meeting",
      );
    }

    // Strict 1-level nesting: a reply cannot be replied to
    if (parentComment.parentCommentId !== null) {
      throw new ApiError(
        400,
        ErrorCodeEnum.VALIDATION_ERROR,
        "Cannot reply to a reply; threads are strictly one level deep",
      );
    }

    validParentId = parentComment.id;
  }

  const newComment = {
    id: uuidv4(),
    announcementId: null,
    meetingId: id,
    content: content.trim(),
    parentCommentId: validParentId,
    createdBy: { id: req.user.id, name: req.user.name },
    createdAt: new Date().toISOString(),
    updatedAt: null,
  };

  await db.createComment(newComment);

  res
    .status(201)
    .json(new ApiResponse(201, newComment, "Comment posted successfully"));
});

/**
 * GET /api/v1/comments/:id
 */
export const getCommentById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const comment = await db.getCommentById(id);
  if (!comment) {
    throw new ApiError(404, ErrorCodeEnum.NOT_FOUND, "Comment not found");
  }

  res
    .status(200)
    .json(new ApiResponse(200, comment, "Comment fetched successfully"));
});

/**
 * PATCH /api/v1/comments/:id (author only)
 */
export const updateComment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;

  const comment = await db.getCommentById(id);
  if (!comment) {
    throw new ApiError(404, ErrorCodeEnum.NOT_FOUND, "Comment not found");
  }

  // Only author can edit their own comment
  if (!comment.createdBy || comment.createdBy.id !== req.user.id) {
    throw new ApiError(
      403,
      ErrorCodeEnum.FORBIDDEN,
      "Only the author can edit this comment",
    );
  }

  const updates = {
    content: content.trim(),
    updatedAt: new Date().toISOString(),
  };

  await db.updateComment(id, updates);

  const updatedComment = await db.getCommentById(id);

  res
    .status(200)
    .json(new ApiResponse(200, updatedComment, "Comment updated successfully"));
});

/**
 * DELETE /api/v1/comments/:id (author or OB)
 * Hard delete: Permanently deletes the comment.
 * If deleting a top-level comment, permanently deletes all replies to it as well.
 */
export const deleteComment = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const comment = await db.getCommentById(id);
  if (!comment) {
    throw new ApiError(404, ErrorCodeEnum.NOT_FOUND, "Comment not found");
  }

  const isOB = req.user.role === UserRolesEnum.OB;
  const isAuthor = comment.createdBy && comment.createdBy.id === req.user.id;

  if (!isOB && !isAuthor) {
    throw new ApiError(
      403,
      ErrorCodeEnum.FORBIDDEN,
      "Only the author or an OB can delete this comment",
    );
  }

  // If top-level comment, cascade-delete all child replies
  if (comment.parentCommentId === null) {
    const allComments = await db.getAllComments();
    for (const c of allComments) {
      if (c.parentCommentId === id) {
        await db.deleteComment(c.id);
      }
    }
  }

  await db.deleteComment(id);

  res.status(204).send();
});
