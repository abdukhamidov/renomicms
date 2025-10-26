import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import LinkExtension from "@tiptap/extension-link";
import { BubbleMenu, EditorContent, useEditor } from "@tiptap/react";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { NavbarActionsSheet } from "@/components/layout/NavbarActionsSheet";
import { useAuth } from "@/contexts/useAuth";
import {
  createNews,
  deleteNews,
  fetchNewsList,
  updateNews,
  type NewsItem,
  type NewsPayload,
} from "@/api/news";
import { resolveMediaUrl } from "@/utils/media";

const PAGE_TITLE = "Новости";
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

type FormMode = "create" | "edit";

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, " ");
}

export function AdminNewsPage() {
  const { user, token, initializing } = useAuth();
  const [isNavbarSheetOpen, setNavbarSheetOpen] = useState(false);
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formMode, setFormMode] = useState<FormMode>("create");
  const [isFormVisible, setFormVisible] = useState(false);
  const [selectedNewsId, setSelectedNewsId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [coverImageValue, setCoverImageValue] = useState<string | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const [coverImageInput, setCoverImageInput] = useState("");
  const [coverImageChanged, setCoverImageChanged] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [pendingContent, setPendingContent] = useState<string | null>(null);
  const [contentDraft, setContentDraft] = useState("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3, 4],
        },
      }),
      LinkExtension.configure({
        openOnClick: false,
        linkOnPaste: true,
      }),
      Placeholder.configure({
        placeholder: "Напишите текст новости...",
      }),
    ],
    autofocus: false,
    editable: true,
    content: "",
    editorProps: {
      attributes: {
        class: "min-h-[220px] outline-none focus:outline-none",
      },
    },
    onUpdate({ editor: current }) {
      setContentDraft(current.getHTML());
    },
    onCreate({ editor: current }) {
      setContentDraft(current.getHTML());
    },
  });

  useEffect(() => {
    if (!editor || pendingContent === null) {
      return;
    }
    editor.commands.setContent(pendingContent, false);
    setContentDraft(pendingContent);
    setPendingContent(null);
  }, [editor, pendingContent]);

  const contentPlainLength = useMemo(() => {
    if (editor) {
      return editor.getText().replace(/\u00a0/g, " ").trim().length;
    }
    return stripHtml(contentDraft).replace(/\s+/g, " ").trim().length;
  }, [editor, contentDraft]);

  const loadNews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchNewsList({}, token ?? null);
      setNewsItems(response.news);
    } catch (requestError) {
      if (requestError instanceof Error) {
        setError(requestError.message);
      } else {
        setError("Не удалось загрузить новости.");
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadNews();
  }, [loadNews]);

  const resetForm = useCallback(
    (options?: { keepVisibility?: boolean }) => {
      setFormMode("create");
      setSelectedNewsId(null);
      setTitle("");
      setCoverImageValue(null);
      setCoverImagePreview(null);
      setCoverImageInput("");
      setCoverImageChanged(false);
      setFormError(null);
      setFormSuccess(null);
      setPendingContent("");
      if (editor) {
        editor.commands.setContent("", false);
        setContentDraft("");
      }
      if (!options?.keepVisibility) {
        setFormVisible(false);
      }
    },
    [editor],
  );

  const handleSelectNews = useCallback(
    (item: NewsItem) => {
      setFormMode("edit");
      setSelectedNewsId(item.id);
      setTitle(item.title);
      const preview = item.coverImageUrl ? resolveMediaUrl(item.coverImageUrl) ?? item.coverImageUrl : null;
      setCoverImageValue(item.coverImageUrl ?? null);
      setCoverImagePreview(preview);
      setCoverImageInput(item.coverImageUrl ?? "");
      setCoverImageChanged(false);
      setFormError(null);
      setFormSuccess(null);
      setPendingContent(item.content ?? "");
      setContentDraft(item.content ?? "");
      if (editor) {
        editor.commands.setContent(item.content ?? "", false);
      }
      setFormVisible(true);
    },
    [editor],
  );

  const handleCoverFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }

      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        setFormError("Файл слишком большой (10МБ).");
        event.target.value = "";
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setCoverImageValue(reader.result);
          setCoverImagePreview(reader.result);
          setCoverImageChanged(true);
          setFormError(null);
          setFormSuccess(null);
        } else {
          setFormError("Не удалось прочитать файл.");
        }
        event.target.value = "";
      };
      reader.onerror = () => {
        setFormError("Не удалось прочитать файл.");
        event.target.value = "";
      };
      reader.readAsDataURL(file);
    },
    [],
  );

  const handleApplyImageUrl = useCallback(() => {
    const trimmed = coverImageInput.trim();
    if (!trimmed) {
      setFormError("Укажите URL изображения.");
      return;
    }
    setCoverImageValue(trimmed);

    const preview = resolveMediaUrl(trimmed) ?? trimmed;
    setCoverImagePreview(preview);
    setCoverImageChanged(true);
    setFormError(null);
    setFormSuccess(null);
  }, [coverImageInput]);

  const handleRemoveImage = useCallback(() => {
    setCoverImageValue("");
    setCoverImagePreview(null);
    setCoverImageChanged(true);
    setFormError(null);
    setFormSuccess(null);
    setCoverImageInput("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleOpenCreate = useCallback(() => {
    setFormVisible(true);
    resetForm({ keepVisibility: true });
  }, [resetForm]);

  const bubbleButtonClasses = useCallback(
    (active: boolean) =>
      [
        "px-[8px]",
        "py-[6px]",
        "rounded-[8px]",
        "text-[14px]",
        "font-semibold",
        active ? "bg-[#32afed] text-black" : "bg-transparent text-[#dbdbdb] hover:bg-[#1D1D1D]",
      ]
        .filter(Boolean)
        .join(" "),
    [],
  );

  const bubbleMenu = editor ? (
    <BubbleMenu
      editor={editor}
      tippyOptions={{ duration: 120, placement: "top" }}
      className="flex items-center gap-1 rounded-[12px] border border-[#1D1D1D] bg-[#0B0B0B] px-2 py-1 shadow-lg"
    >
      <button
        type="button"
        className={bubbleButtonClasses(editor.isActive("bold"))}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => editor.chain().focus().toggleBold().run()}
        aria-label="Жирный"
      >
        B
      </button>
      <button
        type="button"
        className={bubbleButtonClasses(editor.isActive("italic"))}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        aria-label="Курсив"
      >
        I
      </button>
      <button
        type="button"
        className={bubbleButtonClasses(editor.isActive("strike"))}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        aria-label="Зачёркнутый"
      >
        S
      </button>
      <button
        type="button"
        className={bubbleButtonClasses(editor.isActive("code"))}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => editor.chain().focus().toggleCode().run()}
        aria-label="Код"
      >
        {"</>"}
      </button>
      <button
        type="button"
        className={bubbleButtonClasses(editor.isActive("link"))}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          if (editor.isActive("link")) {
            editor.chain().focus().unsetLink().run();
            return;
          }
          const previous = editor.getAttributes("link").href ?? "";
          const url = window.prompt("Введите URL", previous);
          if (url === null) {
            return;
          }
          const trimmed = url.trim();
          if (!trimmed) {
            editor.chain().focus().unsetLink().run();
            return;
          }
          editor.chain().focus().extendMarkRange("link").setLink({ href: trimmed }).run();
        }}
        aria-label="Ссылка"
      >
        &#128279;
      </button>
    </BubbleMenu>
  ) : null;

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!token) {
        setFormError("Требуется авторизация.");
        return;
      }
      const trimmedTitle = title.trim();
      if (!trimmedTitle) {
        setFormError("Укажите заголовок.");
        return;
      }
      const contentHtml = editor ? editor.getHTML() : contentDraft;
      const trimmedContent = contentHtml.trim();
      if (!trimmedContent) {
        setFormError("Добавьте содержание новости.");
        return;
      }

      const payload: NewsPayload = {
        title: trimmedTitle,
        content: trimmedContent,
      };

      if (formMode === "create" || coverImageChanged) {
        payload.coverImage = coverImageValue && coverImageValue.length > 0 ? coverImageValue : "";
      }

      setIsSubmitting(true);
      setFormError(null);
      setFormSuccess(null);

      try {
        if (formMode === "create") {
          const response = await createNews(payload, token);
          setFormSuccess("Новость создана.");
          setNewsItems((prev) => [response.news, ...prev]);
          setFormMode("edit");
          setSelectedNewsId(response.news.id);
          setCoverImageChanged(false);
          setCoverImageValue(response.news.coverImageUrl ?? null);
          setCoverImagePreview(response.news.coverImageUrl ?? null);
          setCoverImageInput(response.news.coverImageUrl ?? "");
          setPendingContent(response.news.content ?? "");
          setTitle(response.news.title);
          if (editor) {
            editor.commands.setContent(response.news.content ?? "", false);
          }
        } else if (selectedNewsId) {
          const response = await updateNews(selectedNewsId, payload, token);
          setFormSuccess("Новость обновлена.");
          setNewsItems((prev) => prev.map((item) => (item.id === response.news.id ? response.news : item)));
          setCoverImageChanged(false);
          setCoverImageValue(response.news.coverImageUrl ?? null);
          setCoverImagePreview(response.news.coverImageUrl ?? null);
          setCoverImageInput(response.news.coverImageUrl ?? "");
          setPendingContent(response.news.content ?? "");
          setTitle(response.news.title);
          if (editor) {
            editor.commands.setContent(response.news.content ?? "", false);
          }
        }
      } catch (requestError) {
        if (requestError instanceof Error) {
          setFormError(requestError.message);
        } else {
          setFormError("Не удалось сохранить новость.");
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [formMode, coverImageChanged, coverImageValue, title, editor, contentDraft, selectedNewsId, token],
  );

  const handleDelete = useCallback(async () => {
    if (!token || !selectedNewsId) {
      return;
    }
    if (!window.confirm("Удалить эту новость?")) {
      return;
    }
    setIsDeleting(true);
    setFormError(null);
    setFormSuccess(null);
    try {
      await deleteNews(selectedNewsId, token);
      setNewsItems((prev) => prev.filter((item) => item.id !== selectedNewsId));
      resetForm();
      setFormSuccess("Новость удалена.");
    } catch (requestError) {
      if (requestError instanceof Error) {
        setFormError(requestError.message);
      } else {
        setFormError("Не удалось удалить новость.");
      }
    } finally {
      setIsDeleting(false);
    }
  }, [token, selectedNewsId, resetForm]);

  if (initializing) {
    return null;
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  if (user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      <div className="bg-black m-[auto] flex flex-col items-center justify-center gap-1 sm:gap-4 pb-[70px] sm:pb-[70px] sm:flex-row sm:items-start">
        <DesktopSidebar />

        <div className="max-w-[540px] w-full flex flex-col gap-4 text-[14px] p-3 sm:p-0">
          <div className="flex items-center justify-between w-full bg-[#131313] border-b border-[#1D1D1D] text-[#dbdbdb] sticky top-0 sm:hidden">
            <Link to="/admin" className="flex items-center gap-1 px-[16px] py-[14px]">
              <img src="/design/img/back.png" alt="" />
            </Link>
            <div className="flex justify-center font-semibold">{PAGE_TITLE}</div>
            <button
              type="button"
              className="flex items-center gap-1 px-[16px] py-[14px]"
              data-bottom-sheet-open="true"
              data-bottom-sheet-target="navbar-actions"
              onClick={() => setNavbarSheetOpen(true)}
            >
              <img src="/design/img/more.png" alt="" />
            </button>
          </div>

          <div className="hidden sm:flex items-center pt-1 justify-between w-full text-[#dbdbdb] sticky top-0 bg-black z-50">
            <Link to="/admin" className="flex items-center gap-1 pr-4 py-3">
              <img className="w-[26px]" src="/design/img/back.png" alt="" />
            </Link>
            <div className="flex justify-center font-semibold text-[16px] gap-2">
              <p>{PAGE_TITLE}</p>
            </div>
            <button
              type="button"
              className="flex items-center gap-1 px-[16px] py-[14px]"
              data-bottom-sheet-open="true"
              data-bottom-sheet-target="navbar-actions"
              onClick={() => setNavbarSheetOpen(true)}
            >
              <img src="/design/img/more.png" alt="" />
            </button>
          </div>

          {isFormVisible ? (
            <form
              className="flex flex-col gap-3 rounded-[16px] border border-[#1D1D1D] bg-[#131313] p-4 text-[#dbdbdb]"
              onSubmit={handleSubmit}
            >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[18px] font-semibold text-white">
                  {formMode === "create" ? "Создание новости" : "Редактирование новости"}
                </p>
                <p className="text-[12px] text-[#8C8C8C]">
                  {formMode === "create"
                    ? "Заполните форму, чтобы опубликовать новую запись."
                    : "Внесите изменения в выбранную новость."}
                </p>
              </div>
              {formMode === "edit" ? (
                <button
                  type="button"
                  className="rounded-[10px] border border-[#232323] bg-[#1C1C1C] px-3 py-2 text-[12px] font-semibold text-[#dbdbdb] hover:bg-[#232323]"
                  onClick={() => resetForm({ keepVisibility: true })}
                >
                  Новая новость
                </button>
              ) : null}
            </div>

            <label className="flex flex-col gap-2">
              <span className="text-[12px] uppercase tracking-wide text-[#6f6f6f]">Заголовок</span>
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Новина reNomiCMS"
                className="w-full rounded-[12px] border border-[#1D1D1D] bg-[#101010] px-4 py-3 text-[14px] text-[#f1f1f1] placeholder:text-[#666666] focus:border-[#32afed] focus:outline-none"
                disabled={isSubmitting || isDeleting}
              />
            </label>

            <div className="flex flex-col gap-2 rounded-[12px] border border-[#1D1D1D] bg-[#101010] p-3">
              <span className="text-[12px] uppercase tracking-wide text-[#6f6f6f]">Ковер</span>
              {coverImagePreview ? (
                <div className="overflow-hidden rounded-[12px] border border-[#1D1D1D]">
                  <img src={coverImagePreview} alt="" className="h-[180px] w-full object-cover" />
                </div>
              ) : (
                <div className="flex h-[180px] items-center justify-center rounded-[12px] border border-dashed border-[#2a2a2a] bg-[#0B0B0B] text-[13px] text-[#777777]">
                  Изображение не выбрано
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCoverFileChange}
                  className="hidden"
                  disabled={isSubmitting || isDeleting}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-[10px] border border-[#232323] bg-[#1C1C1C] px-3 py-2 text-[12px] font-semibold text-[#dbdbdb] hover:bg-[#232323]"
                  disabled={isSubmitting || isDeleting}
                >
                  Выбрать файл
                </button>
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="rounded-[10px] border border-[#402626] bg-[#2A1414] px-3 py-2 text-[12px] font-semibold text-[#f5caca] hover:bg-[#341919]"
                  disabled={isSubmitting || isDeleting}
                >
                  Удалить
                </button>
              </div>
              <div className="flex flex-col gap-2">
                <label className="flex flex-col gap-2 text-[12px] text-[#8C8C8C]">
                  <span>Или URL</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      value={coverImageInput}
                      onChange={(event) => setCoverImageInput(event.target.value)}
                      placeholder="https://example.com/cover.png"
                      className="flex-1 rounded-[10px] border border-[#1D1D1D] bg-[#0B0B0B] px-3 py-2 text-[13px] text-[#e1e1e1] placeholder:text-[#666666] focus:border-[#32afed] focus:outline-none"
                      disabled={isSubmitting || isDeleting}
                    />
                    <button
                      type="button"
                      onClick={handleApplyImageUrl}
                      className="rounded-[10px] border border-[#2F94F9] bg-[#2F94F9] px-3 py-2 text-[12px] font-semibold text-black hover:bg-[#257acc]"
                      disabled={isSubmitting || isDeleting}
                    >
                      Применить
                    </button>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex flex-col gap-2 rounded-[12px] border border-[#1D1D1D] bg-[#101010] p-3">
              <span className="text-[12px] uppercase tracking-wide text-[#6f6f6f]">Текст новости</span>
              <div className="rounded-[12px] border border-[#1D1D1D] bg-[#0B0B0B] p-3">
                {bubbleMenu}
                <EditorContent editor={editor} className="tiptap-editor text-[14px] text-[#dbdbdb]" />
              </div>
              <div className="flex justify-between text-[12px] text-[#777777]">
                <span>{contentPlainLength} симв.</span>
                {selectedNewsId ? (
                  <span>
                    ID:{" "}
                    <code className="rounded bg-[#0B0B0B] px-2 py-[2px] text-[11px] text-[#bbbbbb]">
                      {selectedNewsId}
                    </code>
                  </span>
                ) : null}
              </div>
            </div>

            {formError ? (
              <div className="rounded-[10px] border border-[#402626] bg-[#2A1414] px-4 py-3 text-[13px] text-[#f5caca]">
                {formError}
              </div>
            ) : null}
            {formSuccess ? (
              <div className="rounded-[10px] border border-[#193524] bg-[#112519] px-4 py-3 text-[13px] text-[#93f2c4]">
                {formSuccess}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-[10px] border border-[#232323] bg-[#1C1C1C] px-4 py-2 text-[13px] font-semibold text-[#dbdbdb] hover:bg-[#232323]"
                onClick={() => resetForm({ keepVisibility: true })}
                disabled={isSubmitting || isDeleting}
              >
                Сброс
              </button>
              {formMode === "edit" ? (
                <button
                  type="button"
                  className="rounded-[10px] border border-[#f0948b] bg-[#3a1816] px-4 py-2 text-[13px] font-semibold text-[#f5caca] hover:bg-[#4a201d]"
                  onClick={handleDelete}
                  disabled={isSubmitting || isDeleting}
                >
                  {isDeleting ? "Удаление..." : "Удалить"}
                </button>
              ) : null}
              <button
                type="submit"
                className="rounded-[10px] border border-[#2F94F9] bg-[#2F94F9] px-4 py-2 text-[13px] font-semibold text-black hover:bg-[#257acc]"
                disabled={isSubmitting || isDeleting}
              >
                {isSubmitting ? "Сохранение..." : "Сохранить"}
              </button>
            </div>
            </form>
          ) : null}

          <section className="flex flex-col gap-3 rounded-[16px] border border-[#1D1D1D] bg-[#131313] p-4 text-[#dbdbdb]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[16px] font-semibold text-white">
                  Все новости
                </p>
                <p className="text-[12px] text-[#8C8C8C]">
                  {newsItems.length === 0
                    ? "Ещё нет публикаций."
                    : `${newsItems.length} записей.`}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded-[10px] border border-[#2F94F9] bg-[#2F94F9] px-3 py-2 text-[12px] font-semibold text-black hover:bg-[#257acc]"
                  onClick={handleOpenCreate}
                >
                  Добавить новость
                </button>
                <button
                  type="button"
                  className="rounded-[10px] border border-[#232323] bg-[#1C1C1C] px-3 py-2 text-[12px] font-semibold text-[#dbdbdb] hover:bg-[#232323]"
                  onClick={loadNews}
                  disabled={loading}
                >
                  {loading ? "Обновляю..." : "Обновить"}
                </button>
              </div>
            </div>

            {error ? (
              <div className="rounded-[10px] border border-[#402626] bg-[#2A1414] px-4 py-3 text-[13px] text-[#f5caca]">
                {error}
              </div>
            ) : null}

            <div className="flex flex-col gap-2">
              {newsItems.map((item) => (
                <article
                  key={item.id}
                  className="flex flex-col gap-2 rounded-[12px] border border-[#1D1D1D] bg-[#0B0B0B] p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-[12px] uppercase tracking-wide text-[#6f6f6f]">
                      {formatDateTime(item.publishedAt ?? item.updatedAt ?? item.createdAt)}
                    </span>
                    <p className="text-[15px] font-semibold text-white">{item.title}</p>
                    <p className="text-[13px] text-[#8C8C8C]">
                      {stripHtml(item.excerpt ?? "").slice(0, 120) || "Без краткого описания."}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0">
                    <button
                      type="button"
                      className="rounded-[10px] border border-[#2F94F9] bg-[#2F94F9] px-4 py-2 text-[12px] font-semibold text-black hover:bg-[#257acc]"
                      onClick={() => handleSelectNews(item)}
                    >
                      Открыть
                    </button>
                    {item.coverImageUrl ? (
                      <a
                        href={item.coverImageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-[10px] border border-[#232323] bg-[#1C1C1C] px-4 py-2 text-[12px] font-semibold text-[#dbdbdb] hover:bg-[#232323]"
                      >
                        Посмотреть
                      </a>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>

        <MobileBottomNav activeHref="/admin" />
      </div>

      <NavbarActionsSheet open={isNavbarSheetOpen} onClose={() => setNavbarSheetOpen(false)} textClassName="text-[16px]" />
    </>
  );
}
