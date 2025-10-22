import { useMemo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/useAuth";
import { useMessagesBadge } from "@/contexts/MessagesBadgeContext";

type BottomNavItem = {
  label: string;
  href: string;
  icon: string;
  badge?: number;
  avatar?: boolean;
};

type MobileBottomNavProps = {
  activeHref?: string;
  mailBadge?: number;
};

function normalizeHref(value: string) {
  if (value === "/") {
    return "/";
  }
  return value.replace(/\/+$/, "");
}

const DEFAULT_AVATAR = "/design/img/default-avatar.png";
const ADMIN_NAV_ITEM: BottomNavItem = {
  label: "\u0410\u0434\u043c\u0438\u043d",
  href: "/admin",
  icon: "/design/img/analytics.png",
};

export function MobileBottomNav({ activeHref, mailBadge }: MobileBottomNavProps) {
  const { user } = useAuth();
  const { unreadCount } = useMessagesBadge();
  const { pathname } = useLocation();
  const target = normalizeHref(activeHref ?? pathname);

  const notificationsBadge = user?.stats?.unreadNotifications ?? 0;
  const messagesBadge = typeof mailBadge === "number" ? mailBadge : unreadCount;
  const avatarSrc = user?.avatarUrl && user.avatarUrl.length > 0 ? user.avatarUrl : DEFAULT_AVATAR;

  const items = useMemo<BottomNavItem[]>(() => {
    const base: BottomNavItem[] = [
      {
        label: "\u0413\u043b\u0430\u0432\u043d\u0430\u044f",
        href: "/",
        icon: "/design/img/navbar-home.png",
      },
      {
        label: "\u0423\u0432\u0435\u0434\u043e\u043c\u043b\u0435\u043d\u0438\u044f",
        href: "/notifications",
        icon: "/design/img/navbar-notification.png",
        badge: notificationsBadge,
      },
      {
        label: "\u041f\u043e\u0447\u0442\u0430",
        href: "/mail",
        icon: "/design/img/navbar-mail.png",
        badge: messagesBadge,
      },
      {
        label: "\u041f\u0440\u043e\u0444\u0438\u043b\u044c",
        href: "/profile",
        icon: avatarSrc,
        avatar: true,
      },
    ];

    if (user?.role === "admin") {
      base.push(ADMIN_NAV_ITEM);
    }

    return base;
  }, [notificationsBadge, messagesBadge, avatarSrc, user?.role]);

  return (
    <div className="fixed bottom-0 left-0 right-0 sm:hidden z-50 bg-[#131313] border-t border-[#1D1D1D] text-[#dbdbdb] h-[70px]">
      <nav className="w-full h-full flex">
        {items.map((item) => {
          const itemHref = normalizeHref(item.href);
          const isDirectMatch = target === itemHref;
          const isNestedMatch = !activeHref && itemHref !== "/" && target.startsWith(`${itemHref}/`);
          const isActive = isDirectMatch || isNestedMatch;

          return (
            <NavLink key={item.label} to={item.href} className="flex-1 h-full flex flex-col items-center justify-center gap-1 mt-[-5px]">
              <span className="relative inline-block">
                <img
                  src={item.icon}
                  alt={item.label}
                  className={item.avatar ? "rounded-full w-[24px] h-[24px] object-cover" : ""}
                />
                {typeof item.badge === "number" && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 translate-x-1/4 -translate-y-1/4 min-w-[18px] h-[18px] px-[6px] rounded-full bg-[#ED3426] text-white text-[10px] font-bold flex items-center justify-center leading-none ring-2 ring-[#131313] pointer-events-none">
                    {item.badge}
                  </span>
                )}
              </span>
              <span className={`text-[10px] ${isActive ? "text-white" : ""}`}>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
