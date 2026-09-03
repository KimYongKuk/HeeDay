'use client';

import { Check } from 'lucide-react';
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
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle?.(task);
        }}
        aria-label={task.done ? '완료 취소' : '완료'}
        aria-pressed={task.done}
        className={cn(
          'flex size-3.5 shrink-0 items-center justify-center rounded-[4px] border-[1.5px] border-current transition-opacity',
          task.done ? 'opacity-100' : 'opacity-55 hover:opacity-100',
        )}
        style={task.done ? { background: p.text, borderColor: p.text } : undefined}
      >
        {task.done ? <Check className="size-2.5 text-white" strokeWidth={3} /> : null}
      </button>
      <span className={cn('truncate', task.done && 'line-through opacity-60')}>
        {showProgram ? `${task.templateName} ` : ''}
        {task.title}
      </span>
    </div>
  );
}
