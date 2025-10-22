import { Router } from "express";
import { listUsers, changeUserRole, forceSetUserRoleByUsername } from "./user.service.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { USER_ROLES } from "../../constants/roles.js";

export const usersRouter = Router();

usersRouter.get("/", async (request, response, next) => {
  try {
    const { search = "", limit, offset } = request.query;

    const result = await listUsers({
      search: typeof search === "string" ? search : "",
      limit: typeof limit === "string" || typeof limit === "number" ? Number(limit) : undefined,
      offset: typeof offset === "string" || typeof offset === "number" ? Number(offset) : undefined,
    });

    response.json({
      status: "ok",
      ...result,
    });
  } catch (error) {
    next(error);
  }
});

usersRouter.patch("/:userId/role", authenticate, async (request, response, next) => {
  try {
    const actorId = request.user?.id ?? null;
    const targetUserId = request.params.userId ?? "";
    const { role } = request.body ?? {};

    if (!targetUserId || typeof targetUserId !== "string") {
      response.status(400).json({
        status: "error",
        message: "Target user id is required.",
      });
      return;
    }

    const updatedUser = await changeUserRole(actorId, targetUserId, role);

    response.json({
      status: "ok",
      user: updatedUser,
    });
  } catch (error) {
    next(error);
  }
});

usersRouter.post("/bootstrap-admin", async (request, response, next) => {
  try {
    const { username, token } = request.body ?? {};

    const updatedUser = await forceSetUserRoleByUsername(username, USER_ROLES.ADMIN, token);

    response.json({
      status: "ok",
      user: updatedUser,
    });
  } catch (error) {
    next(error);
  }
});
