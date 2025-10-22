import path from "path";
import { createHttpError } from "../../utils/http-error.js";
import { findUserByUsername, findUserById } from "../users/user.repository.js";
import {
  getOrCreateDirectConversation,
  getUserConversations,
  getConversationForUser,
  getMessagesForConversation,
  createMessage,
  markConversationRead,
  getConversationParticipantIds,
  getConversationParticipants,
  saveMessageAttachmentFile,
} from "./messages.repository.js";
import { emitConversationEvent, emitMessageEvent } from "./messages.socket.js";
import { updateProfilePresence } from "../profile/profile.service.js";
import { createNotification, getProfileByUsername } from "../profile/profile.repository.js";
import { logger } from "../../utils/logger.js";

const MAX_ATTACHMENT_SIZE_BYTES = 5 * 1024 * 1024;
const MIME_EXTENSION_MAP = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/avif": ".avif",
  "application/pdf": ".pdf",
  "text/plain": ".txt",
};
const ALLOWED_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".avif",
  ".pdf",
  ".txt",
]);

function normalizeAttachmentExtension(filename, mimeType) {
  const rawExt = (path.extname(filename) || "").toLowerCase();
  if (rawExt && ALLOWED_EXTENSIONS.has(rawExt)) {
    return rawExt === ".jpeg" ? ".jpg" : rawExt;
  }
  if (mimeType) {
    const mapped = MIME_EXTENSION_MAP[mimeType.toLowerCase()];
    if (mapped) {
      return mapped;
    }
  }
  throw createHttpError(415, "Unsupported attachment type");
}

export async function listConversations(userId, options) {
  return getUserConversations(userId, options);
}

export async function ensureDirectConversation(userId, targetUsername) {
  const target = await findUserByUsername(targetUsername.toLowerCase());
  if (!target) {
    throw createHttpError(404, "пїЅ?пїЅ?пїЅ>пїЅ?пїЅпїЅпїЅ?пїЅ?пїЅпїЅпїЅ'пїЅпїЅ>пїЅ? пїЅ?пїЅпїЅ пїЅ?пїЅпїЅпїЅпїЅпїЅ?пїЅпїЅ?.");
  }
  if (target.id === userId) {
    throw createHttpError(400, "РќРµР»СЊР·СЏ СЃРѕР·РґР°С‚СЊ РґРёР°Р»РѕРі СЃ СЃР°РјРёРј СЃРѕР±РѕР№.");
  }

  const conversationId = await getOrCreateDirectConversation(userId, target.id);
  const conversation = await getConversationForUser(conversationId, userId);
  if (!conversation) {
    throw createHttpError(500, "РќРµ СѓРґР°Р»РѕСЃСЊ РїРѕР»СѓС‡РёС‚СЊ РґРёР°Р»РѕРі.");
  }
  const summaries = await getUserConversations(userId, { limit: 50 });
  const enriched = summaries.find((item) => item.id === conversation.id);
  return enriched ?? conversation;
}

export async function fetchConversation(userId, conversationId, options = {}) {
  const conversation = await getConversationForUser(conversationId, userId);
  if (!conversation) {
    throw createHttpError(404, "Р”РёР°Р»РѕРі РЅРµ РЅР°Р№РґРµРЅ.");
  }

  const messages = await getMessagesForConversation(conversationId, userId, options);
  const summaries = await getUserConversations(userId, { limit: 50 });
  const enriched = summaries.find((item) => item.id === conversation.id) ?? conversation;
  const participants = await getConversationParticipants(conversationId);
  return { conversation: enriched, messages, participants };
}

