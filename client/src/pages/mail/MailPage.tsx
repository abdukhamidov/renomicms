import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { NavbarActionsSheet } from "@/components/layout/NavbarActionsSheet";
import {
  createMessagesSocket,
  fetchConversations,
} from "@/api/messages";
import type { Conversation, MessagesRealtimeEvent } from "@/api/messages";
import { useAuth } from "@/contexts/useAuth";

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center text-[#dbdbdb] gap-3">
      <img className="w-[96px] h-[96px]" src="/design/img/mail-empty.png" alt="" />
      <p className="text-[16px] font-semibold">Нет личных сообщений</p>
      <p className="text-[14px] text-[#8C8C8C] text-center">
        Найдите пользователя и начните диалог. Здесь появятся ваши переписки.
      </p>
    </div>
  );
}

function formatPreview(conversation: Conversation) {
  const content = conversation.latestMessage?.content ?? "";
  if (!content.trim()) {
    return conversation.latestMessage?.attachmentUrl ? "Вложение" : "Новое сообщение";
  }
  return content.length > 120 ? `${content.slice(0, 117)}…` : content;
}

function formatTime(isoDate?: string | null) {
  if (!isoDate) {
    return "";
  }
  try {
    const date = new Date(isoDate);
    const now = Date.now();
    const diff = now - date.getTime();
    const oneDay = 24 * 60 * 60 * 1000;
    if (diff < oneDay) {
      return new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(date);
    }
    return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short" }).format(date);
  } catch {
    return "";
  }
}

export function MailPage() {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError("Войдите в аккаунт, чтобы пользоваться личными сообщениями.");
      return;
    }

    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchConversations(token, { limit: 50 });
        if (!mounted) return;
        setConversations(data);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Не удалось загрузить диалоги.");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [token]);

  useEffect(() => {
    if (!token) {
      return;
    }

    const handleEvent = (event: MessagesRealtimeEvent) => {
      setConversations((prev) => {
        if (!prev.length) {
          return prev;
        }

        if (event.type === "message:new") {
          const index = prev.findIndex((conversation) => conversation.id === event.conversationId);
          if (index === -1) {
            void fetchConversations(token, { limit: 50 }).then(setConversations).catch(() => undefined);
            return prev;
          }
          const updated = [...prev];
          const conversation = { ...updated[index] };

          conversation.latestMessage = event.message;
          if (event.message.senderId === user?.id) {
            conversation.unreadCount = 0;
          } else {
            conversation.unreadCount = (conversation.unreadCount ?? 0) + 1;
          }

          updated.splice(index, 1);
          updated.unshift(conversation);
          return updated;
        }

        if (event.type === "conversation:read") {
          const index = prev.findIndex((conversation) => conversation.id === event.conversationId);
          if (index === -1) {
            return prev;
          }
          const updated = [...prev];
          const conversation = { ...updated[index] };
          conversation.unreadCount = 0;
          updated[index] = conversation;
          return updated;
        }

        return prev;
      });
    };

    const socket = createMessagesSocket(token, handleEvent);

    return () => {
      socket.close();
    };
  }, [token, user?.id]);

  const filtered = useMemo(() => {
    if (!search.trim()) {
      return conversations;
    }
    const lower = search.toLowerCase();
    return conversations.filter((conversation) => {
      const participantName =
        conversation.participant?.displayName ?? conversation.participant?.username ?? "unknown";
      const preview = formatPreview(conversation);
      return participantName.toLowerCase().includes(lower) || preview.toLowerCase().includes(lower);
    });
  }, [conversations, search]);

  const unreadTotal = useMemo(
    () => conversations.reduce((total, item) => total + (item.unreadCount ?? 0), 0),
    [conversations],
  );

  return (
    <div className="bg-black m-[auto] flex flex-col items-center justify-center gap-1 sm:gap-4 pb-[70px] sm:pb-[70px] sm:flex-row sm:items-start text-[#dbdbdb]">
      <DesktopSidebar />

      <MobileHeader
        title="Сообщения"
        backHref="/mail"
        onOpenActions={() => setIsSheetOpen(true)}
        actionsTarget="navbar-actions"
      />
      <div className="w-full max-w-[540px] flex flex-col gap-2 items-center text-[14px] p-3 sm:gap-4 sm:p-0">
        <div className="hidden sm:flex items-center pt-1 justify-between w-full text-[#dbdbdb] sticky top-0 bg-black z-50">
          <div className="flex items-center gap-1 pr-4 py-3" />
          <div className="flex justify-center font-semibold text-[16px] gap-2">
            <p>Сообщения</p>
          </div>
          <button
            type="button"
            className="flex items-center gap-1 px-[16px] py-[14px]"
            data-bottom-sheet-open
            data-bottom-sheet-target="navbar-actions"
            onClick={() => setIsSheetOpen(true)}
          >
            <img src="/design/img/more.png" alt="Меню" />
          </button>
        </div>

        <input
          className="pl-4 px-2 py-2 w-full focus:border-[#505050] focus:outline bg-[#131313] border border-[#1D1D1D] text-[#dbdbdb] placeholder:text-[#8C8C8C] placeholder:text-center rounded-[12px] text-[15px]"
          type="text"
          placeholder="Поиск..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <div className="flex flex-col w-full max-w-[540px] bg-[#131313] border border-[#1D1D1D] text-white rounded-[12px] overflow-hidden">
          {loading ? (
            <div className="px-4 py-6 text-center text-[#8C8C8C] text-[14px]">Загрузка диалогов…</div>
          ) : error ? (
            <div className="px-4 py-6 text-center text-[#fca5a5] text-[14px]">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-6">
              <EmptyState />
            </div>
          ) : (
            filtered.map((conversation, index) => {
              const participantName =
                conversation.participant?.displayName ?? conversation.participant?.username ?? "Неизвестный";
              const avatar = conversation.participant?.avatarUrl ?? "/design/img/default-avatar.png";
              const isLast = index === filtered.length - 1;
              const unread = conversation.unreadCount ?? 0;
              const preview = formatPreview(conversation);
              const timeLabel =
                conversation.latestMessage?.createdAt ?? conversation.createdAt ?? "";

              return (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() =>
                    navigate(`/mail/chat?conversation=${encodeURIComponent(conversation.id)}`)
                  }
                  className={[
                    "flex text-left w-full gap-3 px-4 py-3 transition border-b border-[#1c1c1c]",
                    isLast ? "border-b-0" : "",
                    "hover:bg-[#1a1a1a]",
                  ].join(" ")}
                >
                  <img className="w-[48px] h-[48px] rounded-[8px] object-cover" src={avatar} alt={participantName} />
                  <div className="flex flex-col w-full min-w-0 gap-[6px] mt-[-1px]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1 font-semibold text-[15px] text-white truncate">
                        {participantName}
                      </span>
                      <span className="text-[#afafaf] text-[13px] whitespace-nowrap">{formatTime(timeLabel)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex-1 min-w-0 text-[#dbdbdb] whitespace-nowrap overflow-hidden text-ellipsis">
                        {preview}
                      </span>
                      {unread > 0 ? (
                        <span className="flex-shrink-0 min-w-[18px] h-[18px] px-[6px] rounded-full bg-[#ED3426] text-white text-[12px] font-semibold flex items-center justify-center leading-none">
                          {unread}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      <MobileBottomNav activeHref="/mail" mailBadge={unreadTotal} />
      <NavbarActionsSheet open={isSheetOpen} onClose={() => setIsSheetOpen(false)} textClassName="text-[14px]" />
    </div>
  );
}
