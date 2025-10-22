import { useState } from "react";
import { SettingsLayout } from "@/components/settings/SettingsLayout";

type LanguageOption = {
  id: string;
  label: string;
  icon: string;
};

const languages: LanguageOption[] = [
  { id: "ru", label: "Русский", icon: "/design/img/ru.png" },
  { id: "en", label: "English", icon: "/design/img/uk.png" },
];

export function AppLanguagePage() {
  const [currentLanguage, setCurrentLanguage] = useState<string>("ru");

  return (
    <SettingsLayout title="Язык сайта">
      <div className="flex flex-col w-full bg-[#131313] border border-[#1D1D1D] text-[#e1e1e1] font-semibold rounded-[12px] overflow-hidden">
        {languages.map((language, index) => {
          const isFirst = index === 0;
          const isLast = index === languages.length - 1;
          const borderClass = isLast ? "" : "border-b border-[#1c1c1c]";
          const isActive = currentLanguage === language.id;

          return (
            <button
              key={language.id}
              type="button"
              onClick={() => setCurrentLanguage(language.id)}
              className={[
                "flex items-center pl-4 pr-4 py-[12px] w-full hover:bg-[#161616] transition text-left",
                isFirst ? "hover:rounded-t-[12px]" : "",
                isLast ? "hover:rounded-b-[12px]" : "",
                borderClass,
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span className="bg-[#0B0B0B] p-[6px] rounded-[8px] border border-[#1D1D1D]">
                <img className="w-[18px]" src={language.icon} alt="" />
              </span>
              <span className="flex items-center justify-between w-full ml-[10px]">
                {language.label}
                {isActive ? <img src="/design/img/active-check.png" alt="" /> : null}
              </span>
            </button>
          );
        })}
      </div>
    </SettingsLayout>
  );
}

