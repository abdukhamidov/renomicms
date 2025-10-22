import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useAuth } from "@/contexts/useAuth";
import { createMessagesSocket, fetchConversations } from "@/api/messages";

type MessagesBadgeContextValue = {
  unreadCount: number;
  refresh: () => void;
};

const MessagesBadgeContext = createContext<MessagesBadgeContextValue | undefined>(undefined);

export function MessagesBadgeProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadUnread = useCallback(async () => {
    if (!token) {
      if (mountedRef.current) {
        setUnreadCount(0);
      }
      return;
    }

    try {
      const conversations = await fetchConversations(token, { limit: 100 });
      if (mountedRef.current) {
        const total = conversations.reduce((sum, conversation) => sum + (conversation.unreadCount ?? 0), 0);
        setUnreadCount(total);
      }
    } catch {
      // ignore errors silently
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      setUnreadCount(0);
      return;
    }

    void loadUnread();

    const socket = createMessagesSocket(token, () => {
      void loadUnread();
    });

    return () => {
      socket.close();
    };
  }, [token, loadUnread]);

  const value = useMemo<MessagesBadgeContextValue>(
    () => ({
      unreadCount,
      refresh: () => {
        void loadUnread();
      },
    }),
    [unreadCount, loadUnread],
  );

  return <MessagesBadgeContext.Provider value={value}>{children}</MessagesBadgeContext.Provider>;
}

export function useMessagesBadge() {
  const context = useContext(MessagesBadgeContext);
  if (!context) {
    throw new Error("useMessagesBadge must be used within MessagesBadgeProvider");
  }
  return context;
}
