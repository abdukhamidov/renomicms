import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { NEWS_CACHE_EVENT, type NewsCacheUpdateDetail } from "@/constants/news";
import { fetchNewsList, type NewsItem } from "@/api/news";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { NavbarActionsSheet } from "@/components/layout/NavbarActionsSheet";

type NewsState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; items: NewsItem[] };

const DEFAULT_ICON = "/design/img/news.png";
const NEWS_CACHE_TTL = 60_000;
const NEWS_CACHE_STORAGE_KEY = "nomi.news.cache";

type NewsCacheRecord = {
  items: NewsItem[];
  timestamp: number;
};

let newsCache: NewsCacheRecord | null = null;
let newsCacheListenerInitialized = false;

function initializeNewsCacheListener() {
  if (newsCacheListenerInitialized || typeof window === "undefined") {
    return;
  }

  window.addEventListener(NEWS_CACHE_EVENT, (event) => {
    const detail = (event as CustomEvent<NewsCacheUpdateDetail>).detail;
    if (!detail || !detail.newsId) {
      return;
    }

    if (!newsCache) {
      readCachedNews();
    }
    if (!newsCache) {
      return;
    }

    const index = newsCache.items.findIndex((item) => item.id === detail.newsId);
    if (index === -1) {
      return;
    }

    const current = newsCache.items[index];
    const currentCount = typeof current.commentsCount === "number" ? current.commentsCount : 0;
    const absolute =
      typeof detail.commentsCount === "number" ? Math.max(0, detail.commentsCount) : null;
    const delta =
      absolute === null && typeof detail.commentsDelta === "number" ? detail.commentsDelta : 0;
    const nextCommentsCount =
      absolute !== null ? absolute : Math.max(0, currentCount + delta);

    const nextItems = [...newsCache.items];
    nextItems[index] = {
      ...current,
      commentsCount: nextCommentsCount,
    };

    writeCachedNews(nextItems);
  });

  newsCacheListenerInitialized = true;
}

initializeNewsCacheListener();

function readCachedNews() {
  if (!newsCache) {
    if (typeof window === "undefined") {
      return null;
    }
    try {
      const raw = window.localStorage.getItem(NEWS_CACHE_STORAGE_KEY);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw) as NewsCacheRecord | null;
      if (!parsed || !Array.isArray(parsed.items) || typeof parsed.timestamp !== "number") {
        return null;
      }
      newsCache = parsed;
    } catch (error) {
      console.warn("[NewsPage] Failed to read cached news", error);
      return null;
    }
  }
  const isExpired = Date.now() - newsCache.timestamp > NEWS_CACHE_TTL;
  if (isExpired) {
    newsCache = null;
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(NEWS_CACHE_STORAGE_KEY);
    }
    return null;
  }
  return newsCache.items;
}

function writeCachedNews(items: NewsItem[]) {
  const record: NewsCacheRecord = {
    items,
    timestamp: Date.now(),
  };
  newsCache = record;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(NEWS_CACHE_STORAGE_KEY, JSON.stringify(record));
    } catch (error) {
      console.warn("[NewsPage] Failed to cache news", error);
    }
  }
}

function getInitialNewsState(): NewsState {
  const cachedItems = readCachedNews();
  if (cachedItems) {
    return { status: "ready", items: cachedItems };
  }
  return { status: "loading" };
}

