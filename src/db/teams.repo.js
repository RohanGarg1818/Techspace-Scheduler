import { query } from "./pool.js";
import { buildUpdate } from "./helpers.js";

const mapTeam = (r) => ({
  id: r.id,
  name: r.name,
  type: r.type,
  description: r.description,
});

export const getTeamById = async (id) => {
  const res = await query("SELECT * FROM teams WHERE id = $1", [id]);
  return res.rows[0] ? mapTeam(res.rows[0]) : null;
};

export const getTeamByName = async (name) => {
  const res = await query("SELECT * FROM teams WHERE LOWER(name) = LOWER($1)", [
    name,
  ]);
  return res.rows[0] ? mapTeam(res.rows[0]) : null;
};

export const getAllTeams = async () => {
  const res = await query("SELECT * FROM teams ORDER BY created_at");
  return res.rows.map(mapTeam);
};

export const createTeam = async (team) => {
  const res = await query(
    `INSERT INTO teams (id, name, type, description)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (LOWER(name)) DO NOTHING
     RETURNING *`,
    [team.id, team.name, team.type, team.description ?? null],
  );
  return res.rows[0] ? mapTeam(res.rows[0]) : getTeamByName(team.name);
};

export const updateTeam = async (id, updates) => {
  const existing = await getTeamById(id);
  if (!existing) {
    return null;
  }
  const { text, values } = buildUpdate("teams", id, updates, {
    name: "name",
    type: "type",
    description: "description",
  });
  await query(text, values);
  return getTeamById(id);
};

export const deleteTeam = async (id) => {
  const res = await query("DELETE FROM teams WHERE id = $1", [id]);
  return res.rowCount > 0;
};
