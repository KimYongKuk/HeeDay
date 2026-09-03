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
    <div className="flex h-[52px] shrink-0 items-center gap-3 px-5">
      <h1 className="text-lg font-semibold tracking-[-0.01em]">{title}</h1>
      {subtitle ? <span className="text-[12.5px] text-ink-faint">{subtitle}</span> : null}
      <div className="flex-1" />
      {children}
    </div>
  );
}
