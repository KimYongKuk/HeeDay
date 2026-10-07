'use client';

import { Star } from 'lucide-react';
import { TaskStatusBox } from '@/components/common/TaskStatusBox';
import { PALETTE } from '@/lib/domain/colors';
import type { CalendarTaskDto } from '@/lib/domain/dto';
import { cn } from '@/lib/utils';

export function TaskChip({
  task,
  onToggle,
  muted,
  showProgram,
}: {
  task: CalendarTaskDto;
  onToggle?: (task: CalendarTaskDto) => void;
  muted?: boolean;
  showProgram?: boolean;
}) {
  const p = PALETTE[task.programColor];
  return (
    <div
      className={cn(
        'flex h-[22px] min-w-0 items-center gap-1.5 rounded-md pr-2 pl-[5px] text-xs font-medium',
        muted && 'opacity-60',
      )}
      style={{ background: p.bg, color: p.text }}
      title={`${task.programName} · ${task.title}`}
    >
      <TaskStatusBox status={task.status} color={p.text} onClick={() => onToggle?.(task)} />
      {task.important ? (
        <Star
          className={cn('text-star size-3 shrink-0', task.status === 'DONE' && 'opacity-50')}
          fill="currentColor"
          aria-label="중요"
        />
      ) : null}
      <span
        className={cn(
          'truncate',
          task.important && task.status !== 'DONE' && 'font-semibold',
          task.status === 'DONE' && 'line-through opacity-60',
        )}
      >
        {showProgram ? `${task.templateName} ` : ''}
        {task.title}
      </span>
    </div>
  );
}
