import http from "http";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";
import { verifyDatabaseConnection } from "./config/database.js";
import { initRealtime } from "./utils/realtime.js";

async function bootstrap() {
  try {
    await verifyDatabaseConnection();
  } catch (error) {
    logger.error("Failed to verify database connection on startup", error);
  }

  const app = createApp();
  const server = http.createServer(app);

  initRealtime(server);

  server.listen(env.port, () => {
    logger.info(`Server listening on http://localhost:${env.port}`);
  });
}

bootstrap().catch((error) => {
  logger.error("Unexpected startup error", error);
  process.exit(1);
});
