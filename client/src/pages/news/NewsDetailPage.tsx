import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { MutableRefObject, ReactNode } from "react";
import { Link, Navigate, useLocation, useParams } from "react-router-dom";
import DOMPurify from "dompurify";
import EmojiPicker, { type EmojiClickData, Theme } from "emoji-picker-react";
import {
  fetchNewsItem,
  fetchNewsComments,
  createNewsComment,
  updateNewsComment,
  deleteNewsComment,
  reportNewsComment,
  type NewsItem,
  type NewsComment,
} from "@/api/news";
import type { AuthUser } from "@/api/auth";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { NavbarActionsSheet } from "@/components/layout/NavbarActionsSheet";
import { useAuth } from "@/contexts/useAuth";
import { NEWS_CACHE_EVENT } from "@/constants/news";

type ViewState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; item: NewsItem };

type CommentsState =
  | { status: "loading"; items: NewsComment[] }
  | { status: "error"; message: string; items: NewsComment[] }
  | { status: "ready"; items: NewsComment[] };

const DEFAULT_COVER = "/design/img/profile-cover.png";
const DEFAULT_AVATAR = "/design/img/default-avatar.png";
const NEWS_DETAIL_CACHE_TTL = 60_000;
const NEWS_DETAIL_CACHE_STORAGE_KEY = "nomi.news.detail.cache";
const COMMENT_MAX_LENGTH = 2000;

type NewsDetailCacheEntry = {
  item: NewsItem;
  timestamp: number;
};

type NewsDetailCacheStore = Record<string, NewsDetailCacheEntry>;

let newsDetailCache: NewsDetailCacheStore | null = null;

function hydrateDetailCache() {
  if (newsDetailCache) {
    return;
  }
  if (typeof window === "undefined") {
    newsDetailCache = {};
    return;
  }
  try {
    const raw = window.localStorage.getItem(NEWS_DETAIL_CACHE_STORAGE_KEY);
    if (!raw) {
      newsDetailCache = {};
      return;
    }
    const parsed = JSON.parse(raw) as NewsDetailCacheStore | null;
    if (parsed && typeof parsed === "object") {
      newsDetailCache = parsed;
    } else {
      newsDetailCache = {};
    }
  } catch (error) {
    console.warn("[NewsDetailPage] Failed to read cached news detail", error);
    newsDetailCache = {};
  }
}

function persistDetailCache() {
  if (typeof window === "undefined") {
    return;
  }
  try {
    if (!newsDetailCache || Object.keys(newsDetailCache).length === 0) {
      window.localStorage.removeItem(NEWS_DETAIL_CACHE_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(NEWS_DETAIL_CACHE_STORAGE_KEY, JSON.stringify(newsDetailCache));
  } catch (error) {
    console.warn("[NewsDetailPage] Failed to persist news detail cache", error);
  }
}

function cleanupDetailCache() {
  if (!newsDetailCache) {
    return;
  }
  const now = Date.now();
  let mutated = false;
  for (const key of Object.keys(newsDetailCache)) {
    const entry = newsDetailCache[key];
    if (!entry || now - entry.timestamp > NEWS_DETAIL_CACHE_TTL) {
      delete newsDetailCache[key];
      mutated = true;
    }
  }
  if (mutated) {
    persistDetailCache();
  }
}

function readCachedNewsDetail(newsId: string) {
  hydrateDetailCache();
  cleanupDetailCache();
  const entry = newsDetailCache?.[newsId];
  return entry ? entry.item : null;
}

function writeCachedNewsDetail(item: NewsItem) {
  hydrateDetailCache();
  newsDetailCache = newsDetailCache ?? {};
  newsDetailCache[item.id] = {
    item,
    timestamp: Date.now(),
  };
  persistDetailCache();
}

function insertEmojiIntoTextarea(
  textareaRef: MutableRefObject<HTMLTextAreaElement | null>,
  currentValue: string,
  emoji: string,
  onChange: (nextValue: string) => void,
) {
  const textarea = textareaRef.current;
  const selectionStart = textarea?.selectionStart ?? currentValue.length;
  const selectionEnd = textarea?.selectionEnd ?? currentValue.length;
  const nextValue = `${currentValue.slice(0, selectionStart)}${emoji}${currentValue.slice(selectionEnd)}`;
  onChange(nextValue);
  const nextCaretPosition = selectionStart + emoji.length;
  // Keep the caret after the inserted emoji once React updates the textarea value.
  const applyCaret = () => {
    const target = textareaRef.current;
    if (!target) {
      return;
    }
    target.focus();
    target.setSelectionRange(nextCaretPosition, nextCaretPosition);
  };
  if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
    window.requestAnimationFrame(applyCaret);
  } else {
    applyCaret();
  }
}

function useAutoResizeTextarea(
  textareaRef: MutableRefObject<HTMLTextAreaElement | null>,
  value: string,
  minHeight = 16,
  maxHeight = 240,
) {
  useLayoutEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }
    textarea.style.minHeight = `${minHeight}px`;
    textarea.style.maxHeight = `${maxHeight}px`;
    const isEmpty = value.length === 0;
    textarea.style.height = "auto";
    const measuredHeight = textarea.scrollHeight;
    const baseHeight = isEmpty
      ? minHeight
      : Math.min(Math.max(measuredHeight, minHeight), maxHeight);
    textarea.style.height = `${baseHeight}px`;
    textarea.style.overflowY = !isEmpty && measuredHeight > maxHeight ? "auto" : "hidden";
  }, [textareaRef, value, minHeight, maxHeight]);
}

type EmojiPickerTriggerProps = {
  variant: "desktop" | "mobile";
  disabled: boolean;
  onEmojiSelect: (emoji: string) => void;
};

