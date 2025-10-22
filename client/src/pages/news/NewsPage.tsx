import { AppShell } from "@/components/layout/AppShell";

const breadcrumbs = [
  { label: "Главная", href: "/" },
  { label: "Новости" },
];

const newsItems = [
  {
    id: 1,
    title: "Выходит обновление reNomiCMS 2.1",
    excerpt:
      "Новая система уведомлений, переработка модерации форума и улучшения редактора новостей.",
    timestamp: "Сегодня • 11:45",
  },
  {
    id: 2,
    title: "Гайд: настройка realtime-чата",
    excerpt:
      "Пошаговая инструкция по включению WebSocket-уведомлений и интеграции с сервисом рассылки.",
    timestamp: "Вчера • 20:18",
  },
];

export function NewsPage() {
  return (
    <AppShell
      title="Новости"
      subtitle="Что нового происходит в экосистеме reNomiCMS"
      breadcrumbs={breadcrumbs}
      bottomNavActive="/news"
    >
      <section className="flex flex-col gap-4 rounded-[16px] border border-[#1D1D1D] bg-[#0B0B0B] p-4 sm:p-6">
        <div className="flex flex-col gap-2 text-left sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-[22px] font-bold text-white sm:text-[24px]">
              Лента новостей
            </h1>
            <p className="text-[14px] text-[#8C8C8C] sm:text-[15px]">
              Сводка улучшений, релизов и активностей команды.
            </p>
          </div>
          <button className="flex items-center gap-2 self-start rounded-[12px] border border-[#232323] bg-[#1C1C1C] px-4 py-3 text-[14px] font-semibold text-white hover:bg-[#252525]">
            <img src="/design/img/add.png" alt="" />
            Создать новость
          </button>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        {newsItems.map((item) => (
          <article
            key={item.id}
            className="flex flex-col gap-3 rounded-[16px] border border-[#1D1D1D] bg-[#0B0B0B] p-5"
          >
            <div className="flex flex-wrap items-center gap-2 text-[12px] font-semibold text-[#31AEEC]">
              <span className="rounded-full bg-[#1C1C1C] px-3 py-1 uppercase tracking-[0.12em]">
                Новость
              </span>
              <span className="text-[#8C8C8C]">{item.timestamp}</span>
            </div>
            <h2 className="text-[19px] font-semibold text-white">{item.title}</h2>
            <p className="text-[14px] text-[#b5b5b5]">{item.excerpt}</p>
            <div className="flex flex-wrap items-center gap-3 text-[13px] text-[#8C8C8C]">
              <button className="flex items-center gap-2 rounded-[12px] border border-[#232323] bg-[#1C1C1C] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#252525]">
                <img src="/design/img/chat.png" alt="" />
                Обсудить
              </button>
              <span className="flex items-center gap-2">
                <img src="/design/img/analytics.png" alt="" />
                1 245 просмотров
              </span>
              <span className="flex items-center gap-2">
                <img src="/design/img/comment-gray.png" alt="" />
                48 комментариев
              </span>
            </div>
          </article>
        ))}
      </section>
    </AppShell>
  );
}
