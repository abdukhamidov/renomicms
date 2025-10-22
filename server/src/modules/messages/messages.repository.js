import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getPool, isDatabaseEnabled } from "../../config/database.js";
import { logger } from "../../utils/logger.js";
import { DEFAULT_AVATAR_URL } from "../../constants/media.js";

const projectRoot = path.dirname(fileURLToPath(new URL("../../..", import.meta.url)));
const serverRoot = path.join(projectRoot, "server");
const dataDir = path.join(serverRoot, "data");
const uploadsDir = path.join(serverRoot, "uploads");
const attachmentsUploadsDir = path.join(uploadsDir, "messages");
const conversationsFilePath = path.join(dataDir, "messages-conversations.json");
const participantsFilePath = path.join(dataDir, "messages-participants.json");
const messagesFilePath = path.join(dataDir, "messages.json");

let tablesInitialized = false;

function normalizeDirectKey(userAId, userBId) {
  return [userAId, userBId].sort().join(":");
}

async function ensureDataFiles() {
  await fs.mkdir(dataDir, { recursive: true });
  const defaults = [
    { path: conversationsFilePath, value: "{}" },
    { path: participantsFilePath, value: "{}" },
    { path: messagesFilePath, value: "{}" },
  ];

  await Promise.all(
    defaults.map(async ({ path: filePath, value }) => {
      try {
        await fs.access(filePath);
      } catch {
        await fs.writeFile(filePath, value, "utf8");
      }
    }),
  );
}

async function ensureAttachmentsDir() {
  await fs.mkdir(attachmentsUploadsDir, { recursive: true });
}

async function ensureMessageTables() {
  if (tablesInitialized || !isDatabaseEnabled()) {
    return;
  }

  const pool = getPool();
  await pool.query(
    `
      CREATE TABLE IF NOT EXISTS messages_conversations (
        id UUID PRIMARY KEY,
        type TEXT NOT NULL DEFAULT 'direct',
        key TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS messages_participants (
        conversation_id UUID NOT NULL REFERENCES messages_conversations(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (conversation_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY,
        conversation_id UUID NOT NULL REFERENCES messages_conversations(id) ON DELETE CASCADE,
        sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT,
        attachment_url TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_messages_conversation_id_created_at
        ON messages (conversation_id, created_at DESC);

      CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_conversations_key
        ON messages_conversations (key);
    `,
  );

  tablesInitialized = true;
  logger.info("Message tables ready");
}

function mapConversationRow(row) {
  return {
    id: row.conversation_id ?? row.id,
    type: row.type ?? "direct",
    key: row.key,
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
    latestMessage: row.latest_message_id
      ? {
          id: row.latest_message_id,
          senderId: row.latest_message_sender_id,
          content: row.latest_message_content ?? "",
          attachmentUrl: row.latest_message_attachment_url ?? null,
          createdAt: row.latest_message_created_at?.toISOString?.() ?? row.latest_message_created_at,
        }
      : null,
    unreadCount: Number(row.unread_count) || 0,
    participant: row.participant_id
      ? {
          id: row.participant_id,
          username: row.participant_username,
          displayName: row.participant_display_name ?? row.participant_username,
          avatarUrl: row.participant_avatar_url ?? null,
        }
      : null,
  };
}

function mapMessageRow(row) {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    content: row.content ?? "",
    attachmentUrl: row.attachment_url ?? null,
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
    updatedAt: row.updated_at?.toISOString?.() ?? row.updated_at,
  };
}

