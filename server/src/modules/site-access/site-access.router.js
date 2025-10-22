import { Router } from "express";
import { handleGetPublicSiteAccess } from "./site-access.controller.js";

export const siteAccessRouter = Router();

siteAccessRouter.get("/", handleGetPublicSiteAccess);
