import { Router } from "express";
import { authenticate, optionalAuthenticate } from "../../middlewares/authenticate.js";
import {
  showProfile,
  listPosts,
  updateProfile,
  pingPresence,
  follow,
  unfollow,
  createPost,
  createPostForUsername,
  demoPost,
  demoNotification,
  listNotificationsForCurrentUser,
  markNotificationsRead,
} from "./profile.controller.js";

export const profileRouter = Router();

profileRouter.get("/notifications", authenticate, async (request, response, next) => {
  try {
    await listNotificationsForCurrentUser(request, response);
  } catch (error) {
    next(error);
  }
});

profileRouter.post("/notifications/read", authenticate, async (request, response, next) => {
  try {
    await markNotificationsRead(request, response);
  } catch (error) {
    next(error);
  }
});

profileRouter.get("/:username/posts", optionalAuthenticate, async (request, response, next) => {
  try {
    await listPosts(request, response);
  } catch (error) {
    next(error);
  }
});

profileRouter.get("/:username", optionalAuthenticate, async (request, response, next) => {
  try {
    await showProfile(request, response);
  } catch (error) {
    next(error);
  }
});

profileRouter.post("/presence", authenticate, async (request, response, next) => {
  try {
    await pingPresence(request, response);
  } catch (error) {
    next(error);
  }
});

profileRouter.patch("/", authenticate, async (request, response, next) => {
  try {
    await updateProfile(request, response);
  } catch (error) {
    next(error);
  }
});

profileRouter.post("/:username/follow", authenticate, async (request, response, next) => {
  try {
    await follow(request, response);
  } catch (error) {
    next(error);
  }
});

profileRouter.delete("/:username/follow", authenticate, async (request, response, next) => {
  try {
    await unfollow(request, response);
  } catch (error) {
    next(error);
  }
});

profileRouter.post("/:username/posts", authenticate, async (request, response, next) => {
  try {
    await createPostForUsername(request, response);
  } catch (error) {
    next(error);
  }
});

profileRouter.post("/posts", authenticate, async (request, response, next) => {
  try {
    await createPost(request, response);
  } catch (error) {
    next(error);
  }
});

// Вспомогательные методы для наполнения демо-данными
profileRouter.post("/demo/post", authenticate, async (request, response, next) => {
  try {
    await demoPost(request, response);
  } catch (error) {
    next(error);
  }
});

profileRouter.post("/demo/notification", authenticate, async (request, response, next) => {
  try {
    await demoNotification(request, response);
  } catch (error) {
    next(error);
  }
});
