import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { NavbarActionsSheet } from "@/components/layout/NavbarActionsSheet";
import { useAuth } from "@/contexts/useAuth";
import { fetchAdminReportsArchive, type AdminReport } from "@/api/admin";

const PAGE_TITLE = "Архив жалоб";

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

export function AdminComplaintsArchivePage() {
  const { user, token, initializing } = useAuth();
  const [isNavbarSheetOpen, setNavbarSheetOpen] = useState(false);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    fetchAdminReportsArchive(token, controller.signal)
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
          setError("Не удалось загрузить архив жалоб.");
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

  const sortedReports = useMemo(
    () =>
      reports
        .slice()
        .sort((a, b) => (b.archivedAt ?? b.resolvedAt ?? "").localeCompare(a.archivedAt ?? a.resolvedAt ?? "")),
    [reports],
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
            <Link to="/admin/complaints" className="flex items-center gap-1 px-[16px] py-[14px]">
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
            <Link to="/admin/complaints" className="flex items-center gap-1 pr-4 py-3">
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
                  Здесь хранятся закрытые жалобы. Используйте архив для анализа и отчётности.
                </p>
              </div>
              <div className="flex items-center gap-2 text-[12px] text-[#8C8C8C]">
                <span className="rounded-[10px] border border-[#1D1D1D] bg-[#0B0B0B] px-3 py-1">
                  Всего: {sortedReports.length}
                </span>
              </div>
            </div>

            {error ? (
              <div className="rounded-[10px] border border-[#402626] bg-[#2A1414] p-3 text-[#f5caca]">
                <p className="text-[13px] font-semibold">Не удалось загрузить архив жалоб.</p>
                <p className="text-[12px] text-[#f7dede]">{error}</p>
              </div>
            ) : null}

            {isLoading ? <ReportsSkeleton /> : null}

            {!isLoading && sortedReports.length === 0 && !error ? (
              <div className="flex flex-col items-center gap-2 rounded-[12px] border border-dashed border-[#1D1D1D] bg-[#101010] p-6 text-center text-[#8C8C8C]">
                <img src="/design/img/archive.png" alt="" className="h-[40px] w-[40px] opacity-80" />
                <p className="text-[15px] font-semibold text-white">Архив пуст</p>
                <p className="text-[12px]">Закрытые жалобы появятся здесь автоматически.</p>
              </div>
            ) : null}

            {!isLoading && sortedReports.length > 0 ? (
              <div className="flex flex-col gap-3">
                {sortedReports.map((report, index) => {
                  const resolvedByLabel =
                    report.resolvedBy.displayName ??
                    report.resolvedBy.username ??
                    report.resolvedBy.id ??
                    "администратор";

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
                            ID {index + 1}
                          </span>
                          <span className="rounded-[10px] border border-[#2c6f3a] bg-[#102514] px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#8de6a1]">
                            Закрыта
                          </span>
                        </div>
                        <span>{formatDate(report.archivedAt ?? report.resolvedAt)}</span>
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
                      <div className="flex flex-col gap-2 rounded-[10px] border border-[#1D1D1D] bg-[#111111] px-3 py-2 text-[12px] text-[#bdbdbd]">
                        <span>
                          Закрыта {formatDate(report.resolvedAt)} — {resolvedByLabel}
                        </span>
                        {report.resolutionNote ? (
                          <span className="text-[#e8e8e8]">Комментарий: {report.resolutionNote}</span>
                        ) : null}
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