export async function getOrCreateDirectConversation(userId, targetUserId) {
  if (userId === targetUserId) {
    throw new Error("Cannot create a conversation with yourself.");
  }

  const key = normalizeDirectKey(userId, targetUserId);

  if (isDatabaseEnabled()) {
    await ensureMessageTables();
    const pool = getPool();

    const existing = await pool.query(
      `
        SELECT id
        FROM messages_conversations
        WHERE key = $1
        LIMIT 1
      `,
      [key],
    );

    let conversationId = existing.rows[0]?.id;

    if (!conversationId) {
      conversationId = randomUUID();
      await pool.query(
        `
          INSERT INTO messages_conversations (id, type, key)
          VALUES ($1, 'direct', $2)
          ON CONFLICT (key) DO NOTHING
        `,
        [conversationId, key],
      );
    }

    await pool.query(
      `
        INSERT INTO messages_participants (conversation_id, user_id)
        VALUES ($1, $2)
        ON CONFLICT (conversation_id, user_id) DO NOTHING
      `,
      [conversationId, userId],
    );

    await pool.query(
      `
        INSERT INTO messages_participants (conversation_id, user_id)
        VALUES ($1, $2)
        ON CONFLICT (conversation_id, user_id) DO NOTHING
      `,
      [conversationId, targetUserId],
    );

    return conversationId;
  }

  await ensureDataFiles();
  const [conversationsText, participantsText] = await Promise.all([
    fs.readFile(conversationsFilePath, "utf8"),
    fs.readFile(participantsFilePath, "utf8"),
  ]);

  const conversations = JSON.parse(conversationsText);
  const participants = JSON.parse(participantsText);

  let conversation = Object.values(conversations).find((item) => item.key === key);
  if (!conversation) {
    const id = randomUUID();
    conversation = {
      id,
      type: "direct",
      key,
      createdAt: new Date().toISOString(),
    };
    conversations[id] = conversation;
    participants[id] = [
      { userId, joinedAt: new Date().toISOString(), lastReadAt: new Date().toISOString() },
      { userId: targetUserId, joinedAt: new Date().toISOString(), lastReadAt: new Date().toISOString() },
    ];
    await Promise.all([
      fs.writeFile(conversationsFilePath, JSON.stringify(conversations, null, 2), "utf8"),
      fs.writeFile(participantsFilePath, JSON.stringify(participants, null, 2), "utf8"),
    ]);
    return id;
  }

  return conversation.id;
}

export async function getUserConversations(userId, { limit = 20, offset = 0 } = {}) {
  if (isDatabaseEnabled()) {
    await ensureMessageTables();
    const pool = getPool();

    const result = await pool.query(
      `
        WITH participant_conversations AS (
          SELECT
            mc.id,
            mc.type,
            mc.key,
            mc.created_at,
            mp.last_read_at,
            mp.joined_at
          FROM messages_conversations mc
          JOIN messages_participants mp ON mp.conversation_id = mc.id
          WHERE mp.user_id = $1
          ORDER BY mc.created_at DESC
          LIMIT $2 OFFSET $3
        ),
        latest_messages AS (
          SELECT DISTINCT ON (m.conversation_id)
            m.conversation_id,
            m.id,
            m.sender_id,
            m.content,
            m.attachment_url,
            m.created_at
          FROM messages m
          ORDER BY m.conversation_id, m.created_at DESC
        )
        SELECT
          pc.id AS conversation_id,
          pc.type,
          pc.key,
          pc.created_at,
          lm.id AS latest_message_id,
          lm.sender_id AS latest_message_sender_id,
          lm.content AS latest_message_content,
          lm.attachment_url AS latest_message_attachment_url,
          lm.created_at AS latest_message_created_at,
          COALESCE(
            (
              SELECT COUNT(*)
              FROM messages unread
              WHERE unread.conversation_id = pc.id
                AND unread.created_at > pc.last_read_at
            ),
            0
          ) AS unread_count,
          u.id AS participant_id,
          u.username AS participant_username,
          u.display_name AS participant_display_name,
          COALESCE(p.avatar_url, '${DEFAULT_AVATAR_URL}') AS participant_avatar_url
        FROM participant_conversations pc
        LEFT JOIN latest_messages lm ON lm.conversation_id = pc.id
        LEFT JOIN messages_participants other_participant
          ON other_participant.conversation_id = pc.id
         AND other_participant.user_id <> $1
        LEFT JOIN users u ON u.id = other_participant.user_id
        LEFT JOIN user_profiles p ON p.user_id = u.id
        ORDER BY lm.created_at DESC NULLS LAST, pc.created_at DESC
      `,
      [userId, limit, offset],
    );

    return result.rows.map(mapConversationRow);
  }

  await ensureDataFiles();
  const [conversationsText, participantsText, messagesText] = await Promise.all([
    fs.readFile(conversationsFilePath, "utf8"),
    fs.readFile(participantsFilePath, "utf8"),
    fs.readFile(messagesFilePath, "utf8"),
  ]);

  const conversations = Object.values(JSON.parse(conversationsText));
  const participants = JSON.parse(participantsText);
  const messages = JSON.parse(messagesText);

  const userConversations = conversations
    .filter((conversation) => {
      const list = participants[conversation.id] ?? [];
      return list.some((participant) => participant.userId === userId);
    })
    .sort((a, b) => {
      const aLatest = (messages[a.id] ?? []).slice(-1)[0]?.createdAt ?? a.createdAt;
      const bLatest = (messages[b.id] ?? []).slice(-1)[0]?.createdAt ?? b.createdAt;
      return new Date(bLatest).getTime() - new Date(aLatest).getTime();
    })
    .slice(offset, offset + limit)
    .map((conversation) => {
      const list = participants[conversation.id] ?? [];
      const participant = list.find((item) => item.userId !== userId) ?? null;
      const items = messages[conversation.id] ?? [];
      const latest = items.slice(-1)[0] ?? null;
      const unread = items.filter(
        (message) =>
          new Date(message.createdAt).getTime() >
          new Date(list.find((item) => item.userId === userId)?.lastReadAt ?? 0).getTime(),
      ).length;

      return {
        id: conversation.id,
        type: conversation.type,
        key: conversation.key,
        createdAt: conversation.createdAt,
        latestMessage: latest ?? null,
        unreadCount: unread,
        participant: participant
          ? {
              id: participant.userId,
              username: null,
              displayName: null,
              avatarUrl: null,
            }
          : null,
      };
    });

  return userConversations;
}

