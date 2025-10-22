import { Link } from "react-router-dom";

type MobileHeaderProps = {
  title: string;
  backHref?: string;
  onOpenActions?: () => void;
  actionsTarget?: string;
};

export function MobileHeader({
  title,
  backHref = "/",
  onOpenActions,
  actionsTarget,
}: MobileHeaderProps) {
  const backContent = (
    <span className="flex items-center gap-1 px-[16px] py-[14px]">
      <img src="/design/img/back.png" alt="Назад" />
    </span>
  );

  const BackElement =
    backHref && backHref.startsWith("/") ? (
      <Link to={backHref} aria-label="Назад">
        {backContent}
      </Link>
    ) : (
      <button type="button" aria-label="Назад">
        {backContent}
      </button>
    );

  return (
    <header className="sticky top-0 flex w-full items-center justify-between self-stretch bg-[#131313] border-b border-[#1D1D1D] text-[#dbdbdb] sm:hidden">
      {BackElement}
      <div className="flex justify-center font-semibold">{title}</div>
      <button
        type="button"
        onClick={onOpenActions}
        className="flex items-center gap-1 px-[16px] py-[14px]"
        aria-label="Открыть меню"
        data-bottom-sheet-open={actionsTarget ? true : undefined}
        data-bottom-sheet-target={actionsTarget}
      >
        <img src="/design/img/more.png" alt="Меню" />
      </button>
    </header>
  );
}
