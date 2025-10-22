import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { NavbarActionsSheet } from "@/components/layout/NavbarActionsSheet";
import { useAuth } from "@/contexts/useAuth";

type AdminLinkItem = {
  to: string;
  icon: string;
  label: string;
  showArrow?: boolean;
  innerPaddingClass?: string;
  innerExtraClassName?: string;
};

const ADMIN_TITLE = "\u0410\u0434\u043c\u0438\u043d \u043f\u0430\u043d\u0435\u043b";

const ADMIN_LINK_GROUPS: AdminLinkItem[][] = [
  [
    {
      to: "/admin/stats",
      icon: "/design/img/sheet-update-profile.png",
      label: "\u0421\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043a\u0430",
      showArrow: true,
    },
    {
      to: "/admin/access",
      icon: "/design/img/sheet-lock.png",
      label: "\u0414\u043e\u0441\u0442\u0443\u043f \u043a \u0441\u0430\u0439\u0442\u0443",
      showArrow: true,
    },
    {
      to: "/admin/users",
      icon: "/design/img/users-sidebar.png",
      label: "\u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u0438",
      showArrow: true,
    },
    {
      to: "/admin/appearance",
      icon: "/design/img/password.png",
      label: "\u0412\u043d\u0435\u0448\u043d\u0438\u0439 \u0432\u0438\u0434",
      showArrow: true,
    },
    {
      to: "/admin",
      icon: "/design/img/login.png",
      label: "SEO \u041d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438",
      showArrow: true,
      innerExtraClassName: "pl-0",
    },
  ],
  [
    {
      to: "/admin",
      icon: "/design/img/language.png",
      label: "\u041d\u043e\u0432\u043e\u0441\u0442\u0438",
      innerPaddingClass: "py-[8px]",
      showArrow: true,
    },
    {
      to: "/admin",
      icon: "/design/img/notification-red.png",
      label: "\u0424\u043e\u0440\u0443\u043c",
      showArrow: true,
    },
    {
      to: "/admin",
      icon: "/design/img/browser.png",
      label: "\u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u0438",
      showArrow: true,
      innerExtraClassName: "pl-0",
    },
  ],
  [
    {
      to: "/admin",
      icon: "/design/img/language.png",
      label: "\u0411\u0430\u043d\u044b",
      innerPaddingClass: "py-[8px]",
      showArrow: true,
    },
    {
      to: "/admin",
      icon: "/design/img/notification-red.png",
      label: "\u0416\u0430\u043b\u043e\u0431\u044b",
      showArrow: true,
    },
    {
      to: "/admin",
      icon: "/design/img/browser.png",
      label: "\u041f\u043e\u0434\u0434\u0435\u0440\u0436\u043a\u0430",
      showArrow: true,
      innerExtraClassName: "pl-0",
    },
  ],
];

export function AdminPage() {
  const { user, initializing } = useAuth();
  const [isNavbarSheetOpen, setNavbarSheetOpen] = useState(false);

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
            <Link to="/" className="flex items-center gap-1 px-[16px] py-[14px]">
              <img src="/design/img/back.png" alt="" />
            </Link>
            <div className="flex justify-center font-semibold">{ADMIN_TITLE}</div>
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
            <Link to="/" className="flex items-center gap-1 pr-4 py-3">
              <img className="w-[26px]" src="/design/img/back.png" alt="" />
            </Link>
            <div className="flex justify-center font-semibold text-[16px] gap-2">
              <p>{ADMIN_TITLE}</p>
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

          {ADMIN_LINK_GROUPS.map((group, groupIndex) => (
            <div
              key={groupIndex}
              className="flex flex-col w-full bg-[#131313] border-t border-r border-l border-[#1D1D1D] text-[#e1e1e1] font-semibold rounded-[12px]"
            >
              {group.map((link, linkIndex) => {
                const isFirst = linkIndex === 0;
                const isLast = linkIndex === group.length - 1;
                const containerClassNames = [
                  "flex items-center pl-4 hover:bg-[#161616]",
                  isFirst ? "hover:rounded-t-[12px]" : "",
                  isLast ? "hover:rounded-b-[12px]" : "",
                ]
                  .filter(Boolean)
                  .join(" ");

                const innerClassNames = [
                  "flex items-center justify-between w-full ml-[10px] pr-4 text-[#e1e1e1] hover:text-[#fff]",
                  link.innerPaddingClass ?? "py-[12px]",
                  !isLast ? "border-b border-[#1c1c1c]" : "",
                  link.innerExtraClassName ?? "",
                ]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <Link key={`${link.label}-${linkIndex}`} to={link.to} className={containerClassNames}>
                    <div className="bg-[#0B0B0B] p-[6px] rounded-[8px] border border-[#1D1D1D]">
                      <img className="w-[18px]" src={link.icon} alt="" />
                    </div>
                    <div className={innerClassNames}>
                      {link.label}
                      {link.showArrow ? (
                        <span>
                          <img src="/design/img/arrow-right.png" alt="" />
                        </span>
                      ) : null}
                    </div>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        <MobileBottomNav activeHref="/admin" />
      </div>

      <NavbarActionsSheet open={isNavbarSheetOpen} onClose={() => setNavbarSheetOpen(false)} textClassName="text-[16px]" />
    </>
  );
}
