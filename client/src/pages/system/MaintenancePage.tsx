export type MaintenancePageProps = {
  title?: string;
  message?: string;
};

export function MaintenancePage({
  title = "\u0421\u0430\u0439\u0442 \u0432\u0440\u0435\u043c\u0435\u043d\u043d\u043e \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u0435\u043d",
  message,
}: MaintenancePageProps) {
  return (
    <div className="min-h-screen bg-black text-[#dbdbdb] flex flex-col items-center justify-center px-6 py-12">
      <div className="flex flex-col items-center gap-4 text-center max-w-xl">
        <img src="/design/img/logo-icon.png" alt="Maintenance" className="w-[80px] h-[80px]" />
        <h1 className="text-[28px] font-bold text-white">{title}</h1>
        <p className="text-[16px] leading-relaxed text-[#bdbdbd]">
          {message && message.trim().length > 0
            ? message
            : "\u0410\u0434\u043c\u0438\u043d\u0438\u0441\u0442\u0440\u0430\u0442\u043e\u0440\u044b \u043f\u0440\u043e\u0432\u043e\u0434\u044f\u0442 \u0442\u0435\u0445\u043d\u0438\u0447\u0435\u0441\u043a\u0438\u0435 \u0440\u0430\u0431\u043e\u0442\u044b. \u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0437\u0430\u0439\u0442\u0438 \u043f\u043e\u0437\u0436\u0435."}
        </p>
      </div>
    </div>
  );
}
