import { query } from "./pool.js";

/**
 * Repository for tentative_meetings table
 */

/**
 * Get all tentative meetings
 * @returns {Promise<Array>}
 */
export const getAllTentativeMeetings = async () => {
  const result = await query(`
    SELECT 
      tm.id,
      tm.type,
      tm.color,
      tm.team_id,
      t.name as team_name,
      tm.topic,
      tm.start_date,
      tm.end_date,
      tm.start_time,
      tm.end_time,
      tm.note,
      tm.location,
      tm.link,
      tm.status,
      tm.created_at,
      tm.updated_at,
      u.id as created_by_id,
      u.name as created_by_name
    FROM tentative_meetings tm
    LEFT JOIN teams t ON tm.team_id = t.id
    LEFT JOIN users u ON tm.created_by = u.id
    ORDER BY tm.start_date ASC, tm.start_time ASC NULLS FIRST
  `);

  return result.rows.map((row) => ({
    id: row.id,
    type: row.type,
    color: row.color,
    team: row.team_id ? { id: row.team_id, name: row.team_name } : null,
    topic: row.topic,
    startDate: row.start_date,
    endDate: row.end_date,
    startTime: row.start_time,
    endTime: row.end_time,
    note: row.note,
    location: row.location,
    link: row.link,
    status: row.status,
    createdBy: { id: row.created_by_id, name: row.created_by_name },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
};

/**
 * Get tentative meeting by ID
 * @param {string} id
 * @returns {Promise<object|null>}
 */
export const getTentativeMeetingById = async (id) => {
  const result = await query(
    `
    SELECT 
      tm.id,
      tm.type,
      tm.color,
      tm.team_id,
      t.name as team_name,
      tm.topic,
      tm.start_date,
      tm.end_date,
      tm.start_time,
      tm.end_time,
      tm.note,
      tm.location,
      tm.link,
      tm.status,
      tm.created_at,
      tm.updated_at,
      u.id as created_by_id,
      u.name as created_by_name
    FROM tentative_meetings tm
    LEFT JOIN teams t ON tm.team_id = t.id
    LEFT JOIN users u ON tm.created_by = u.id
    WHERE tm.id = $1
  `,
    [id],
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    type: row.type,
    color: row.color,
    team: row.team_id ? { id: row.team_id, name: row.team_name } : null,
    topic: row.topic,
    startDate: row.start_date,
    endDate: row.end_date,
    startTime: row.start_time,
    endTime: row.end_time,
    note: row.note,
    location: row.location,
    link: row.link,
    status: row.status,
    createdBy: { id: row.created_by_id, name: row.created_by_name },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

/**
 * Create tentative meeting
 * @param {object} tentativeMeeting
 * @returns {Promise<object>}
 */
export const createTentativeMeeting = async (tentativeMeeting) => {
  const result = await query(
    `
    INSERT INTO tentative_meetings (
      id, type, color, team_id, topic, 
      start_date, end_date, start_time, end_time,
      note, location, link, created_by, status
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING *
  `,
    [
      tentativeMeeting.id,
      tentativeMeeting.type,
      tentativeMeeting.color,
      tentativeMeeting.team?.id ?? null,
      tentativeMeeting.topic,
      tentativeMeeting.startDate,
      tentativeMeeting.endDate,
      tentativeMeeting.startTime ?? null,
      tentativeMeeting.endTime ?? null,
      tentativeMeeting.note ?? null,
      tentativeMeeting.location ?? null,
      tentativeMeeting.link ?? null,
      tentativeMeeting.createdBy.id,
      tentativeMeeting.status,
    ],
  );

  return result.rows[0];
};

/**
 * Update tentative meeting
 * @param {string} id
 * @param {object} updates
 * @returns {Promise<object>}
 */
export const updateTentativeMeeting = async (id, updates) => {
  const fields = [];
  const values = [];
  let paramCounter = 1;

  if (updates.topic !== undefined) {
    fields.push(`topic = $${paramCounter++}`);
    values.push(updates.topic);
  }
  if (updates.startDate !== undefined) {
    fields.push(`start_date = $${paramCounter++}`);
    values.push(updates.startDate);
  }
  if (updates.endDate !== undefined) {
    fields.push(`end_date = $${paramCounter++}`);
    values.push(updates.endDate);
  }
  if (updates.startTime !== undefined) {
    fields.push(`start_time = $${paramCounter++}`);
    values.push(updates.startTime);
  }
  if (updates.endTime !== undefined) {
    fields.push(`end_time = $${paramCounter++}`);
    values.push(updates.endTime);
  }
  if (updates.note !== undefined) {
    fields.push(`note = $${paramCounter++}`);
    values.push(updates.note);
  }
  if (updates.location !== undefined) {
    fields.push(`location = $${paramCounter++}`);
    values.push(updates.location);
  }
  if (updates.link !== undefined) {
    fields.push(`link = $${paramCounter++}`);
    values.push(updates.link);
  }
  if (updates.type !== undefined) {
    fields.push(`type = $${paramCounter++}`);
    values.push(updates.type);
  }
  if (updates.color !== undefined) {
    fields.push(`color = $${paramCounter++}`);
    values.push(updates.color);
  }
  if (updates.team !== undefined) {
    fields.push(`team_id = $${paramCounter++}`);
    values.push(updates.team?.id ?? null);
  }
  if (updates.status !== undefined) {
    fields.push(`status = $${paramCounter++}`);
    values.push(updates.status);
  }

  fields.push("updated_at = now()");
  values.push(id);

  const result = await query(
    `UPDATE tentative_meetings SET ${fields.join(", ")} WHERE id = $${paramCounter} RETURNING *`,
    values,
  );

  return result.rows[0];
};

/**
 * Delete tentative meeting
 * @param {string} id
 * @returns {Promise<void>}
 */
export const deleteTentativeMeeting = async (id) => {
  await query("DELETE FROM tentative_meetings WHERE id = $1", [id]);
};
