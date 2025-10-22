import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { NavbarActionsSheet } from "@/components/layout/NavbarActionsSheet";
import { fetchForumTopic, updateForumTopic, type ForumPost, type ForumTopicResponse } from "@/api/forum";
import { useAuth } from "@/contexts/useAuth";

const MAX_TITLE_LENGTH = 150;
const MAX_CONTENT_LENGTH = 20000;

type TopicState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: ForumTopicResponse };

export function ForumEditTopicPage() {
  const [isNavbarSheetOpen, setIsNavbarSheetOpen] = useState(false);
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [state, setState] = useState<TopicState>({ status: "loading" });
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!topicId) {
      setState({ status: "error", message: "Тема не найдена." });
      return;
    }

    let cancelled = false;

    const load = async () => {
      setState({ status: "loading" });
      try {
        const data = await fetchForumTopic(topicId, token ?? null, { page: 1, limit: 20 });
        if (!cancelled) {
          setState({ status: "ready", data });
          setTitle(data.topic.title);

          const firstPost = data.posts.reduce<ForumPost | null>((acc, post) => {
            if (!acc) return post;
            const accTime = new Date(acc.createdAt ?? 0).getTime();
            const postTime = new Date(post.createdAt ?? 0).getTime();
            return postTime < accTime ? post : acc;
          }, null);

          setContent(firstPost?.content ?? "");
        }
      } catch (err) {
        if (!cancelled) {
          setState({
            status: "error",
            message: err instanceof Error ? err.message : "Не удалось загрузить тему.",
          });
        }
      }
    };

    load().catch(() => {
      if (!cancelled) {
        setState({ status: "error", message: "Не удалось загрузить тему." });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [topicId, token]);

  const topic = state.status === "ready" ? state.data.topic : null;
  const section = state.status === "ready" ? state.data.section : null;
  const canEdit = topic?.permissions.canEdit ?? false;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!token) {
      setFormError("Необходимо войти в аккаунт.");
      return;
    }

    if (!topicId) {
      setFormError("Тема не найдена.");
      return;
    }

    if (!canEdit) {
      setFormError("У вас нет прав для редактирования.");
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
      const response = await updateForumTopic(topicId, { title: trimmedTitle, content: trimmedContent }, token);
      navigate(`/forum/topics/${encodeURIComponent(response.topic.id)}`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Не удалось обновить тему.");
    } finally {
      setSubmitting(false);
    }
  };

  const headerTitle = useMemo(() => {
    if (state.status === "ready") {
      return state.data.topic.title;
    }
    if (state.status === "loading") {
      return "Загрузка...";
    }
    return "Редактирование темы";
  }, [state]);

  return (
    <div className="bg-black m-[auto] flex flex-col items-center justify-center gap-1 sm:gap-4 pb-[70px] sm:pb-[70px] sm:flex-row sm:items-start text-[#dbdbdb]">
      <DesktopSidebar />

      <div className="w-full max-w-[540px] flex flex-col gap-4 items-center text-[14px] p-3 sm:gap-4 sm:p-0">
        <div className="flex items-center justify-between w-full bg-[#131313] border-b border-[#1D1D1D] text-[#dbdbdb] sticky top-0 sm:hidden">
          <Link
            to={topic ? `/forum/topics/${encodeURIComponent(topic.id)}` : "/forum"}
            className="flex items-center gap-1 px-[16px] py-[14px]"
          >
            <img src="/design/img/back.png" alt="Назад" />
          </Link>
          <div className="flex justify-center font-semibold">Редактирование темы</div>
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
          <Link
            to={topic ? `/forum/topics/${encodeURIComponent(topic.id)}` : "/forum"}
            className="flex items-center gap-1 pr-4 py-3"
          >
            <img className="w-[26px]" src="/design/img/back.png" alt="Назад" />
          </Link>
          <div className="flex justify-center font-semibold text-[16px] gap-2">
            <p>Форум</p>
            <p className="text-[#414141] font-bold">/</p>
            <p>{section?.title ?? "Раздел"}</p>
            <p className="text-[#414141] font-bold">/</p>
            <p>{headerTitle}</p>
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

        {state.status === "loading" ? (
          <div className="flex flex-col w-full bg-[#131313] border border-[#1D1D1D] rounded-[12px] p-6 text-center text-[#a3a3a3]">
            Загружаем тему...
          </div>
        ) : null}

        {state.status === "error" ? (
          <div className="flex flex-col w-full bg-[#1b0f0f] border border-[#401919] rounded-[12px] p-4 text-[#f5c1c1]">
            {state.message}
          </div>
        ) : null}

        {state.status === "ready" ? (
          <form className="flex flex-col w-full gap-4" onSubmit={handleSubmit}>
            {!canEdit ? (
              <div className="flex flex-col w-full bg-[#1b0f0f] border border-[#401919] rounded-[12px] p-4 text-[#f5c1c1]">
                У вас нет прав для редактирования этой темы.
              </div>
            ) : null}

            <div className="flex flex-col w-full text-[#dbdbdb] gap-2">
              <label htmlFor="edit-topic-title" className="px-1 text-[14px]">
                Заголовок темы
              </label>
              <input
                id="edit-topic-title"
                className="pl-4 px-2 py-3 w-full focus:border-[#505050] focus:outline bg-[#131313] border border-[#1D1D1D] text-[#ffffff] placeholder:text-[#dbdbdb] rounded-[12px] text-[14px]"
                type="text"
                placeholder="Название темы"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={MAX_TITLE_LENGTH}
                disabled={!canEdit || submitting}
              />
            </div>

            <div className="flex flex-col w-full text-[#dbdbdb] gap-2">
              <label htmlFor="edit-topic-message" className="px-1 text-[14px]">
                Первое сообщение
              </label>
              <textarea
                id="edit-topic-message"
                rows={10}
                placeholder="Введите содержимое первого сообщения"
                className="w-full p-4 border border-[#1D1D1D] rounded-[12px] bg-[#131313] text-[#ffffff] placeholder:text-[#8C8C8C] leading-[1.4] focus:ring-0 focus:outline-none min-h-[120px] resize-none"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                maxLength={MAX_CONTENT_LENGTH}
                disabled={!canEdit || submitting}
              />
              <div className="flex justify-between items-center text-[12px] text-[#8C8C8C]">
                <span>{content.length} / {MAX_CONTENT_LENGTH}</span>
                {formError ? <span className="text-[#f0948b]">{formError}</span> : null}
              </div>
            </div>

            <div className="w-full">
              <button
                type="submit"
                className="px-2 py-3 bg-[#31AEEC] text-black font-bold rounded-[8px] w-full hover:bg-[#3abdff]"
                disabled={!canEdit || submitting}
              >
                {submitting ? "Сохранение..." : "Сохранить изменения"}
              </button>
            </div>
          </form>
        ) : null}
      </div>

      <MobileBottomNav activeHref="/forum" />
      <NavbarActionsSheet open={isNavbarSheetOpen} onClose={() => setIsNavbarSheetOpen(false)} />
    </div>
  );
}
