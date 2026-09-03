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
    for (const list of map.values())
      list.sort((a, b) => Number(a.done) - Number(b.done) || a.id - b.id);
    return map;
  }, [tasks]);

  return (
    <div className="bg-surface flex min-h-0 flex-1 flex-col overflow-y-auto md:grid md:grid-cols-7 md:overflow-hidden">
      {days.map((date) => {
        const w = weekdayISO(date);
        const isToday = date === today;
        const holiday = closures.get(date);
        const list = byDate.get(date) ?? [];
        const tone = cn(
          isToday && 'text-brand',
          w === 6 && 'text-sat',
          (w === 0 || holiday) && 'text-sun',
        );
        return (
          <DroppableDay
            key={date}
            date={date}
            className={cn(
              'group border-line flex flex-col border-b md:min-h-0 md:border-r md:border-b-0 md:last:border-r-0',
              holiday
                ? 'bg-holiday'
                : isToday
                  ? 'bg-today'
                  : w === 0 || w === 6
                    ? 'bg-weekend'
                    : 'bg-surface',
            )}
          >
            <div
              className={cn(
                'border-line flex shrink-0 items-center gap-2 border-b px-3 py-2 md:h-14 md:flex-col md:items-start md:justify-center md:gap-0.5',
                isToday && 'border-brand-line',
              )}
            >
              <div className={cn('text-lg font-semibold tracking-[-0.01em] md:order-2', tone)}>
                {Number(date.slice(8, 10))}
              </div>
              <div className="text-ink-faint flex min-w-0 flex-1 items-center gap-2 text-[11.5px] font-medium md:order-1 md:w-full">
                <span className={tone}>
                  {WEEKDAY_LABEL[w]}요일
                  {isToday ? ' · 오늘' : ''}
                </span>
                {holiday ? <span className="text-sun/80 truncate">{holiday}</span> : null}
                <QuickAdd
                  date={date}
                  programs={programs}
                  className="ml-auto md:opacity-0 md:group-hover:opacity-100 md:data-popup-open:opacity-100"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5 p-2 md:min-h-0 md:flex-1 md:overflow-y-auto">
              {list.length === 0 ? (
                <p className="text-ink-ghost px-1 py-1 text-[11.5px] md:hidden">없음</p>
              ) : null}
              {list.map((t) => (
                <div key={t.id} className="border-line bg-surface rounded-lg border p-1.5">
                  <CalendarItem task={t} onToggle={onToggle} />
                  <div className="text-ink-faint mt-1 flex items-center gap-1 px-1 text-[11px]">
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
