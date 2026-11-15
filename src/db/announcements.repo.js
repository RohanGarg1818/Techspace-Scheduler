import { query } from "./pool.js";
import { buildUpdate } from "./helpers.js";

const ANNOUNCEMENT_SELECT = `
  SELECT a.*, t.name AS team_name, u.name AS created_by_name
  FROM announcements a
  LEFT JOIN teams t ON t.id = a.team_id
  JOIN users u ON u.id = a.created_by`;

const mapAnnouncement = (r) => ({
  id: r.id,
  type: r.type,
  team: r.team_id ? { id: r.team_id, name: r.team_name } : null,
  title: r.title,
  content: r.content,
  priority: r.priority,
  isPinned: r.is_pinned,
  createdBy: { id: r.created_by, name: r.created_by_name },
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export const getAnnouncementById = async (id) => {
  const res = await query(`${ANNOUNCEMENT_SELECT} WHERE a.id = $1`, [id]);
  return res.rows[0] ? mapAnnouncement(res.rows[0]) : null;
};

export const getAllAnnouncements = async () => {
  const res = await query(
    `${ANNOUNCEMENT_SELECT} ORDER BY a.is_pinned DESC, a.created_at DESC`,
  );
  return res.rows.map(mapAnnouncement);
};

export const createAnnouncement = async (announcement) => {
  await query(
    `INSERT INTO announcements (
       id, type, team_id, title, content, priority, is_pinned, created_by, created_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8, COALESCE($9::timestamptz, now()))`,
    [
      announcement.id,
      announcement.type,
      announcement.team?.id ?? null,
      announcement.title,
      announcement.content,
      announcement.priority || "normal",
      Boolean(announcement.isPinned),
      announcement.createdBy.id,
      announcement.createdAt ?? null,
    ],
  );
  return getAnnouncementById(announcement.id);
};

export const updateAnnouncement = async (id, updates) => {
  const existing = await getAnnouncementById(id);
  if (!existing) {
    return null;
  }
  const { text, values } = buildUpdate(
    "announcements",
    id,
    {
      ...updates,
      isPinned:
        updates.isPinned === undefined ? undefined : Boolean(updates.isPinned),
    },
    {
      title: "title",
      content: "content",
      priority: "priority",
      isPinned: "is_pinned",
    },
  );
  await query(text, values);
  return getAnnouncementById(id);
};

export const deleteAnnouncement = async (id) => {
  const res = await query("DELETE FROM announcements WHERE id = $1", [id]);
  return res.rowCount > 0;
};
