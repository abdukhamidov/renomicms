import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/useAuth";

export function LogoutPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    logout();
    navigate("/auth/login", { replace: true });
  }, [logout, navigate]);

  return (
    <AppShell title="Р’С‹С…РѕРґ" backHref="/" hideSidebar hideMobileNav contentClassName="flex w-full justify-center p-6">
      <div className="flex max-w-[320px] flex-col items-center gap-3 rounded-[12px] border border-[#1D1D1D] bg-[#131313] px-6 py-8 text-center text-[#dbdbdb]">
        <img src="/design/img/logout-sidebar.png" alt="Р’С‹С…РѕРґ" className="h-[48px] w-[48px]" />
        <p className="text-[16px] font-semibold">Р’С‹С…РѕРґРёРј РёР· Р°РєРєР°СѓРЅС‚Р°...</p>
        <p className="text-[13px] text-[#8C8C8C]">РЎРµРєСѓРЅРґСѓ, СЃРµР№С‡Р°СЃ РІРµСЂРЅС‘Рј РІР°СЃ РЅР° СЃС‚СЂР°РЅРёС†Сѓ РІС…РѕРґР°.</p>
      </div>
    </AppShell>
  );
}
