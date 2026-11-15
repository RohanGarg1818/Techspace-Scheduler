import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error(
      "❌ [Migration Error] DATABASE_URL is not set in environment or .env file.",
    );
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    const client = await pool.connect();
    console.log("Connecting to PostgreSQL...");

    // Create migrations tracker table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const migrationsDir = path.join(__dirname, "migrations");
    if (!fs.existsSync(migrationsDir)) {
      console.log("⚠️ No migrations directory found at:", migrationsDir);
      client.release();
      await pool.end();
      process.exit(0);
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    if (files.length === 0) {
      console.log("ℹ️ No SQL migration files found.");
      client.release();
      await pool.end();
      process.exit(0);
    }

    // Get executed migrations
    const { rows: executedRows } = await client.query(
      "SELECT name FROM _migrations",
    );
    const executedSet = new Set(executedRows.map((r) => r.name));

    let executedCount = 0;
    for (const file of files) {
      if (executedSet.has(file)) {
        console.log(`⏩ [Skipping] ${file} (already executed)`);
        continue;
      }

      console.log(`🚀 [Running Migration] ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, "utf-8");

      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO _migrations (name) VALUES ($1)", [
          file,
        ]);
        await client.query("COMMIT");
        console.log(`✅ [Applied] ${file}`);
        executedCount += 1;
      } catch (migrationErr) {
        await client.query("ROLLBACK");
        console.error(`❌ [Failed] ${file}:`, migrationErr.message);
        throw migrationErr;
      }
    }

    if (executedCount === 0) {
      console.log("✨ All migrations are already up to date!");
    } else {
      console.log(`🎉 Successfully applied ${executedCount} migration(s)!`);
    }

    client.release();
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error("❌ [Migration Failed]:", err.message);
    await pool.end();
    process.exit(1);
  }
}

runMigrations();
