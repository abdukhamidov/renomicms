import { Router } from "express";
import { authenticate, optionalAuthenticate } from "../../middlewares/authenticate.js";
import {
  listNewsHandler,
  getNewsHandler,
  createNewsHandler,
  updateNewsHandler,
  deleteNewsHandler,
  listNewsCommentsHandler,
  createNewsCommentHandler,
} from "./news.controller.js";

export const newsRouter = Router();

newsRouter.get("/", optionalAuthenticate, listNewsHandler);
newsRouter.get("/:newsId/comments", optionalAuthenticate, listNewsCommentsHandler);
newsRouter.post("/:newsId/comments", authenticate, createNewsCommentHandler);
newsRouter.get("/:newsId", optionalAuthenticate, getNewsHandler);
newsRouter.post("/", authenticate, createNewsHandler);
newsRouter.put("/:newsId", authenticate, updateNewsHandler);
newsRouter.delete("/:newsId", authenticate, deleteNewsHandler);