export async function sendMessageToConversation(userId, conversationId, payload) {
  const conversation = await getConversationForUser(conversationId, userId);
  if (!conversation) {
    throw createHttpError(404, "Р”РёР°Р»РѕРі РЅРµ РЅР°Р№РґРµРЅ.");
  }

  const sender = await findUserById(userId);
  if (!sender) {
    throw createHttpError(404, "РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ РЅРµ РЅР°Р№РґРµРЅ.");
  }

  const content = typeof payload.content === "string" ? payload.content.trim() : "";
  const attachmentUrl =
    typeof payload.attachmentUrl === "string" && payload.attachmentUrl.trim().length > 0
      ? payload.attachmentUrl.trim()
      : null;

  if (!content && !attachmentUrl) {
    throw createHttpError(400, "РЎРѕРѕР±С‰РµРЅРёРµ РЅРµ РјРѕР¶РµС‚ Р±С‹С‚СЊ РїСѓСЃС‚С‹Рј.");
  }

  const message = await createMessage(conversationId, userId, { content, attachmentUrl });
  await updateProfilePresence(userId).catch(() => undefined);

  let avatarUrl = null;
  try {
    const senderProfile = await getProfileByUsername(sender.usernameLower ?? sender.username.toLowerCase());
    avatarUrl = senderProfile?.profile?.avatarUrl ?? null;
  } catch (error) {
    logger.warn("Failed to load sender profile for message notification", {
      error: error instanceof Error ? error.message : error,
      senderId: sender.id,
    });
  }

  const participantIds = await getConversationParticipantIds(conversationId);
  const recipients = participantIds.filter((id) => id !== userId);
  await Promise.all(
    recipients.map(async (targetId) => {
      try {
        await createNotification(targetId, {
          type: "messages.direct",
          title: sender.displayName ?? sender.username,
          body: content || (attachmentUrl ? "Attachment" : "New message"),
          iconUrl: avatarUrl ?? "/design/img/default-avatar.png",
          link: `/mail/chat?conversation=${conversationId}`,
          authorId: sender.id,
        });
      } catch (error) {
        logger.warn("Failed to create message notification", {
          error: error instanceof Error ? error.message : error,
          conversationId,
          targetId,
        });
      }
    }),
  );

  emitMessageEvent(participantIds, {
    type: "message:new",
    conversationId,
    message,
  });

  return message;
}

export async function sendMessageToUsername(userId, targetUsername, payload) {
  const conversation = await ensureDirectConversation(userId, targetUsername);
  const message = await sendMessageToConversation(userId, conversation.id, payload);
  return { conversationId: conversation.id, message };
}

export async function uploadMessageAttachment(userId, payload) {
  if (!userId) {
    throw createHttpError(401, "Authorization required.");
  }
  if (!payload || typeof payload !== "object") {
    throw createHttpError(400, "Некорректные данные вложения.");
  }

  const filename = typeof payload.filename === "string" ? payload.filename.trim() : "";
  if (!filename) {
    throw createHttpError(400, "Имя файла вложения не задано.");
  }

  let content = typeof payload.content === "string" ? payload.content.trim() : "";
  if (!content) {
    throw createHttpError(400, "Содержимое вложения не задано.");
  }

  let mimeType = typeof payload.contentType === "string" ? payload.contentType.trim() : "";
  const dataUrlMatch = content.match(/^data:([^;]+);base64,(.+)$/i);
  if (dataUrlMatch) {
    mimeType = dataUrlMatch[1];
    content = dataUrlMatch[2];
  }

  content = content.replace(/\s/g, "");

  let buffer;
  try {
    buffer = Buffer.from(content, "base64");
  } catch (error) {
    throw createHttpError(400, "Не удалось декодировать вложение.");
  }

  if (!buffer || buffer.length === 0) {
    throw createHttpError(400, "Вложение пустое.");
  }

  if (buffer.length > MAX_ATTACHMENT_SIZE_BYTES) {
    throw createHttpError(413, "Размер вложения превышает 5 МБ.");
  }

  const extension = normalizeAttachmentExtension(filename, mimeType);
  const attachmentUrl = await saveMessageAttachmentFile({ extension, buffer });
  return { attachmentUrl };
}

export async function markConversationAsRead(userId, conversationId) {
  const conversation = await getConversationForUser(conversationId, userId);
  if (!conversation) {
    throw createHttpError(404, "Р”РёР°Р»РѕРі РЅРµ РЅР°Р№РґРµРЅ.");
  }

  const timestamp = new Date().toISOString();
  await markConversationRead(conversationId, userId, timestamp);
  const participantIds = await getConversationParticipantIds(conversationId);
  emitConversationEvent(participantIds, {
    type: "conversation:read",
    conversationId,
    userId,
    lastReadAt: timestamp,
  });

  return { conversationId, lastReadAt: timestamp };
}






