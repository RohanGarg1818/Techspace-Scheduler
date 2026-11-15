import { query } from "./pool.js";
import { buildUpdate } from "./helpers.js";

// team name and creator name come from joins, never from copied columns.
const MEETING_SELECT = `
  SELECT m.*, t.name AS team_name, u.name AS created_by_name
  FROM meetings m
  LEFT JOIN teams t ON t.id = m.team_id
  JOIN users u ON u.id = m.created_by`;

const mapMeeting = (r) => ({
  id: r.id,
  type: r.type,
  color: r.color,
  team: r.team_id ? { id: r.team_id, name: r.team_name } : null,
  topic: r.topic,
  date: r.date,
  startTime: r.start_time,
  endTime: r.end_time,
  note: r.note,
  location: r.location,
  link: r.link,
  createdBy: { id: r.created_by, name: r.created_by_name },
  status: r.status,
});

export const getMeetingById = async (id) => {
  const res = await query(`${MEETING_SELECT} WHERE m.id = $1`, [id]);
  return res.rows[0] ? mapMeeting(res.rows[0]) : null;
};

export const getAllMeetings = async () => {
  const res = await query(`${MEETING_SELECT} ORDER BY m.date, m.start_time`);
  return res.rows.map(mapMeeting);
};

export const createMeeting = async (meeting) => {
  await query(
    `INSERT INTO meetings (
       id, type, color, team_id, topic, date, start_time, end_time,
       note, location, link, created_by, status
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [
      meeting.id,
      meeting.type,
      meeting.color,
      meeting.team?.id ?? null,
      meeting.topic,
      meeting.date,
      meeting.startTime,
      meeting.endTime,
      meeting.note ?? null,
      meeting.location ?? null,
      meeting.link ?? null,
      meeting.createdBy.id,
      meeting.status || "scheduled",
    ],
  );
  return getMeetingById(meeting.id);
};

export const updateMeeting = async (id, updates) => {
  const existing = await getMeetingById(id);
  if (!existing) {
    return null;
  }
  const { text, values } = buildUpdate(
    "meetings",
    id,
    {
      ...updates,
      teamId:
        updates.team === undefined ? undefined : (updates.team?.id ?? null),
    },
    {
      topic: "topic",
      date: "date",
      startTime: "start_time",
      endTime: "end_time",
      note: "note",
      location: "location",
      link: "link",
      status: "status",
      type: "type",
      color: "color",
      teamId: "team_id",
    },
  );
  await query(text, values);
  return getMeetingById(id);
};

export const deleteMeeting = async (id) => {
  const res = await query("DELETE FROM meetings WHERE id = $1", [id]);
  return res.rowCount > 0;
};
