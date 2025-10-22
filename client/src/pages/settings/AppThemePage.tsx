import { useState } from "react";
import { SettingsLayout } from "@/components/settings/SettingsLayout";

export function AppThemePage() {
  const [useLightTheme, setUseLightTheme] = useState(false);

  return (
    <SettingsLayout title="Внешний вид">
      <div className="flex flex-col w-full max-w-[540px] gap-2 bg-[#131313] border border-[#1D1D1D] text-white rounded-[12px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 pl-[16px] font-semibold">
            <p className="text-[#e1e1e1]">Светлая тема</p>
          </div>
          <Toggle checked={useLightTheme} onChange={setUseLightTheme} />
        </div>
      </div>
      <p className="text-[#8C8C8C] px-1 -mt-[5px]">
        Переключайтесь между тёмным и светлым оформлением интерфейса. Мы автоматически запомним ваш выбор.
      </p>
    </SettingsLayout>
  );
}

type ToggleProps = {
  checked: boolean;
  onChange: (value: boolean) => void;
};

function Toggle({ checked, onChange }: ToggleProps) {
  return (
    <label className="relative inline-flex items-center cursor-pointer p-[16px]">
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span
        className={[
          "relative w-[44px] h-[24px] rounded-full transition-colors duration-300",
          checked ? "bg-[#0A84FF]" : "bg-[#2a2a2a]",
        ].join(" ")}
      >
        <span
          className={[
            "absolute top-[2px] left-[2px] w-[20px] h-[20px] rounded-full bg-white transition-transform",
            checked ? "translate-x-[20px]" : "",
          ].join(" ")}
        />
      </span>
    </label>
  );
}

