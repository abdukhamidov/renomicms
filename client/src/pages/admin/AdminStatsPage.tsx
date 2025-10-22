import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { NavbarActionsSheet } from "@/components/layout/NavbarActionsSheet";
import { fetchAdminStatistics, type AdminStatistics } from "@/api/admin";
import { useAuth } from "@/contexts/useAuth";

const PAGE_TITLE = "\u0421\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043a\u0430";

type MetricsGroup = {
  title: string;
  icon: string;
  description?: string;
  items: Array<{
    id: string;
    label: string;
    value: string;
    hint?: string | null;
  }>;
};

export function AdminStatsPage() {
  const { user, token, initializing } = useAuth();
  const [isNavbarSheetOpen, setNavbarSheetOpen] = useState(false);
  const [stats, setStats] = useState<AdminStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const numberFormatter = useMemo(() => new Intl.NumberFormat("ru-RU"), []);
  const averageFormatter = useMemo(
    () =>
      new Intl.NumberFormat("ru-RU", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }),
    [],
  );

  const loadStats = useCallback(() => {
    if (!token) {
      return null;
    }

    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    fetchAdminStatistics(token, controller.signal)
      .then((response) => {
        setStats(response.stats);
      })
      .catch((requestError) => {
        if (requestError instanceof DOMException && requestError.name === "AbortError") {
          return;
        }
        if (requestError instanceof Error) {
          setError(requestError.message);
        } else {
          setError("\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u0441\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043a\u0443.");
        }
      })
      .finally(() => {
        setIsLoading(false);
      });

    return controller;
  }, [token]);

  useEffect(() => {
    if (!token) {
      return;
    }
    const controller = loadStats();
    return () => {
      controller?.abort();
    };
  }, [loadStats, token]);

  const groups: MetricsGroup[] = useMemo(() => {
    if (!stats) {
      return [];
    }

    const averageMessages =
      stats.messages.conversations > 0 ? stats.messages.messages / stats.messages.conversations : 0;

    return [
      {
        title: "\u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u0438",
        icon: "/design/img/users-sidebar.png",
        description: "\u041e\u0431\u0449\u0438\u0435 \u0434\u0430\u043d\u043d\u044b\u0435 \u043f\u043e \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044f\u043c \u0438 \u0440\u043e\u043b\u044f\u043c.",
        items: [
          {
            id: "users-total",
            label: "\u0412\u0441\u0435\u0433\u043e \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u0435\u0439",
            value: numberFormatter.format(stats.users.total),
          },
          {
            id: "users-admins",
            label: "\u0410\u043a\u0442\u0438\u0432\u043d\u044b\u0435 \u0430\u0434\u043c\u0438\u043d\u044b",
            value: numberFormatter.format(stats.users.admins),
          },
          {
            id: "profiles-total",
            label: "\u041f\u0440\u043e\u0444\u0438\u043b\u0438",
            value: numberFormatter.format(stats.profiles.total),
          },
        ],
      },
      {
        title: "\u041a\u043e\u043d\u0442\u0435\u043d\u0442",
        icon: "/design/img/blog-sidebar.png",
        description: "\u041c\u0435\u0442\u0440\u0438\u043a\u0438 \u043f\u043e \u043f\u0443\u0431\u043b\u0438\u043a\u0430\u0446\u0438\u044f\u043c \u0438 \u0432\u0437\u0430\u0438\u043c\u043e\u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044e.",
        items: [
          {
            id: "posts-total",
            label: "\u041f\u0443\u0431\u043b\u0438\u043a\u0430\u0446\u0438\u0438",
            value: numberFormatter.format(stats.posts.total),
          },
          {
            id: "followers-relations",
            label: "\u041f\u043e\u0434\u043f\u0438\u0441\u043a\u0438",
            value: numberFormatter.format(stats.followers.relations),
            hint: stats.followers.relations > 0
              ? `${numberFormatter.format(stats.followers.uniqueFollowers)} \u043f\u043e\u0434\u043f\u0438\u0441\u0447\u0438\u043a\u043e\u0432`
              : null,
          },
          {
            id: "notifications-total",
            label: "\u0423\u0432\u0435\u0434\u043e\u043c\u043b\u0435\u043d\u0438\u044f",
            value: numberFormatter.format(stats.notifications.total),
            hint:
              stats.notifications.unread > 0
                ? `${numberFormatter.format(stats.notifications.unread)} \u043d\u0435\u043f\u0440\u043e\u0447\u0438\u0442\u0430\u043d\u043d\u044b\u0445`
                : "\u0412\u0441\u0451 \u043f\u0440\u043e\u0447\u0438\u0442\u0430\u043d\u043e",
          },
        ],
      },
      {
        title: "\u0421\u043e\u043e\u0431\u0449\u0435\u043d\u0438\u044f",
        icon: "/design/img/mail-sidebar.png",
        description: "\u0421\u043e\u0441\u0442\u043e\u044f\u043d\u0438\u0435 \u0447\u0430\u0442\u043e\u0432 \u0438 \u0434\u0438\u0430\u043b\u043e\u0433\u043e\u0432.",
        items: [
          {
            id: "messages-conversations",
            label: "\u0414\u0438\u0430\u043b\u043e\u0433\u0438",
            value: numberFormatter.format(stats.messages.conversations),
          },
          {
            id: "messages-total",
            label: "\u0421\u043e\u043e\u0431\u0449\u0435\u043d\u0438\u044f",
            value: numberFormatter.format(stats.messages.messages),
            hint:
              stats.messages.conversations > 0
                ? `~${averageFormatter.format(averageMessages)} \u043d\u0430 \u0434\u0438\u0430\u043b\u043e\u0433`
                : null,
          },
          {
            id: "messages-participants",
            label: "\u0423\u0447\u0430\u0441\u0442\u043d\u0438\u043a\u0438",
            value: numberFormatter.format(stats.messages.participants),
          },
        ],
      },
    ];
  }, [averageFormatter, numberFormatter, stats]);

  if (initializing) {
    return null;
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  if (user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  const renderGroup = (group: MetricsGroup) => (
    <div
      key={group.title}
      className="flex w-full flex-col rounded-[12px] border border-[#1D1D1D] bg-[#131313] text-[#dbdbdb]"
    >
      <div className="flex items-center justify-between gap-3 border-b border-[#1D1D1D] px-4 py-3">
        <div className="flex items-center gap-2 text-[14px] font-semibold">
          <img src={group.icon} alt="" className="h-[18px] w-[18px]" />
          <span>{group.title}</span>
        </div>
        {group.description ? (
          <span className="text-[12px] text-[#777777]">{group.description}</span>
        ) : null}
      </div>
      <div className="grid w-full grid-cols-1 gap-3 p-4 sm:grid-cols-2">
        {group.items.map((item) => (
          <div
            key={item.id}
            className="flex flex-col gap-1 rounded-[10px] border border-[#1D1D1D] bg-[#0B0B0B] px-4 py-3"
          >
            <span className="text-[12px] text-[#8C8C8C]">{item.label}</span>
            <span className="text-[20px] font-semibold text-white">{item.value}</span>
            {item.hint ? <span className="text-[12px] text-[#777777]">{item.hint}</span> : null}
          </div>
        ))}
      </div>
    </div>
  );

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

          {stats ? (
            <div className="flex w-full flex-col gap-3">
              <div className="flex flex-col gap-2 rounded-[12px] border border-[#1D1D1D] bg-[#131313] px-4 py-3 text-[12px] text-[#8C8C8C] sm:flex-row sm:items-center sm:justify-between">
                <span>
                  \u0414\u0430\u043d\u043d\u044b\u0435 \u0438\u0437{" "}
                  <span className="text-white font-semibold">
                    {stats.source === "database" ? "\u0431\u0430\u0437\u044b \u0434\u0430\u043d\u043d\u044b\u0445" : "\u0444\u0430\u0439\u043b\u043e\u0432\u043e\u0433\u043e \u0445\u0440\u0430\u043d\u0438\u043b\u0438\u0449\u0430"}
                  </span>
                </span>
                <span>
                  \u041e\u0431\u043d\u043e\u0432\u043b\u0435\u043d\u043e:{" "}
                  <span className="text-white">
                    {new Date(stats.generatedAt).toLocaleString("ru-RU")}
                  </span>
                </span>
              </div>
              {groups.map(renderGroup)}
            </div>
          ) : null}

          {isLoading ? (
            <div className="flex w-full items-center justify-center py-10">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#dbdbdb] border-t-transparent" />
            </div>
          ) : null}

          {error ? (
            <div className="flex w-full flex-col gap-2 rounded-[12px] border border-[#402626] bg-[#2A1414] px-4 py-3 text-[14px] text-[#f5caca]">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => {
                  const controller = loadStats();
                  if (!controller) {
                    setError("\u0422\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044f \u0430\u0432\u0442\u043e\u0440\u0438\u0437\u0430\u0446\u0438\u044f.");
                  }
                }}
                className="self-start rounded-[8px] border border-[#f5caca] px-3 py-1 text-[12px] font-semibold text-[#2A1414] bg-[#f5caca] hover:bg-[#f1b6b6]"
              >
                \u041f\u043e\u0432\u0442\u043e\u0440\u0438\u0442\u044c
              </button>
            </div>
          ) : null}
        </div>

        <MobileBottomNav activeHref="/admin" />
      </div>

      <NavbarActionsSheet open={isNavbarSheetOpen} onClose={() => setNavbarSheetOpen(false)} textClassName="text-[16px]" />
    </>
  );
}
