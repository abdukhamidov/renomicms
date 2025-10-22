import { Pool } from "pg";
import { env, isProd } from "./env.js";
import { logger } from "../utils/logger.js";

let pool = null;

export function isDatabaseEnabled() {
  return env.enableDatabase;
}

export function getPool() {
  if (!env.enableDatabase) {
    throw new Error("Database pool requested while ENABLE_DATABASE is disabled.");
  }

  if (!pool) {
    pool = new Pool({
      connectionString: env.databaseUrl,
      ssl: isProd ? { rejectUnauthorized: false } : false,
    });

    pool.on("error", (error) => {
      logger.error("PostgreSQL pool error", error);
    });
  }

  return pool;
}

export async function verifyDatabaseConnection() {
  if (!env.enableDatabase) {
    logger.info("Database verification skipped (ENABLE_DATABASE=false).");
    return;
  }

  const client = await getPool().connect();
  try {
    await client.query("SELECT 1");
    logger.info("PostgreSQL connection verified");
  } finally {
    client.release();
  }
}
