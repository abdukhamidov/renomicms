import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { NavbarActionsSheet } from "@/components/layout/NavbarActionsSheet";
import { fetchForumSection, type ForumSectionResponse, type ForumTopicSummary } from "@/api/forum";
import { useAuth } from "@/contexts/useAuth";

const DEFAULT_TOPIC_ICON = "/design/img/topic-gray.png";

function formatNumber(value: number) {
  return new Intl.NumberFormat("ru-RU").format(value);
}

function formatReplies(value: number) {
  if (value === 0) {
    return "нет ответов";
  }
  if (value === 1) {
    return "1 ответ";
  }
  if (value >= 2 && value <= 4) {
    return `${value} ответа`;
  }
  return `${value} ответов`;
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

type SectionState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: ForumSectionResponse };

function TopicRow({ topic }: { topic: ForumTopicSummary }) {
  return (
    <Link
      to={`/forum/topics/${encodeURIComponent(topic.id)}`}
      className="flex items-center pl-4 hover:bg-[#161616]"
    >
      <div className="flex items-center justify-center p-[6px]">
        <img className="w-[18px] h-[18px]" src={topic.isPinned ? "/design/img/pin.png" : DEFAULT_TOPIC_ICON} alt="" />
      </div>
      <div className="flex flex-col w-full ml-[10px] py-[6px] pr-4 border-b border-[#1c1c1c] text-[#e1e1e1] hover:text-[#fff]">
        <span className="flex items-center gap-2">
          {topic.title}
          {topic.isLocked ? (
            <img src="/design/img/lock.png" alt="" className="w-[14px] h-[14px]" />
          ) : null}
        </span>
        <span className="flex flex-wrap items-center gap-2 text-[12px] text-[#8C8C8C] mt-[4px]">
          <span>{topic.author.displayName}</span>
          <span>•</span>
          <span>{formatReplies(topic.repliesCount)}</span>
          <span>•</span>
          <span>Последний ответ: {formatDateTime(topic.lastPostAt)} от {topic.lastPostAuthor.displayName}</span>
        </span>
      </div>
    </Link>
  );
}

