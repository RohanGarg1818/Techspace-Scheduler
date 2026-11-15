import { query, withTransaction } from "./pool.js";
import { buildUpdate } from "./helpers.js";

const USER_SELECT = `
  SELECT u.id, u.name, u.email, u.password, u.role, u.ob_title, u.deleted_at,
         COALESCE(
           json_agg(json_build_object('teamId', ut.team_id, 'position', ut.position))
             FILTER (WHERE ut.team_id IS NOT NULL),
           '[]'::json
         ) AS teams
  FROM users u
  LEFT JOIN user_teams ut ON ut.user_id = u.id`;

const mapUser = (r) => ({
  id: r.id,
  name: r.name,
  email: r.email,
  password: r.password,
  role: r.role,
  obTitle: r.ob_title,
  deletedAt: r.deleted_at,
  teams: r.teams,
});

const insertTeams = (client, userId, teams) => {
  const unique = [...new Map(teams.map((t) => [t.teamId, t])).values()];
  if (unique.length === 0) {
    return null;
  }
  return client.query(
    `INSERT INTO user_teams (user_id, team_id, position)
     SELECT $1, x.team_id, x.position
     FROM unnest($2::text[], $3::text[]) AS x(team_id, position)
     ON CONFLICT (user_id, team_id) DO UPDATE SET position = EXCLUDED.position`,
    [userId, unique.map((t) => t.teamId), unique.map((t) => t.position)],
  );
};

export const getUserById = async (id) => {
  const res = await query(
    `${USER_SELECT} WHERE u.id = $1 AND u.deleted_at IS NULL GROUP BY u.id`,
    [id],
  );
  return res.rows[0] ? mapUser(res.rows[0]) : null;
};

export const getUserByEmail = async (email) => {
  const res = await query(
    `${USER_SELECT} WHERE LOWER(u.email) = LOWER($1) AND u.deleted_at IS NULL GROUP BY u.id`,
    [email],
  );
  return res.rows[0] ? mapUser(res.rows[0]) : null;
};

export const getAllUsers = async () => {
  const res = await query(
    `${USER_SELECT} WHERE u.deleted_at IS NULL GROUP BY u.id ORDER BY u.created_at`,
  );
  return res.rows.map(mapUser);
};

export const createUser = async (user) => {
  const u = {
    ...user,
    email: user.email.toLowerCase(),
    obTitle: user.obTitle ?? null,
    deletedAt: user.deletedAt ?? null,
    teams: Array.isArray(user.teams) ? user.teams : [],
  };

  const inserted = await withTransaction(async (client) => {
    const res = await client.query(
      `INSERT INTO users (id, name, email, password, role, ob_title, deleted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (LOWER(email)) WHERE deleted_at IS NULL DO NOTHING
       RETURNING id`,
      [u.id, u.name, u.email, u.password, u.role, u.obTitle, u.deletedAt],
    );
    if (res.rowCount === 0) {
      return false;
    }
    await insertTeams(client, u.id, u.teams);
    return true;
  });

  // if the email is taken, return the existing user.
  return inserted ? u : getUserByEmail(u.email);
};

export const updateUser = async (id, updates) => {
  const existing = await getUserById(id);
  if (!existing) {
    return null;
  }

  await withTransaction(async (client) => {
    const { text, values } = buildUpdate(
      "users",
      id,
      { ...updates, email: updates.email?.toLowerCase() },
      {
        name: "name",
        email: "email",
        password: "password",
        role: "role",
        obTitle: "ob_title",
        deletedAt: "deleted_at",
      },
    );
    await client.query(text, values);

    if (updates.teams !== undefined) {
      await client.query("DELETE FROM user_teams WHERE user_id = $1", [id]);
      if (Array.isArray(updates.teams)) {
        await insertTeams(client, id, updates.teams);
      }
    }
  });

  return getUserById(id);
};

export const deleteUser = async (id) => {
  const existing = await getUserById(id);
  if (!existing) {
    return null;
  }

  const deletedAt = await withTransaction(async (client) => {
    const res = await client.query(
      "UPDATE users SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL RETURNING deleted_at",
      [id],
    );
    await client.query("DELETE FROM user_teams WHERE user_id = $1", [id]);
    return res.rows[0]?.deleted_at ?? null;
  });

  return { ...existing, deletedAt, teams: [] };
};
