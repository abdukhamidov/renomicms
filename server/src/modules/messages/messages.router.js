import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate.js";
import {
  getConversations,
  getConversationMessages,
  postConversationMessage,
  postDirectMessage,
  openDirectConversation,
  markConversationReadHandler,
  uploadAttachment,
} from "./messages.controller.js";

export const messagesRouter = Router();

messagesRouter.use(authenticate);

messagesRouter.post("/attachments", async (request, response, next) => {
  try {
    await uploadAttachment(request, response);
  } catch (error) {
    next(error);
  }
});

messagesRouter.get("/conversations", async (request, response, next) => {
  try {
    await getConversations(request, response);
  } catch (error) {
    next(error);
  }
});

messagesRouter.get("/conversations/:conversationId/messages", async (request, response, next) => {
  try {
    await getConversationMessages(request, response);
  } catch (error) {
    next(error);
  }
});

messagesRouter.post("/conversations/:conversationId/messages", async (request, response, next) => {
  try {
    await postConversationMessage(request, response);
  } catch (error) {
    next(error);
  }
});

messagesRouter.post("/conversations/:conversationId/read", async (request, response, next) => {
  try {
    await markConversationReadHandler(request, response);
  } catch (error) {
    next(error);
  }
});

messagesRouter.get("/direct/:username", async (request, response, next) => {
  try {
    await openDirectConversation(request, response);
  } catch (error) {
    next(error);
  }
});

messagesRouter.post("/direct/:username", async (request, response, next) => {
  try {
    await postDirectMessage(request, response);
  } catch (error) {
    next(error);
  }
});
