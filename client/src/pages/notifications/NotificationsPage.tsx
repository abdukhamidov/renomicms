import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { NavbarActionsSheet } from "@/components/layout/NavbarActionsSheet";
import {
  fetchNotifications,
  markNotificationsAsRead,
  type ProfileNotification,
} from "@/api/profile";
import { useAuth } from "@/contexts/useAuth";

const DEFAULT_ICON = "/design/img/default-avatar.png";

function formatDate(dateString: string) {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("ru-RU", {
      dateStyle: "long",
      timeStyle: "short",
    }).format(date);
  } catch {
    return dateString;
  }
}

function formatRelative(dateString: string) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.max(0, Math.floor(diffMs / 60000));

  if (minutes < 1) {
    return "только что";
  }
  if (minutes < 60) {
    return `${minutes} мин назад`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} ч назад`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days} д назад`;
  }

  return formatDate(dateString);
}

type NotificationCardProps = {
  item: ProfileNotification;
};

function isExternalLink(href: string) {
  return /^https?:\/\//i.test(href);
}

function NotificationCard({ item }: NotificationCardProps) {
  const icon = item.iconUrl && item.iconUrl.trim().length > 0 ? item.iconUrl : DEFAULT_ICON;
  const isUnread = !item.isRead;
  const link = item.link?.trim();
  const relative = formatRelative(item.createdAt);
  const absolute = formatDate(item.createdAt);
  const title = item.title?.trim().length ? item.title : "�?�?�?�?�� �?�?��?�?�?�>��?���";

  const isFollowNotification = item.type === "profile.follow" || item.type === "profile.unfollow";
  if (isFollowNotification) {
    const message =
      item.type === "profile.follow" ? "Подписался(-ась) на вас" : "Отписался(-ась) от вас";

    const followCard = (
      <div className="relative flex items-start gap-3 w-full max-w-[540px] bg-[#131313] border border-[#1d1d1d] rounded-[10px] p-4 hover:bg-[#1a1a1a] transition">
        {isUnread ? (
          <span className="absolute top-3 right-3 w-[10px] h-[10px] bg-[#FF0051] rounded-full shadow-[0_0_8px_#FF0051]" />
        ) : null}
        <img src={icon} alt="avatar" className="w-[40px] h-[40px] rounded-[8px] object-cover flex-shrink-0" />
        <div className="flex flex-col text-[#dbdbdb] text-[14px] leading-tight w-full">
          <div className="flex flex-wrap items-center gap-[6px]">
            <span className="font-semibold text-white flex items-center gap-1">
              Username
              <img className="w-[18px] h-[18px]" src="/design/img/badge.png" alt="" />
            </span>
            <span>{message}</span>
          </div>
          <span className="text-[12px] text-[#7c7c7c] mt-2">{relative}</span>
        </div>
      </div>
    );

    if (link) {
      if (isExternalLink(link)) {
        return (
          <a href={link} className="block w-full max-w-[540px]" target="_blank" rel="noopener noreferrer">
            {followCard}
          </a>
        );
      }
      return (
        <Link to={link} className="block w-full max-w-[540px]">
          {followCard}
        </Link>
      );
    }

    return followCard;
  }

  const content = (
    <div className="relative flex items-start gap-3 w-full max-w-[540px] bg-[#131313] border border-[#1d1d1d] rounded-[10px] p-4 hover:bg-[#1a1a1a] transition">
      {isUnread ? (
        <span className="absolute top-3 right-3 w-[10px] h-[10px] bg-[#FF0051] rounded-full shadow-[0_0_8px_#FF0051]" />
      ) : null}
      <img src={icon} alt={title} className="w-[40px] h-[40px] rounded-[8px] object-cover flex-shrink-0" />
      <div className="flex flex-col text-[#dbdbdb] text-[14px] leading-tight w-full">
        <div className="flex flex-wrap items-center gap-[6px]">
          <span className="font-semibold text-white">{title}</span>
        </div>
        <p className="mt-2 px-2 py-[6px] bg-[#1f1f1f] rounded-[6px] border border-[#2a2a2a] text-[13px] text-[#9ca3af] break-words">
          {item.body}
        </p>
        <time dateTime={item.createdAt} title={absolute} className="text-[12px] text-[#7c7c7c] mt-2">
          {relative}
        </time>
      </div>
    </div>
  );

  if (link) {
    if (isExternalLink(link)) {
      return (
        <a href={link} className="block w-full max-w-[540px]" target="_blank" rel="noopener noreferrer">
          {content}
        </a>
      );
    }

    return (
      <Link to={link} className="block w-full max-w-[540px]">
        {content}
      </Link>
    );
  }

  return content;
}

