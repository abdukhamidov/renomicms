import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { NavbarActionsSheet } from "@/components/layout/NavbarActionsSheet";
import { useAuth } from "@/contexts/useAuth";
import { fetchAdminReports, resolveAdminReport, type AdminReport } from "@/api/admin";

const PAGE_TITLE = "Жалобы";

type ReportFilter = "all" | "news";

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "неизвестно";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "неизвестно";
  }
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getCommentExcerpt(value: string, limit = 280) {
  if (!value) {
    return "Комментарий пустой.";
  }
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (trimmed.length <= limit) {
    return trimmed;
  }
  return `${trimmed.slice(0, Math.max(0, limit - 1)).trim()}…`;
}

function ReportsSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="rounded-[12px] border border-[#1D1D1D] bg-[#131313] p-4 animate-pulse flex flex-col gap-3"
        >
          <div className="h-4 w-1/3 rounded bg-[#1F1F1F]" />
          <div className="h-3 w-2/3 rounded bg-[#1F1F1F]" />
          <div className="h-16 w-full rounded bg-[#1F1F1F]" />
        </div>
      ))}
    </div>
  );
}

export function AdminComplaintsPage() {
  const { user, token, initializing } = useAuth();
  const [isNavbarSheetOpen, setNavbarSheetOpen] = useState(false);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ReportFilter>("all");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);
    setError(null);
    setActionError(null);
    setActionSuccess(null);

    fetchAdminReports(token, controller.signal)
      .then((response) => {
        setReports(response.reports);
      })
      .catch((requestError) => {
        if (controller.signal.aborted) {
          return;
        }
        if (requestError instanceof Error) {
          setError(requestError.message);
        } else {
          setError("Не удалось загрузить жалобы.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [token]);

  const openReports = useMemo(
    () => reports.filter((report) => report.status !== "resolved"),
    [reports],
  );

  const filteredReports = useMemo(() => {
    if (filter === "news") {
      return openReports.filter((report) => report.meta.source === "news");
    }
    return openReports;
  }, [filter, openReports]);

  const handleResolve = useCallback(
    async (report: AdminReport, displayNumber: number | null) => {
      if (!token) {
        return;
      }

      const label = displayNumber ? `№${displayNumber}` : `ID ${report.id}`;
      const confirmed = window.confirm(`Отметить жалобу ${label} как обработанную?`);
      if (!confirmed) {
        return;
      }

      const noteInput = window.prompt("Добавьте комментарий (опционально).", "");
      const note = typeof noteInput === "string" ? noteInput.trim() : "";

      setResolvingId(report.id);
      setActionError(null);
      setActionSuccess(null);

      try {
        const response = await resolveAdminReport(
          report.id,
          note.length > 0 ? { note } : undefined,
          token,
        );
        setReports((prev) => prev.map((item) => (item.id === report.id ? response.report : item)));
        setActionSuccess(`Жалоба ${label} закрыта и перенесена в архив.`);
      } catch (requestError) {
        if (requestError instanceof Error) {
          setActionError(requestError.message);
        } else {
          setActionError("Не удалось закрыть жалобу. Попробуйте ещё раз.");
        }
      } finally {
        setResolvingId(null);
      }
    },
    [token],
  );

  if (initializing) {
    return null;
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  if (user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      <div className="bg-black m-[auto] flex flex-col items-center justify-center gap-1 sm:gap-4 pb-[70px] sm:pb-[70px] sm:flex-row sm:items-start">
        <DesktopSidebar />

        <div className="max-w-[540px] w-full flex flex-col gap-3 items-center text-[14px] p-3 sm:gap-4 sm:p-0">
          <div className="flex items-center justify-between w-full bg-[#131313] border-b border-[#1D1D1D] text-[#dbdbdb] sticky top-0 sm:hidden">
            <Link to="/admin" className="flex items-center gap-1 px-[16px] py-[14px]">
              <img src="/design/img/back.png" alt="" />
            </Link>
            <div className="flex justify-center font-semibold">{PAGE_TITLE}</div>
            <button
              type="button"
              className="flex items-center gap-1 px-[16px] py-[14px]"
              data-bottom-sheet-open="true"
              data-bottom-sheet-target="navbar-actions"
              onClick={() => setNavbarSheetOpen(true)}
            >
              <img src="/design/img/more.png" alt="" />
            </button>
          </div>

          <div className="hidden sm:flex items-center pt-1 justify-between w-full text-[#dbdbdb] sticky top-0 bg-black z-50">
            <Link to="/admin" className="flex items-center gap-1 pr-4 py-3">
              <img className="w-[26px]" src="/design/img/back.png" alt="" />
            </Link>
            <div className="flex justify-center font-semibold text-[16px] gap-2">
              <p>{PAGE_TITLE}</p>
            </div>
            <button
              type="button"
              className="flex items-center gap-1 px-[16px] py-[14px]"
              data-bottom-sheet-open="true"
              data-bottom-sheet-target="navbar-actions"
              onClick={() => setNavbarSheetOpen(true)}
            >
              <img src="/design/img/more.png" alt="" />
            </button>
          </div>

          <div className="flex w-full flex-col gap-3 rounded-[12px] border border-[#1D1D1D] bg-[#131313] p-4 text-[#e1e1e1]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-col gap-1">
                <h1 className="text-[18px] font-semibold text-white">{PAGE_TITLE}</h1>
                <p className="text-[12px] text-[#8C8C8C]">
                  Жалобы закрываются по мере обработки. Пока доступен раздел для комментариев к новостям.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className={`rounded-[10px] border px-3 py-1.5 text-[12px] ${
                    filter === "all"
                      ? "border-[#2F94F9] bg-[#2F94F9] text-black"
                      : "border-[#1D1D1D] text-[#dbdbdb] hover:border-[#2F94F9] hover:text-white"
                  }`}
                  onClick={() => setFilter("all")}
                >
                  Все ({openReports.length})
                </button>
                <button
                  type="button"
                  className={`rounded-[10px] border px-3 py-1.5 text-[12px] ${
                    filter === "news"
                      ? "border-[#2F94F9] bg-[#2F94F9] text-black"
                      : "border-[#1D1D1D] text-[#dbdbdb] hover:border-[#2F94F9] hover:text-white"
                  }`}
                  onClick={() => setFilter("news")}
                >
                  Новости ({openReports.filter((report) => report.meta.source === "news").length})
                </button>
                <Link
                  to="/admin/complaints/archive"
                  className="rounded-[10px] border border-[#1D1D1D] px-3 py-1.5 text-[12px] text-[#dbdbdb] hover:border-[#2F94F9] hover:text-white"
                >
                  Архив
                </Link>
              </div>
            </div>

            {actionSuccess ? (
              <div className="rounded-[10px] border border-[#2c6f3a] bg-[#122112] p-3 text-[12px] text-[#b7f2c1]">
                {actionSuccess}
              </div>
            ) : null}
            {actionError ? (
              <div className="rounded-[10px] border border-[#402626] bg-[#2A1414] p-3 text-[12px] text-[#f5caca]">
                {actionError}
              </div>
            ) : null}
            {error ? (
              <div className="rounded-[10px] border border-[#402626] bg-[#2A1414] p-3 text-[#f5caca]">
                <p className="text-[13px] font-semibold">Не удалось загрузить жалобы.</p>
                <p className="text-[12px] text-[#f7dede]">{error}</p>
              </div>
            ) : null}

            {isLoading ? <ReportsSkeleton /> : null}

            {!isLoading && filteredReports.length === 0 && !error ? (
              <div className="flex flex-col items-center gap-2 rounded-[12px] border border-dashed border-[#1D1D1D] bg-[#101010] p-6 text-center text-[#8C8C8C]">
                <img src="/design/img/check.png" alt="" className="h-[40px] w-[40px] opacity-80" />
                <p className="text-[15px] font-semibold text-white">Жалоб нет</p>
                <p className="text-[12px]">Как только появятся новые жалобы, мы покажем их здесь.</p>
              </div>
            ) : null}

            {!isLoading && filteredReports.length > 0 ? (
              <div className="flex flex-col gap-3">
                {filteredReports.map((report, index) => {
                  const listIndex = openReports.findIndex((item) => item.id === report.id);
                  const displayNumber = listIndex >= 0 ? listIndex + 1 : index + 1;

                  return (
                    <article
                      key={report.id}
                      className="rounded-[12px] border border-[#1D1D1D] bg-[#151515] p-4 text-[#dbdbdb] flex flex-col gap-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3 text-[12px] text-[#8C8C8C]">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="flex items-center gap-2 rounded-[10px] border border-[#2F94F9] bg-[#1A1A1A] px-3 py-1 text-[#93c8ff]">
                            <img src="/design/img/notification-red.png" alt="" className="h-[16px] w-[16px]" />
                            Комментарий к новости
                          </span>
                          <span className="rounded-[10px] border border-[#1D1D1D] bg-[#0B0B0B] px-3 py-1 text-[11px] font-semibold text-[#dcdcdc]">
                            ID {displayNumber}
                          </span>
                          <span className="rounded-[10px] border border-[#5a1f1f] bg-[#251112] px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#f5caca]">
                            Открыта
                          </span>
                        </div>
                        <span>{formatDate(report.createdAt)}</span>
                      </div>
                      <div className="flex flex-col gap-1 text-[13px] text-[#bcbcbc]">
                        <span className="text-[12px] uppercase text-[#8C8C8C] tracking-wide">Новость</span>
                        <Link
                          to={report.target.newsId ? `/news/${encodeURIComponent(report.target.newsId)}` : "/news"}
                          className="text-[15px] font-semibold text-white hover:text-[#2F94F9]"
                        >
                          {report.target.newsTitle ?? "Не найдено"}
                        </Link>
                        <span className="text-[12px] text-[#777777]">
                          ID комментария: {report.target.commentId ?? "нет"} |{" "}
                          {report.target.commentAuthorId ? `Автор: ${report.target.commentAuthorId}` : "Автор неизвестен"}
                        </span>
                      </div>
                      <div className="rounded-[10px] border border-[#1E1E1E] bg-[#0F0F0F] p-3 text-[13px] leading-relaxed text-[#dcdcdc]">
                        {getCommentExcerpt(report.target.commentContent)}
                      </div>
                      {report.reason ? (
                        <div className="rounded-[10px] border border-[#2A1414] bg-[#1c0f0f] px-3 py-2 text-[12px] text-[#f5caca]">
                          <span className="font-semibold text-[#f8dada]">Причина: </span>
                          {report.reason}
                        </div>
                      ) : null}
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-[#8C8C8C]">
                        <div className="flex items-center gap-2">
                          <span className="rounded-[8px] border border-[#1D1D1D] bg-[#0B0B0B] px-2 py-1 text-[#bdbdbd]">
                            Развиваем ленту
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <span>
                            От{" "}
                            {report.reporter.displayName ??
                              report.reporter.username ??
                              report.reporter.id ??
                              "аноним"}
                          </span>
                          {report.reporter.username ? (
                            <span className="text-[#2F94F9]">@{report.reporter.username}</span>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            void handleResolve(report, displayNumber);
                          }}
                          disabled={resolvingId === report.id}
                          className="rounded-[10px] border border-[#2F94F9] bg-[#2F94F9] px-3 py-1.5 text-[12px] font-semibold text-black hover:bg-[#257acc] disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {resolvingId === report.id ? "Закрываем…" : "Закрыть жалобу"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>

        <MobileBottomNav activeHref="/admin" />
      </div>

      <NavbarActionsSheet open={isNavbarSheetOpen} onClose={() => setNavbarSheetOpen(false)} textClassName="text-[16px]" />
    </>
  );
}
