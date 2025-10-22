import { type ReactNode } from "react";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";

type Breadcrumb = {
  label: string;
  href?: string;
};

type AppShellProps = {
  children: ReactNode;
  title: string;
  backHref?: string;
  contentClassName?: string;
  hideSidebar?: boolean;
  hideMobileNav?: boolean;
  onOpenActions?: () => void;
  actionsTarget?: string;
  subtitle?: string;
  breadcrumbs?: Breadcrumb[];
  bottomNavActive?: string;
};

export function AppShell({
  children,
  title,
  backHref = "/",
  contentClassName,
  hideSidebar = false,
  hideMobileNav = false,
  onOpenActions,
  actionsTarget,
  bottomNavActive,
}: AppShellProps) {
  return (
    <div className="bg-black m-[auto] flex w-full flex-col items-stretch justify-start gap-1 sm:gap-4 pb-[70px] sm:pb-[70px] sm:flex-row sm:items-start sm:justify-center text-[#dbdbdb]">
      {!hideSidebar && <DesktopSidebar />}

      <div className="flex w-full flex-col items-stretch gap-4 sm:gap-4 sm:items-start">
        <MobileHeader
          title={title}
          backHref={backHref}
          onOpenActions={onOpenActions}
          actionsTarget={actionsTarget}
        />

        <div
          className={
            contentClassName ??
            "w-full max-w-[960px] flex flex-col gap-4 text-[14px] px-3 sm:px-0"
          }
        >
          {children}
        </div>
      </div>

      {!hideMobileNav && <MobileBottomNav activeHref={bottomNavActive} />}
    </div>
  );
}
