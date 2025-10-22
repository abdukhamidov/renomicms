import { useMemo } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/contexts/useAuth";
import { sidebarPrimaryNav, sidebarSecondaryNav } from "@/data/navigation";
import { useMessagesBadge } from "@/contexts/MessagesBadgeContext";
import { useAppearance } from "@/contexts/AppearanceContext";

const DEFAULT_AVATAR = "/design/img/default-avatar.png";
const DEFAULT_LOGO = "/design/img/logo-icon.png";
const ADMIN_NAV_ITEM = {
  label: "\u0410\u0434\u043c\u0438\u043d \u043f\u0430\u043d\u0435\u043b\u044c",
  href: "/admin",
  icon: "/design/img/analytics.png",
  end: false,
};

export function DesktopSidebar() {
  const { user } = useAuth();
  const { unreadCount: messagesBadge } = useMessagesBadge();
  const { appearance } = useAppearance();

  const displayName = user?.displayName ?? "\u0413\u043e\u0441\u0442\u044c";
  const subtitle = user ? "\u0412 \u0441\u0435\u0442\u0438" : "\u0412\u043e\u0439\u0434\u0438\u0442\u0435 \u0432 \u0441\u0438\u0441\u0442\u0435\u043c\u0443";
  const avatarSrc = user?.avatarUrl && user.avatarUrl.length > 0 ? user.avatarUrl : DEFAULT_AVATAR;
  const notificationsCount = user?.stats?.unreadNotifications ?? 0;

  const primaryNavItems = useMemo(
    () =>
      sidebarPrimaryNav.map((item) => {
        if (item.href === "/notifications") {
          return { ...item, badge: notificationsCount };
        }
        if (item.href === "/mail") {
          return { ...item, badge: messagesBadge };
        }
        return item;
      }),
    [notificationsCount, messagesBadge],
  );

  const secondaryNavItems = useMemo(() => {
    if (user?.role === "admin") {
      return [ADMIN_NAV_ITEM, ...sidebarSecondaryNav];
    }
    return sidebarSecondaryNav;
  }, [user?.role]);

  return (
    <aside className="hidden sm:flex flex-col gap-2 items-start top-0 w-[220px] text-white ml-[-240px] sticky z-50">
      <div className="flex items-center px-[12px] py-4 w-full">
        <NavLink to="/" className="flex gap-2 items-center text-[18px] font-bold hover:opacity-90">
          <img src={appearance.logoUrl || DEFAULT_LOGO} alt="NomiCMS" />
          NomiCMS
        </NavLink>
      </div>

      <div className="flex flex-col bg-[#080808] rounded-[8px] w-full gap-1 text-[16px]">
        <NavLink
          to={user ? "/profile" : "/auth/login"}
          className="flex items-start gap-3 px-[12px] py-[10px] border-b border-black hover:bg-[#101010]"
        >
          <img width={42} className="rounded-[8px] object-cover" src={avatarSrc} alt={displayName} />
          <div>
            <p className="font-semibold truncate max-w-[120px]">{displayName}</p>
            <p className="text-[12px] text-[#dbdbdb] truncate max-w-[120px]">{subtitle}</p>
          </div>
        </NavLink>
      </div>

      <nav className="flex flex-col w-full gap-1 text-[16px] border-b border-[#0f0f0f] pb-2">
        {primaryNavItems.map((item) => (
          <NavLink
            key={item.label}
            to={item.href}
            end={item.end}
            className={({ isActive }) =>
              [
                "flex justify-between items-center gap-3 px-[12px] py-[8px] text-[#dbdbdb] font-bold rounded-[8px]",
                isActive ? "bg-[#161616] text-white" : "hover:bg-[#161616]",
              ].join(" ")
            }
          >
            <span className="flex items-center gap-2">
              <img src={item.icon} alt="" />
              {item.label}
            </span>
            {typeof item.badge === "number" && item.badge > 0 && (
              <span className="min-w-[20px] h-[20px] px-[6px] rounded-full bg-[#ED3426] text-white text-[12px] font-bold flex items-center justify-center leading-none pointer-events-none">
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <nav className="flex flex-col w-full gap-1 text-[16px] border-b border-[#0f0f0f] pb-2">
        {secondaryNavItems.map((item) => (
          <NavLink
            key={item.label}
            to={item.href}
            end={item.end}
            className={({ isActive }) =>
              [
                "flex items-center gap-3 px-[12px] py-[8px] text-[#dbdbdb] font-bold rounded-[8px] transition-transform duration-300 ease-out",
                isActive ? "bg-[#161616] text-white" : "hover:bg-[#161616]",
              ].join(" ")
            }
          >
            <img src={item.icon} alt="" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="flex items-center justify-between w-full text-[12px] text-[#777777] font-semibold">
        <a href="#" className="px-[12px] py-[8px] pt-0 hover:text-[#dbdbdb] transition-transform duration-300 ease-out">
          Help
        </a>
        <a href="#" className="px-[12px] py-[8px] pt-0 hover:text-[#dbdbdb] transition-transform duration-300 ease-out">
          Support
        </a>
        <p className="px-[12px] py-[8px] pt-0">G: 0.0045</p>
      </div>
    </aside>
  );
}