function EmojiPickerTrigger({ variant, disabled, onEmojiSelect }: EmojiPickerTriggerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isDesktopVariant = variant === "desktop";
  const buttonPadding = isDesktopVariant ? "p-[4px]" : "p-2";
  const menuPositionClass = "bottom-[calc(100%+8px)] left-0";
  const pickerWidth = isDesktopVariant ? 320 : 300;
  const pickerHeight = isDesktopVariant ? 380 : 360;

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const handleOutsideClick = (event: MouseEvent | TouchEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-emoji-picker]")) {
        return;
      }
      setIsOpen(false);
    };
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, [isOpen]);

  useEffect(() => {
    if (disabled) {
      setIsOpen(false);
    }
  }, [disabled]);

  return (
    <div className="relative" data-emoji-picker>
      <button
        type="button"
        className={`rounded-[8px] hover:bg-[#1D1D1D] flex items-center justify-center ${buttonPadding}`}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          if (disabled) {
            return;
          }
          setIsOpen((open) => !open);
        }}
        aria-label="Вставить эмодзи"
        disabled={disabled}
      >
        <span aria-hidden="true" role="img">
          <img src="/design/img/smile.png" alt="Вставить эмодзи" />
        </span>
      </button>
      {isOpen ? (
        <div
          className={`absolute ${menuPositionClass} z-20 rounded-[12px] border border-[#1D1D1D] bg-[#0B0B0B] shadow-lg overflow-hidden`}
        >
          <EmojiPicker
            onEmojiClick={(emojiData: EmojiClickData) => {
              if (disabled) {
                return;
              }
              onEmojiSelect(emojiData.emoji);
              setIsOpen(false);
            }}
            theme={Theme.DARK}
            lazyLoadEmojis
            searchDisabled
            skinTonesDisabled
            previewConfig={{ showPreview: false }}
            autoFocusSearch={false}
            width={pickerWidth}
            height={pickerHeight}
          />
        </div>
      ) : null}
    </div>
  );
}

const STR = {
  defaultAuthor: "\u041a\u043e\u043c\u0430\u043d\u0434\u0430 NomiCMS",
  title: "\u041d\u043e\u0432\u043e\u0441\u0442\u0438",
  back: "\u041d\u0430\u0437\u0430\u0434",
  actions: "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u044f",
  dateUnknown: "\u0414\u0430\u0442\u0430 \u043d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d\u0430",
  loadError: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u043d\u043e\u0432\u043e\u0441\u0442\u044c.",
  tryAgain: "\u041f\u043e\u043f\u0440\u043e\u0431\u043e\u0432\u0430\u0442\u044c \u0441\u043d\u043e\u0432\u0430",
  backToList: "\u0412\u0435\u0440\u043d\u0443\u0442\u044c\u0441\u044f \u043a \u0441\u043f\u0438\u0441\u043a\u0443",
  newsTag: "\u041d\u043e\u0432\u043e\u0441\u0442\u0438 \u043f\u0440\u043e\u0435\u043a\u0442\u0430",
  when: "\u041a\u043e\u0433\u0434\u0430",
  who: "\u041a\u0442\u043e \u043f\u043e\u0434\u0433\u043e\u0442\u043e\u0432\u0438\u043b",
  team: "\u041a\u043e\u043c\u0430\u043d\u0434\u0430 \u043f\u043e\u0434\u0434\u0435\u0440\u0436\u043a\u0438 NomiCMS",
  brief: "\u041a\u043e\u0440\u043e\u0442\u043a\u043e",
  briefPlaceholder: "\u041e\u043f\u0438\u0441\u0430\u043d\u0438\u0435 \u043e\u0431\u043d\u043e\u0432\u043b\u0435\u043d\u0438\u044f \u043f\u043e\u044f\u0432\u0438\u0442\u0441\u044f \u043f\u043e\u0437\u0436\u0435.",
  today: "\u0421\u0435\u0433\u043e\u0434\u043d\u044f \u0432 ",
  yesterday: "\u0412\u0447\u0435\u0440\u0430 \u0432 ",
  noContent:
    "\u0422\u0435\u043a\u0441\u0442 \u044d\u0442\u043e\u0439 \u043d\u043e\u0432\u043e\u0441\u0442\u0438 \u043f\u043e\u043a\u0430 \u043e\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u0435\u0442. \u041c\u044b \u043e\u0431\u043d\u043e\u0432\u0438\u043c \u043f\u0443\u0431\u043b\u0438\u043a\u0430\u0446\u0438\u044e, \u043a\u0430\u043a \u0442\u043e\u043b\u044c\u043a\u043e \u043f\u043e\u0434\u0440\u043e\u0431\u043d\u043e\u0441\u0442\u0438 \u0431\u0443\u0434\u0443\u0442 \u0433\u043e\u0442\u043e\u0432\u044b.",
  discussText:
    "\u0415\u0441\u043b\u0438 \u0445\u043e\u0442\u0438\u0442\u0435 \u043e\u0431\u0441\u0443\u0434\u0438\u0442\u044c \u043e\u0431\u043d\u043e\u0432\u043b\u0435\u043d\u0438\u0435, \u0437\u0430\u0433\u043b\u044f\u043d\u0438\u0442\u0435 \u043d\u0430 ",
  forum: "\u0444\u043e\u0440\u0443\u043c NomiCMS",
  or: " \u0438\u043b\u0438 ",
  mail: "\u043b\u0438\u0447\u043d\u044b\u0435 \u0441\u043e\u043e\u0431\u0449\u0435\u043d\u0438\u044f",
  follow:
    ". \u041c\u044b \u0432\u043d\u0438\u043c\u0430\u0442\u0435\u043b\u044c\u043d\u043e \u0441\u043b\u0435\u0434\u0438\u043c \u0437\u0430 \u043e\u0431\u0440\u0430\u0442\u043d\u043e\u0439 \u0441\u0432\u044f\u0437\u044c\u044e.",
  commentsTitle: "\u041a\u043e\u043c\u043c\u0435\u043d\u0442\u0430\u0440\u0438\u0438",
  commentsEmptyTitle: "\u041f\u043e\u043a\u0430 \u043d\u0435\u0442 \u043a\u043e\u043c\u043c\u0435\u043d\u0442\u0430\u0440\u0438\u0435\u0432",
  commentsEmptyText:
    "\u0411\u0443\u0434\u044c\u0442\u0435 \u043f\u0435\u0440\u0432\u044b\u043c, \u043a\u0442\u043e \u043f\u043e\u0434\u0435\u043b\u0438\u0442\u0441\u044f \u0432\u043f\u0435\u0447\u0430\u0442\u043b\u0435\u043d\u0438\u044f\u043c\u0438 \u043e\u0431 \u044d\u0442\u043e\u043c \u043e\u0431\u043d\u043e\u0432\u043b\u0435\u043d\u0438\u0438.",
  commentLoginPrompt: "\u0410\u0432\u0442\u043e\u0440\u0438\u0437\u0443\u0439\u0442\u0435\u0441\u044c, \u0447\u0442\u043e\u0431\u044b \u043e\u0441\u0442\u0430\u0432\u0438\u0442\u044c \u043a\u043e\u043c\u043c\u0435\u043d\u0442\u0430\u0440\u0438\u0439.",
  commentPlaceholder: "\u041d\u0430\u043f\u0438\u0448\u0438\u0442\u0435 \u043a\u043e\u043c\u043c\u0435\u043d\u0442\u0430\u0440\u0438\u0439\u2026",
  commentSubmit: "\u041e\u0442\u043f\u0440\u0430\u0432\u0438\u0442\u044c",
  commentSubmitting: "\u041e\u0442\u043f\u0440\u0430\u0432\u043a\u0430\u2026",
  commentTooShort: "\u041a\u043e\u043c\u043c\u0435\u043d\u0442\u0430\u0440\u0438\u0439 \u043d\u0435 \u043c\u043e\u0436\u0435\u0442 \u0431\u044b\u0442\u044c \u043f\u0443\u0441\u0442\u044b\u043c.",
  commentError: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0442\u043f\u0440\u0430\u0432\u0438\u0442\u044c \u043a\u043e\u043c\u043c\u0435\u043d\u0442\u0430\u0440\u0438\u0439. \u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437.",
  commentsLoadError: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u043a\u043e\u043c\u043c\u0435\u043d\u0442\u0430\u0440\u0438\u0438.",
  commentsRetry: "\u041e\u0431\u043d\u043e\u0432\u0438\u0442\u044c",
  commentJustNow: "\u0422\u043e\u043b\u044c\u043a\u043e \u0447\u0442\u043e",
  missingId: "\u041d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d \u0438\u0434\u0435\u043d\u0442\u0438\u0444\u0438\u043a\u0430\u0442\u043e\u0440 \u043d\u043e\u0432\u043e\u0441\u0442\u0438.",
  commentActionEdit: "\u0420\u0435\u0434\u0430\u043a\u0442\u0438\u0440\u043e\u0432\u0430\u0442\u044c",
  commentActionDelete: "\u0423\u0434\u0430\u043b\u0438\u0442\u044c",
  commentActionReport: "\u041f\u043e\u0436\u0430\u043b\u043e\u0432\u0430\u0442\u044c\u0441\u044f",
  commentSave: "\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c",
  commentEditLabel: "\u0420\u0435\u0434\u0430\u043a\u0442\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435 \u043a\u043e\u043c\u043c\u0435\u043d\u0442\u0430\u0440\u0438\u044f",
  commentEditCancel: "\u041e\u0442\u043c\u0435\u043d\u0430",
  commentCreateSuccess: "\u041a\u043e\u043c\u043c\u0435\u043d\u0442\u0430\u0440\u0438\u0439 \u043e\u043f\u0443\u0431\u043b\u0438\u043a\u043e\u0432\u0430\u043d.",
  commentUpdateSuccess: "\u041a\u043e\u043c\u043c\u0435\u043d\u0442\u0430\u0440\u0438\u0439 \u043e\u0431\u043d\u043e\u0432\u043b\u0451\u043d.",
  commentDeleteSuccess: "\u041a\u043e\u043c\u043c\u0435\u043d\u0442\u0430\u0440\u0438\u0439 \u0443\u0434\u0430\u043b\u0451\u043d.",
  commentDeleteConfirm: "\u0423\u0434\u0430\u043b\u0438\u0442\u044c \u043a\u043e\u043c\u043c\u0435\u043d\u0442\u0430\u0440\u0438\u0439?",
  commentReportPrompt: "\u041e\u043f\u0438\u0448\u0438\u0442\u0435 \u043f\u0440\u0438\u0447\u0438\u043d\u0443 \u0436\u0430\u043b\u043e\u0431\u044b (\u043d\u0435\u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u043e).",
  commentReportSuccess: "\u0416\u0430\u043b\u043e\u0431\u0430 \u043e\u0442\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0430. \u0421\u043f\u0430\u0441\u0438\u0431\u043e!",
  commentReportError: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0442\u043f\u0440\u0430\u0432\u0438\u0442\u044c \u0436\u0430\u043b\u043e\u0431\u0443. \u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437.",
  close: "\u0417\u0430\u043a\u0440\u044b\u0442\u044c",
};

