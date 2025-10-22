import { Router } from "express";
import { handleGetAppearance } from "./appearance.controller.js";

export const appearanceRouter = Router();

appearanceRouter.get("/", handleGetAppearance);
