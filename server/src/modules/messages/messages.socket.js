import { broadcastToUsers } from "../../utils/realtime.js";

export function emitMessageEvent(userIds, payload) {
  broadcastToUsers(userIds, "messages", payload);
}

export function emitConversationEvent(userIds, payload) {
  broadcastToUsers(userIds, "messages", payload);
}
