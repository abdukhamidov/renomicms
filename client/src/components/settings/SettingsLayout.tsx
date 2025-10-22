import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { NavbarActionsSheet } from "@/components/layout/NavbarActionsSheet";

type SettingsLayoutProps = {
  title: string;
  backHref?: string;
  children: ReactNode;
  contentClassName?: string;
};

function autosizeTextarea(element: HTMLTextAreaElement) {
  element.style.height = "auto";
  element.style.height = `${element.scrollHeight}px`;
}

export function SettingsLayout({
  title,
  backHref = "/settings",
  children,
  contentClassName = "flex flex-col w-full gap-3 items-center p-3 sm:gap-4 sm:p-0",
}: SettingsLayoutProps) {
  const [isNavbarSheetOpen, setIsNavbarSheetOpen] = useState(false);

  useEffect(() => {
    const textareas = Array.from(document.querySelectorAll<HTMLTextAreaElement>("textarea[data-autosize]"));
    textareas.forEach(autosizeTextarea);

    const handleInput = (event: Event) => {
      const target = event.target;
      if (target instanceof HTMLTextAreaElement && target.dataset.autosize !== undefined) {
        autosizeTextarea(target);
      }
    };

    document.addEventListener("input", handleInput);
    return () => {
      document.removeEventListener("input", handleInput);
    };
  }, [children]);

  return (
    <div className="bg-black m-[auto] flex flex-col items-center justify-center gap-1 sm:gap-4 pb-[70px] sm:pb-[70px] sm:flex-row sm:items-start text-[#dbdbdb]">
      <DesktopSidebar />

      <div className="max-w-[540px] w-full flex flex-col gap-3 items-center text-[14px] sm:gap-4">
        <div className="flex items-center justify-between w-full bg-[#131313] border-b border-[#1D1D1D] text-[#dbdbdb] sticky top-0 sm:hidden -mx-3 sm:mx-0">
          <Link to={backHref} className="flex items-center gap-1 px-[16px] py-[14px]">
            <img src="/design/img/back.png" alt="Назад" />
          </Link>
          <div className="flex justify-center font-semibold">{title}</div>
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

        <div className={contentClassName}>
          <div className="hidden sm:flex items-center pt-1 justify-between w-full text-[#dbdbdb] sticky top-0 bg-black z-50">
            <Link to={backHref} className="flex items-center gap-1 pr-4 py-3">
              <img className="w-[26px]" src="/design/img/back.png" alt="Назад" />
            </Link>
            <div className="flex justify-center font-semibold text-[16px]">
              <p>{title}</p>
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

          {children}
        </div>
      </div>

      <MobileBottomNav activeHref="/settings" />
      <NavbarActionsSheet open={isNavbarSheetOpen} onClose={() => setIsNavbarSheetOpen(false)} textClassName="text-[16px]" />
    </div>
  );
}


