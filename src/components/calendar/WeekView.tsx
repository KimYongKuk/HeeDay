'use client';

import { useMemo } from 'react';
import { CalendarItem } from '@/components/calendar/DayCell';
import { DroppableDay } from '@/components/calendar/dnd';
import { QuickAdd } from '@/components/calendar/QuickAdd';
import type { CalendarTaskDto, ProgramListDto } from '@/lib/domain/dto';
import { WEEKDAY_LABEL } from '@/lib/domain/labels';
import type { ISODate } from '@/lib/domain/types';
import { cn } from '@/lib/utils';
import { weekdayISO } from '@/lib/utils/dates';

export function WeekView({
  days,
  today,
  tasks,
  programs,
  closures,
  onToggle,
}: {
  days: ISODate[];
  today: ISODate;
  tasks: CalendarTaskDto[];
  programs: ProgramListDto[];
  closures: Map<ISODate, string>;
  onToggle: (task: CalendarTaskDto) => void;
}) {
  const byDate = useMemo(() => {
    const map = new Map<ISODate, CalendarTaskDto[]>();
    for (const t of tasks) {
      const list = map.get(t.dueDate) ?? [];
      list.push(t);
      map.set(t.dueDate, list);
    }
    for (const list of map.values()) list.sort((a, b) => Number(a.done) - Number(b.done) || a.id - b.id);
    return map;
  }, [tasks]);

  return (
    <div className="grid min-h-0 flex-1 grid-cols-7 bg-surface">
      {days.map((date) => {
        const w = weekdayISO(date);
        const isToday = date === today;
        const holiday = closures.get(date);
        const list = byDate.get(date) ?? [];
        return (
          <DroppableDay
            key={date}
            date={date}
            className={cn(
              'group flex min-h-0 flex-col border-r border-line last:border-r-0',
              holiday ? 'bg-holiday' : isToday ? 'bg-today' : w === 0 || w === 6 ? 'bg-weekend' : 'bg-surface',
            )}
          >
            <div className={cn('flex h-14 shrink-0 flex-col justify-center gap-0.5 border-b border-line px-3', isToday && 'border-brand-line')}>
              <div className="flex items-center gap-2 text-[11.5px] font-medium text-ink-faint">
                <span className={cn(isToday && 'text-brand', w === 6 && 'text-sat', (w === 0 || holiday) && 'text-sun')}>
                  {WEEKDAY_LABEL[w]}
                  {isToday ? ' · 오늘' : ''}
                </span>
                {holiday ? <span className="truncate text-sun/80">{holiday}</span> : null}
                <QuickAdd date={date} programs={programs} className="ml-auto opacity-0 group-hover:opacity-100 data-popup-open:opacity-100" />
              </div>
              <div className={cn('text-lg font-semibold tracking-[-0.01em]', isToday && 'text-brand', w === 6 && 'text-sat', (w === 0 || holiday) && 'text-sun')}>
                {Number(date.slice(8, 10))}
              </div>
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto p-2">
              {list.map((t) => (
                <div key={t.id} className="rounded-lg border border-line bg-surface p-1.5">
                  <CalendarItem task={t} onToggle={onToggle} />
                  <div className="mt-1 flex items-center gap-1 px-1 text-[11px] text-ink-faint">
                    <span className="min-w-0 truncate">{t.programName}</span>
                    {t.checklist.length > 0 ? (
                      <span className="ml-auto shrink-0 whitespace-nowrap">
                        {t.checklist.filter((c) => c.checked).length}/{t.checklist.length}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </DroppableDay>
        );
      })}
    </div>
  );
}
