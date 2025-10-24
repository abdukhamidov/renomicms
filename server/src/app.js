import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { healthRouter } from "./routes/health.js";
import { errorHandler } from "./middlewares/error-handler.js";
import { authRouter } from "./modules/auth/auth.router.js";
import { profileRouter } from "./modules/profile/profile.router.js";
import { usersRouter } from "./modules/users/user.router.js";
import { messagesRouter } from "./modules/messages/messages.router.js";
import { adminRouter } from "./modules/admin/admin.router.js";
import { siteAccessRouter } from "./modules/site-access/site-access.router.js";
import { appearanceRouter } from "./modules/appearance/appearance.router.js";
import { forumRouter } from "./modules/forum/forum.router.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, "..", "uploads");
fs.mkdirSync(uploadsDir, { recursive: true });

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(cors());
  const bodyLimit = "75mb";
  app.use(express.json({ limit: bodyLimit }));
  app.use(express.urlencoded({ extended: true, limit: bodyLimit }));
  app.use("/uploads", express.static(uploadsDir));
  app.use((_, res, next) => {
    if (!res.getHeader("Content-Type")) {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
    }
    next();
  });

  app.use("/health", healthRouter);
  app.use("/site-access", siteAccessRouter);
  app.use("/appearance", appearanceRouter);
  app.use("/auth", authRouter);
  app.use("/profile", profileRouter);
  app.use("/users", usersRouter);
  app.use("/messages", messagesRouter);
  app.use("/forum", forumRouter);
  app.use("/admin", adminRouter);

  app.get("/", (_req, res) => {
    res.json({
      service: "reNomiCMS API",
      status: "ok",
    });
  });

  app.use(errorHandler);

  return app;
}
