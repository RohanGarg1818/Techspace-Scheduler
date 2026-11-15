import app from "./app.js";
import { query } from "./db/pool.js";

const PORT = process.env.PORT || 8000;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Check your .env");
  process.exit(1);
}

try {
  const { rows } = await query(
    "SELECT to_regclass('public.schema_migrations') AS t",
  );
  if (!rows[0].t) {
    console.error("Database is not migrated. Run: npm run migrate");
    process.exit(1);
  }
} catch (err) {
  console.error("Cannot connect to the database:", err.message);
  process.exit(1);
}

app.listen(PORT, () => {
  console.log(`Server is listening on port: http://localhost:${PORT}`);
});
