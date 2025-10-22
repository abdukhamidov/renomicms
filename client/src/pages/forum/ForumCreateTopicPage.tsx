import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { NavbarActionsSheet } from "@/components/layout/NavbarActionsSheet";

export function ForumCreateTopicPage() {
  const [isNavbarSheetOpen, setIsNavbarSheetOpen] = useState(false);

  useEffect(() => {
    const fit = (element: HTMLTextAreaElement) => {
      element.style.height = "auto";
      element.style.height = `${element.scrollHeight}px`;
    };

    const textareas = document.querySelectorAll<HTMLTextAreaElement>("textarea[data-autosize]");
    textareas.forEach(fit);

    const handleInput = (event: Event) => {
      const target = event.target;
      if (target instanceof HTMLTextAreaElement && target.dataset.autosize !== undefined) {
        fit(target);
      }
    };

    document.addEventListener("input", handleInput);
    return () => {
      document.removeEventListener("input", handleInput);
    };
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  return (
    <div className="bg-black m-[auto] flex flex-col items-center justify-center gap-1 sm:gap-4 pb-[70px] sm:pb-[70px] sm:flex-row sm:items-start text-[#dbdbdb]">
      <DesktopSidebar />

      <div className="flex items-center justify-between z-50 w-full bg-[#131313] border-b border-[#1D1D1D] text-[#dbdbdb] sticky top-0 sm:hidden">
          <Link to="/forum/section" className="flex items-center gap-1 px-[16px] py-[14px]">
            <img src="/design/img/back.png" alt="Назад" />
          </Link>
          <div className="flex flex-col items-center justify-center">
            <span className="flex items-center gap-1 font-semibold text-[14px]">
            Название раздела <span className="text-[#414141] font-bold">/</span> Создать тему
            </span>
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

      <div className="w-full max-w-[540px] flex flex-col gap-2 items-center text-[14px] p-3 sm:gap-4 sm:p-0">
        

        <div className="hidden sm:flex items-center pt-1 justify-between w-full text-[#dbdbdb] sticky top-0 bg-black z-50">
          <Link to="/forum/section" className="flex items-center gap-1 pr-4 py-3">
            <img className="w-[26px]" src="/design/img/back.png" alt="Назад" />
          </Link>
          <div className="flex justify-center font-semibold text-[16px] gap-2">
            <p>Форум</p>
            <p className="text-[#414141] font-bold">/</p>
            <p>Название раздела</p>
            <p className="text-[#414141] font-bold">/</p>
            <p>Создать тему</p>
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

        <div className="flex flex-col gap-2 bg-[#131313] border-t border-r border-l border-[#1D1D1D] text-white p-[16px] rounded-[12px] w-full">
          <div className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <p className="flex items-center gap-2 text-[16px]">Перед тем как создать тему</p>
            </div>
            <button type="button" className="flex items-center text-gray-400 py-[8px] pl-[16px] pr-0">
              <img src="/design/img/close.png" alt="Закрыть" />
            </button>
          </div>
          <div className="text-[#dbdbdb] mt-[-12px]">
            Пожалуйста, ознакомьтесь с правилами форума — это поможет сохранить порядок и дружескую атмосферу.
          </div>
          <div className="flex">
            <Link
              to="#"
              className="bg-[#66e48b] text-[#0a130d] font-bold py-[8px] px-[14px] rounded-[12px] border border-[#252525] hover:bg-[#5dd180]"
            >
              Правила форума
            </Link>
          </div>
        </div>

        <div className="flex flex-col w-full">
          <input
            className="p-4 w-full focus:border-[#505050] focus:outline bg-[#131313] border border-[#1D1D1D] text-[#dbdbdb] placeholder:text-[#8C8C8C] rounded-[12px] text-[14px]"
            type="text"
            placeholder="Название темы"
          />
        </div>

        <div className="sm:flex flex-col w-full max-w-[540px] gap-2 bg-[#131313] border border-[#1D1D1D] text-white p-[16px] rounded-[12px]">
          <form className="flex flex-col w-full max-w-[540px]" onSubmit={handleSubmit}>
            <textarea
              data-autosize
              rows={1}
              placeholder="Сообщение"
              className="w-full bg-[#131313] text-[#dbdbdb] placeholder:text-[#8C8C8C] resize-none overflow-hidden leading-[1.4] border-0 focus:ring-0 focus:outline-none min-h-[50px] max-h-[50vh] pb-4"
            />
          </form>
          <div className="flex items-center justify-between pt-4">
            <div className="flex gap-3">
              <button type="button" className="p-1 pl-0 pb-0">
                <img src="/design/img/image.png" alt="" />
              </button>
              <button type="button" className="p-1 pb-0">
                <img src="/design/img/text-font.png" alt="" />
              </button>
            </div>
            <button type="submit" className="py-[6px] px-[8px] font-bold text-[#000000] bg-[#32afed] hover:bg-[#2b99cf] rounded-[8px]">
              Создать тему
            </button>
          </div>
        </div>

        <p className="text-[#888888] text-center">Скоро создание темы пополниться новыми функциями</p>
      </div>

      <MobileBottomNav activeHref="/forum" />
      <NavbarActionsSheet open={isNavbarSheetOpen} onClose={() => setIsNavbarSheetOpen(false)} />
    </div>
  );
}