function resolveInitialViewState(newsId: string | undefined, fallback?: NewsItem): ViewState {
  if (!newsId) {
    return { status: "error", message: STR.missingId };
  }
  if (fallback && fallback.id === newsId) {
    return { status: "ready", item: fallback };
  }
  const cached = readCachedNewsDetail(newsId);
  if (cached) {
    return { status: "ready", item: cached };
  }
  return { status: "loading" };
}

function formatNumber(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "0";
  }
  return new Intl.NumberFormat("ru-RU").format(value);
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return STR.dateUnknown;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return STR.dateUnknown;
  }
  return new Intl.DateTimeFormat("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function sortComments(items: NewsComment[]) {
  return [...items].sort((a, b) => {
    const left = a.createdAt ?? "";
    const right = b.createdAt ?? "";
    return left.localeCompare(right);
  });
}

function formatCommentTimestamp(value: string | null | undefined) {
  if (!value) {
    return STR.dateUnknown;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return STR.dateUnknown;
  }
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  if (diff < 60_000) {
    return STR.commentJustNow;
  }
  const sameDay = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const timeFormatter = new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (sameDay) {
    return `${STR.today}${timeFormatter.format(date)}`;
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return `${STR.yesterday}${timeFormatter.format(date)}`;
  }
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function sanitizeHtml(html: string) {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
  });
}

function LoadingView() {
  return (
    <div className="flex flex-col items-center gap-3 text-[14px] p-3 sm:gap-4 sm:p-0">
      <div className="h-[170px] w-full max-w-[540px] rounded-[12px] border border-[#1D1D1D] bg-[#101010] animate-pulse" />
      <div className="grid w-full max-w-[540px] gap-2 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-[120px] rounded-[12px] border border-[#1D1D1D] bg-[#0B0B0B] animate-pulse" />
        ))}
      </div>
      <div className="h-[240px] w-full max-w-[540px] rounded-[12px] border border-[#1D1D1D] bg-[#0B0B0B] animate-pulse" />
    </div>
  );
}

function ErrorView({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 text-[14px] p-3 sm:gap-4 sm:p-0">
      <div className="flex w-full max-w-[540px] flex-col gap-3 rounded-[12px] border border-[#402626] bg-[#2A1414] p-6 text-[#f5caca]">
        <p className="text-[16px] font-semibold">{STR.loadError}</p>
        <p className="text-[13px] text-[#f8dada]">{message}</p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onRetry}
            className="rounded-[10px] border border-[#f5caca] bg-[#f5caca] px-4 py-2 text-[13px] font-semibold text-[#2A1414] hover:bg-[#f1bebe]"
          >
            {STR.tryAgain}
          </button>
          <Link
            to="/news"
            className="rounded-[10px] border border-[#f5caca] px-4 py-2 text-[13px] font-semibold text-[#f5caca] hover:bg-[#f5caca]/10"
          >
            {STR.backToList}
          </Link>
        </div>
      </div>
    </div>
  );
}