export async function getConversationForUser(conversationId, userId) {
  if (isDatabaseEnabled()) {
    await ensureMessageTables();
    const pool = getPool();
    const result = await pool.query(
      `
        SELECT mc.id, mc.type, mc.key, mc.created_at
        FROM messages_conversations mc
        JOIN messages_participants mp ON mp.conversation_id = mc.id
        WHERE mc.id = $1 AND mp.user_id = $2
        LIMIT 1
      `,
      [conversationId, userId],
    );
    return result.rows[0]
      ? {
          id: result.rows[0].id,
          type: result.rows[0].type,
          key: result.rows[0].key,
          createdAt: result.rows[0].created_at?.toISOString?.() ?? result.rows[0].created_at,
        }
      : null;
  }

  await ensureDataFiles();
  const [conversationsText, participantsText] = await Promise.all([
    fs.readFile(conversationsFilePath, "utf8"),
    fs.readFile(participantsFilePath, "utf8"),
  ]);

  const conversations = JSON.parse(conversationsText);
  const participants = JSON.parse(participantsText);
  const conversation = conversations[conversationId];
  if (!conversation) {
    return null;
  }
  const list = participants[conversationId] ?? [];
  if (!list.some((item) => item.userId === userId)) {
    return null;
  }

  return conversation;
}

