import { useState } from "react";
import { Link } from "react-router-dom";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { NavbarActionsSheet } from "@/components/layout/NavbarActionsSheet";

type ForumSectionLink = {
  title: string;
  count: string;
  icon: string;
  pinned?: boolean;
  locked?: boolean;
};

type ForumCategoryBlock = {
  title: string;
  subtitle: string;
  stats: string;
  icon: string;
  sections: ForumSectionLink[];
};

const forumCategories: ForumCategoryBlock[] = [
  {
    title: "NomiCMS",
    subtitle: "Все касаемо NomiCMS",
    stats: "55 тем / 646 постов",
    icon: "/design/img/logo-red.png",
    sections: [
      { title: "Новости NomiCMS", count: "12 тем", icon: "/design/img/folder.png" },
      { title: "Обновления", count: "8 тем", icon: "/design/img/folder.png" },
      { title: "Вопрос/ответ", count: "6 тем", icon: "/design/img/folder.png" },
      { title: "Предложения и пожелания", count: "23 тем", icon: "/design/img/folder.png" },
      { title: "Предложения по сайту", count: "2 тем", icon: "/design/img/folder.png" },
    ],
  },
  {
    title: "Общение",
    subtitle: "Общаемся и знакомимся",
    stats: "120 тем / 2048 постов",
    icon: "/design/img/forum.png",
    sections: [
      { title: "Общий чат", count: "18 тем", icon: "/design/img/folder.png", pinned: true },
      { title: "Оффтопик", count: "64 темы", icon: "/design/img/folder.png" },
      { title: "Юмор", count: "43 темы", icon: "/design/img/folder.png" },
      { title: "Работа и проекты", count: "15 тем", icon: "/design/img/folder.png" },
      { title: "Архив", count: "129 тем", icon: "/design/img/lock.png", locked: true },
    ],
  },
];

export function ForumPage() {
  const [isNavbarSheetOpen, setIsNavbarSheetOpen] = useState(false);

  return (
    <div className="bg-black m-[auto] flex flex-col items-center justify-center gap-1 sm:gap-4 pb-[70px] sm:pb-[70px] sm:flex-row sm:items-start text-[#dbdbdb]">
      <DesktopSidebar />

<div className="flex items-center justify-between z-50 w-full bg-[#131313] border-b border-[#1D1D1D] text-[#dbdbdb] sticky top-0 sm:hidden">
          <Link to="/" className="flex items-center gap-1 px-[16px] py-[14px]">
            <img src="/design/img/back.png" alt="Назад" />
          </Link>
          <div className="flex justify-center font-semibold">Форум</div>
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

      <div className="max-w-[540px] flex flex-col gap-3 items-center text-[14px] p-3 sm:gap-4 sm:p-0 w-full">
        

        <div className="hidden sm:flex items-center pt-1 justify-between w-full text-[#dbdbdb] sticky top-0 bg-black z-50">
          <Link to="/" className="flex items-center gap-1 pr-4 py-3">
            <img className="w-[26px]" src="/design/img/back.png" alt="Назад" />
          </Link>
          <div className="flex justify-center font-semibold text-[16px] gap-2">
            <p>Форум</p>
          </div>
          <button
            type="button"
            className="flex items-center gap-1 pl-4 py-3"
            data-bottom-sheet-open="true"
            data-bottom-sheet-target="navbar-actions"
            onClick={() => setIsNavbarSheetOpen(true)}
          >
            <img className="w-[26px]" src="/design/img/more.png" alt="Меню" />
          </button>
        </div>

        <div className="flex flex-col gap-2 bg-[#131313] border-t border-r border-l border-[#1D1D1D] text-white p-[16px] rounded-[12px] w-full">
          <div className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <p className="flex items-center gap-2 text-[16px]">Добро пожаловать на наш форум!</p>
            </div>
            <button type="button" className="flex items-center text-gray-400 py-[8px] pl-[16px] pr-0">
              <img src="/design/img/close.png" alt="Закрыть" />
            </button>
          </div>
          <div className="text-[#dbdbdb] mt-[-12px]">
            Перед тем как начать, пожалуйста, ознакомьтесь с правилами форума — это поможет сохранить порядок и дружескую атмосферу.
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

        {forumCategories.map((category) => (
          <div key={category.title} className="flex flex-col w-full bg-[#131313] border-t border-r border-l border-[#1D1D1D] text-[#e1e1e1] rounded-[12px] overflow-hidden">
            <div className="flex items-center justify-between bg-[#101010] border-b border-[#1D1D1D] gap-2 py-[12px] px-[16px]">
              <div className="flex items-center gap-2">
                <div className="bg-[#0B0B0B] p-[8px] rounded-[10px] border border-[#1D1D1D]">
                  <img src={category.icon} alt="" />
                </div>
                <div>
                  <p className="font-bold">{category.title}</p>
                  <p className="text-[10px]">{category.subtitle}</p>
                </div>
              </div>
              <div className="flex items-center bg-[#0B0B0B] text-[#8C8C8C] text-[12px] p-[6px] rounded-[8px] border border-l border-[#1D1D1D] ml-[12px] gap-2">
                {category.stats}
              </div>
            </div>
            {category.sections.map((section, sectionIndex) => {
              const isLastSection = sectionIndex === category.sections.length - 1;
              const iconSrc = section.locked ? "/design/img/lock.png" : section.icon;
              return (
                <Link
                  key={section.title}
                  to="/forum/section"
                  className={[
                    "flex items-center pl-4 hover:bg-[#161616]",
                    isLastSection ? "hover:rounded-b-[12px]" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <div className="flex items-center justify-center p-[6px]">
                    <img className="w-[18px] h-[18px]" src={section.pinned ? "/design/img/pin.png" : iconSrc} alt="" />
                  </div>
                  <div
                    className={`flex items-center justify-between w-full pl-0 ml-[10px] py-[6px] pr-4 ${
                      isLastSection ? "" : "border-b border-[#1c1c1c]"
                    } text-[#e1e1e1] hover:text-[#fff]`}
                  >
                    {section.title}
                    <span className="flex items-center gap-1 bg-[#0B0B0B] text-[#8C8C8C] text-[12px] p-[6px] rounded-[8px] border border-l border-[#1D1D1D] ml-[12px]">
                      <img src="/design/img/topic-gray.png" alt="" />
                      {section.count}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        ))}

        <div className="flex flex-col w-full bg-[#131313] border-t border-r border-l border-[#1D1D1D] text-[#e1e1e1] rounded-[12px]">
          <Link
            to="#"
            className="flex items-center justify-between rounded-tr-[12px] rounded-tl-[12px] gap-2 py-[12px] px-[16px] hover:bg-[#161616]"
          >
            <span className="flex items-center gap-2">
              <div className="bg-[#0B0B0B] p-[6px] rounded-[8px] border border-[#1D1D1D]">
                <img src="/design/img/users.png" alt="" />
              </div>
              <p>Модераторы</p>
            </span>
            <span className="bg-[#0B0B0B] text-[#8C8C8C] text-[12px] p-[6px] rounded-[8px] border border-l border-[#1D1D1D] ml-[12px]">
              108
            </span>
          </Link>
        </div>
      </div>

      <MobileBottomNav activeHref="/forum" />
      <NavbarActionsSheet open={isNavbarSheetOpen} onClose={() => setIsNavbarSheetOpen(false)} />
    </div>
  );
}


