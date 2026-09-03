import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-1 flex-col items-center justify-center gap-2 p-10 text-center',
        className,
      )}
    >
      <p className="text-ink text-[15px] font-semibold">{title}</p>
      {description ? (
        <p className="text-ink-faint max-w-sm text-[13px] leading-relaxed">{description}</p>
      ) : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