export async function getMessagesForConversation(conversationId, userId, { limit = 50, before } = {}) {
  if (isDatabaseEnabled()) {
    await ensureMessageTables();
    const pool = getPool();
    const params = [conversationId, userId];
    let index = params.length;

    const beforeClause = before ? `AND m.created_at < $${++index}` : "";
    if (before) {
      params.push(new Date(before));
    }
    params.push(limit);

    const result = await pool.query(
      `
        SELECT m.id,
               m.conversation_id,
               m.sender_id,
               m.content,
               m.attachment_url,
               m.created_at,
               m.updated_at
        FROM messages m
        JOIN messages_participants mp ON mp.conversation_id = m.conversation_id
        WHERE m.conversation_id = $1
          AND mp.user_id = $2
          ${beforeClause}
        ORDER BY m.created_at DESC
        LIMIT $${params.length}
      `,
      params,
    );

    return result.rows.map(mapMessageRow).reverse();
  }

  await ensureDataFiles();
  const [messagesText, participantsText] = await Promise.all([
    fs.readFile(messagesFilePath, "utf8"),
    fs.readFile(participantsFilePath, "utf8"),
  ]);

  const messages = JSON.parse(messagesText);
  const participants = JSON.parse(participantsText);
  const list = participants[conversationId] ?? [];
  if (!list.some((item) => item.userId === userId)) {
    return [];
  }

  const conversationMessages = (messages[conversationId] ?? []).slice().sort((a, b) => {
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  let filtered = conversationMessages;
  if (before) {
    filtered = filtered.filter((item) => new Date(item.createdAt).getTime() < new Date(before).getTime());
  }

  return filtered.slice(-limit);
}

export async function createMessage(conversationId, senderId, { content, attachmentUrl } = {}) {
  const message = {
    id: randomUUID(),
    conversationId,
    senderId,
    content: content ?? "",
    attachmentUrl: attachmentUrl ?? null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (isDatabaseEnabled()) {
    await ensureMessageTables();
    const pool = getPool();
    await pool.query(
      `
        INSERT INTO messages (id, conversation_id, sender_id, content, attachment_url, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        message.id,
        message.conversationId,
        message.senderId,
        message.content,
        message.attachmentUrl,
        message.createdAt,
        message.updatedAt,
      ],
    );
    await pool.query(
      `
        UPDATE messages_participants
        SET last_read_at = NOW()
        WHERE conversation_id = $1 AND user_id = $2
      `,
      [conversationId, senderId],
    );
    return message;
  }

  await ensureDataFiles();
  const messagesText = await fs.readFile(messagesFilePath, "utf8");
  const messages = JSON.parse(messagesText);
  const list = messages[conversationId] ?? [];
  list.push(message);
  messages[conversationId] = list;
  await fs.writeFile(messagesFilePath, JSON.stringify(messages, null, 2), "utf8");
  return message;
}

export async function markConversationRead(conversationId, userId, readAt = new Date().toISOString()) {
  if (isDatabaseEnabled()) {
    await ensureMessageTables();
    const pool = getPool();
    await pool.query(
      `
        UPDATE messages_participants
        SET last_read_at = GREATEST(COALESCE(last_read_at, '1970-01-01'), $3::timestamptz)
        WHERE conversation_id = $1 AND user_id = $2
      `,
      [conversationId, userId, readAt],
    );
    return;
  }

  await ensureDataFiles();
  const text = await fs.readFile(participantsFilePath, "utf8");
  const participants = JSON.parse(text);
  const list = participants[conversationId] ?? [];
  const target = list.find((item) => item.userId === userId);
  if (target) {
    target.lastReadAt = readAt;
    participants[conversationId] = list;
    await fs.writeFile(participantsFilePath, JSON.stringify(participants, null, 2), "utf8");
  }
}

export async function getConversationParticipantIds(conversationId) {
  if (isDatabaseEnabled()) {
    await ensureMessageTables();
    const pool = getPool();
    const result = await pool.query(
      `
        SELECT user_id
        FROM messages_participants
        WHERE conversation_id = $1
      `,
      [conversationId],
    );
    return result.rows.map((row) => row.user_id);
  }

  await ensureDataFiles();
  const text = await fs.readFile(participantsFilePath, "utf8");
  const participants = JSON.parse(text);
  return (participants[conversationId] ?? []).map((item) => item.userId);
}

export async function getConversationParticipants(conversationId) {
  if (isDatabaseEnabled()) {
    await ensureMessageTables();
    const pool = getPool();
    const result = await pool.query(
      `
        SELECT user_id, last_read_at
        FROM messages_participants
        WHERE conversation_id = $1
      `,
      [conversationId],
    );
    return result.rows.map((row) => ({
      userId: row.user_id,
      lastReadAt: row.last_read_at?.toISOString?.() ?? row.last_read_at ?? null,
    }));
  }

  await ensureDataFiles();
  const text = await fs.readFile(participantsFilePath, "utf8");
  const participants = JSON.parse(text);
  return (participants[conversationId] ?? []).map((item) => ({
    userId: item.userId,
    lastReadAt: item.lastReadAt ?? null,
  }));
}

export async function saveMessageAttachmentFile({ extension = "", buffer }) {
  if (!buffer || !(buffer instanceof Buffer) || buffer.length === 0) {
    throw new Error("Attachment buffer is empty");
  }
  await ensureAttachmentsDir();
  const safeExtension = extension && extension.startsWith(".") ? extension.toLowerCase() : "";
  const fileName = `${randomUUID()}${safeExtension}`;
  const filePath = path.join(attachmentsUploadsDir, fileName);
  await fs.writeFile(filePath, buffer);
  return `/uploads/messages/${fileName}`;
}
