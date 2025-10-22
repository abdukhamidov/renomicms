export type OfficialBadgeProps = {
  className?: string;
  title?: string;
};

const BASE_CLASS = "inline-flex items-center justify-center rounded-full bg-[#2563eb] px-1.5 py-[2px] text-white";

export function OfficialBadge({ className, title = "Официальный профиль" }: OfficialBadgeProps) {
  const classes = className ? `${BASE_CLASS} ${className}` : BASE_CLASS;

  return (
    <span className={classes} title={title} aria-label={title}>
      <svg className="h-3 w-3" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M5 10.5 8 13l7-8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
