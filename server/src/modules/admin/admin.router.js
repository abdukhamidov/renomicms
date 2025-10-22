import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate.js";
import {
  handleGetAdminSiteAccess,
  handleGetAdminStats,
  handleUpdateAdminSiteAccess,
  handleGetAppearanceSettings,
  handleUpdateAppearanceSettings,
  handleUpdateUserProfile,
} from "./admin.controller.js";

export const adminRouter = Router();

adminRouter.use(authenticate);
adminRouter.get("/stats", handleGetAdminStats);
adminRouter.get("/site-access", handleGetAdminSiteAccess);
adminRouter.put("/site-access", handleUpdateAdminSiteAccess);
adminRouter.get("/appearance", handleGetAppearanceSettings);
adminRouter.put("/appearance", handleUpdateAppearanceSettings);
adminRouter.patch("/users/:userId/profile", handleUpdateUserProfile);
