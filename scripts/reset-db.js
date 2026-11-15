import "dotenv/config";
import { query } from "../src/db/pool.js";

if (process.env.NODE_ENV === "production") {
  console.error("bruh u dumb?.");
  process.exit(1);
}

try {
  console.log("Resetting database...");
  await query("TRUNCATE users, teams, meetings, announcements, comments CASCADE");
  console.log("boom.");
} catch (err) {
  console.error("Error:", err.message);
  process.exit(1);
} finally {
  process.exit(0);
}
