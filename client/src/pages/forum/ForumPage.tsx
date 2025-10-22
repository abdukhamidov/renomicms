import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { NavbarActionsSheet } from "@/components/layout/NavbarActionsSheet";
import { fetchForumCategories, type ForumCategory, type ForumSectionSummary } from "@/api/forum";
import { useAuth } from "@/contexts/useAuth";

const DEFAULT_SECTION_ICON = "/design/img/folder.png";
const DEFAULT_CATEGORY_ICON = "/design/img/forum.png";

function formatNumber(value: number) {
  return new Intl.NumberFormat("ru-RU").format(value);
}

function formatSectionStats(section: ForumSectionSummary) {
  const topics = formatNumber(section.stats.topicsCount);
  const posts = formatNumber(section.stats.postsCount);
  return `${topics} тем / ${posts} сообщений`;
}

function formatLastActivity(section: ForumSectionSummary) {
  if (!section.stats.lastActivityAt) {
    return "Нет активности";
  }
  const date = new Date(section.stats.lastActivityAt);
  const formatted = new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
  const author = section.stats.lastActivityUser?.displayName ?? "Участник";
  return `${formatted} · ${author}`;
}

export function ForumPage() {
  const [isNavbarSheetOpen, setIsNavbarSheetOpen] = useState(false);
  const { token } = useAuth();
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const data = await fetchForumCategories(token ?? null);
        if (!cancelled) {
          setCategories(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Не удалось загрузить форум.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    setLoading(true);
    setError(null);
    load().catch(() => {
      if (!cancelled) {
        setError("Не удалось загрузить форум.");
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const hasData = useMemo(() => categories.some((category) => category.sections.length > 0), [categories]);

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

        <div className="flex flex-col gap-2 bg-[#131313] border border-[#1D1D1D] text-white p-[16px] rounded-[12px] w-full">
          <div className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <p className="flex items-center gap-2 text-[16px]">Добро пожаловать на форум NomiCMS!</p>
            </div>
            <button type="button" className="flex items-center text-gray-400 py-[8px] pl-[16px] pr-0">
              <img src="/design/img/close.png" alt="Скрыть" />
            </button>
          </div>
          <div className="text-[#dbdbdb] mt-[-12px]">
            Обсуждайте релизы, делитесь идеями и задавайте вопросы. Следите за правилами разделов и уважайте других участников.
          </div>
          <div className="flex">
            <Link
              to="/forum/sections/sec-nomicms-news"
              className="bg-[#66e48b] text-[#0a130d] font-bold py-[8px] px-[14px] rounded-[12px] border border-[#252525] hover:bg-[#5dd180]"
            >
              К объявлениям
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col w-full max-w-[540px] bg-[#131313] border border-[#1D1D1D] rounded-[12px] p-6 items-center justify-center text-[#a3a3a3]">
            Загружаем разделы...
          </div>
        ) : null}

        {error ? (
          <div className="flex flex-col w-full max-w-[540px] bg-[#1b0f0f] border border-[#401919] rounded-[12px] p-4 text-[#f5c1c1]">
            {error}
          </div>
        ) : null}

        {!loading && !error && !hasData ? (
          <div className="flex flex-col w-full max-w-[540px] bg-[#131313] border border-[#1D1D1D] rounded-[12px] p-6 text-center text-[#a3a3a3]">
            Пока что здесь пусто. Создайте первый раздел через административную панель или дождитесь активности сообщества.
          </div>
        ) : null}

        {categories.map((category) => (
          <div key={category.id} className="flex flex-col w-full bg-[#131313] border border-[#1D1D1D] text-[#e1e1e1] rounded-[12px] overflow-hidden">
            <div className="flex items-center justify-between bg-[#101010] border-b border-[#1D1D1D] gap-2 py-[12px] px-[16px]">
              <div className="flex items-center gap-2">
                <div className="bg-[#0B0B0B] p-[8px] rounded-[10px] border border-[#1D1D1D]">
                  <img src={category.icon ?? DEFAULT_CATEGORY_ICON} alt="" />
                </div>
                <div>
                  <p className="font-bold">{category.title}</p>
                  <p className="text-[12px] text-[#9b9b9b]">{category.description}</p>
                </div>
              </div>
              <div className="flex items-center bg-[#0B0B0B] text-[#8C8C8C] text-[12px] p-[6px] rounded-[8px] border border-l border-[#1D1D1D] ml-[12px] gap-2">
                {formatNumber(category.stats.topicsCount)} тем · {formatNumber(category.stats.postsCount)} сообщений
              </div>
            </div>
            {category.sections.map((section, sectionIndex) => {
              const isLastSection = sectionIndex === category.sections.length - 1;
              const iconSrc = section.isLocked ? "/design/img/lock.png" : section.icon ?? DEFAULT_SECTION_ICON;
              return (
                <Link
                  key={section.id}
                  to={`/forum/sections/${encodeURIComponent(section.id)}`}
                  className={[
                    "flex items-center pl-4 hover:bg-[#161616]",
                    isLastSection ? "hover:rounded-b-[12px]" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <div className="flex items-center justify-center p-[6px]">
                    <img className="w-[18px] h-[18px]" src={section.pinnedCount > 0 ? "/design/img/pin.png" : iconSrc} alt="" />
                  </div>
                  <div
                    className={`flex items-center justify-between w-full pl-0 ml-[10px] py-[6px] pr-4 ${
                      isLastSection ? "" : "border-b border-[#1c1c1c]"
                    } text-[#e1e1e1] hover:text-[#fff]`}
                  >
                    <span className="flex flex-col">
                      <span className="font-semibold">{section.title}</span>
                      <span className="text-[11px] text-[#9d9d9d]">{formatLastActivity(section)}</span>
                    </span>
                    <span className="flex flex-col items-end gap-[2px]">
                      <span className="flex items-center gap-1 bg-[#0B0B0B] text-[#8C8C8C] text-[12px] p-[6px] rounded-[8px] border border-l border-[#1D1D1D] ml-[12px]">
                        <img src="/design/img/topic-gray.png" alt="" />
                        {formatSectionStats(section)}
                      </span>
                      {section.isLocked ? (
                        <span className="flex items-center gap-1 text-[#f0948b] text-[11px]">
                          <img src="/design/img/lock.png" alt="" className="w-[12px] h-[12px]" />
                          Раздел закрыт
                        </span>
                      ) : null}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        ))}

        <div className="flex flex-col w-full bg-[#131313] border border-[#1D1D1D] text-[#e1e1e1] rounded-[12px] p-4 items-center">
          <div className="flex items-center gap-2 text-[14px] text-[#9d9d9d]">
            <img src="/design/img/users.png" alt="" className="w-[18px] h-[18px]" />
            <span>Онлайн: статистика появится в одном из ближайших обновлений</span>
          </div>
        </div>
      </div>

      <MobileBottomNav activeHref="/forum" />
      <NavbarActionsSheet open={isNavbarSheetOpen} onClose={() => setIsNavbarSheetOpen(false)} />
    </div>
  );
}