function NotificationsSkeleton() {
  return (
    <div className="flex flex-col gap-3 w-full max-w-[540px] animate-pulse">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={`notification-skeleton-${index}`}
          className="flex items-start gap-3 w-full max-w-[540px] bg-[#131313] border border-[#1D1D1D] rounded-[10px] p-4"
        >
          <div className="w-[40px] h-[40px] rounded-[8px] bg-[#1D1D1D]" />
          <div className="flex flex-col gap-2 flex-1">
            <div className="h-4 w-2/3 rounded bg-[#1D1D1D]" />
            <div className="h-3 w-full rounded bg-[#1D1D1D]" />
            <div className="h-3 w-3/4 rounded bg-[#1D1D1D]" />
            <div className="h-3 w-1/3 rounded bg-[#1D1D1D]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center text-[#dbdbdb] gap-3 w-full max-w-[540px] py-12">
      <p className="text-[16px] font-semibold text-white">Уведомлений пока нет</p>
      <p className="text-[14px] text-[#8C8C8C] text-center">Мы сообщим, как только появится что-то новое.</p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="w-full max-w-[540px] rounded-[12px] border border-[#1D1D1D] bg-[#131313] px-6 py-8 text-center text-[#dbdbdb]">
      <h2 className="text-[18px] font-semibold text-white">Не удалось загрузить уведомления</h2>
      <p className="mt-2 text-[14px] text-[#8C8C8C]">{message}</p>
      <button
        type="button"
        className="mt-4 inline-flex items-center justify-center rounded-[8px] bg-[#32afed] px-4 py-2 text-[14px] font-semibold text-black hover:bg-[#2b99cf]"
        onClick={onRetry}
      >
        Повторить
      </button>
    </div>
  );
}

export function NotificationsPage() {
  const { token, user, refreshProfile } = useAuth();
  const [isNavbarSheetOpen, setIsNavbarSheetOpen] = useState(false);
  const [notifications, setNotifications] = useState<ProfileNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!token) {
      setNotifications([]);
      setLoading(false);
      setError("Требуется авторизация.");
      return;
    }

    let ignore = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchNotifications(token, { limit: 50, offset: 0 });
        if (ignore) {
          return;
        }

        const filtered = data.filter((item) => item.type !== "messages.direct");

        setNotifications(filtered);

        if (data.some((item) => !item.isRead)) {
          void markNotificationsAsRead(token)
            .then(() => refreshProfile().catch(() => undefined))
            .catch(() => undefined);
        }
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Не удалось загрузить уведомления.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      ignore = true;
    };
  }, [token, refreshProfile, reloadKey]);

  const headerTitle = user?.username ?? "Уведомления";

  let content: JSX.Element;
  if (loading) {
    content = <NotificationsSkeleton />;
  } else if (error) {
    content = <ErrorState message={error} onRetry={() => setReloadKey((value) => value + 1)} />;
  } else if (notifications.length === 0) {
    content = <EmptyState />;
  } else {
    content = (
      <div className="flex flex-col gap-3 w-full items-center">
        {notifications.map((item) => (
          <NotificationCard key={item.id} item={item} />
        ))}
      </div>
    );
  }

  return (
    <div className="bg-black m-[auto] flex flex-col items-center justify-center gap-1 sm:gap-4 pb-[70px] sm:pb-[70px] sm:flex-row sm:items-start text-[#dbdbdb]">
      <DesktopSidebar />
      <div className="flex flex-col items-center w-full max-w-[540px] text-[14px]">
        <div className="flex items-center justify-between w-full z-50 bg-[#131313] border-b border-[#1D1D1D] text-[#dbdbdb] sticky top-0 sm:hidden">
          <button
            type="button"
            className="flex items-center gap-1 px-[16px] py-[14px]"
            onClick={() => {
              if (window.history.length > 1) {
                window.history.back();
              } else {
                window.location.href = "/";
              }
            }}
          >
            <img src="/design/img/back.png" alt="Назад" />
          </button>
          <div className="flex justify-center font-semibold">{headerTitle}</div>
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

        <div className="flex flex-col w-full gap-3 items-center p-3 sm:gap-4 sm:p-0">
          <div className="hidden sm:flex items-center pt-1 justify-between w-full text-[#dbdbdb] sticky top-0 bg-black z-50">
            <a href="/" className="flex items-center gap-1 pr-4 py-3">
              <img className="w-[26px]" src="/design/img/back.png" alt="Назад" />
            </a>
            <div className="flex justify-center font-semibold text-[16px]">
              <p>Уведомления</p>
            </div>
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

          <div className="flex flex-col w-full sm:w-[540px] max-w-[540px] gap-2 bg-[#131313] border border-[#1D1D1D] text-white rounded-[12px]">
            <div className="flex items-center justify-around gap-1 py-[4px] px-[4px] w-full">
              <button
                type="button"
                className="flex items-center justify-center text-[#dbdbdb] w-full px-[18px] py-[8px] bg-[#0B0B0B] rounded-[8px] border border-[#1D1D1D] font-semibold"
                disabled
              >
                Все
              </button>
              <button
                type="button"
                className="flex items-center justify-center text-[#dbdbdb] w-full px-[18px] py-[8px]"
                disabled
              >
                Личные
              </button>
              <button
                type="button"
                className="flex items-center justify-center text-[#dbdbdb] w-full px-[18px] py-[8px]"
                disabled
              >
                Системные
              </button>
            </div>
          </div>

          {content}
        </div>
      </div>

      <MobileBottomNav activeHref="/notifications" />
      <NavbarActionsSheet
        open={isNavbarSheetOpen}
        onClose={() => setIsNavbarSheetOpen(false)}
        textClassName="text-[16px]"
      />
    </div>
  );
}