const STR = {
  title: "\u041d\u043e\u0432\u043e\u0441\u0442\u0438",
  back: "\u041d\u0430\u0437\u0430\u0434",
  actions: "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u044f",
  dateUnknown: "\u0414\u0430\u0442\u0430 \u043d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d\u0430",
  today: "\u0421\u0435\u0433\u043e\u0434\u043d\u044f \u0432 ",
  yesterday: "\u0412\u0447\u0435\u0440\u0430 \u0432 ",
  loadError: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u043d\u043e\u0432\u043e\u0441\u0442\u0438.",
  tryAgain: "\u041f\u043e\u043f\u0440\u043e\u0431\u043e\u0432\u0430\u0442\u044c \u0441\u043d\u043e\u0432\u0430",
  noNewsTitle: "\u041f\u043e\u043a\u0430 \u043d\u0435\u0442 \u043d\u043e\u0432\u043e\u0441\u0442\u0435\u0439",
  noNewsText:
    "\u041a\u0430\u043a \u0442\u043e\u043b\u044c\u043a\u043e \u043a\u043e\u043c\u0430\u043d\u0434\u0430 \u043f\u043e\u0434\u0435\u043b\u0438\u0442\u0441\u044f \u0441\u0432\u0435\u0436\u0438\u043c\u0438 \u0441\u043e\u0431\u044b\u0442\u0438\u044f\u043c\u0438, \u043e\u043d\u0438 \u043f\u043e\u044f\u0432\u044f\u0442\u0441\u044f \u0432 \u044d\u0442\u043e\u0439 \u043b\u0435\u043d\u0442\u0435.",
};

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function summarize(item: NewsItem, limit = 220) {
  const source = (item.excerpt ?? "").trim() || stripHtml(item.content ?? "");
  if (!source) {
    return "";
  }
  if (source.length <= limit) {
    return source;
  }
  return `${source.slice(0, Math.max(0, limit - 1)).trim()}\u2026`;
}

function resolvePublishedAt(item: NewsItem) {
  return item.publishedAt ?? item.updatedAt ?? item.createdAt ?? null;
}

