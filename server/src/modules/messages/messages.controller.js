import { createHttpError } from "../../utils/http-error.js";
import {
  listConversations,
  ensureDirectConversation,
  fetchConversation,
  sendMessageToConversation,
  sendMessageToUsername,
  markConversationAsRead,
  uploadMessageAttachment,
} from "./messages.service.js";

export async function getConversations(request, response) {
  const userId = request.user?.id;
  if (!userId) {
    throw createHttpError(401, "Authorization required.");
  }

  const { limit, offset } = request.query ?? {};
  const conversations = await listConversations(userId, {
    limit: limit ? Number(limit) : undefined,
    offset: offset ? Number(offset) : undefined,
  });

  response.json({
    status: "ok",
    conversations,
  });
}

export async function getConversationMessages(request, response) {
  const userId = request.user?.id;
  if (!userId) {
    throw createHttpError(401, "Authorization required.");
  }

  const { conversationId } = request.params;
  const { before, limit } = request.query ?? {};
  const result = await fetchConversation(userId, conversationId, {
    before,
    limit: limit ? Number(limit) : undefined,
  });

  response.json({
    status: "ok",
    ...result,
  });
}

export async function postConversationMessage(request, response) {
  const userId = request.user?.id;
  if (!userId) {
    throw createHttpError(401, "Authorization required.");
  }

  const { conversationId } = request.params;
  const { content, attachmentUrl } = request.body ?? {};

  const message = await sendMessageToConversation(userId, conversationId, { content, attachmentUrl });

  response.status(201).json({
    status: "ok",
    message,
  });
}

export async function postDirectMessage(request, response) {
  const userId = request.user?.id;
  if (!userId) {
    throw createHttpError(401, "Authorization required.");
  }

  const username = request.params.username ?? "";
  if (!username) {
    throw createHttpError(400, "РќРµ СѓРєР°Р·Р°РЅ РїРѕР»СѓС‡Р°С‚РµР»СЊ.");
  }

  const { content, attachmentUrl } = request.body ?? {};
  const { conversationId, message } = await sendMessageToUsername(userId, username, { content, attachmentUrl });

  response.status(201).json({
    status: "ok",
    conversationId,
    message,
  });
}

export async function openDirectConversation(request, response) {
  const userId = request.user?.id;
  if (!userId) {
    throw createHttpError(401, "Authorization required.");
  }

  const username = request.params.username ?? "";
  if (!username) {
    throw createHttpError(400, "РќРµ СѓРєР°Р·Р°РЅ РїРѕР»СѓС‡Р°С‚РµР»СЊ.");
  }

  const conversation = await ensureDirectConversation(userId, username);

  response.json({
    status: "ok",
    conversation,
  });
}

export async function markConversationReadHandler(request, response) {
  const userId = request.user?.id;
  if (!userId) {
    throw createHttpError(401, "Authorization required.");
  }

  const { conversationId } = request.params;
  const result = await markConversationAsRead(userId, conversationId);

  response.json({
    status: "ok",
    ...result,
  });
}


export async function uploadAttachment(request, response) {
  const userId = request.user?.id;
  if (!userId) {
    throw createHttpError(401, "Authorization required.");
  }

  const result = await uploadMessageAttachment(userId, request.body ?? {});

  response.status(201).json({
    status: "ok",
    attachmentUrl: result.attachmentUrl,
  });
}


