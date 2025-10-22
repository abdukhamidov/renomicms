import { Router } from "express";
import * as controller from "./auth.controller.js";
import { authenticate } from "../../middlewares/authenticate.js";

export const authRouter = Router();

authRouter.post("/register", async (req, res, next) => {
  try {
    await controller.register(req, res);
  } catch (error) {
    next(error);
  }
});

authRouter.post("/login", async (req, res, next) => {
  try {
    await controller.login(req, res);
  } catch (error) {
    next(error);
  }
});

authRouter.get("/me", authenticate, async (req, res, next) => {
  try {
    await controller.me(req, res);
  } catch (error) {
    next(error);
  }
});

authRouter.patch("/password", authenticate, async (req, res, next) => {
  try {
    await controller.updatePassword(req, res);
  } catch (error) {
    next(error);
  }
});