function BodyCard({ item }: { item: NewsItem }) {
  const sanitized = useMemo(() => sanitizeHtml(item.content ?? ""), [item.content]);
  const hasContent = sanitized.trim().length > 0;
  const cover = item.coverImageUrl ?? DEFAULT_COVER;
  const publishedAt = item.publishedAt ?? item.updatedAt ?? item.createdAt ?? null;

  return (
    <div className="flex w-full max-w-[540px] flex-col gap-2 rounded-[12px] border border-[#1D1D1D] bg-[#131313] text-white">
      <div
          className="flex h-[140px] w-full items-start justify-end rounded-[12px] border-b border-[#1D1D1D] bg-cover bg-center sm:h-[190px]"
          style={{ backgroundImage: `url(${cover})` }}
        />
        <div className="flex flex-col gap-2 px-4 pb-4 pt-0">
       <h1 className="flex items-center justify-between gap-2 text-[20px] font-semibold leading-[1.3]">{item.title}  <span className="text-[#dbdbdb] text-[14px]">{`${formatDate(publishedAt)}`}</span></h1>
      {hasContent ? (
        <div
          className="prose prose-invert max-w-none text-[15px] leading-[1.7] prose-headings:text-white prose-a:text-[#2F94F9] prose-strong:text-white prose-li:marker:text-[#2F94F9]"
          dangerouslySetInnerHTML={{ __html: sanitized }}
        />
      ) : (
        <div className="rounded-[10px] border border-[#2A1414] bg-[#1c0f0f] p-4 text-[13px] text-[#f5caca]">{STR.noContent}</div>
      )}
      </div>
    </div>
  );
}

function CommentsSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 2 }).map((_, index) => (
        <div key={index} className="flex gap-3">
          <div className="h-[36px] w-[36px] rounded-full bg-[#1D1D1D] animate-pulse" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="h-[14px] w-1/3 rounded bg-[#1D1D1D] animate-pulse" />
            <div className="h-[32px] w-full rounded bg-[#1D1D1D] animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

function CommentEntry({ comment, onOpenActions }: { comment: NewsComment; onOpenActions: (comment: NewsComment) => void }) {
  const avatarSrc =
    comment.authorAvatarUrl && comment.authorAvatarUrl.length > 0 ? comment.authorAvatarUrl : DEFAULT_AVATAR;

  return (
    <div id={"comment-" + comment.id} className="flex flex-col w-full max-w-[540px] gap-2 bg-[#131313] border-t border-r border-l border-[#1D1D1D] text-white p-[16px] rounded-[12px]">
      <div className="flex justify-between gap-2">
        <div className="flex gap-2">
          <a href="#">
            <img className="w-[42px] h-[42px] rounded-[8px] object-cover" src={avatarSrc} alt={comment.authorDisplayName} />
          </a>
          <div className="flex flex-col justify-center gap-1">
            <div className="flex items-center gap-1">
              <div className="font-semibold text-[16px]">
                <a href="#">{comment.authorDisplayName}</a>
              </div>
              <img className="w-[18px]" src="/design/img/badge.png" alt="" />
            </div>
            <div className="flex items-center gap-2">
              <div className="flex text-[12px] text-[#e1e1e1] mt-[-4px]">{formatCommentTimestamp(comment.createdAt)}</div>
            </div>
          </div>
        </div>
        <div className="flex items-start justify-end">
          <button
            type="button"
            data-bottom-sheet-open="true"
            data-bottom-sheet-target="news-comment-actions"
            onClick={() => onOpenActions(comment)}
          >
            <img className="p-2 hover:bg-[#1D1D1D] rounded-[8px]" src="/design/img/more-gray.png" alt="Дополнительные действия" />
          </button>
        </div>
      </div>
      <p className="text-[#e1e1e1] text-[16px] prose prose-invert prose-sm max-w-none">{comment.content}</p>
    </div>

  
     
  );
}

type CommentsSectionProps = {
  state: CommentsState;
  onReload: () => void;
  canComment: boolean;
  commentsCount: number;
  viewsCount: number;
  commentValue: string;
  onCommentChange: (value: string) => void;
  onSubmit: () => void;
  onCancelEdit: () => void;
  isEditing: boolean;
  submitting: boolean;
  submitError: string | null;
  successMessage: string | null;
  avatarSrc: string;
  textareaRef: MutableRefObject<HTMLTextAreaElement | null>;
  onOpenActions: (comment: NewsComment) => void;
};

function CommentsSection({
  state,
  onReload,
  canComment,
  commentsCount,
  viewsCount,
  commentValue,
  onCommentChange,
  onSubmit,
  onCancelEdit,
  isEditing,
  submitting,
  submitError,
  successMessage,
  avatarSrc,
  textareaRef,
  onOpenActions,
}: CommentsSectionProps) {
  const isLoading = state.status === "loading";
  const isError = state.status === "error";
  const hasComments = state.items.length > 0;
  const handleEmojiSelect = useCallback(
    (emoji: string) => {
      insertEmojiIntoTextarea(textareaRef, commentValue, emoji, onCommentChange);
    },
    [commentValue, onCommentChange, textareaRef],
  );

  return (
    <div className="flex w-full max-w-[540px] flex-col gap-4 text-white">
      

      <div className="flex items-center justify-between rounded-[12px] border-t border-r border-l border-[#1D1D1D] bg-[#131313] p-[16px] text-[13px] text-[#e1e1e1]">
        <div className="flex items-center gap-2">
          <img src="/design/img/comment-gray.png" alt="" />
          <p>
            {STR.commentsTitle}: {formatNumber(commentsCount)}
          </p>
        </div>
        <div className="flex items-center gap-2 text-[#dbdbdb]">
          <img src="/design/img/eye.png" alt="" />
          <p>{formatNumber(viewsCount)}</p>
        </div>
      </div>
      {!isLoading && !isError && !hasComments ? (
        <div className="flex flex-col items-center gap-2 rounded-[12px] border border-dashed border-[#1D1D1D] bg-[#101010] p-6 text-center">
          <div className="flex h-[64px] w-[64px] items-center justify-center rounded-full border border-[#1D1D1D] bg-[#0B0B0B]">
            <img src="/design/img/comment-gray.png" alt="" className="h-[28px] w-[28px] opacity-70" />
          </div>
          <p className="text-[15px] font-semibold">{STR.commentsEmptyTitle}</p>
          <p className="text-[12px] text-[#8C8C8C]">{STR.commentsEmptyText}</p>
        </div>
      ) : null}
      <div className="hidden sm:flex flex-col w-full max-w-[540px] gap-2 bg-[#131313] border border-[#1D1D1D] text-white p-[16px] rounded-[12px]">
        {canComment ? (
          <>
            <form
              className="flex flex-col gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                onSubmit();
              }}
            >
              {isEditing ? (
                <div className="flex items-center justify-between rounded-[8px] bg-[#1C1C1C] px-3 py-2 text-[12px] text-[#8C8C8C]">
                  <span>{STR.commentEditLabel}</span>
                  <button
                    type="button"
                    onClick={onCancelEdit}
                    className="text-[#2F94F9] hover:underline"
                  >
                    {STR.commentEditCancel}
                  </button>
                </div>
              ) : null}
              <div className="flex gap-3">
                
                <textarea
                  ref={textareaRef}
                  value={commentValue}
                  maxLength={COMMENT_MAX_LENGTH}
                  disabled={submitting}
                  onChange={(event) => onCommentChange(event.target.value)}
                  placeholder={STR.commentPlaceholder}
                  className="flex-1 resize-none rounded-[8px] bg-[#131313] text-[14px] text-[#dbdbdb] placeholder:text-[#8C8C8C] focus:border-[#2F94F9] focus:outline-none focus:ring-0"
                  rows={3}
                />
              </div>
              <div className="flex items-center justify-between text-[12px] text-[#8C8C8C]">
                <div className="flex items-center gap-2">
                  <EmojiPickerTrigger
                    variant="desktop"
                    disabled={submitting}
                    onEmojiSelect={handleEmojiSelect}
                  />
                </div>
                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <button
                      type="button"
                      onClick={onCancelEdit}
                      className="rounded-[10px] border border-[#1D1D1D] px-4 py-2 text-[13px] font-semibold text-[#dbdbdb] transition-colors hover:bg-[#1D1D1D]"
                    >
                      {STR.commentEditCancel}
                    </button>
                  ) : null}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-[10px] border border-[#2F94F9] bg-[#2F94F9] px-4 py-2 text-[13px] font-semibold text-black transition-colors hover:bg-[#257acc] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {submitting ? STR.commentSubmitting : isEditing ? STR.commentSave : STR.commentSubmit}
                  </button>
                </div>
              </div>
            </form>
            {submitError ? <p className="mt-2 text-[12px] text-[#f5caca]">{submitError}</p> : null}
            {!submitError && successMessage ? (
              <p className="mt-2 text-[12px] text-[#7fffa5]">{successMessage}</p>
            ) : null}
          </>
        ) : (
          <p className="text-[13px] text-[#8C8C8C]">{STR.commentLoginPrompt}</p>
        )}
      </div>

      {isError ? (
        <div className="flex flex-col gap-2 rounded-[10px] border border-[#402626] bg-[#2A1414] p-3 text-[#f5caca]">
          <p className="text-[13px] font-semibold">{STR.commentsLoadError}</p>
          <p className="text-[12px] text-[#f7dede]">{state.message}</p>
          <button
            type="button"
            onClick={onReload}
            className="self-start rounded-[8px] border border-[#f5caca] bg-[#f5caca] px-3 py-1.5 text-[12px] font-semibold text-[#2A1414] hover:bg-[#f1bebe]"
          >
            {STR.commentsRetry}
          </button>
        </div>
      ) : null}
    
      {isLoading && state.items.length === 0 ? <CommentsSkeleton /> : null}

      

      {state.items.length > 0 ? (
        <div className="flex flex-col gap-3">
          {state.items.map((comment) => (
            <CommentEntry key={comment.id} comment={comment} onOpenActions={onOpenActions} />
          ))}
        </div>
      ) : null}

      
    </div>
  );
}

