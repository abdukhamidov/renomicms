import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { NavbarActionsSheet } from "@/components/layout/NavbarActionsSheet";
import { useAuth } from "@/contexts/useAuth";
import { useSiteAccess } from "@/contexts/SiteAccessContext";
import { updateSiteAccess } from "@/api/siteAccess";

const PAGE_TITLE = "Доступ к сайту";

type ModeOption = {
  value: "public" | "auth_only" | "maintenance";
  title: string;
  description: string;
};

const MODE_OPTIONS: ModeOption[] = [
  {
    value: "public",
    title: "Открытый доступ",
    description: "Все посетители видят контент без авторизации.",
  },
  {
    value: "auth_only",
    title: "Только авторизованные",
    description: "Гости будут перенаправлены на страницу входа.",
  },
  {
    value: "maintenance",
    title: "Закрыть сайт для всех",
    description: "Покажем сообщение о техработах для всех пользователей.",
  },
];

export function AdminSiteAccessPage() {
  const { user, token, initializing } = useAuth();
  const { status, setStatus } = useSiteAccess();

  const [isNavbarSheetOpen, setNavbarSheetOpen] = useState(false);
  const [mode, setMode] = useState(status.mode);
  const [message, setMessage] = useState(status.message);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setMode(status.mode);
    setMessage(status.message);
  }, [status.mode, status.message]);

  useEffect(() => {
    setSaveSuccess(false);
  }, [mode, message]);

  const disabled = useMemo(() => isSaving || !token, [isSaving, token]);

  if (initializing) {
    return null;
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  if (user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      setSaveError("Требуется авторизация.");
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const payload = {
        mode,
        message: mode === "maintenance" ? message : "",
      };
      const response = await updateSiteAccess(payload, token);
      setStatus(response.access);
      setSaveSuccess(true);
    } catch (error) {
      if (error instanceof Error) {
        setSaveError(error.message);
      } else {
        setSaveError("Не удалось сохранить настройки.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="bg-black m-[auto] flex flex-col items-center justify-center gap-1 sm:gap-4 pb-[70px] sm:pb-[70px] sm:flex-row sm:items-start">
        <DesktopSidebar />

        <div className="max-w-[540px] w-full flex flex-col gap-3 items-center text-[14px] p-3 sm:gap-4 sm:p-0">
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

          <form
            onSubmit={handleSubmit}
            className="flex w-full flex-col gap-3 rounded-[12px] border border-[#1D1D1D] bg-[#131313] p-4 text-[#dbdbdb]"
          >
            <div className="flex flex-col gap-2">
              <h2 className="text-[16px] font-semibold text-white">Режим доступа</h2>
              <p className="text-[12px] text-[#8C8C8C]">
                Выберите, кто сможет просматривать сайт. Изменения применяются сразу после сохранения.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              {MODE_OPTIONS.map((option) => {
                const checked = mode === option.value;
                return (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer flex-col gap-1 rounded-[10px] border border-[#1D1D1D] bg-[#0B0B0B] px-4 py-3 transition hover:border-[#323232] ${
                      checked ? "border-[#2F94F9] bg-[#101010]" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="site-mode"
                        value={option.value}
                        checked={checked}
                        onChange={() => setMode(option.value)}
                        className="h-[16px] w-[16px] accent-[#2F94F9]"
                      />
                      <span className="text-[14px] font-semibold text-white">{option.title}</span>
                    </div>
                    <span className="pl-[22px] text-[12px] text-[#8C8C8C]">{option.description}</span>
                  </label>
                );
              })}
            </div>

            {mode === "maintenance" ? (
              <div className="flex flex-col gap-2">
                <label htmlFor="maintenance-message" className="text-[13px] font-semibold text-white">
                  Сообщение для посетителей
                </label>
                <textarea
                  id="maintenance-message"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Обновляемся, скоро вернёмся!"
                  className="rounded-[10px] border border-[#1D1D1D] bg-[#0B0B0B] px-3 py-2 text-[13px] text-[#dbdbdb] focus:border-[#2F94F9] focus:outline-none"
                  rows={4}
                  maxLength={500}
                />
                <span className="text-[11px] text-[#777777]">
                  Сообщение увидят все посетители во время техработ.
                </span>
              </div>
            ) : null}

            {saveError ? (
              <div className="rounded-[10px] border border-[#402626] bg-[#2A1414] px-3 py-2 text-[13px] text-[#f5caca]">
                {saveError}
              </div>
            ) : null}

            {saveSuccess ? (
              <div className="rounded-[10px] border border-[#193524] bg-[#112519] px-3 py-2 text-[13px] text-[#93f2c4]">
                Настройки сохранены.
              </div>
            ) : null}

            <div className="flex items-center justify-end gap-2">
              <button
                type="submit"
                disabled={disabled}
                className={`rounded-[10px] border border-[#2F94F9] bg-[#2F94F9] px-4 py-2 text-[14px]	font-semibold text-black transition hover:bg-[#2277c0] ${
                  disabled ? "opacity-60" : ""
                }`}
              >
                {isSaving ? "Сохраняем..." : "Сохранить"}
              </button>
            </div>
          </form>
        </div>

        <MobileBottomNav activeHref="/admin" />
      </div>

      <NavbarActionsSheet open={isNavbarSheetOpen} onClose={() => setNavbarSheetOpen(false)} textClassName="text-[16px]" />
    </>
  );
}
