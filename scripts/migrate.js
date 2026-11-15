// Usage: npm run migrate
// Applies every migrations/*.sql not yet recorded in schema_migrations,
// in filename order, each inside its own transaction.
import "dotenv/config";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const dir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "migrations",
);
const LOCK_ID = 727274;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.DATABASE_SSL === "false"
      ? false
      : { rejectUnauthorized: false },
});

const sha = (s) => crypto.createHash("sha256").update(s).digest("hex");

try {
  await client.connect();
  await client.query("SELECT pg_advisory_lock($1)", [LOCK_ID]);
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name        TEXT PRIMARY KEY,
      checksum    TEXT NOT NULL,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);

  const { rows } = await client.query(
    "SELECT name, checksum FROM schema_migrations",
  );
  const applied = new Map(rows.map((r) => [r.name, r.checksum]));
  const files = (await fs.readdir(dir))
    .filter((f) => f.endsWith(".sql"))
    .sort();

  let count = 0;
  for (const file of files) {
    const sql = await fs.readFile(path.join(dir, file), "utf8");
    const checksum = sha(sql);

    if (applied.has(file)) {
      if (applied.get(file) !== checksum) {
        throw new Error(
          `${file} was edited after being applied. Add a new migration instead.`,
        );
      }
      continue;
    }

    console.log(`-> applying ${file}`);
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query(
        "INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)",
        [file, checksum],
      );
      await client.query("COMMIT");
      count++;
    } catch (err) {
      await client.query("ROLLBACK");
      throw new Error(`${file} failed: ${err.message}`, { cause: err });
    }
  }

  console.log(count ? `Done. Applied ${count} migration(s).` : "Up to date.");
} catch (err) {
  console.error(err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
