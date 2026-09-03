'use client';

import { useState } from 'react';
import { DraggableTask, DroppableDay } from '@/components/calendar/dnd';
import { QuickAdd } from '@/components/calendar/QuickAdd';
import { TaskChip } from '@/components/calendar/TaskChip';
import { TaskPopover } from '@/components/calendar/TaskPopover';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { CalendarTaskDto, ProgramListDto } from '@/lib/domain/dto';
import type { ISODate } from '@/lib/domain/types';
import { cn } from '@/lib/utils';
import { formatMonthDayKo, weekdayISO } from '@/lib/utils/dates';

export function CalendarItem({
  task,
  onToggle,
}: {
  task: CalendarTaskDto;
  onToggle: (t: CalendarTaskDto) => void;
}) {
  return (
    <DraggableTask task={task}>
      <TaskPopover task={task}>
        <TaskChip task={task} onToggle={onToggle} />
      </TaskPopover>
    </DraggableTask>
  );
}

export function DayCell({
  date,
  inMonth,
  isToday,
  holidayName,
  tasks,
  programs,
  capacity,
  onToggle,
}: {
  date: ISODate;
  inMonth: boolean;
  isToday: boolean;
  holidayName?: string;
  tasks: CalendarTaskDto[];
  programs: ProgramListDto[];
  capacity: number;
  onToggle: (task: CalendarTaskDto) => void;
}) {
  const [open, setOpen] = useState(false);
  const weekday = weekdayISO(date);
  const isSat = weekday === 6;
  const isSun = weekday === 0;
  const day = Number(date.slice(8, 10));
  const showMonth = !inMonth && day === 1;

  const overflow = tasks.length > capacity;
  const visible = overflow ? tasks.slice(0, Math.max(0, capacity - 1)) : tasks;
  const hidden = tasks.length - visible.length;
  const numberColor = holidayName || isSun ? 'text-sun' : isSat ? 'text-sat' : 'text-ink-muted';

  return (
    <DroppableDay
      date={date}
      className={cn(
        'group border-line flex min-w-0 flex-col border-r px-1.5 pt-1.5 pb-1 last:border-r-0',
        holidayName
          ? 'bg-holiday'
          : isToday
            ? 'bg-today'
            : isSat || isSun
              ? 'bg-weekend'
              : 'bg-surface',
      )}
    >
      <div className="flex h-[22px] items-center gap-1.5 text-xs font-medium">
        {isToday ? (
          <span className="bg-brand -ml-1 flex size-[22px] items-center justify-center rounded-full text-white">
            {day}
          </span>
        ) : (
          <span className={cn(numberColor, !inMonth && 'text-ink-ghost')}>
            {showMonth ? `${Number(date.slice(5, 7))}월 ` : ''}
            {day}
          </span>
        )}
        {holidayName ? (
          <span className="text-sun/80 truncate text-[11px]">{holidayName}</span>
        ) : null}
        <QuickAdd
          date={date}
          programs={programs}
          className="ml-auto opacity-0 group-hover:opacity-100 data-popup-open:opacity-100 print:hidden"
        />
      </div>

      <div className={cn('mt-[30px] flex min-h-0 flex-col gap-[3px]', !inMonth && 'opacity-60')}>
        {visible.map((t) => (
          <CalendarItem key={t.id} task={t} onToggle={onToggle} />
        ))}
        {overflow ? (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger
              render={
                <button
                  type="button"
                  className="text-ink-faint hover:bg-app hover:text-ink flex h-[18px] items-center rounded px-1.5 text-left text-[11.5px]"
                />
              }
            >
              외 {hidden}건
            </PopoverTrigger>
            <PopoverContent align="start" className="w-72 gap-1.5 p-2.5">
              <div className="mb-1 text-[12.5px] font-semibold">{formatMonthDayKo(date)}</div>
              {tasks.map((t) => (
                <CalendarItem key={t.id} task={t} onToggle={onToggle} />
              ))}
            </PopoverContent>
          </Popover>
        ) : null}
      </div>
    </DroppableDay>
  );
}
