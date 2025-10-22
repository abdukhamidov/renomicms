import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { NavbarActionsSheet } from "@/components/layout/NavbarActionsSheet";
import { fetchForumSection, createForumTopic, type ForumSectionResponse } from "@/api/forum";
import { useAuth } from "@/contexts/useAuth";

const MAX_TITLE_LENGTH = 150;
const MAX_CONTENT_LENGTH = 20000;

export function ForumCreateTopicPage() {
  const [isNavbarSheetOpen, setIsNavbarSheetOpen] = useState(false);
  const { sectionId } = useParams<{ sectionId: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [sectionData, setSectionData] = useState<ForumSectionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!sectionId) {
      setFetchError("Раздел не найден.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchForumSection(sectionId, token ?? null, { limit: 1 });
        if (!cancelled) {
          setSectionData(data);
          setFetchError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setFetchError(err instanceof Error ? err.message : "Не удалось загрузить раздел.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load().catch(() => {
      if (!cancelled) {
        setFetchError("Не удалось загрузить раздел.");
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [sectionId, token]);

  const canCreate = sectionData?.permissions.canCreateTopic ?? false;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!token) {
      setFormError("Необходимо войти в аккаунт.");
      return;
    }

    if (!sectionId) {
      setFormError("Раздел не найден.");
      return;
    }

    if (!canCreate) {
      setFormError("В этом разделе нельзя создавать темы.");
      return;
    }

    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (!trimmedTitle) {
      setFormError("Введите заголовок.");
      return;
    }

    if (trimmedTitle.length > MAX_TITLE_LENGTH) {
      setFormError("Заголовок слишком длинный.");
      return;
    }

    if (!trimmedContent) {
      setFormError("Введите сообщение.");
      return;
    }

    if (trimmedContent.length > MAX_CONTENT_LENGTH) {
      setFormError("Сообщение слишком длинное.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await createForumTopic(sectionId, { title: trimmedTitle, content: trimmedContent }, token);
      navigate(`/forum/topics/${encodeURIComponent(result.topic.id)}`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Не удалось создать тему.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-black m-[auto] flex flex-col items-center justify-center gap-1 sm:gap-4 pb-[70px] sm:pb-[70px] sm:flex-row sm:items-start text-[#dbdbdb]">
      <DesktopSidebar />

      <div className="flex items-center justify-between z-50 w-full bg-[#131313] border-b border-[#1D1D1D] text-[#dbdbdb] sticky top-0 sm:hidden">
        <Link
          to={sectionData ? `/forum/sections/${encodeURIComponent(sectionData.section.id)}` : "/forum"}
          className="flex items-center gap-1 px-[16px] py-[14px]"
        >
          <img src="/design/img/back.png" alt="Назад" />
        </Link>
        <div className="flex flex-col items-center justify-center">
          <span className="flex items-center gap-1 font-semibold text-[14px]">
            {sectionData?.section.title ?? "Создание темы"}
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
          <Link
            to={sectionData ? `/forum/sections/${encodeURIComponent(sectionData.section.id)}` : "/forum"}
            className="flex items-center gap-1 pr-4 py-3"
          >
            <img className="w-[26px]" src="/design/img/back.png" alt="Назад" />
          </Link>
          <div className="flex justify-center font-semibold text-[16px] gap-2">
            <p>Форум</p>
            <p className="text-[#414141] font-bold">/</p>
            <p>{sectionData?.section.title ?? "Раздел"}</p>
            <p className="text-[#414141] font-bold">/</p>
            <p>Создание темы</p>
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

        {loading ? (
          <div className="flex flex-col w-full bg-[#131313] border border-[#1D1D1D] rounded-[12px] p-6 text-center text-[#a3a3a3]">
            Загружаем информацию о разделе...
          </div>
        ) : null}

        {fetchError ? (
          <div className="flex flex-col w-full bg-[#1b0f0f] border border-[#401919] rounded-[12px] p-4 text-[#f5c1c1]">
            {fetchError}
          </div>
        ) : null}

        {sectionData ? (
          <div className="flex flex-col gap-2 bg-[#131313] border border-[#1D1D1D] text-white p-[16px] rounded-[12px] w-full">
            <div className="flex flex-row items-center justify-between">
              <div className="flex flex-col">
                <p className="text-[16px] font-semibold">{sectionData.section.title}</p>
                <p className="text-[12px] text-[#9d9d9d]">{sectionData.section.description}</p>
              </div>
              <div className="flex items-center text-[#8C8C8C] text-[12px]">
                Тем: {sectionData.topics.length + sectionData.pinnedTopics.length}
              </div>
            </div>
            {token ? null : (
              <div className="text-[12px] text-[#8C8C8C]">
                Чтобы создать тему,{" "}
                <Link to="/auth/login" className="text-[#31AEEC] hover:underline">
                  войдите
                </Link>{" "}
                или{" "}
                <Link to="/auth/register" className="text-[#31AEEC] hover:underline">
                  зарегистрируйтесь
                </Link>
                .
              </div>
            )}
            {!canCreate ? (
              <div className="text-[12px] text-[#f0948b]">
                В этом разделе запрещено создавать темы. Обратитесь к администратору.
              </div>
            ) : null}
          </div>
        ) : null}

        <form className="flex flex-col w-full gap-3" onSubmit={handleSubmit}>
          <div className="flex flex-col w-full">
            <label htmlFor="topic-title" className="px-1 text-[14px] text-[#9d9d9d]">
              Заголовок темы
            </label>
            <input
              id="topic-title"
              className="p-4 w-full focus:border-[#505050] focus:outline bg-[#131313] border border-[#1D1D1D] text-[#ffffff] placeholder:text-[#dbdbdb] rounded-[12px] text-[14px]"
              type="text"
              placeholder="Название темы"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={MAX_TITLE_LENGTH}
              disabled={!canCreate || submitting}
            />
          </div>

          <div className="flex flex-col w-full bg-[#131313] border border-[#1D1D1D] text-white p-[16px] rounded-[12px]">
            <label htmlFor="topic-content" className="px-1 text-[14px] text-[#9d9d9d]">
              Сообщение
            </label>
            <textarea
              id="topic-content"
              rows={8}
              placeholder="Поделитесь подробностями, опишите проблему или идею..."
              className="w-full bg-[#131313] text-[#dbdbdb] placeholder:text-[#8C8C8C] resize-none overflow-hidden leading-[1.4] border-0 focus:ring-0 focus:outline-none min-h-[120px]"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              maxLength={MAX_CONTENT_LENGTH}
              disabled={!canCreate || submitting}
            />
            <div className="flex justify-between items-center text-[12px] text-[#8C8C8C] mt-2">
              <span>{content.length} / {MAX_CONTENT_LENGTH}</span>
              {formError ? <span className="text-[#f0948b]">{formError}</span> : null}
            </div>
            <div className="flex items-center justify-end pt-4">
              <button
                type="submit"
                className="py-[6px] px-[14px] font-bold text-[#000000] bg-[#32afed] hover:bg-[#2b99cf] rounded-[8px]"
                disabled={!canCreate || submitting}
              >
                {submitting ? "Создание..." : "Создать тему"}
              </button>
            </div>
          </div>
        </form>
      </div>

      <MobileBottomNav activeHref="/forum" />
      <NavbarActionsSheet open={isNavbarSheetOpen} onClose={() => setIsNavbarSheetOpen(false)} />
    </div>
  );
}
