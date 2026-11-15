import pg from "pg";
const { Pool } = pg;

let pool = null;
let isInitialized = false;
let initPromise = null;

export const getPool = () => {
  if (!pool && process.env.DATABASE_URL) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
      max: 10,
      idleTimeoutMillis: 30000,
    });

    pool.on("error", (err) => {
      console.error("Unexpected error on idle PostgreSQL client:", err);
    });
  }
  return pool;
};

export const initPostgres = async () => {
  if (isInitialized) {
    return true;
  }
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    const currentPool = getPool();
    if (!currentPool) {
      console.log(
        "ℹ️ [Database] DATABASE_URL not set. Running in-memory mode.",
      );
      return false;
    }

    try {
      const client = await currentPool.connect();
      try {
        console.log("Connecting to Neon PostgreSQL...");
        await client.query("SELECT 1");
        isInitialized = true;
        console.log("✅ [Database] PostgreSQL connected successfully!");
        return true;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error(
        "❌ [Database] Failed to connect to PostgreSQL:",
        error.message,
      );
      initPromise = null;
      return false;
    }
  })();

  return initPromise;
};
