import { getPool, query, withTransaction } from "./pool.js";
import * as users from "./users.repo.js";
import * as teams from "./teams.repo.js";
import * as meetings from "./meetings.repo.js";
import * as announcements from "./announcements.repo.js";
import * as comments from "./comments.repo.js";
import * as tentativeMeetings from "./tentativeMeetings.repo.js";

const db = {
  ...users,
  ...teams,
  ...meetings,
  ...announcements,
  ...comments,
  ...tentativeMeetings,
  query,
  withTransaction,
  getClient: () => getPool().connect(),
};
Object.defineProperty(db, "pool", { get: getPool });

export default db;
