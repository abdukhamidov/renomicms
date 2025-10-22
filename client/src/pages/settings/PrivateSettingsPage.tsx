import { useState } from "react";
import { SettingsLayout } from "@/components/settings/SettingsLayout";

export function PrivateSettingsPage() {
  const [isPrivateProfile, setIsPrivateProfile] = useState(false);
  const [messageVisibility, setMessageVisibility] = useState<"all" | "followers">("all");

  return (
    <SettingsLayout title="Приватность профиля">
      <div className="flex flex-col w-full max-w-[540px] gap-2 bg-[#131313] border border-[#1D1D1D] text-white rounded-[12px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 pl-[16px] font-semibold">
            <p className="text-[#e1e1e1]">Закрытый профиль</p>
          </div>
          <Toggle checked={isPrivateProfile} onChange={setIsPrivateProfile} />
        </div>
      </div>
      <p className="text-[#dbdbdb] px-1 -mt-[5px]">
        Если вы закроете свой профиль, только ваши подписчики смогут просматривать ваши материалы и оставлять сообщения. Остальные пользователи не увидят ваш контент и активность.
      </p>

      <div className="flex flex-col w-full max-w-[540px] gap-2 bg-[#131313] border border-[#1D1D1D] text-white rounded-[12px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 pl-[16px] font-semibold">
            <p className="text-[#e1e1e1]">Сообщения</p>
          </div>
          <div className="relative p-[10px]">
            <label htmlFor="message-visibility" className="sr-only">
              Кто может писать
            </label>
            <select
              id="message-visibility"
              value={messageVisibility}
              onChange={(event) => setMessageVisibility(event.target.value as "all" | "followers")}
              className="appearance-none w-[180px] h-[36px] bg-[#191919] text-[#eaeaea] text-[14px] border border-[#2a2a2a] rounded-[10px] pl-4 pr-10 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] outline-none transition hover:border-[#3a3a3a] focus:border-[#0A84FF] focus:ring-2 focus:ring-[#0A84FF]/25"
            >
              <option value="all">Все</option>
              <option value="followers">Только подписчики</option>
            </select>
            <svg className="pointer-events-none absolute right-[28px] top-1/2 -translate-y-1/2 w-[16px] h-[16px] opacity-70" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.12l3.71-2.89a.75.75 0 1 1 .92 1.18l-4.24 3.31a.75.75 0 0 1-.92 0L5.21 8.41a.75.75 0 0 1 .02-1.2z" />
            </svg>
          </div>
        </div>
      </div>
      <p className="text-[#dbdbdb] px-1 -mt-[5px]">
        Только выбранные пользователи смогут писать вам личные сообщения.
      </p>

      <div className="w-full max-w-[540px]">
        <button type="button" className="px-2 py-3 bg-[#31AEEC] text-black font-bold rounded-[8px] w-full hover:bg-[#3abdff]">
          Сохранить
        </button>
      </div>
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

