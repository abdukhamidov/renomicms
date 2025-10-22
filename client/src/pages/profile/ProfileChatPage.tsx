
import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { NavbarActionsSheet } from "@/components/layout/NavbarActionsSheet";
import {
  createMessagesSocket,
  fetchConversationMessages,
  fetchConversations,
  markConversationRead,
  openDirectConversation,
  sendConversationMessage,
  uploadMessageAttachment,
} from "@/api/messages";
import type {
  Conversation,
  ConversationParticipantReadState,
  Message,
  MessagesRealtimeEvent,
} from "@/api/messages";
import { API_BASE_URL } from "@/api/client";
import { useAuth } from "@/contexts/useAuth";
import { useMessagesBadge } from "@/contexts/MessagesBadgeContext";

const PAGE_SIZE = 40;
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const MAX_ATTACHMENTS = 5;

const STRINGS = {
  today: "Today",
  yesterday: "Yesterday",
  loginRequired: "Please sign in to continue the conversation.",
  notFound: "Conversation not found.",
  loadError: "Failed to load conversation.",
  sendError: "Failed to send message.",
  loadMoreError: "Failed to load previous messages.",
  loading: "Loading conversation...",
  showMore: "Show previous messages",
  empty: "No messages yet. Start the conversation!",
  inputPlaceholder: "Type a message...",
  send: "Send",
  reply: "Reply",
  close: "Close",
  attach: "Attach",
  attachment: "Attachment",
  newMessages: "New messages",
  dialog: "Chat",
  sent: "Sent",
  read: "Read",
  attachmentUploading: "Uploading attachment...",
  attachmentRemove: "Remove",
  attachmentTooLarge: "Attachment exceeds 5 MB.",
  attachmentUploadError: "Failed to upload attachment.",
  attachmentLimit: "You can attach up to 5 files.",
};

function formatMessageTime(iso?: string) {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

function formatDateLabel(date: Date) {
  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  const dateKey = date.toISOString().slice(0, 10);

  if (todayKey === dateKey) {
    return STRINGS.today;
  }

  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  if (yesterday.toISOString().slice(0, 10) === dateKey) {
    return STRINGS.yesterday;
  }

  try {
    return new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      month: "long",
    }).format(date);
  } catch {
    return date.toLocaleDateString();
  }
}

function isImageUrl(url: string | null | undefined) {
  if (!url) return false;
  return /\.(png|jpe?g|gif|webp|avif)$/i.test(url);
}

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes)) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function resolveAttachmentUrl(url: string) {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  const normalized = url.startsWith("/") ? url : `/${url}`;
  const base = API_BASE_URL.endsWith("/") ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  return `${base}${normalized}`;
}

function buildReadStateMap(participants: ConversationParticipantReadState[]) {
  return participants.reduce<Record<string, string | null>>((acc, participant) => {
    acc[participant.userId] = participant.lastReadAt ?? null;
    return acc;
  }, {});
}

function isWithinMinute(a?: string, b?: string) {
  if (!a || !b) return false;
  const first = Date.parse(a);
  const second = Date.parse(b);
  if (Number.isNaN(first) || Number.isNaN(second)) return false;
  return Math.abs(second - first) <= 60_000;
}

interface MessageGroup {
  key: string;
  label: string;
  messages: Message[];
}

interface PendingAttachment {
  id: string;
  file: File;
  previewUrl: string;
  uploadedUrl: string | null;
  uploading: boolean;
  error: string | null;
  name: string;
  size: number;
  contentType: string;
}

let attachmentIdCounter = 0;

