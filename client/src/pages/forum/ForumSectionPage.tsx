import { useState } from "react";
import { Link } from "react-router-dom";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { NavbarActionsSheet } from "@/components/layout/NavbarActionsSheet";

type TopicLink = {
  title: string;
  replies: string;
  icon: string;
  pinned?: boolean;
  locked?: boolean;
  href?: string;
};

const pinnedTopics: TopicLink[] = [
  { title: "Форум", replies: "12", icon: "/design/img/pin.png", pinned: true },
  { title: "NOMICMS INDONESIA", replies: "8", icon: "/design/img/pin.png", pinned: true },
];

const regularTopics: TopicLink[] = [
  { title: "Админ-чат", replies: "6", icon: "/design/img/topic-gray.png" },
  { title: "Nomicms v3", replies: "23", icon: "/design/img/topic-gray.png" },
  { title: "Форум", replies: "12", icon: "/design/img/topic-gray.png" },
  { title: "Закрытая тема", replies: "0", icon: "/design/img/lock.png", locked: true },
];

export function ForumSectionPage() {
  const [isNavbarSheetOpen, setIsNavbarSheetOpen] = useState(false);

  const renderTopicLink = (topic: TopicLink, isLast?: boolean) => (
    <Link
      key={topic.title}
      to="/forum/topic"
      className={["flex items-center pl-4 hover:bg-[#161616]", isLast ? "hover:rounded-b-[12px]" : ""].filter(Boolean).join(" ")}
    >
      <div className="flex items-center justify-center p-[6px]">
        <img className="w-[18px] h-[18px]" src={topic.icon} alt="" />
      </div>
      <div
        className={`flex items-center justify-between w-full pl-0 ml-[10px] py-[6px] pr-4 ${
          isLast ? "" : "border-b border-[#1c1c1c]"
        } text-[#e1e1e1] hover:text-[#fff]`}
      >
        {topic.title}
        <span className="flex items-center gap-1 bg-[#0B0B0B] text-[#8C8C8C] text-[12px] p-[6px] rounded-[8px] border border-l border-[#1D1D1D] ml-[12px]">
          <img src="/design/img/comment-gray.png" alt="" />
          {topic.replies}
        </span>
      </div>
    </Link>
  );

  return (
    <div className="bg-black m-[auto] flex flex-col items-center justify-center gap-1 sm:gap-4 pb-[70px] sm:pb-[70px] sm:flex-row sm:items-start text-[#dbdbdb]">
      <DesktopSidebar />

        <div className="flex items-center justify-between z-50 w-full bg-[#131313] border-b border-[#1D1D1D] text-[#dbdbdb] sticky top-0 sm:hidden">
          <Link to="/forum" className="flex items-center gap-1 px-[16px] py-[14px]">
            <img src="/design/img/back.png" alt="Назад" />
          </Link>
          <div className="flex justify-center font-semibold">Название раздела</div>
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
      <div className="w-full max-w-[540px] flex flex-col gap-3 items-center text-[14px] p-3 sm:gap-4 sm:p-0">
        

        <div className="hidden sm:flex items-center pt-1 justify-between w-full text-[#dbdbdb] sticky top-0 bg-black z-50">
          <Link to="/forum" className="flex items-center gap-1 pr-4 py-3">
            <img className="w-[26px]" src="/design/img/back.png" alt="Назад" />
          </Link>
          <div className="flex justify-center font-semibold text-[16px] gap-2">
            <p>Форум</p>
            <p className="text-[#414141] font-bold">/</p>
            <p>Название раздела</p>
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

        <Link
          to="/forum/create"
          className="flex items-center justify-center py-[10px] px-[14px] bg-[#66e48b] border border-[#1D1D1D] text-[#0a130d] font-bold text-[14px] gap-1 w-full rounded-[12px]"
        >
          <img src="/design/img/add.png" alt="" />
          <p className="mb-[-1px]">Создать тему</p>
        </Link>

        <div className="flex flex-col w-full bg-[#131313] border-t border-r border-l border-[#1D1D1D] text-[#e1e1e1] rounded-[12px] overflow-hidden">
          <div className="flex items-center justify-between bg-[#101010] border-b border-[#1D1D1D] gap-2 py-[12px] px-[16px]">
            <span className="flex items-center gap-2">
              <div className="bg-[#0B0B0B] p-[6px] rounded-[8px] border border-[#1D1D1D]">
                <img src="/design/img/forum.png" alt="" />
              </div>
              <p className="text-[16px]">Название раздела</p>
            </span>
            <span className="bg-[#0B0B0B] text-[#8C8C8C] text-[12px] p-[6px] rounded-[8px] border border-l border-[#1D1D1D] ml-[12px]">
              55 тем / 646 постов
            </span>
          </div>

          {pinnedTopics.map((topic) => renderTopicLink(topic))}
          {regularTopics.map((topic, index) => renderTopicLink(topic, index === regularTopics.length - 1))}
        </div>

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



