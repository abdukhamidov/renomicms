import { SettingsLayout } from "@/components/settings/SettingsLayout";

type AuthEntry = {
  id: number;
  title: string;
  timestamp: string;
  ip: string;
  browser: string;
  device: string;
};

const authEntries: AuthEntry[] = [
  {
    id: 1,
    title: "Ввод логина и пароля",
    timestamp: "Вчера 12:12",
    ip: "94.230.228.137",
    browser: "Chrome",
    device: "iPhone",
  },
  {
    id: 2,
    title: "Ввод логина и пароля",
    timestamp: "Вчера 12:12",
    ip: "94.230.228.137",
    browser: "Chrome",
    device: "ПК",
  },
];

export function AuthHistoryPage() {
  return (
    <SettingsLayout title="История входов">
      {authEntries.map((entry) => (
        <div key={entry.id} className="flex flex-col w-full max-w-[540px] gap-2 bg-[#131313] border border-[#1D1D1D] text-white rounded-[12px]">
          <div className="flex flex-col p-4 gap-2">
            <div className="flex justify-between w-full items-center gap-2 font-semibold">
              <p className="text-[#e1e1e1]">{entry.title}</p>
              <p className="text-[#8C8C8C] text-[12px]">{entry.timestamp}</p>
            </div>
            <p className="text-[#8C8C8C]">IP: {entry.ip}</p>
            <p className="text-[#8C8C8C]">Браузер: {entry.browser}</p>
            <p className="text-[#8C8C8C]">Устройство: {entry.device}</p>
          </div>
        </div>
      ))}
    </SettingsLayout>
  );
}

