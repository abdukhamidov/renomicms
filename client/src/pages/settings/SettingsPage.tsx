import { Link } from "react-router-dom";
import { SettingsLayout } from "@/components/settings/SettingsLayout";

type SettingsLink = {
  to: string;
  icon: string;
  label: string;
  badge?: string;
};

const profileLinks: SettingsLink[] = [
  {
    to: "/settings/profile",
    icon: "/design/img/sheet-update-profile.png",
    label: "Редактировать профиль",
  },
  {
    to: "/settings/privacy",
    icon: "/design/img/sheet-lock.png",
    label: "Приватность профиля",
  },
  {
    to: "/settings/security",
    icon: "/design/img/password.png",
    label: "Изменить пароль",
  },
  {
    to: "/settings/auth-history",
    icon: "/design/img/login.png",
    label: "История входов",
  },
];

const generalLinks: SettingsLink[] = [
  {
    to: "/settings/language",
    icon: "/design/img/language.png",
    label: "Язык сайта",
    badge: "RU",
  },
  {
    to: "/settings/notifications",
    icon: "/design/img/notification-red.png",
    label: "Уведомления",
  },
  {
    to: "/settings/theme",
    icon: "/design/img/browser.png",
    label: "Внешний вид",
  },
];

const logoutLink: SettingsLink = {
  to: "/logout",
  icon: "/design/img/logout-red.png",
  label: "Выйти",
};

export function SettingsPage() {
  return (
    <SettingsLayout title="Настройки" contentClassName="flex flex-col w-full gap-3 p-3 sm:gap-4 sm:p-0">
      <SettingsGroup links={profileLinks} />
      <SettingsGroup links={generalLinks} />
      <SettingsGroup links={[logoutLink]} />
    </SettingsLayout>
  );
}

type SettingsGroupProps = {
  links: SettingsLink[];
};

function SettingsGroup({ links }: SettingsGroupProps) {
  return (
    <div className="flex flex-col w-full bg-[#131313] border border-[#1D1D1D] text-[#e1e1e1] font-semibold rounded-[12px] overflow-hidden">
      {links.map((link, index) => {
        const isFirst = index === 0;
        const isLast = index === links.length - 1;
        const borderClass = isLast ? "" : "border-b border-[#1c1c1c]";

        return (
          <Link
            key={link.to}
            to={link.to}
            className={[
              "flex items-center pl-4 hover:bg-[#161616] transition",
              isFirst ? "hover:rounded-t-[12px]" : "",
              isLast ? "hover:rounded-b-[12px]" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <span className="bg-[#0B0B0B] p-[6px] rounded-[8px] border border-[#1D1D1D]">
              <img className="w-[18px]" src={link.icon} alt="" />
            </span>
            <span className={`flex items-center justify-between w-full ml-[10px] py-[12px] pr-4 ${borderClass}`}>
              {link.label}
              <span className="flex items-center gap-1">
                {link.badge ? (
                  <span className="flex items-center gap-1 bg-[#0B0B0B] text-[#ededed] text-[12px] px-[8px] py-[4px] rounded-[8px] border border-[#1D1D1D]">
                    {link.badge}
                  </span>
                ) : null}
                <img src="/design/img/arrow-right.png" alt="" />
              </span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}