export function ForumSectionPage() {
  const [isNavbarSheetOpen, setIsNavbarSheetOpen] = useState(false);
  const { sectionId } = useParams<{ sectionId: string }>();
  const { token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentPage = useMemo(() => {
    const raw = searchParams.get("page");
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.floor(parsed);
    }
    return 1;
  }, [searchParams]);

  const [state, setState] = useState<SectionState>({ status: "loading" });

  useEffect(() => {
    if (!sectionId) {
      setState({ status: "error", message: "Раздел не найден." });
      return;
    }

    let cancelled = false;

    const load = async () => {
      setState({ status: "loading" });
      try {
        const data = await fetchForumSection(sectionId, token ?? null, { page: currentPage });
        if (!cancelled) {
          setState({ status: "ready", data });
        }
      } catch (err) {
        if (!cancelled) {
          setState({
            status: "error",
            message: err instanceof Error ? err.message : "Не удалось загрузить тему.",
          });
        }
      }
    };

    load().catch(() => {
      if (!cancelled) {
        setState({ status: "error", message: "Не удалось загрузить раздел." });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [sectionId, token, currentPage]);

  const data = state.status === "ready" ? state.data : null;
  const section = data?.section ?? null;
  const pinnedTopics = data?.pinnedTopics ?? [];
  const topics = data?.topics ?? [];
  const pagination = data?.pagination ?? null;
  const permissions = data?.permissions ?? null;

  const handlePageChange = (page: number) => {
    if (!pagination) {
      return;
    }
    if (page < 1 || page > pagination.totalPages) {
      return;
    }
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("page", String(page));
      return next;
    });
  };

  const canCreateTopic = permissions?.canCreateTopic ?? false;

  return (
    <div className="bg-black m-[auto] flex flex-col items-center justify-center gap-1 sm:gap-4 pb-[70px] sm:pb-[70px] sm:flex-row sm:items-start text-[#dbdbdb]">
      <DesktopSidebar />

      <div className="flex items-center justify-between z-50 w-full bg-[#131313] border-b border-[#1D1D1D] text-[#dbdbdb] sticky top-0 sm:hidden">
        <Link to="/forum" className="flex items-center gap-1 px-[16px] py-[14px]">
          <img src="/design/img/back.png" alt="Назад" />
        </Link>
        <div className="flex justify-center font-semibold">Раздел</div>
        <button
          type="button"
          className="flex items-center gap-1 px-[16px] py-[14px]"
          data-bottom-sheet-open="true"
          data-bottom-sheet-target="navbar-actions"
          onClick={() => setIsNavbarSheetOpen(true)}
        >
          <img src="/design/img/more.png" alt="Меню" />
        </button>
      </div>

      <div className="w-full max-w-[540px] flex flex-col gap-3 items-center text-[14px] p-3 sm:gap-4 sm:p-0">
        <div className="hidden sm:flex items-center pt-1 justify-between w-full text-[#dbdbdb] sticky top-0 bg-black z-50">
          <Link to="/forum" className="flex items-center gap-1 pr-4 py-3">
            <img className="w-[26px]" src="/design/img/back.png" alt="Назад" />
          </Link>
          <div className="flex justify-center font-semibold text-[16px] gap-2">
            <p>Форум</p>
            <p className="text-[#414141] font-bold">/</p>
            <p>{section?.category?.title ?? "Раздел"}</p>
            <p className="text-[#414141] font-bold">/</p>
            <p>{section?.title ?? "..."}</p>
          </div>
          <button
            type="button"
            className="flex items-center gap-1 pl-4 py-3"
            data-bottom-sheet-open="true"
            data-bottom-sheet-target="navbar-actions"
            onClick={() => setIsNavbarSheetOpen(true)}
          >
            <img className="w-[26px]" src="/design/img/more.png" alt="Меню" />
          </button>
        </div>

        {state.status === "loading" ? (
          <div className="flex flex-col w-full bg-[#131313] border border-[#1D1D1D] rounded-[12px] p-6 text-center text-[#a3a3a3]">
            Загружаем темы...
          </div>
        ) : null}

        {state.status === "error" ? (
          <div className="flex flex-col w-full bg-[#1b0f0f] border border-[#401919] rounded-[12px] p-4 text-[#f5c1c1]">
            {state.message}
          </div>
        ) : null}

        {data ? (
          <>
            <div className="flex flex-col bg-[#131313] border border-[#1D1D1D] text-white p-[16px] rounded-[12px] w-full gap-3">
              <div>
                <p className="text-[16px] font-semibold">{section?.title}</p>
                <p className="text-[13px] text-[#9b9b9b] mt-[4px]">{section?.description}</p>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {canCreateTopic ? (
                  <Link
                    to={`/forum/sections/${encodeURIComponent(sectionId ?? "")}/create`}
                    className="flex items-center justify-center py-[10px] px-[14px] bg-[#66e48b] border border-[#1D1D1D] text-[#0a130d] font-bold text-[14px] gap-1 rounded-[12px]"
                  >
                    <img src="/design/img/add.png" alt="" />
                    <p className="mb-[-1px]">Создать тему</p>
                  </Link>
                ) : (
                  <div className="flex items-center gap-2 text-[#f0948b]">
                    <img src="/design/img/lock.png" alt="" className="w-[16px]" />
                    Раздел закрыт для создания тем
                  </div>
                )}
                <div className="flex items-center gap-2 text-[#9d9d9d] text-[12px]">
                  <span>Тем: {formatNumber((pinnedTopics.length ?? 0) + topics.length)}</span>
                  <span>•</span>
                  <span>Страница: {pagination?.page ?? 1} из {pagination?.totalPages ?? 1}</span>
                </div>
              </div>
            </div>

            {pinnedTopics.length ? (
              <div className="flex flex-col w-full bg-[#131313] border border-[#1D1D1D] text-[#e1e1e1] rounded-[12px] overflow-hidden">
                <div className="flex items-center justify-between bg-[#101010] border-b border-[#1D1D1D] gap-2 py-[10px] px-[16px] text-[13px] uppercase tracking-wide text-[#f0c674]">
                  Закреплённые темы
                </div>
                {pinnedTopics.map((topic, index) => (
                  <div
                    key={topic.id}
                    className={[
                      index === pinnedTopics.length - 1 ? "" : "border-b border-[#1c1c1c]",
                      "flex flex-col",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <TopicRow topic={topic} />
                  </div>
                ))}
              </div>
            ) : null}

            <div className="flex flex-col w-full bg-[#131313] border border-[#1D1D1D] text-[#e1e1e1] rounded-[12px] overflow-hidden">
              {topics.length ? (
                topics.map((topic, index) => (
                  <div
                    key={topic.id}
                    className={[
                      index === topics.length - 1 ? "" : "border-b border-[#1c1c1c]",
                      "flex flex-col",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <TopicRow topic={topic} />
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-[#9d9d9d]">
                  Тем пока нет. Будьте первым, кто начнёт обсуждение!
                </div>
              )}
            </div>

            {topics.length && pagination ? (
              <div className="flex items-center justify-between w-full gap-2">
                <button
                  type="button"
                  disabled={pagination.page <= 1}
                  className={[
                    "flex-1 py-[10px] rounded-[10px] border border-[#1D1D1D] text-[#e1e1e1]",
                    pagination.page > 1 ? "hover:bg-[#161616]" : "opacity-50 cursor-not-allowed",
                  ].join(" ")}
                  onClick={() => handlePageChange(pagination.page - 1)}
                >
                  Назад
                </button>
                <button
                  type="button"
                  disabled={pagination.page >= pagination.totalPages}
                  className={[
                    "flex-1 py-[10px] rounded-[10px] border border-[#1D1D1D] text-[#e1e1e1]",
                    pagination.page < pagination.totalPages ? "hover:bg-[#161616]" : "opacity-50 cursor-not-allowed",
                  ].join(" ")}
                  onClick={() => handlePageChange(pagination.page + 1)}
                >
                  Вперёд
                </button>
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      <MobileBottomNav activeHref="/forum" />
      <NavbarActionsSheet open={isNavbarSheetOpen} onClose={() => setIsNavbarSheetOpen(false)} />
    </div>
  );
}