export function ProfileChatPage() {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const { refresh: refreshMessagesBadge } = useMessagesBadge();
  const [params] = useSearchParams();
  const conversationParam = params.get("conversation");
  const usernameParam = params.get("to");

  const [conversationId, setConversationId] = useState<string | null>(conversationParam);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [sending, setSending] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [isNavbarSheetOpen, setIsNavbarSheetOpen] = useState(false);
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [lastReadByUser, setLastReadByUser] = useState<Record<string, string | null>>({});

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const lastMessageMarkerRef = useRef<HTMLDivElement | null>(null);
  const shouldScrollToBottomRef = useRef(true);
  const pendingScrollBehaviorRef = useRef<ScrollBehavior>("auto");
  const desktopTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const mobileTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const groupedMessages = useMemo<MessageGroup[]>(() => {
    const groups = new Map<string, MessageGroup>();
    messages.forEach((message) => {
      const date = new Date(message.createdAt);
      const key = date.toISOString().slice(0, 10);
      if (!groups.has(key)) {
        groups.set(key, { key, label: formatDateLabel(date), messages: [] });
      }
      groups.get(key)!.messages.push(message);
    });
    return Array.from(groups.values());
  }, [messages]);

  const isEmpty = !loading && messages.length === 0;

  const companionId = useMemo(() => {
    const currentUserId = user?.id ?? null;
    const participantId = conversation?.participant?.id ?? null;
    if (participantId && participantId !== currentUserId) {
      return participantId;
    }
    if (!currentUserId) {
      return participantId ?? null;
    }
    return Object.keys(lastReadByUser).find((id) => id !== currentUserId) ?? null;
  }, [conversation?.participant?.id, lastReadByUser, user?.id]);

  const companionLastReadTimestamp = useMemo(() => {
    if (!companionId) {
      return null;
    }
    const value = lastReadByUser[companionId];
    if (!value) {
      return null;
    }
    const timestamp = Date.parse(value);
    return Number.isNaN(timestamp) ? null : timestamp;
  }, [companionId, lastReadByUser]);

  const scrollConversationToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    if (typeof window === "undefined") {
      return;
    }

    const ensureWindowScroll = () => {
      const scrollingElement = document.scrollingElement ?? document.documentElement ?? document.body;
      if (!scrollingElement) {
        return;
      }
      if (behavior === "smooth" && typeof window.scrollTo === "function") {
        window.scrollTo({ top: scrollingElement.scrollHeight, behavior });
      } else {
        scrollingElement.scrollTop = scrollingElement.scrollHeight;
      }
    };

    const marker = lastMessageMarkerRef.current;
    if (marker && typeof marker.scrollIntoView === "function") {
      marker.scrollIntoView({ block: "end", inline: "nearest", behavior });
    }

    const container = scrollContainerRef.current;
    if (container) {
      if (typeof container.scrollTo === "function" && behavior === "smooth") {
        container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
      } else {
        container.scrollTop = container.scrollHeight;
      }

      const delta = container.scrollHeight - container.scrollTop - container.clientHeight;
      if (delta > 4) {
        ensureWindowScroll();
      }
    } else {
      ensureWindowScroll();
    }

    requestAnimationFrame(() => {
      const node = scrollContainerRef.current;
      if (!node) {
        ensureWindowScroll();
        return;
      }
      const remaining = node.scrollHeight - node.scrollTop - node.clientHeight;
      if (remaining > 4) {
        if (typeof node.scrollTo === "function" && behavior === "smooth") {
          node.scrollTo({ top: node.scrollHeight, behavior: "auto" });
        } else {
          node.scrollTop = node.scrollHeight;
        }
        ensureWindowScroll();
      }
    });
  }, []);

  const requestScrollToBottom = useCallback(
    (behavior: ScrollBehavior = "auto") => {
      pendingScrollBehaviorRef.current = behavior;
      shouldScrollToBottomRef.current = true;
    },
    [],
  );

  const readFileAsDataUrl = useCallback((file: File) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
        } else {
          reject(new Error("empty result"));
        }
      };
      reader.onerror = () => {
        reject(reader.error ?? new Error("failed to read file"));
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const generateAttachmentId = () => {
    try {
      if (typeof globalThis.crypto?.randomUUID === "function") {
        return globalThis.crypto.randomUUID();
      }
    } catch {
      // ignore
    }
    attachmentIdCounter += 1;
    return `pending-attachment-${Date.now()}-${attachmentIdCounter}`;
  };

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((item) => item.id !== id);
    });
    setAttachmentError(null);
  }, []);

  const clearAllAttachments = useCallback(() => {
    setAttachments((prev) => {
      prev.forEach((item) => {
        if (item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });
      return [];
    });
    setAttachmentError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const updateReadStateForUser = useCallback((userId: string, lastReadAt: string | null) => {
    if (!userId) {
      return;
    }
    setLastReadByUser((prev) => {
      if (prev[userId] === lastReadAt) {
        return prev;
      }
      return { ...prev, [userId]: lastReadAt ?? null };
    });
  }, []);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError(STRINGS.loginRequired);
      return;
    }

    let cancelled = false;

    const bootstrap = async () => {
      setLoading(true);
      setError(null);
      setAttachments([]);
      try {
        let activeConversationId = conversationParam;
        if (conversationParam) {
          setConversationId(conversationParam);
        }
        if (!activeConversationId && usernameParam) {
          const conversationData = await openDirectConversation(usernameParam, token);
          if (cancelled) return;
          activeConversationId = conversationData.id;
          setConversation(conversationData);
          setConversationId(activeConversationId);
        }

        if (!activeConversationId) {
          setError(STRINGS.notFound);
          return;
        }

        requestScrollToBottom();
        const list = await fetchConversationMessages(activeConversationId, token, { limit: PAGE_SIZE });
        if (cancelled) return;
        setMessages(list.messages);
        setHasMore(list.messages.length >= PAGE_SIZE);
        setLastReadByUser(buildReadStateMap(list.participants ?? []));

        const conversationsList = await fetchConversations(token, { limit: 50 });
        if (!cancelled) {
          const found = conversationsList.find((item) => item.id === activeConversationId) ?? null;
          setConversation(found);
        }

        if (!cancelled) {
          const result = await markConversationRead(activeConversationId, token).catch(() => null);
          if (!cancelled && result && user?.id) {
            updateReadStateForUser(user.id, result.lastReadAt);
          }
          if (!cancelled) {
            refreshMessagesBadge();
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : STRINGS.loadError);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [token, conversationParam, usernameParam, user?.id, updateReadStateForUser, refreshMessagesBadge, requestScrollToBottom]);

  useEffect(() => {
    if (!token || !conversationId) {
      return;
    }

    const socket = createMessagesSocket(token, (event: MessagesRealtimeEvent) => {
      if (event.type === "message:new" && event.conversationId === conversationId) {
        let appended = false;
        setMessages((prev) => {
          if (prev.some((item) => item.id === event.message.id)) {
            return prev;
          }
          appended = true;
          return [...prev, event.message];
        });

        if (appended) {
          const sentByMe = event.message.senderId === user?.id;
          if (sentByMe) {
            requestScrollToBottom("auto");
          } else {
            const container = scrollContainerRef.current;
            const nearBottom =
              !container || container.scrollHeight - (container.scrollTop + container.clientHeight) <= 200;
            if (nearBottom) {
              requestScrollToBottom("smooth");
            }
          }
        }

        setConversation((prev) => {
          if (!prev) {
            return prev;
          }
          const unreadIncrement = event.message.senderId === user?.id ? 0 : (prev.unreadCount ?? 0) + 1;
          return {
            ...prev,
            latestMessage: event.message,
            unreadCount: unreadIncrement,
          };
        });

        if (event.message.senderId !== user?.id) {
          const currentUserId = user?.id ?? null;
          void markConversationRead(conversationId, token)
            .then((result) => {
              if (result && currentUserId) {
                updateReadStateForUser(currentUserId, result.lastReadAt);
              }
              refreshMessagesBadge();
            })
            .catch(() => undefined);
        }
      } else if (event.type === "conversation:read" && event.conversationId === conversationId) {
        updateReadStateForUser(event.userId, event.lastReadAt);
        setConversation((prev) => (prev ? { ...prev, unreadCount: 0 } : prev));
      }
    });

    return () => {
      socket.close();
    };
  }, [token, conversationId, user?.id, updateReadStateForUser, refreshMessagesBadge, requestScrollToBottom]);

  useLayoutEffect(() => {
    if (!shouldScrollToBottomRef.current) {
      return;
    }
    const raf = requestAnimationFrame(() => {
      const behavior = pendingScrollBehaviorRef.current;
      scrollConversationToBottom(behavior);
      pendingScrollBehaviorRef.current = "auto";
      shouldScrollToBottomRef.current = false;
    });
    return () => cancelAnimationFrame(raf);
  }, [messages, loading, scrollConversationToBottom]);

  useEffect(() => {
    return () => {
      clearAllAttachments();
    };
  }, [clearAllAttachments]);

  useEffect(() => {
    if (!messages.length || !user?.id) {
      return;
    }
    const last = messages[messages.length - 1];
    if (last.senderId === user.id) {
      requestScrollToBottom("auto");
    }
  }, [messages, user?.id, requestScrollToBottom]);

  useEffect(() => {
    const elements = [desktopTextareaRef.current, mobileTextareaRef.current];
    elements.forEach((element) => {
      if (element) {
        element.style.height = "auto";
        element.style.height = `${element.scrollHeight}px`;
      }
    });
  }, [messageText, attachments.length]);

  const messageHasContent = messageText.trim().length > 0;
  const readyAttachments = useMemo(
    () => attachments.filter((item) => item.uploadedUrl && !item.error),
    [attachments],
  );
  const uploadingAttachment = attachments.some((item) => item.uploading);
  const sendEnabled =
    Boolean(token && conversationId && (messageHasContent || readyAttachments.length > 0)) && !uploadingAttachment;

  const handleTextareaChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setMessageText(event.target.value);
    const element = event.target;
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  };

  const handleAttachmentButtonClick = () => {
    if (!token) {
      setError(STRINGS.loginRequired);
      return;
    }
    if (attachments.length >= MAX_ATTACHMENTS) {
      setAttachmentError(STRINGS.attachmentLimit);
      return;
    }
    setAttachmentError(null);
    fileInputRef.current?.click();
  };

  const addAttachmentFromFile = useCallback(
    (file: File) => {
      const id = generateAttachmentId();
      const previewUrl = URL.createObjectURL(file);
      setAttachments((prev) => [
        ...prev,
        {
          id,
          file,
          previewUrl,
          uploadedUrl: null,
          uploading: true,
          error: null,
          name: file.name,
          size: file.size,
          contentType: file.type,
        },
      ]);

      (async () => {
        try {
          const dataUrl = await readFileAsDataUrl(file);
          if (!token) {
            throw new Error(STRINGS.loginRequired);
          }
          const uploadedUrl = await uploadMessageAttachment(
            {
              filename: file.name,
              content: dataUrl,
              contentType: file.type,
            },
            token,
          );
          setAttachments((prev) =>
            prev.map((item) =>
              item.id === id
                ? {
                    ...item,
                    uploadedUrl,
                    uploading: false,
                    error: null,
                  }
                : item,
            ),
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : STRINGS.attachmentUploadError;
          setAttachments((prev) =>
            prev.map((item) =>
              item.id === id
                ? {
                    ...item,
                    uploading: false,
                    error: message,
                  }
                : item,
            ),
          );
          setAttachmentError(message);
        }
      })();
    },
    [readFileAsDataUrl, token],
  );

  const handleAttachmentChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!selectedFiles.length) {
      return;
    }

    const availableSlots = MAX_ATTACHMENTS - attachments.length;
    if (availableSlots <= 0) {
      setAttachmentError(STRINGS.attachmentLimit);
      return;
    }

    const eligibleFiles = selectedFiles.filter((file) => {
      if (file.size > MAX_ATTACHMENT_BYTES) {
        setAttachmentError(STRINGS.attachmentTooLarge);
        return false;
      }
      return true;
    });

    if (!eligibleFiles.length) {
      return;
    }

    if (eligibleFiles.length > availableSlots) {
      setAttachmentError(STRINGS.attachmentLimit);
    } else {
      setAttachmentError(null);
    }

    eligibleFiles.slice(0, availableSlots).forEach((file) => addAttachmentFromFile(file));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token || !conversationId || sending || uploadingAttachment) {
      return;
    }

    const content = messageText.trim();
    const readyFiles = [...readyAttachments];
    if (!content && readyFiles.length === 0) {
      if (attachments.some((item) => item.error)) {
        setAttachmentError(STRINGS.attachmentUploadError);
      }
      return;
    }

    setSending(true);
    try {
      const payloads: { content: string; attachmentUrl: string | null }[] = [];
      if (readyFiles.length > 0) {
        const [firstAttachment, ...restAttachments] = readyFiles;
        payloads.push({ content, attachmentUrl: firstAttachment?.uploadedUrl ?? null });
        restAttachments.forEach((item) => {
          payloads.push({ content: "", attachmentUrl: item.uploadedUrl ?? null });
        });
      } else {
        payloads.push({ content, attachmentUrl: null });
      }

      let appendedAny = false;

      for (const payload of payloads) {
        const trimmedContent = payload.content.trim();
        if (!trimmedContent && !payload.attachmentUrl) {
          continue;
        }

        const message = await sendConversationMessage(
          conversationId,
          {
            content: trimmedContent || undefined,
            attachmentUrl: payload.attachmentUrl ?? undefined,
          },
          token,
        );

        setMessages((prev) => {
          if (prev.some((item) => item.id === message.id)) {
            return prev;
          }
          appendedAny = true;
          return [...prev, message];
        });

        setConversation((prev) =>
          prev
            ? {
                ...prev,
                unreadCount: 0,
                latestMessage: message,
              }
            : prev,
        );
      }

      setMessageText("");
      clearAllAttachments();
      if (appendedAny) {
        requestScrollToBottom();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : STRINGS.sendError);
    } finally {
      setSending(false);
    }
  };

  const handleLoadMore = async () => {
    if (!token || !conversationId || !messages.length) {
      return;
    }
    const oldest = messages[0];
    try {
      const response = await fetchConversationMessages(conversationId, token, {
        limit: PAGE_SIZE,
        before: oldest.createdAt,
      });
      const older = response.messages;
      setMessages((prev) => [...older, ...prev]);
      setHasMore(older.length >= PAGE_SIZE);
      setLastReadByUser((prev) => ({ ...prev, ...buildReadStateMap(response.participants ?? []) }));
    } catch (err) {
      setError(err instanceof Error ? err.message : STRINGS.loadMoreError);
    }
  };

  const companionName = useMemo(() => {
    if (!conversation) {
      return usernameParam ?? STRINGS.dialog;
    }
    return conversation.participant?.displayName ?? conversation.participant?.username ?? STRINGS.dialog;
  }, [conversation, usernameParam]);

  const companionAvatar = useMemo(() => {
    if (!conversation) {
      return "/design/img/default-avatar.png";
    }
    return conversation.participant?.avatarUrl ?? "/design/img/default-avatar.png";
  }, [conversation]);

  const unreadCount = conversation?.unreadCount ?? 0;

  const AttachmentPreview = () => {
    if (!attachments.length) {
      return attachmentError ? (
        <div className="rounded-[10px] border border-[#3A0F0F] bg-[#1B0A0A] px-3 py-2 text-[12px] text-[#FF8080]">
          {attachmentError}
        </div>
      ) : null;
    }

    return (
      <div className="flex w-full flex-col gap-2">
        {attachments.map((item) => {
          const isImage = Boolean(item.previewUrl && item.contentType?.startsWith("image/"));
          const extension = item.name.includes(".") ? item.name.split(".").pop()?.toUpperCase() ?? "FILE" : "FILE";
          return (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-[10px] border border-[#1D1D1D] bg-[#0B0B0B] px-3 py-3"
            >
              {isImage ? (
                <img className="h-12 w-12 rounded-[8px] object-cover" src={item.previewUrl} alt="" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-[8px] bg-[#131313] text-[11px] font-semibold text-[#F5F5F5]">
                  {extension.slice(0, 4)}
                </div>
              )}
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="truncate text-sm text-[#F5F5F5]">{item.name}</span>
                <span className="text-[12px] text-[#8C8C8C]">
                  {formatFileSize(item.size)}
                  {item.uploading ? ` ${STRINGS.attachmentUploading}` : ""}
                </span>
                {item.error && !item.uploading ? (
                  <span className="text-[12px] text-[#ED3426]">{item.error}</span>
                ) : null}
              </div>
              <button
                type="button"
                className="text-[12px] font-medium text-[#ED3426] hover:text-[#FF6456]"
                onClick={() => removeAttachment(item.id)}
              >
                {STRINGS.attachmentRemove}
              </button>
            </div>
          );
        })}
        {attachmentError ? (
          <div className="rounded-[10px] border border-[#3A0F0F] bg-[#1B0A0A] px-3 py-2 text-[12px] text-[#FF8080]">
            {attachmentError}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black text-[#dbdbdb] flex">
      <DesktopSidebar />
      <div className="flex-1 flex justify-center px-0 sm:px-6">
        <div className="flex min-h-screen w-full max-w-[540px] flex-col gap-4 text-[14px] pb-[80px]">
          <header className="sticky top-0 z-30 flex items-center justify-between gap-3 bg-black/90 px-3 py-3 backdrop-blur">
            <button
              type="button"
              onClick={() => navigate("/mail")}
              className="flex items-center gap-2 text-sm text-[#dbdbdb] transition-colors hover:text-white"
            >
              <img className="h-6 w-6" src="/design/img/back.png" alt="Back" />
              <span>Back</span>
              {unreadCount > 0 ? (
                <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#ED3426] px-[6px] text-[11px] font-semibold leading-none text-white">
                  {unreadCount}
                </span>
              ) : null}
            </button>
            <div className="flex flex-col items-center gap-1 text-center">
              <span className="flex items-center gap-2 text-[16px] font-semibold text-white">{companionName}</span>
              <span className="text-[12px] text-[#8C8C8C]">
                {unreadCount > 0 ? STRINGS.newMessages : STRINGS.dialog}
              </span>
            </div>
            <button
              type="button"
              className="flex items-center gap-1 px-2 py-2"
              onClick={() => setIsNavbarSheetOpen(true)}
            >
              <img className="h-9 w-9 rounded-[10px] object-cover" src={companionAvatar} alt="avatar" />
            </button>
          </header>

          <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-1 pb-[140px] sm:pb-[260px]">
            {loading ? (
              <div className="py-10 text-center text-sm text-[#8C8C8C]">{STRINGS.loading}</div>
            ) : error ? (
              <div className="py-10 text-center text-sm text-[#ED3426]">{error}</div>
            ) : isEmpty ? (
              <div className="py-10 text-center text-sm text-[#8C8C8C]">{STRINGS.empty}</div>
            ) : (
              <div className="flex flex-col gap-6">
                {hasMore ? (
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    className="mx-auto flex items-center gap-2 rounded-full border border-[#32AFED] px-4 py-1 text-[12px] font-semibold text-[#32AFED] transition-colors hover:bg-[#32AFED]/10"
                  >
                    {STRINGS.showMore}
                  </button>
                ) : null}
                {groupedMessages.map((group) => (
                  <section key={group.key} className="relative flex flex-col gap-4">
                    <div className="sticky top-[70px] z-10 flex justify-center pb-4 pointer-events-none sm:top-[70px]">
                      <span className="pointer-events-auto rounded-full border border-[#1D1D1D] bg-[#080808]/70 px-3 py-1 text-[12px] text-[#dbdbdb] backdrop-blur">
                        {group.label}
                      </span>
                    </div>
                    <div className="flex flex-col gap-4">
                      {group.messages.map((message, index) => {
                        const nextMessage = group.messages[index + 1];
                        const showTimestamp =
                          !nextMessage ||
                          nextMessage.senderId !== message.senderId ||
                          !isWithinMinute(message.createdAt, nextMessage.createdAt);
                        const mine = message.senderId === user?.id;
                        const normalizedAttachmentUrl = message.attachmentUrl
                          ? resolveAttachmentUrl(message.attachmentUrl)
                          : null;
                        const imageAttachment = normalizedAttachmentUrl && isImageUrl(normalizedAttachmentUrl)
                          ? normalizedAttachmentUrl
                          : null;
                        const hasFileAttachment = normalizedAttachmentUrl && !imageAttachment;

                        const bubbleClasses = mine
                          ? "bg-[#4188F2] text-white"
                          : "bg-[#131313] text-white";
                        const bubbleShape = mine ? "rounded-[20px] rounded-br-none" : "rounded-[20px] rounded-bl-none";

                        return (
                          <div key={message.id} className={`flex w-full ${mine ? "justify-end" : "justify-start"}`}>
                            <div
                              className={`flex max-w-[60%] flex-col gap-2 ${mine ? "items-end text-right" : "items-start"}`}
                            >
                              {message.content ? (
                                <span
                                  className={`whitespace-pre-wrap break-words px-4 py-3 text-[14px] leading-[1.45] ${bubbleClasses} ${bubbleShape}`}
                                >
                                  {message.content}
                                </span>
                              ) : null}
                              {imageAttachment ? (
                                <span className={`${bubbleShape} overflow-hidden`}>
                                  <img
                                    className="max-h-[320px] w-full rounded-[20px] object-cover"
                                    src={imageAttachment}
                                    alt="attachment"
                                    loading="lazy"
                                  />
                                </span>
                              ) : null}
                              {hasFileAttachment ? (
                                <a
                                  className="text-[12px] font-semibold text-[#32AFED] underline"
                                  href={normalizedAttachmentUrl ?? undefined}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {STRINGS.attachment}
                                </a>
                              ) : null}
                              {showTimestamp ? (
                                <div
                                  className={`flex gap-2 text-[12px] text-[#8C8C8C] ${
                                    mine ? "items-center justify-end" : "items-center"
                                  }`}
                                >
                                  {mine ? (
                                    <span className="uppercase tracking-wide text-[11px] text-[#ADADAD]">
                                      {companionLastReadTimestamp &&
                                      companionLastReadTimestamp >= Date.parse(message.createdAt)
                                        ? STRINGS.read
                                        : STRINGS.sent}
                                    </span>
                                  ) : null}
                                  <span>{formatMessageTime(message.createdAt)}</span>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            )}
            <div ref={lastMessageMarkerRef} aria-hidden="true" />
          </div>
        </div>
      </div>

      <NavbarActionsSheet
        open={isNavbarSheetOpen}
        onClose={() => setIsNavbarSheetOpen(false)}
        textClassName="text-[14px]"
      />

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.txt"
        className="hidden"
        onChange={handleAttachmentChange}
      />

      <div className="hidden sm:flex pointer-events-none fixed bottom-0 left-0 right-0 justify-center">
        <div className="pointer-events-auto w-full max-w-[540px] px-4 pb-6">
          <div className="flex flex-col gap-3 rounded-t-[16px] border border-[#1D1D1D] bg-[#131313] px-4 py-4">
            <AttachmentPreview />
            <form className="flex items-end gap-2" onSubmit={handleSubmit}>
              <button type="button" onClick={handleAttachmentButtonClick} className="shrink-0 self-end p-2">
                <img src="/design/img/image.png" alt="Attach" className="h-6 w-6" />
              </button>
              <textarea
                ref={desktopTextareaRef}
                value={messageText}
                onChange={handleTextareaChange}
                placeholder={STRINGS.inputPlaceholder}
                rows={1}
                className="flex-1 min-w-0 resize-none overflow-hidden rounded-[10px] border border-[#1D1D1D] bg-[#0B0B0B] px-3 py-2 text-[#dbdbdb] placeholder:text-[#8C8C8C] focus:outline-none focus:ring-0"
              />
              <button
                type="submit"
                disabled={!sendEnabled || sending}
                className="shrink-0 rounded-[8px] bg-[#32AFED] px-3 py-2 font-bold text-black transition-colors hover:bg-[#2B99CF] disabled:opacity-50"
              >
                {STRINGS.send}
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="sm:hidden fixed bottom-0 left-0 right-0 border-t border-[#1D1D1D] bg-[#131313] text-white">
        <div className="space-y-2 px-4 py-2">
          <AttachmentPreview />
          <form className="flex items-end gap-2" onSubmit={handleSubmit}>
            <button type="button" onClick={handleAttachmentButtonClick} className="shrink-0 self-end p-2">
              <img src="/design/img/image.png" alt="Attach" className="h-6 w-6" />
            </button>
            <textarea
              value={messageText}
              onChange={handleTextareaChange}
              placeholder={STRINGS.inputPlaceholder}
              rows={1}
              ref={mobileTextareaRef}
              className="flex-1 min-w-0 resize-none overflow-hidden rounded-[10px] border border-[#1D1D1D] bg-[#0B0B0B] px-3 py-2 text-[#dbdbdb] placeholder:text-[#8C8C8C] focus:outline-none focus:ring-0"
            />
            <button
              type="submit"
              disabled={!sendEnabled || sending}
              className="shrink-0 self-end rounded-[10px] p-2 text-[#66E48B] disabled:opacity-50"
            >
              <img className="h-6 w-6" src="/design/img/send.png" alt="Send" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}





