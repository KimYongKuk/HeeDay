'use client';

import { Check } from 'lucide-react';
import type { TaskStatus } from '@/lib/domain/enums';
import { TASK_STATUS_LABEL } from '@/lib/domain/labels';
import { nextTaskStatus } from '@/lib/domain/taskStatus';
import { cn } from '@/lib/utils';

/**
 * Three-state task box: empty outline (대기), filled grey (진행 중), filled program color with a
 * check (완료). Each click advances to the next status.
 */
export function TaskStatusBox({
  status,
  color,
  onClick,
}: {
  status: TaskStatus;
  /** Program chip text color; used for the outline and the 완료 fill. */
  color: string;
  onClick?: () => void;
}) {
  const next = TASK_STATUS_LABEL[nextTaskStatus(status)];
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      aria-label={`${TASK_STATUS_LABEL[status]}, 누르면 ${next}`}
      title={`${TASK_STATUS_LABEL[status]} · 누르면 ${next}`}
      className={cn(
        'flex size-3.5 shrink-0 items-center justify-center rounded-[4px] border-[1.5px] transition-opacity',
        status === 'TODO' && 'opacity-60 hover:opacity-100',
        status === 'DOING' && 'border-ink-ghost bg-ink-ghost',
        status === 'DONE' && 'text-white',
      )}
      style={
        status === 'DONE'
          ? { background: color, borderColor: color }
          : status === 'TODO'
            ? { borderColor: color }
            : undefined
      }
    >
      {status === 'DONE' ? <Check className="size-2.5" strokeWidth={3} /> : null}
    </button>
  );
}
