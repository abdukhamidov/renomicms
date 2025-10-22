import { WebSocketServer } from "ws";
import { verifyToken } from "../modules/auth/auth.service.js";
import { logger } from "./logger.js";

const connections = new Map(); // userId -> Set<WebSocket>
let websocketServer = null;

function registerConnection(userId, socket) {
  let set = connections.get(userId);
  if (!set) {
    set = new Set();
    connections.set(userId, set);
  }
  set.add(socket);
}

function unregisterConnection(userId, socket) {
  const set = connections.get(userId);
  if (!set) {
    return;
  }
  set.delete(socket);
  if (set.size === 0) {
    connections.delete(userId);
  }
}

export function initRealtime(server) {
  websocketServer = new WebSocketServer({ server, path: "/ws" });

  websocketServer.on("connection", (socket, request) => {
    try {
      const url = new URL(request.url ?? "", `http://${request.headers.host}`);
      const token = url.searchParams.get("token");
      if (!token) {
        socket.close(4001, "Token required");
        return;
      }

      let decoded;
      try {
        decoded = verifyToken(token);
      } catch (error) {
        socket.close(4002, "Invalid token");
        return;
      }
      const userId = decoded.sub;
      registerConnection(userId, socket);

      socket.send(
        JSON.stringify({
          event: "connected",
          data: { userId },
        }),
      );

      socket.on("message", (raw) => {
        // handle ping/pong messages from client if needed
        let payload;
        try {
          payload = JSON.parse(raw.toString());
        } catch {
          return;
        }

        if (payload?.event === "ping") {
          socket.send(JSON.stringify({ event: "pong" }));
        }
      });

      socket.on("close", () => {
        unregisterConnection(userId, socket);
      });
    } catch (error) {
      logger.warn("Realtime connection error", {
        error: error instanceof Error ? error.message : error,
      });
      socket.close(1011, "Unexpected error");
    }
  });

  logger.info("Realtime WebSocket server started at /ws");
}

export function broadcastToUsers(userIds, channel, payload) {
  if (!websocketServer) {
    return;
  }
  const data = JSON.stringify({ event: channel, data: payload });
  userIds.forEach((userId) => {
    const set = connections.get(userId);
    if (!set) {
      return;
    }
    set.forEach((socket) => {
      if (socket.readyState === socket.OPEN) {
        socket.send(data);
      }
    });
  });
}
