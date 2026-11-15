import { query } from "./pool.js";
import { buildUpdate } from "./helpers.js";

const COMMENT_SELECT = `
  SELECT c.*, u.name AS created_by_name
  FROM comments c
  JOIN users u ON u.id = c.created_by`;

const mapComment = (r) => ({
  id: r.id,
  announcementId: r.announcement_id,
  meetingId: r.meeting_id,
  parentCommentId: r.parent_comment_id,
  content: r.content,
  createdBy: { id: r.created_by, name: r.created_by_name },
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export const getCommentById = async (id) => {
  const res = await query(`${COMMENT_SELECT} WHERE c.id = $1`, [id]);
  return res.rows[0] ? mapComment(res.rows[0]) : null;
};

export const getAllComments = async () => {
  const res = await query(`${COMMENT_SELECT} ORDER BY c.created_at`);
  return res.rows.map(mapComment);
};

export const createComment = async (comment) => {
  await query(
    `INSERT INTO comments (
       id, announcement_id, meeting_id, parent_comment_id, content, created_by, created_at
     ) VALUES ($1,$2,$3,$4,$5,$6, COALESCE($7::timestamptz, now()))`,
    [
      comment.id,
      comment.announcementId ?? null,
      comment.meetingId ?? null,
      comment.parentCommentId ?? null,
      comment.content,
      comment.createdBy.id,
      comment.createdAt ?? null,
    ],
  );
  return getCommentById(comment.id);
};

export const updateComment = async (id, updates) => {
  const existing = await getCommentById(id);
  if (!existing) {
    return null;
  }
  const { text, values } = buildUpdate("comments", id, updates, {
    content: "content",
  });
  await query(text, values);
  return getCommentById(id);
};

export const deleteComment = async (id) => {
  const res = await query("DELETE FROM comments WHERE id = $1", [id]);
  return res.rowCount > 0;
};
