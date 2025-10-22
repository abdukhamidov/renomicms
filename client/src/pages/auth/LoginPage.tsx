import type { FormEvent } from "react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { NavbarActionsSheet } from "@/components/layout/NavbarActionsSheet";
import { useAuth } from "@/contexts/useAuth";

type LoginFormState = {
  username: string;
  password: string;
};

const INITIAL_FORM: LoginFormState = {
  username: "",
  password: "",
};

export function LoginPage() {
  const navigate = useNavigate();
  const { login, initializing } = useAuth();
  const [form, setForm] = useState<LoginFormState>(INITIAL_FORM);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isActionsOpen, setIsActionsOpen] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const username = form.username.trim();
    if (username.length < 3 || username.length > 15) {
      setError("Р›РѕРіРёРЅ РґРѕР»Р¶РµРЅ СЃРѕРґРµСЂР¶Р°С‚СЊ РѕС‚ 3 РґРѕ 15 СЃРёРјРІРѕР»РѕРІ.");
      return;
    }

    if (form.password.length < 6 || form.password.length > 32) {
      setError("РџР°СЂРѕР»СЊ РґРѕР»Р¶РµРЅ СЃРѕРґРµСЂР¶Р°С‚СЊ РѕС‚ 6 РґРѕ 32 СЃРёРјРІРѕР»РѕРІ.");
      return;
    }

    setIsSubmitting(true);

    try {
      await login(username, form.password);
      navigate("/");
    } catch (submissionError) {
      console.error(submissionError);
      setError(submissionError instanceof Error ? submissionError.message : "РќРµ СѓРґР°Р»РѕСЃСЊ РІС‹РїРѕР»РЅРёС‚СЊ РІС…РѕРґ.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <AppShell
        title="РђРІС‚РѕСЂРёР·Р°С†РёСЏ"
        backHref="/"
        hideSidebar
        hideMobileNav
        actionsTarget="navbar-actions"
        onOpenActions={() => setIsActionsOpen(true)}
        contentClassName="w-full max-w-[540px] flex flex-col gap-4 items-center text-[14px] p-3 sm:gap-4 sm:p-0"
      >
        <nav className="sticky top-0 z-10 hidden w-full items-center justify-between bg-black text-[#dbdbdb] sm:flex sm:pt-1">
          <Link to="/" className="flex items-center gap-1 pr-4 py-3">
            <img className="w-[26px]" src="/design/img/back.png" alt="РќР°Р·Р°Рґ" />
          </Link>
          <div className="flex items-center gap-2 text-[16px] font-semibold">
            <p>NomiCMS</p>
            <span className="font-bold text-[#414141]">/</span>
            <p>РђРІС‚РѕСЂРёР·Р°С†РёСЏ</p>
          </div>
          <button
            type="button"
            className="flex items-center gap-1 px-[16px] py-[14px]"
            onClick={() => setIsActionsOpen(true)}
            data-bottom-sheet-open
            data-bottom-sheet-target="navbar-actions"
          >
            <img src="/design/img/more.png" alt="РњРµРЅСЋ" />
          </button>
        </nav>

        <header className="flex w-full flex-col items-center gap-2 py-4 text-center text-[#dbdbdb]">
          <p className="text-[18px]">Р”РѕР±СЂРѕ РїРѕР¶Р°Р»РѕРІР°С‚СЊ вЂ” СЂР°РґС‹ РІРёРґРµС‚СЊ РІР°СЃ СЃРЅРѕРІР°!</p>
          <p>Р’РѕР№РґРёС‚Рµ, С‡С‚РѕР±С‹ РїРѕР»СѓС‡РёС‚СЊ РґРѕСЃС‚СѓРї Рє СЃРІРѕРµРјСѓ Р°РєРєР°СѓРЅС‚Сѓ.</p>
        </header>

        <form onSubmit={handleSubmit} className="flex w-full max-w-[540px] flex-col gap-3 text-[#dbdbdb]">
          <label className="flex flex-col gap-2 text-[15px]">
            <span className="flex items-center gap-2">
              Р›РѕРіРёРЅ <span className="text-[#777777]">(3-15)</span>
            </span>
            <input
              className="w-full rounded-[12px] border border-[#1D1D1D] bg-[#131313] px-4 py-3 text-[14px] text-[#dbdbdb] placeholder:text-[#8C8C8C] focus:border-[#505050] focus:outline-none"
              type="text"
              placeholder="Р’РІРµРґРёС‚Рµ Р»РѕРіРёРЅ."
              value={form.username}
              onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
              autoComplete="username"
              required
            />
          </label>
          <label className="flex flex-col gap-2 text-[15px]">
            <span className="flex items-center gap-2">
              РџР°СЂРѕР»СЊ <span className="text-[#777777]">(6-32)</span>
            </span>
            <input
              className="w-full rounded-[12px] border border-[#1D1D1D] bg-[#131313] px-4 py-3 text-[14px] text-[#dbdbdb] placeholder:text-[#8C8C8C] focus:border-[#505050] focus:outline-none"
              type="password"
              placeholder="Р’РІРµРґРёС‚Рµ РїР°СЂРѕР»СЊ."
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              autoComplete="current-password"
              required
            />
          </label>
          {error ? (
            <p className="rounded-[8px] border border-[#3b1010] bg-[#1f0c0c] px-3 py-2 text-[#ff7b7b]">{error}</p>
          ) : null}
          <button
            type="submit"
            className="rounded-[8px] bg-[#31AEEC] px-4 py-3 text-[15px] font-bold text-black transition hover:bg-[#3abdff] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting || initializing}
          >
            {isSubmitting ? "Р’С…РѕРґРёРј..." : "Р’РѕР№С‚Рё"}
          </button>
        </form>

        <div className="flex w-full max-w-[540px] flex-col gap-2">
          <Link
            to="/auth/register"
            className="flex items-center justify-center rounded-[8px] border border-[#1d1d1d] bg-white px-4 py-3 text-[15px] font-bold text-black transition hover:bg-[#e6e6e6]"
          >
            Создать аккаунт
          </Link>
          <Link to="/auth/reset" className="text-center text-[13px] text-[#31AEEC] hover:text-[#3abdff]">
            Р—Р°Р±С‹Р»Рё РїР°СЂРѕР»СЊ?
          </Link>
        </div>
      </AppShell>

      <NavbarActionsSheet open={isActionsOpen} onClose={() => setIsActionsOpen(false)} />
    </>
  );
}

