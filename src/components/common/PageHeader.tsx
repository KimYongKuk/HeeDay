import type { ReactNode } from 'react';

export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex min-h-[52px] shrink-0 flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2 md:px-5">
      <h1 className="text-lg font-semibold tracking-[-0.01em]">{title}</h1>
      {subtitle ? <span className="text-ink-faint text-[12.5px]">{subtitle}</span> : null}
      <div className="hidden flex-1 sm:block" />
      {children}
    </div>
  );
}
