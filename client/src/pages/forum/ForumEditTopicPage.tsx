import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { NavbarActionsSheet } from "@/components/layout/NavbarActionsSheet";

const scrollStyles = `
.invisible-scroll::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.invisible-scroll::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  transition: opacity 0.3s ease;
}

.invisible-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.invisible-scroll::-webkit-scrollbar-thumb {
  opacity: 0;
}

.invisible-scroll:hover::-webkit-scrollbar-thumb,
.invisible-scroll:active::-webkit-scrollbar-thumb {
  opacity: 1;
}

.invisible-scroll {
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
}
`;

const initialMessage = `Добрый день. У нас для вас две новости.

1 Ведётся разработка новой версии.
2 Но, к сожалению дата выхода неизвестна.

Что ждать в новой версии

1 Переход на новую систему.
2 Пакеты теперь заменять модульность.
3 Новая админ-панель.
4 Маршрутизация (Routing). И многое другое.

Системные требования

1 PHP: 7.3
2 Apache 2.4
3 MySQL: 5.6 MySQL Native Driver (mysqlnd)
4 Поддержка функционала .htaccess

Подробности
Telegram`;

export function ForumEditTopicPage() {
  const [isNavbarSheetOpen, setIsNavbarSheetOpen] = useState(false);
  const [title, setTitle] = useState("Разработка Nomicms v3.x");
  const [message, setMessage] = useState(initialMessage);

  useEffect(() => {
    const styleElement = document.createElement("style");
    styleElement.id = "forum-edit-scroll";
    styleElement.innerHTML = scrollStyles;
    document.head.appendChild(styleElement);

    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  return (
    <div className="bg-black m-[auto] flex flex-col items-center justify-center gap-1 sm:gap-4 pb-[70px] sm:pb-[70px] sm:flex-row sm:items-start text-[#dbdbdb]">
      <DesktopSidebar />

      <div className="w-full max-w-[540px] flex flex-col gap-4 items-center text-[14px] p-3 sm:gap-4 sm:p-0">
        <div className="flex items-center justify-between w-full bg-[#131313] border-b border-[#1D1D1D] text-[#dbdbdb] sticky top-0 sm:hidden">
          <Link to="/forum/topic" className="flex items-center gap-1 px-[16px] py-[14px]">
            <img src="/design/img/back.png" alt="Назад" />
          </Link>
          <div className="flex justify-center font-semibold">Редактировать новость</div>
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

        <div className="hidden sm:flex items-center pt-1 justify-between w-full text-[#dbdbdb] sticky top-0 bg-black z-50">
          <Link to="/forum/topic" className="flex items-center gap-1 pr-4 py-3">
            <img className="w-[26px]" src="/design/img/back.png" alt="Назад" />
          </Link>
          <div className="flex justify-center font-semibold text-[16px] gap-2">
            <p>Редактировать новости</p>
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

        <div className="flex flex-col w-full max-w-[540px] text-[#dbdbdb] gap-2">
          <label htmlFor="edit-topic-title" className="px-1 text-[14px]">
            Изменить название
          </label>
          <input
            id="edit-topic-title"
            className="pl-4 px-2 py-3 w-full focus:border-[#505050] focus:outline bg-[#131313] border border-[#1D1D1D] text-[#ffffff] placeholder:text-[#dbdbdb] rounded-[12px] text-[14px]"
            type="text"
            placeholder="Введите название"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>

        <form className="flex flex-col w-full max-w-[540px] text-[#dbdbdb] gap-2" onSubmit={handleSubmit}>
          <label htmlFor="edit-topic-message" className="px-1 text-[14px]">
            Сообщение
          </label>
          <textarea
            id="edit-topic-message"
            rows={10}
            placeholder="Введите сообщение"
            className="invisible-scroll w-full p-4 border border-[#1D1D1D] rounded-[12px] bg-[#131313] text-[#ffffff] placeholder:text-[#8C8C8C] leading-[1.4] focus:ring-0 focus:outline-none min-h-[70px] max-h-[50vh] resize-none overflow-y-auto"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
          <div className="w-full max-w-[540px]">
            <button type="submit" className="px-2 py-3 bg-[#31AEEC] text-black font-bold rounded-[8px] w-full hover:bg-[#3abdff]">
              Сохранить
            </button>
          </div>
        </form>
      </div>

      <MobileBottomNav activeHref="/forum" />
      <NavbarActionsSheet open={isNavbarSheetOpen} onClose={() => setIsNavbarSheetOpen(false)} />
    </div>
  );
}



