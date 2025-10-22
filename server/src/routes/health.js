import { Router } from "express";
import { verifyDatabaseConnection } from "../config/database.js";

export const healthRouter = Router();

healthRouter.get("/", async (_req, res, next) => {
  try {
    await verifyDatabaseConnection();
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});
