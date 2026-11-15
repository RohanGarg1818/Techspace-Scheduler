import pg from "pg";

pg.types.setTypeParser(1082, (v) => v); // DATE        -> "YYYY-MM-DD"
pg.types.setTypeParser(1083, (v) => v.slice(0, 5)); // TIME        -> "HH:MM"
pg.types.setTypeParser(1184, (v) => new Date(v).toISOString()); // TIMESTAMPTZ -> ISO string

let pool = null;

export const getPool = () => {
  if (pool) {
    return pool;
  }
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }
  pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.DATABASE_SSL === "false"
        ? false
        : { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
  });
  pool.on("error", (err) => {
    console.error("Unexpected error on idle PostgreSQL client:", err);
  });
  return pool;
};

export const query = (text, params) => getPool().query(text, params);

export const withTransaction = async (fn) => {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
};