type CommentActionsSheetProps = {
  open: boolean;
  comment: NewsComment | null;
  currentUser: AuthUser | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReport: () => void;
};

function CommentActionsSheet({ open, comment, currentUser, onClose, onEdit, onDelete, onReport }: CommentActionsSheetProps) {
  const header = comment?.authorDisplayName ?? "";
  const isAdmin = currentUser?.role === "admin";
  const isAuthor = Boolean(currentUser?.id && comment?.authorId === currentUser.id);
  const canEditOrDelete = Boolean(comment && currentUser && (isAdmin || isAuthor));
  const canReport = Boolean(comment && currentUser);

  const actions = [
    {
      key: "edit",
      label: STR.commentActionEdit,
      icon: "/design/img/sheet-update-profile.png",
      onClick: onEdit,
      visible: canEditOrDelete,
    },
    {
      key: "delete",
      label: STR.commentActionDelete,
      icon: "/design/img/sheet-delete-cover.png",
      onClick: onDelete,
      visible: canEditOrDelete,
    },
    {
      key: "report",
      label: STR.commentActionReport,
      icon: "/design/img/sheet-report.png",
      onClick: onReport,
      visible: canReport,
    },
  ].filter((action) => action.visible);

  return (
    <div
      className={`fixed inset-0 z-50 ${open ? "" : "hidden"}`}
      data-bottom-sheet="news-comment-actions"
      aria-hidden={open ? "false" : "true"}
    >
      <div
        className={`absolute inset-0 bg-black/80 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`}
        data-bottom-sheet-overlay
        onClick={onClose}
      />
      <div
        className={`absolute bottom-0 left-0 right-0 bg-[#131313] border-t border-[#1D1D1D] rounded-t-[16px] px-4 pt-4 pb-6 transition-transform duration-300 ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
        data-bottom-sheet-panel
        role="menu"
      >
        <div className="mx-auto mb-4 h-[4px] w-12 rounded-full bg-[#2E2E2E]" />
        {header ? <p className="mb-4 text-center text-[14px] text-[#8C8C8C]">{header}</p> : null}
        <div className="flex flex-col items-center gap-2 text-[#F5F5F5] text-[14px]">
          {actions.map((action) => (
            <button
              key={action.key}
              type="button"
              className="flex w-full max-w-[540px] items-center gap-3 rounded-[10px] border border-[#232323] bg-[#1C1C1C] p-2 px-4 text-left hover:bg-[#252525]"
              onClick={() => {
                action.onClick();
              }}
            >
              <img src={action.icon} alt="" />
              <span>{action.label}</span>
            </button>
          ))}
          <button
            type="button"
            className="mt-4 w-full max-w-[540px] rounded-[10px] border border-[#232323] p-2 text-[#F5F5F5] hover:bg-[#1C1C1C]"
            onClick={onClose}
          >
            {STR.close}
          </button>
        </div>
      </div>
    </div>
  );
}

type MobileCommentComposerProps = {
  canComment: boolean;
  commentValue: string;
  onCommentChange: (value: string) => void;
  onSubmit: () => void;
  submitting: boolean;
  submitError: string | null;
  successMessage: string | null;
  isEditing: boolean;
  onCancelEdit: () => void;
  textareaRef: MutableRefObject<HTMLTextAreaElement | null>;
  avatarSrc: string;
};

function MobileCommentComposer({
  canComment,
  commentValue,
  onCommentChange,
  onSubmit,
  submitting,
  submitError,
  successMessage,
  isEditing,
  onCancelEdit,
  textareaRef,
  avatarSrc,
}: MobileCommentComposerProps) {
  const handleEmojiSelect = useCallback(
    (emoji: string) => {
      insertEmojiIntoTextarea(textareaRef, commentValue, emoji, onCommentChange);
    },
    [commentValue, onCommentChange, textareaRef],
  );
  useAutoResizeTextarea(textareaRef, commentValue, 32, 240);

  return (
    <div className="fixed flex items-center justify-center bottom-0 left-0 right-0 sm:hidden z-50 bg-[#131313] border-t border-[#1D1D1D] text-white">
      {canComment ? (
        <form
          className="max-w-[540px] mx-auto w-full px-3 pt-2 pb-9 flex items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <div className="shrink-0">
            <EmojiPickerTrigger
              variant="mobile"
              disabled={submitting}
              onEmojiSelect={handleEmojiSelect}
            />
          </div>
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="mb-2 flex items-center justify-between text-[12px] text-[#8C8C8C]">
                <span>{STR.commentEditLabel}</span>
                <button type="button" onClick={onCancelEdit} className="text-[#2F94F9] hover:underline">
                  {STR.commentEditCancel}
                </button>
              </div>
            ) : null}
            <div className="rounded-[10px] border border-[#1D1D1D] bg-[#0B0B0B] px-3 py-1">
              <textarea
                ref={textareaRef}
                value={commentValue}
                maxLength={COMMENT_MAX_LENGTH}
                disabled={submitting}
                onChange={(event) => onCommentChange(event.target.value)}
                placeholder={STR.commentPlaceholder}
                className="min-h-[16px] max-h-[240px] w-full resize-none overflow-y-auto bg-transparent text-[14px] leading-[14px] text-[#dbdbdb] placeholder:text-[#8C8C8C] focus:outline-none py-3"
                rows={1}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="shrink-0 rounded-[10px] p-2 text-[#2F94F9]"
          >
            <img
              className="h-6 w-6"
              src="/design/img/send.png"
              alt={isEditing ? STR.commentSave : STR.commentSubmit}
            />
          </button>
        </form>
      ) : (
        <div className="max-w-[540px] mx-auto w-full px-4 py-3 text-[13px] text-[#8C8C8C]">
          {STR.commentLoginPrompt}
        </div>
      )}
      {submitError ? <div className="px-4 pb-2 text-[12px] text-[#f5caca]">{submitError}</div> : null}
      {!submitError && successMessage ? (
        <div className="px-4 pb-2 text-[12px] text-[#7fffa5]">{successMessage}</div>
      ) : null}
    </div>
  );
}

export function NewsDetailPage() {
  const { newsId } = useParams<{ newsId: string }>();
  const location = useLocation();
  const fallbackItem = (location.state as { item?: NewsItem } | undefined)?.item;
  const { user, token } = useAuth();
  const [state, setState] = useState<ViewState>(() => resolveInitialViewState(newsId, fallbackItem));
  const [commentsState, setCommentsState] = useState<CommentsState>({ status: "loading", items: [] });
  const [commentValue, setCommentValue] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNavbarSheetOpen, setNavbarSheetOpen] = useState(false);
  const [isCommentActionsOpen, setCommentActionsOpen] = useState(false);
  const [activeComment, setActiveComment] = useState<NewsComment | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const currentNewsIdRef = useRef<string | undefined>(newsId);
  const desktopComposerRef = useRef<HTMLTextAreaElement | null>(null);
  const mobileComposerRef = useRef<HTMLTextAreaElement | null>(null);
  const canComment = Boolean(user && token);
  const commenterAvatar =
    user?.avatarUrl && user.avatarUrl.length > 0 ? user.avatarUrl : DEFAULT_AVATAR;
  const currentNewsItemId = state.status === "ready" ? state.item.id : null;

  const focusComposer = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (window.innerWidth < 640) {
      mobileComposerRef.current?.focus();
    } else {
      desktopComposerRef.current?.focus();
    }
  }, [desktopComposerRef, mobileComposerRef]);

  useEffect(() => {
    currentNewsIdRef.current = newsId;
    setCommentsState({ status: "loading", items: [] });
    setCommentValue("");
    setSubmitError(null);
    setSubmitSuccess(null);
    setEditingCommentId(null);
    setCommentActionsOpen(false);
    setActiveComment(null);
    setIsSubmitting(false);
  }, [newsId]);

  const load = useCallback(async () => {
    if (!newsId) {
      setState({ status: "error", message: STR.missingId });
      return;
    }
    const targetId = newsId;
    setState((prev) => {
      if (prev.status === "ready" && prev.item.id === targetId) {
        return prev;
      }
      return { status: "loading" };
    });
    try {
      const response = await fetchNewsItem(targetId);
      if (!mountedRef.current) {
        return;
      }
      if (currentNewsIdRef.current !== targetId) {
        return;
      }
      setState((prev) => {
        if (!mountedRef.current || currentNewsIdRef.current !== targetId) {
          return prev;
        }
        let nextItem = response.news;
        if (prev.status === "ready" && prev.item.id === targetId) {
          const prevViews = prev.item.viewsCount ?? 0;
          const fetchedViews = response.news.viewsCount ?? 0;
          if (prevViews > fetchedViews) {
            nextItem = { ...response.news, viewsCount: prevViews };
          }
        }
        writeCachedNewsDetail(nextItem);
        return { status: "ready", item: nextItem };
      });
    } catch (error) {
      if (!mountedRef.current) {
        return;
      }
      if (currentNewsIdRef.current !== targetId) {
        return;
      }
      const message = error instanceof Error ? error.message : STR.loadError;
      setState((prev) => {
        if (prev.status === "ready" && prev.item.id === targetId) {
          return prev;
        }
        return { status: "error", message };
      });
    }
  }, [newsId]);

  const loadComments = useCallback(async () => {
    if (!newsId) {
      return;
    }
    const targetId = newsId;
    setCommentsState((prev) => ({
      status: "loading",
      items: prev.items,
    }));
    try {
      const response = await fetchNewsComments(targetId);
      if (!mountedRef.current) {
        return;
      }
      if (currentNewsIdRef.current !== targetId) {
        return;
      }
      const sorted = sortComments(response.comments);
      setCommentsState({ status: "ready", items: sorted });
      const nextCount = sorted.length;
      setState((prev) => {
        if (prev.status !== "ready" || prev.item.id !== targetId) {
          return prev;
        }
        if ((prev.item.commentsCount ?? 0) === nextCount) {
          return prev;
        }
        const updatedItem = { ...prev.item, commentsCount: nextCount };
        writeCachedNewsDetail(updatedItem);
        return { status: "ready", item: updatedItem };
      });
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent(NEWS_CACHE_EVENT, { detail: { newsId: targetId, commentsCount: sorted.length } }),
        );
      }
    } catch (error) {
      if (!mountedRef.current) {
        return;
      }
      if (currentNewsIdRef.current !== targetId) {
        return;
      }
      const message = error instanceof Error ? error.message : STR.commentsLoadError;
      setCommentsState((prev) => ({
        status: "error",
        message,
        items: prev.items,
      }));
    }
  }, [newsId]);

  useEffect(() => {
    if (!newsId) {
      setState({ status: "error", message: STR.missingId });
      return;
    }
    if (fallbackItem && fallbackItem.id === newsId) {
      writeCachedNewsDetail(fallbackItem);
      setState({ status: "ready", item: fallbackItem });
      return;
    }
    const cached = readCachedNewsDetail(newsId);
    if (cached) {
      setState({ status: "ready", item: cached });
      return;
    }
    setState((prev) => {
      if (prev.status === "loading") {
        return prev;
      }
      return { status: "loading" };
    });
  }, [fallbackItem, newsId]);

  useEffect(() => {
    mountedRef.current = true;
    void load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  useEffect(() => {
    if (!newsId) {
      return;
    }
    void loadComments();
  }, [loadComments, newsId]);

  const handleCommentChange = useCallback(
    (value: string) => {
      setCommentValue(value);
      if (submitError) {
        setSubmitError(null);
      }
      if (submitSuccess) {
        setSubmitSuccess(null);
      }
    },
    [submitError, submitSuccess],
  );

  const handleSubmitComment = useCallback(async () => {
    if (!newsId || !token) {
      setSubmitError(STR.commentLoginPrompt);
      return;
    }
    const targetId = newsId;
    const content = commentValue.trim();
    if (!content) {
      setSubmitError(STR.commentTooShort);
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);
    try {
      if (editingCommentId) {
        const response = await updateNewsComment(targetId, editingCommentId, { content }, token);
        if (!mountedRef.current || currentNewsIdRef.current !== targetId) {
          return;
        }
        setCommentsState((prev) => {
          const nextItems = prev.items.map((item) =>
            item.id === response.comment.id ? response.comment : item,
          );
          switch (prev.status) {
            case "loading":
              return { status: "loading", items: nextItems };
            case "error":
              return { status: "error", message: prev.message, items: nextItems };
            default:
              return { status: "ready", items: nextItems };
          }
        });
        setCommentValue("");
        setEditingCommentId(null);
        setSubmitSuccess(STR.commentUpdateSuccess);
        focusComposer();
        return;
      }

      const response = await createNewsComment(targetId, { content }, token);
      if (!mountedRef.current || currentNewsIdRef.current !== targetId) {
        return;
      }
      let updatedComments: NewsComment[] = [];
      setCommentsState((prev) => {
        const nextItems = sortComments([...prev.items, response.comment]);
        updatedComments = nextItems;
        return { status: "ready", items: nextItems };
      });
      setCommentValue("");
      const nextCount = updatedComments.length;
      setState((prev) => {
        if (prev.status !== "ready" || prev.item.id !== targetId) {
          return prev;
        }
        const updatedItem = { ...prev.item, commentsCount: nextCount };
        writeCachedNewsDetail(updatedItem);
        return { status: "ready", item: updatedItem };
      });
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent(NEWS_CACHE_EVENT, {
            detail: { newsId: targetId, commentsCount: updatedComments.length },
          }),
        );
      }
      setSubmitSuccess(STR.commentCreateSuccess);
    } catch (error) {
      if (!mountedRef.current || currentNewsIdRef.current !== targetId) {
        return;
      }
      const message = error instanceof Error ? error.message : STR.commentError;
      setSubmitError(message);
    } finally {
      if (mountedRef.current) {
        setIsSubmitting(false);
      }
    }
  }, [commentValue, editingCommentId, focusComposer, newsId, token]);

  const handleOpenCommentActions = useCallback(
    (comment: NewsComment) => {
      if (!user) {
        return;
      }
      setActiveComment(comment);
      setCommentActionsOpen(true);
    },
    [user],
  );

  const handleCloseCommentActions = useCallback(() => {
    setCommentActionsOpen(false);
    setActiveComment(null);
  }, []);

  const handleEditComment = useCallback(() => {
    if (!activeComment || !user || (user.role !== "admin" && activeComment.authorId !== user.id)) {
      handleCloseCommentActions();
      return;
    }

    const nextValue = activeComment.content ?? "";
    setCommentValue(nextValue);
    setEditingCommentId(activeComment.id);
    setSubmitError(null);
    setSubmitSuccess(null);
    handleCloseCommentActions();
    setTimeout(() => {
      focusComposer();
    }, 0);
  }, [activeComment, focusComposer, handleCloseCommentActions, setCommentValue, user]);

  const handleCancelEdit = useCallback(() => {
    setEditingCommentId(null);
    setCommentValue("");
    setSubmitError(null);
    setSubmitSuccess(null);
  }, []);

  const handleDeleteComment = useCallback(async () => {
    if (!activeComment || !user || (user.role !== "admin" && activeComment.authorId !== user.id)) {
      handleCloseCommentActions();
      return;
    }

    if (!newsId || !token) {
      setSubmitError(STR.commentLoginPrompt);
      handleCloseCommentActions();
      return;
    }

    const confirmed = window.confirm(STR.commentDeleteConfirm);
    if (!confirmed) {
      return;
    }

    const targetId = activeComment.id;
    handleCloseCommentActions();
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      await deleteNewsComment(newsId, targetId, token);
      let nextItems: NewsComment[] = [];
      setCommentsState((prev) => {
        const filtered = prev.items.filter((item) => item.id !== targetId);
        nextItems = filtered;
        switch (prev.status) {
          case "loading":
            return { status: "loading", items: filtered };
          case "error":
            return { status: "error", message: prev.message, items: filtered };
          default:
            return { status: "ready", items: filtered };
        }
      });

      if (editingCommentId === targetId) {
        setEditingCommentId(null);
        setCommentValue("");
      }

      const nextCount = nextItems.length;
      setState((prev) => {
        if (prev.status !== "ready" || prev.item.id !== newsId) {
          return prev;
        }
        const updatedItem = { ...prev.item, commentsCount: nextCount };
        writeCachedNewsDetail(updatedItem);
        return { status: "ready", item: updatedItem };
      });

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent(NEWS_CACHE_EVENT, {
            detail: { newsId, commentsCount: nextItems.length },
          }),
        );
      }

      setSubmitSuccess(STR.commentDeleteSuccess);
    } catch (error) {
      const message = error instanceof Error ? error.message : STR.commentError;
      setSubmitError(message);
    }
  }, [activeComment, editingCommentId, handleCloseCommentActions, newsId, token, user]);

  const handleReportComment = useCallback(async () => {
    if (!activeComment) {
      handleCloseCommentActions();
      return;
    }

    if (!newsId || !token) {
      setSubmitError(STR.commentLoginPrompt);
      handleCloseCommentActions();
      return;
    }

    const reasonInput = window.prompt(STR.commentReportPrompt, "");
    if (reasonInput === null) {
      return;
    }

    const payload =
      typeof reasonInput === "string" && reasonInput.trim().length > 0
        ? { reason: reasonInput.trim() }
        : undefined;

    handleCloseCommentActions();
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      await reportNewsComment(newsId, activeComment.id, payload, token);
      setSubmitSuccess(STR.commentReportSuccess);
    } catch (error) {
      const message = error instanceof Error ? error.message : STR.commentReportError;
      setSubmitError(message);
    }
  }, [activeComment, handleCloseCommentActions, newsId, token]);

  const commentsCount =
    commentsState.items.length > 0
      ? commentsState.items.length
      : state.status === "ready"
        ? state.item.commentsCount ?? 0
        : 0;
  const viewsCount = state.status === "ready" ? state.item.viewsCount ?? 0 : 0;

  if (!newsId) {
    return <Navigate to="/news" replace />;
  }

  let content: ReactNode;
  if (state.status === "loading") {
    content = <LoadingView />;
  } else if (state.status === "error") {
    content = <ErrorView message={state.message} onRetry={() => void load()} />;
  } else {
    content = (
      <div className="max-w-[540px] flex flex-col gap-3 items-center text-[14px] p-3 sm:gap-4 sm:p-0 w-full">
        <div className="flex items-center justify-between w-full bg-[#131313] border-b border-[#1D1D1D] text-[#dbdbdb] sticky top-0 sm:hidden">
          <Link to="/news" className="flex items-center gap-1 px-[16px] py-[14px]">
            <img src="/design/img/back.png" alt={STR.back} />
          </Link>
          <div className="flex justify-center font-semibold">{STR.title}</div>
          <button
            type="button"
            className="flex items-center gap-1 px-[16px] py-[14px]"
            onClick={() => setNavbarSheetOpen(true)}
          >
            <img src="/design/img/more.png" alt={STR.actions} />
          </button>
        </div>

        <div className="hidden sm:flex items-center pt-1 justify-between w-full text-[#dbdbdb] sticky top-0 bg-black z-50">
          <Link to="/news" className="flex items-center gap-1 pr-4 py-3">
            <img className="w-[26px]" src="/design/img/back.png" alt={STR.back} />
          </Link>
          <div className="flex justify-center font-semibold text-[16px] gap-2">
            <p>{STR.title}</p>
          </div>
          <button
            type="button"
            className="flex items-center gap-1 px-[16px] py-[14px]"
            onClick={() => setNavbarSheetOpen(true)}
          >
            <img src="/design/img/more.png" alt={STR.actions} />
          </button>
        </div>



        <BodyCard item={state.item} />
        <CommentsSection
          state={commentsState}
          onReload={() => {
            void loadComments();
          }}
          canComment={canComment}
          commentsCount={commentsCount}
          viewsCount={viewsCount}
          commentValue={commentValue}
          onCommentChange={handleCommentChange}
          onSubmit={() => {
            void handleSubmitComment();
          }}
          onCancelEdit={handleCancelEdit}
          isEditing={Boolean(editingCommentId)}
          submitting={isSubmitting}
          submitError={submitError}
          successMessage={submitSuccess}
          avatarSrc={commenterAvatar}
          textareaRef={desktopComposerRef}
          onOpenActions={handleOpenCommentActions}
        />
      </div>
    );
  }

  return (
    <>
      <div className="bg-black m-[auto] flex flex-col items-center justify-center gap-1 sm:gap-4 pb-[160px] sm:pb-[70px] sm:flex-row sm:items-start">
        <DesktopSidebar />
        {content}
        
      </div>

      <CommentActionsSheet
        open={isCommentActionsOpen}
        comment={activeComment}
        currentUser={user}
        onClose={handleCloseCommentActions}
        onEdit={handleEditComment}
        onDelete={handleDeleteComment}
        onReport={handleReportComment}
      />

      {state.status !== "error" ? (
        <MobileCommentComposer
          canComment={canComment}
          commentValue={commentValue}
          onCommentChange={handleCommentChange}
          onSubmit={() => {
            void handleSubmitComment();
          }}
          submitting={isSubmitting}
          submitError={submitError}
          successMessage={submitSuccess}
          isEditing={Boolean(editingCommentId)}
          onCancelEdit={handleCancelEdit}
          textareaRef={mobileComposerRef}
          avatarSrc={commenterAvatar}
        />
      ) : null}

      <NavbarActionsSheet
        open={isNavbarSheetOpen}
        onClose={() => setNavbarSheetOpen(false)}
        textClassName="text-[16px]"
      />
    </>
  );
}













