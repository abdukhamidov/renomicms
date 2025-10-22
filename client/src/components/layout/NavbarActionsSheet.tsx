import { useEffect } from "react";

type NavbarActionsSheetProps = {
  open: boolean;
  onClose: () => void;
  textClassName?: string;
};

export function NavbarActionsSheet({
  open,
  onClose,
  textClassName = "text-[14px]",
}: NavbarActionsSheetProps) {
  useEffect(() => {
    if (!open) {
      document.body.classList.remove("overflow-hidden");
      return;
    }

    document.body.classList.add("overflow-hidden");

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKey);

    return () => {
      document.body.classList.remove("overflow-hidden");
      window.removeEventListener("keydown", handleKey);
    };
  }, [open, onClose]);

  return (
    <div
      className={`fixed inset-0 z-50 ${open ? "" : "hidden"}`}
      data-bottom-sheet="navbar-actions"
      aria-hidden={open ? "false" : "true"}
    >
      <div
        className={`absolute inset-0 bg-black/80 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
        data-bottom-sheet-overlay
        onClick={onClose}
      />
      <div
        className={`absolute bottom-0 left-0 right-0 bg-[#131313] border-t border-[#1D1D1D] rounded-t-[16px] px-4 pt-4 pb-6 transition-transform duration-300 ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
        data-bottom-sheet-panel
        role="menu"
      >
        <div className="mx-auto mb-4 h-[4px] w-12 rounded-full bg-[#2E2E2E]" />
        <div className={`flex flex-col items-center gap-2 text-[#F5F5F5] ${textClassName}`}>
          <button
            type="button"
            className="flex items-center gap-3 w-full max-w-[540px] rounded-[10px] border border-[#232323] bg-[#1C1C1C] p-2 px-4 text-left hover:bg-[#252525]"
            data-bottom-sheet-dismiss
            data-bottom-sheet-action="refresh"
            onClick={onClose}
          >
            Обновить страницу
          </button>
          <button
            type="button"
            className="flex items-center gap-3 w-full max-w-[540px] rounded-[10px] border border-[#232323] bg-[#1C1C1C] p-2 px-4 text-left hover:bg-[#252525]"
            data-bottom-sheet-dismiss
            data-bottom-sheet-action="support"
            onClick={onClose}
          >
            Написать в поддержку
          </button>
          <button
            type="button"
            className="flex items-center gap-3 w-full max-w-[540px] rounded-[10px] border border-[#232323] bg-[#1C1C1C] p-2 px-4 text-left hover:bg-[#252525]"
            data-bottom-sheet-dismiss
            data-bottom-sheet-action="donate"
            onClick={onClose}
          >
            Поддержать проект
          </button>
          <button
            type="button"
            className="mt-4 w-full max-w-[540px] rounded-[10px] border border-[#232323] p-2 text-[#F5F5F5] hover:bg-[#1C1C1C]"
            data-bottom-sheet-dismiss
            onClick={onClose}
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
