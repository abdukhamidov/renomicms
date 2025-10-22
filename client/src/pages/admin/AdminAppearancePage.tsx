import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { NavbarActionsSheet } from "@/components/layout/NavbarActionsSheet";
import { useAuth } from "@/contexts/useAuth";
import { useAppearance } from "@/contexts/AppearanceContext";
import { updateAppearance } from "@/api/appearance";

const PAGE_TITLE = "Внешний вид";
const DEFAULT_LOGO = "/design/img/logo-icon.png";

const helperLinks = [
  {
    label: "Статический файл",
    href: "https://vitejs.dev/guide/assets.html",
  },
  {
    label: "Загрузка в CDN",
    href: "https://imgbb.com/",
  },
];

export function AdminAppearancePage() {
  const { user, token, initializing } = useAuth();
  const { appearance, setAppearance } = useAppearance();

  const [isNavbarSheetOpen, setNavbarSheetOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState(appearance.logoUrl);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setLogoUrl(appearance.logoUrl);
  }, [appearance.logoUrl]);

  useEffect(() => {
    setSaveSuccess(false);
  }, [logoUrl]);

  const previewLogo = useMemo(() => {
    if (!logoUrl || logoUrl.trim().length === 0) {
      return DEFAULT_LOGO;
    }
    return logoUrl.trim();
  }, [logoUrl]);

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
        logoUrl: logoUrl.trim().length > 0 ? logoUrl.trim() : DEFAULT_LOGO,
      };
      const response = await updateAppearance(payload, token);
      setAppearance(response.appearance);
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
              <h2 className="text-[16px] font-semibold text-white">Логотип на боковой панели</h2>
              <p className="text-[12px] text-[#8C8C8C]">
                Укажите прямую ссылку на изображение. Мы покажем его в боковом меню и на десктопной версии сайта.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="logo-url" className="text-[13px] font-semibold text-white">
                Адрес изображения
              </label>
              <input
                id="logo-url"
                type="url"
                value={logoUrl}
                onChange={(event) => setLogoUrl(event.target.value)}
                placeholder="https://example.com/logo.png"
                className="rounded-[10px] border border-[#1D1D1D] bg-[#0B0B0B] px-3 py-2 text-[13px] text-[#dbdbdb] focus:border-[#2F94F9] focus:outline-none"
              />
              <span className="text-[11px] text-[#777777]">
                Если оставить поле пустым, будем использовать логотип по умолчанию ({DEFAULT_LOGO}).
              </span>
            </div>

            <div className="flex flex-col gap-2 rounded-[10px] border border-[#1D1D1D] bg-[#0B0B0B] p-4 text-center">
              <p className="text-[12px] text-[#8C8C8C]">Предпросмотр</p>
              <div className="flex items-center justify-center p-4">
                <img src={previewLogo} alt="Предпросмотр логотипа" className="max-h-[64px]" />
              </div>
            </div>

            {helperLinks.length ? (
              <div className="flex flex-wrap gap-2 text-[12px] text-[#777777]">
                {helperLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-[8px] border border-[#1D1D1D] bg-[#0B0B0B] px-3 py-1 hover:text-white"
                  >
                    {link.label}
                  </a>
                ))}
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
                disabled={isSaving || !token}
                className={`rounded-[10px] border border-[#2F94F9] bg-[#2F94F9] px-4 py-2 text-[14px] font-semibold text-black transition hover:bg-[#2277c0] ${
                  isSaving || !token ? "opacity-60" : ""
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
