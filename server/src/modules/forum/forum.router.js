import { Router } from "express";
import { authenticate, optionalAuthenticate } from "../../middlewares/authenticate.js";
import {
  listCategoriesHandler,
  getSectionHandler,
  getTopicHandler,
  createTopicHandler,
  updateTopicHandler,
  updateTopicStateHandler,
  createPostHandler,
  updatePostHandler,
  votePostHandler,
  deletePostHandler,
  deleteTopicHandler,
  incrementTopicViewHandler,
  uploadAttachmentHandler,
} from "./forum.controller.js";

export const forumRouter = Router();

forumRouter.get("/", optionalAuthenticate, async (request, response, next) => {
  try {
    await listCategoriesHandler(request, response);
  } catch (error) {
    next(error);
  }
});

forumRouter.get("/sections/:sectionId", optionalAuthenticate, async (request, response, next) => {
  try {
    await getSectionHandler(request, response);
  } catch (error) {
    next(error);
  }
});

forumRouter.get("/topics/:topicId", optionalAuthenticate, async (request, response, next) => {
  try {
    await getTopicHandler(request, response);
  } catch (error) {
    next(error);
  }
});

forumRouter.post("/attachments", authenticate, async (request, response, next) => {
  try {
    await uploadAttachmentHandler(request, response);
  } catch (error) {
    next(error);
  }
});

forumRouter.post("/sections/:sectionId/topics", authenticate, async (request, response, next) => {
  try {
    await createTopicHandler(request, response);
  } catch (error) {
    next(error);
  }
});

forumRouter.patch("/topics/:topicId", authenticate, async (request, response, next) => {
  try {
    await updateTopicHandler(request, response);
  } catch (error) {
    next(error);
  }
});

forumRouter.patch("/topics/:topicId/state", authenticate, async (request, response, next) => {
  try {
    await updateTopicStateHandler(request, response);
  } catch (error) {
    next(error);
  }
});

forumRouter.post("/topics/:topicId/views", optionalAuthenticate, async (request, response, next) => {
  try {
    await incrementTopicViewHandler(request, response);
  } catch (error) {
    next(error);
  }
});

forumRouter.post("/topics/:topicId/posts", authenticate, async (request, response, next) => {
  try {
    await createPostHandler(request, response);
  } catch (error) {
    next(error);
  }
});

forumRouter.patch("/posts/:postId", authenticate, async (request, response, next) => {
  try {
    await updatePostHandler(request, response);
  } catch (error) {
    next(error);
  }
});

forumRouter.post("/posts/:postId/votes", authenticate, async (request, response, next) => {
  try {
    await votePostHandler(request, response);
  } catch (error) {
    next(error);
  }
});

forumRouter.delete("/posts/:postId", authenticate, async (request, response, next) => {
  try {
    await deletePostHandler(request, response);
  } catch (error) {
    next(error);
  }
});

forumRouter.delete("/topics/:topicId", authenticate, async (request, response, next) => {
  try {
    await deleteTopicHandler(request, response);
  } catch (error) {
    next(error);
  }
});
