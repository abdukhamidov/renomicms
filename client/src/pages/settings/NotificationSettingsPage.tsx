import { useState } from "react";
import { SettingsLayout } from "@/components/settings/SettingsLayout";

type NotificationToggle = {
  id: string;
  label: string;
  description?: string;
};

const notificationToggles: NotificationToggle[] = [
  { id: "mail", label: "Письма" },
  { id: "blog-replies", label: "Ответы в блоге" },
  { id: "news-replies", label: "Ответы в новости" },
  { id: "followers-topics", label: "О создании темы от подписок" },
  { id: "likes", label: "Лайки", description: "Скоро напишем полное описание для всех функций." },
];

export function NotificationSettingsPage() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    notificationToggles.forEach((item) => {
      initial[item.id] = true;
    });
    return initial;
  });

  return (
    <SettingsLayout title="Уведомления">
      {notificationToggles.map((item) => (
        <div key={item.id} className="flex flex-col w-full max-w-[540px] gap-2 bg-[#131313] border border-[#1D1D1D] text-white rounded-[12px]">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1 pl-[16px] py-[12px]">
              <p className="text-[#e1e1e1] font-semibold">{item.label}</p>
              {item.description ? <p className="text-[#8C8C8C] text-[12px] pr-[16px]">{item.description}</p> : null}
            </div>
            <Toggle checked={enabled[item.id]} onChange={(value) => setEnabled((prev) => ({ ...prev, [item.id]: value }))} />
          </div>
        </div>
      ))}
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

