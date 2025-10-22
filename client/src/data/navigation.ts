export type NavItem = {
  label: string;
  href: string;
  icon: string;
  badge?: number;
  end?: boolean;
};

export const sidebarPrimaryNav: NavItem[] = [
  {
    label: "Сообщения",
    href: "/mail",
    icon: "/design/img/mail-sidebar.png",
    badge: 0,
  },
  {
    label: "Уведомления",
    href: "/notifications",
    icon: "/design/img/notification-sidebar.png",
    badge: 0,
  },
  {
    label: "Настройки",
    href: "/settings",
    icon: "/design/img/settings-sidebar.png",
  },
  {
    label: "Выход",
    href: "/logout",
    icon: "/design/img/logout-sidebar.png",
  },
];

export const sidebarSecondaryNav: NavItem[] = [
  {
    label: "Главная",
    href: "/",
    icon: "/design/img/home.png",
    end: true,
  },
  {
    label: "Новости",
    href: "/news",
    icon: "/design/img/news-sidebar.png",
  },
  {
    label: "Форум",
    href: "/forum",
    icon: "/design/img/forum-sidebar.png",
  },
  {
    label: "Блог",
    href: "/blogs",
    icon: "/design/img/blog-sidebar.png",
  },
  {
    label: "Чат",
    href: "/chat",
    icon: "/design/img/chat-sidebar.png",
  },
  {
    label: "Пользователи",
    href: "/users",
    icon: "/design/img/users-sidebar.png",
  },
];
