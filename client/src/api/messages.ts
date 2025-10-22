import { apiRequest, API_BASE_URL } from "./client";

export type ConversationParticipant = {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
};

export type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  attachmentUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ConversationParticipantReadState = {
  userId: string;
  lastReadAt: string | null;
};

export type Conversation = {
  id: string;
  type: string;
  key: string;
  createdAt: string;
  latestMessage: Message | null;
  unreadCount: number;
  participant: ConversationParticipant | null;
};

export function fetchConversations(
  token: string,
  options: { limit?: number; offset?: number } = {},
) {
  const params = new URLSearchParams();
  if (typeof options.limit === "number") {
    params.set("limit", String(options.limit));
  }
  if (typeof options.offset === "number") {
    params.set("offset", String(options.offset));
  }

  const path = `/messages/conversations${params.size ? `?${params.toString()}` : ""}`;

  return apiRequest<{ status: "ok"; conversations: Conversation[] }>(path, {
    method: "GET",
    token,
  }).then((response) => response.conversations);
}

export function openDirectConversation(username: string, token: string) {
  return apiRequest<{ status: "ok"; conversation: Conversation }>(`/messages/direct/${encodeURIComponent(username)}`, {
    method: "GET",
    token,
  }).then((response) => response.conversation);
}

export function sendDirectMessage(
  username: string,
  payload: { content?: string; attachmentUrl?: string | null },
  token: string,
) {
  return apiRequest<{ status: "ok"; conversationId: string; message: Message }>(
    `/messages/direct/${encodeURIComponent(username)}`,
    {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    },
  );
}

export function fetchConversationMessages(
  conversationId: string,
  token: string,
  options: { limit?: number; before?: string } = {},
) {
  const params = new URLSearchParams();
  if (typeof options.limit === "number") {
    params.set("limit", String(options.limit));
  }
  if (options.before) {
    params.set("before", options.before);
  }
  const path = `/messages/conversations/${encodeURIComponent(conversationId)}/messages${
    params.size ? `?${params.toString()}` : ""
  }`;

  return apiRequest<{
    status: "ok";
    conversation: { id: string; type: string; key: string; createdAt: string };
    messages: Message[];
    participants: ConversationParticipantReadState[];
  }>(path, {
    method: "GET",
    token,
  });
}

export function sendConversationMessage(
  conversationId: string,
  payload: { content?: string; attachmentUrl?: string | null },
  token: string,
) {
  return apiRequest<{ status: "ok"; message: Message }>(
    `/messages/conversations/${encodeURIComponent(conversationId)}/messages`,
    {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    },
  ).then((response) => response.message);
}

export function markConversationRead(conversationId: string, token: string) {
  return apiRequest<{ status: "ok"; conversationId: string; lastReadAt: string }>(
    `/messages/conversations/${encodeURIComponent(conversationId)}/read`,
    {
      method: "POST",
      token,
    },
  );
}

export function uploadMessageAttachment(
  payload: { filename: string; content: string; contentType?: string },
  token: string,
) {
  return apiRequest<{ status: "ok"; attachmentUrl: string }>(`/messages/attachments`, {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  }).then((response) => response.attachmentUrl);
}

export type MessagesRealtimeEvent =
  | {
      type: "message:new";
      conversationId: string;
      message: Message;
    }
  | {
      type: "conversation:read";
      conversationId: string;
      userId: string;
      lastReadAt: string;
    };

export function createMessagesSocket(token: string, onEvent: (event: MessagesRealtimeEvent) => void) {
  const base = API_BASE_URL.replace(/\/$/, "");
  const wsBase = base.startsWith("https") ? base.replace(/^https/, "wss") : base.replace(/^http/, "ws");
  const socket = new WebSocket(`${wsBase}/ws?token=${encodeURIComponent(token)}`);

  socket.addEventListener("message", (event) => {
    try {
      const payload = JSON.parse(event.data);
      if (payload?.event === "messages" && payload?.data) {
        onEvent(payload.data);
      }
    } catch {
      // ignore malformed payloads
    }
  });

  return socket;
}
