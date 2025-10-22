import { useState } from "react";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { NavbarActionsSheet } from "@/components/layout/NavbarActionsSheet";

type Topic = {
  title: string;
  count: string;
};

type MenuLink = {
  title: string;
  icon: string;
  count?: string;
};

const latestTopics: Topic[] = [
  { title: "Форум", count: "12" },
  { title: "NOMICMS INDONESIA", count: "8" },
  { title: "Админ-чат", count: "6" },
  { title: "Nomicms v3", count: "23" },
  { title: "Всем привет", count: "2" },
];

const menuLinks: MenuLink[] = [
  { title: "Новости", icon: "/design/img/news.png", count: "12" },
  { title: "Блог", icon: "/design/img/blog.png", count: "52" },
  { title: "Мини-чат", icon: "/design/img/chat.png", count: "215" },
  { title: "Пользователи", icon: "/design/img/users.png", count: "108" },
  { title: "Поддержать проект", icon: "/design/img/donat.png" },
];

export function HomePage() {
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  return (
    <div className="bg-black m-[auto] flex flex-col items-center justify-center gap-1 sm:gap-4 pb-[70px] sm:pb-[70px] sm:flex-row sm:items-start text-[#dbdbdb]">
      <DesktopSidebar />

      <div className="max-w-[540px] flex flex-col gap-3 items-center text-[14px] p-3 sm:gap-4 sm:p-0 w-full">
        <MobileHeader
          title="Главная"
          backHref="/"
          onOpenActions={() => setIsSheetOpen(true)}
          actionsTarget="navbar-actions"
        />

        <div className="hidden sm:flex items-center pt-1 justify-between w-full text-[#dbdbdb] sticky top-0 bg-black backdrop-blur-xs z-50">
          <div className="flex items-center justify-between w-full">
            <span className="flex items-center gap-1 pr-4 py-3">
              <img className="w-[26px] hidden" src="/design/img/back.png" alt="Назад" />
            </span>
            <div className="flex justify-center font-semibold text-[16px]">Главная</div>
            <button
              type="button"
              className="flex items-center gap-1 pl-4 py-3"
              onClick={() => setIsSheetOpen(true)}
            >
              <img className="w-[26px]" src="/design/img/more.png" alt="Меню" />
            </button>
          </div>
        </div>

        <a
          href="#"
          className="flex flex-col gap-2 bg-[#131313] border-t border-r border-l border-[#1D1D1D] text-white p-[16px] rounded-[12px] w-full"
        >
          <div className="flex items-center gap-2">
            <div className="bg-[#0B0B0B] p-[6px] rounded-[8px] border border-[#1D1D1D]">
              <img src="/design/img/news.png" alt="" />
            </div>
            <p className="flex flex-row items-center gap-2 text-[16px]">Первое обновление</p>
          </div>
          <p className="text-[#dbdbdb]">
            В re:Nomicms была проведена работа по исправлению ошибок, улучшению юзабилити, а также улучшена совместимость
            с различными хостингами. Если у вас были проблемы с установкой и это вам мешало, то самое время попробовать новую
            версию.
          </p>
          <div className="flex flex-row justify-between gap-2 items-center">
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-[#0B0B0B] gap-1 text-[12px] py-[6px] px-[12px] rounded-[8px] border border-[#1D1D1D]">
                <img src="/design/img/comment.png" alt="" />
                5
              </div>
              <div className="flex items-center bg-[#0B0B0B] gap-1 text-[12px] py-[6px] px-[12px] rounded-[8px] border border-[#1D1D1D]">
                <img src="/design/img/eye.png" alt="" />
                103
              </div>
            </div>
            <p className="text-[#8C8C8C]">Сегодня в 12:54</p>
          </div>
        </a>

        <div className="flex flex-col w-full bg-[#131313] border-t border-r border-l border-[#1D1D1D] text-[#e1e1e1] rounded-[12px]">
          <a
            href="modules/forum/index.html"
            className="flex items-center justify-between bg-[#101010] border-b border-[#1D1D1D] rounded-tr-[12px] rounded-tl-[12px] gap-2 py-[12px] px-[16px]"
          >
            <span className="flex items-center gap-2">
              <div className="bg-[#0B0B0B] p-[6px] rounded-[8px] border border-[#1D1D1D]">
                <img src="/design/img/forum.png" alt="" />
              </div>
              <p>Форум</p>
            </span>
            <span className="bg-[#0B0B0B] text-[#8C8C8C] text-[12px] p-[6px] rounded-[8px] border border-l border-[#1D1D1D] pl-[12px] ml-[12px]">
              55 тем / 646 постов
            </span>
          </a>

          {latestTopics.map(({ title, count }, index) => {
            const isLast = index === latestTopics.length - 1;
            return (
              <a
                key={title}
                href="#"
                className={`flex items-center pl-4 hover:bg-[#161616] ${isLast ? "hover:rounded-b-[12px]" : ""}`}
              >
                <div className="p-[6px]">
                  <img className="w-[18px] h-[18px]" src="/design/img/topic-gray.png" alt="" />
                </div>
                <div
                  className={`flex items-center justify-between w-full pl-0 ml-[10px] py-[6px] pr-4 text-[#e1e1e1] hover:text-[#fff] ${
                    isLast ? "" : "border-b border-[#1c1c1c]"
                  }`}
                >
                  {title}
                  <span className="flex items-center gap-1 bg-[#0B0B0B] text-[#8C8C8C] text-[12px] p-[6px] rounded-[8px] border border-l border-[#1D1D1D] ml-[12px]">
                    <img src="/design/img/comment-gray.png" alt="" />
                    {count}
                  </span>
                </div>
              </a>
            );
          })}
        </div>

        <div className="flex flex-col w-full bg-[#131313] border-t border-r border-l border-[#1D1D1D] text-[#e1e1e1] rounded-[12px]">
          {menuLinks.map(({ title, icon, count }, index) => {
            const isLast = index === menuLinks.length - 1;
            const baseClasses = [
              "flex items-center justify-between gap-2 py-[12px] px-[16px] hover:bg-[#161616]",
            ];
            if (index === 0) {
              baseClasses.push("border-b border-[#1D1D1D]", "rounded-tr-[12px]", "rounded-tl-[12px]");
            } else if (!isLast) {
              baseClasses.push("border-b border-[#1D1D1D]");
            }
            if (isLast) {
              baseClasses.push("hover:rounded-b-[12px]");
            }

            return (
              <a key={title} href="#" className={baseClasses.join(" ")}>
                <span className="flex items-center gap-2">
                  <div className="bg-[#0B0B0B] p-[6px] rounded-[8px] border border-[#1D1D1D]">
                    <img src={icon} alt="" />
                  </div>
                  <p>{title}</p>
                </span>
                {count ? (
                  <span className="bg-[#0B0B0B] text-[#8C8C8C] text-[12px] p-[6px] rounded-[8px] border border-l border-[#1D1D1D] ml-[12px]">
                    {count}
                  </span>
                ) : null}
              </a>
            );
          })}
        </div>
      </div>

      <MobileBottomNav activeHref="/" />
      <NavbarActionsSheet open={isSheetOpen} onClose={() => setIsSheetOpen(false)} textClassName="text-[16px]" />
    </div>
  );
}
