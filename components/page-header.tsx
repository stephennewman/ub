/**
 * Shared page header for hub module pages. Renders a Class 101–red icon
 * tile, a single H1 title, and an optional subtitle, plus an optional
 * action slot on the right (e.g. "+ New" buttons).
 *
 * Use the same icon component here as the corresponding sidebar entry so
 * the page identity is unmistakable as the user navigates between tools.
 */
export function PageHeader({
  icon,
  title,
  subtitle,
  actions,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 items-start gap-3">
        <span
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl"
          style={{
            background: "var(--brand-red-soft)",
            color: "var(--brand-red)",
          }}
          aria-hidden
        >
          {icon}
        </span>
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl tracking-tight text-ink sm:text-3xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="max-w-4xl text-sm text-ink-soft sm:text-base">
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="ml-auto flex items-center gap-2">{actions}</div> : null}
    </header>
  );
}