function formatTimestamp(value: string | null | undefined) {
  if (!value) {
    return STR.dateUnknown;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return STR.dateUnknown;
  }

  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const time = new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

  if (sameDay) {
    return `${STR.today}${time}`;
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return `${STR.yesterday}${time}`;
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function NewsSkeleton() {
  return (
    <div className="flex w-full max-w-[540px] flex-col gap-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="flex flex-col gap-2 rounded-[12px] border border-[#1D1D1D] bg-[#131313] p-[16px] animate-pulse"
        >
          <div className="flex items-center gap-2">
            <div className="h-[32px] w-[32px] rounded-[8px] bg-[#171717]" />
            <div className="h-[18px] w-2/3 rounded bg-[#171717]" />
          </div>
          <div className="h-[46px] w-full rounded bg-[#171717]" />
          <div className="flex items-center gap-2">
            <div className="h-[20px] w-[80px] rounded bg-[#171717]" />
            <div className="h-[20px] w-[80px] rounded bg-[#171717]" />
            <div className="ml-auto h-[16px] w-[110px] rounded bg-[#171717]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex w-full max-w-[540px] flex-col items-center gap-4 rounded-[12px] border border-dashed border-[#1D1D1D] bg-[#131313] p-8 text-center">
      <img src={DEFAULT_ICON} alt="" className="h-[48px] w-[48px] opacity-70" />
      <div className="flex flex-col gap-2 text-[#a8a8a8]">
        <p className="text-[18px] font-semibold text-white">{STR.noNewsTitle}</p>
        <p className="text-[14px] text-[#8C8C8C]">{STR.noNewsText}</p>
      </div>
    </div>
  );
}

function NewsCard({ item }: { item: NewsItem }) {
  const summary = summarize(item);
  const publishedAt = resolvePublishedAt(item);
  const commentsCount = item.commentsCount ?? 0;
  const viewsCount = item.viewsCount ?? 0;

  return (
    <Link
      to={`/news/${encodeURIComponent(item.id)}`}
      state={{ item }}
      className="flex flex-col gap-2 rounded-[12px] border border-[#1D1D1D] hover:border-[#333] bg-[#131313] p-[16px] text-white transition"
    >
      <div className="flex items-center gap-2">
        <div className="rounded-[8px] border border-[#1D1D1D] bg-[#0B0B0B] p-[6px]">
          <img src={DEFAULT_ICON} alt="" />
        </div>
        <p className="flex flex-row items-center gap-2 text-[16px] font-semibold">{item.title}</p>
      </div>
      {summary ? <p className="text-[#dbdbdb]">{summary}</p> : null}
      <div className="flex flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-[8px] border border-[#1D1D1D] bg-[#0B0B0B] px-[12px] py-[6px] text-[12px] text-[#dbdbdb]">
            <img src="/design/img/comment-gray.png" alt="" />
            {commentsCount}
          </div>
          <div className="flex items-center gap-1 rounded-[8px] border border-[#1D1D1D] bg-[#0B0B0B] px-[12px] py-[6px] text-[12px] text-[#dbdbdb]">
            <img src="/design/img/eye.png" alt="" />
            {viewsCount}
          </div>
        </div>
        <p className="text-[13px] text-[#8C8C8C]">{formatTimestamp(publishedAt)}</p>
      </div>
    </Link>
  );
}

export function NewsPage() {
  const [state, setState] = useState<NewsState>(() => getInitialNewsState());
  const [isNavbarSheetOpen, setNavbarSheetOpen] = useState(false);
  const mountedRef = useRef(true);

  const loadNews = useCallback(async () => {
    setState((prev) => {
      if (prev.status === "ready") {
        return prev;
      }
      return { status: "loading" };
    });
    try {
      const response = await fetchNewsList({ limit: 20 });
      if (!mountedRef.current) {
        return;
      }
      writeCachedNews(response.news);
      setState({ status: "ready", items: response.news });
    } catch (error) {
      if (!mountedRef.current) {
        return;
      }
      const message = error instanceof Error ? error.message : STR.loadError;
      setState((prev) => {
        if (prev.status === "ready") {
          return prev;
        }
        return { status: "error", message };
      });
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void loadNews();
    return () => {
      mountedRef.current = false;
    };
  }, [loadNews]);

  const handleReload = useCallback(() => {
    void loadNews();
  }, [loadNews]);

  const content = useMemo(() => {
    if (state.status === "loading") {
      return <NewsSkeleton />;
    }

    if (state.status === "error") {
      return (
        <div className="flex w-full max-w-[540px] flex-col gap-3 rounded-[12px] border border-[#402626] bg-[#2A1414] p-6 text-[#f5caca]">
          <p className="text-[16px] font-semibold">{STR.loadError}</p>
          <p className="text-[13px] text-[#f7dede]">{state.message}</p>
          <button
            type="button"
            onClick={handleReload}
            className="self-start rounded-[10px] border border-[#f5caca] bg-[#f5caca] px-4 py-2 text-[13px] font-semibold text-[#2A1414] hover:bg-[#f1bebe]"
          >
            {STR.tryAgain}
          </button>
        </div>
      );
    }

    if (state.items.length === 0) {
      return <EmptyState />;
    }

    return (
      <div className="flex w-full max-w-[540px] flex-col gap-3">
        {state.items.map((item) => (
          <NewsCard key={item.id} item={item} />
        ))}
      </div>
    );
  }, [handleReload, state]);

  return (
    <>
      <div className="bg-black m-[auto] flex flex-col items-center justify-center gap-1 sm:gap-4 pb-[70px] sm:pb-[70px] sm:flex-row sm:items-start">
        <DesktopSidebar />

        <div className="max-w-[540px] flex flex-col gap-3 items-center text-[14px] p-3 sm:gap-4 sm:p-0">
          <div className="flex items-center justify-between w-full bg-[#131313] border-b border-[#1D1D1D] text-[#dbdbdb] sticky top-0 sm:hidden">
            <Link to="/" className="flex items-center gap-1 px-[16px] py-[14px]">
              <img src="/design/img/back.png" alt={STR.back} />
            </Link>
            <div className="flex justify-center font-semibold">{STR.title}</div>
            <button
              type="button"
              className="flex items-center gap-1 px-[16px] py-[14px]"
              data-bottom-sheet-open="true"
              data-bottom-sheet-target="navbar-actions"
              onClick={() => setNavbarSheetOpen(true)}
            >
              <img src="/design/img/more.png" alt={STR.actions} />
            </button>
          </div>

          <div className="hidden sm:flex items-center pt-1 justify-between w-full text-[#dbdbdb] sticky top-0 bg-black z-50">
            <Link to="/" className="flex items-center gap-1 pr-4 py-3">
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

          {content}
        </div>

        <MobileBottomNav activeHref="/news" />
      </div>

      <NavbarActionsSheet
        open={isNavbarSheetOpen}
        onClose={() => setNavbarSheetOpen(false)}
        textClassName="text-[16px]"
      />
    </>
  );
}
