'use client';

import { useMemo, useState } from 'react';
import { CalendarItem } from '@/components/calendar/DayCell';
import { QuickAdd } from '@/components/calendar/QuickAdd';
import { PALETTE } from '@/lib/domain/colors';
import type { CalendarTaskDto, ProgramListDto } from '@/lib/domain/dto';
import { WEEKDAY_LABEL } from '@/lib/domain/labels';
import type { ISODate } from '@/lib/domain/types';
import { cn } from '@/lib/utils';
import { formatMonthDayKo, weekdayISO } from '@/lib/utils/dates';

const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일'];

/** Phone layout: compact month grid with dots, then the selected day's task list. */
export function MobileMonth({
  weeks,
  monthKey,
  today,
  tasks,
  programs,
  closures,
  onToggle,
}: {
  weeks: ISODate[][];
  monthKey: string;
  today: ISODate;
  tasks: CalendarTaskDto[];
  programs: ProgramListDto[];
  closures: Map<ISODate, string>;
  onToggle: (task: CalendarTaskDto) => void;
}) {
  const [selected, setSelected] = useState<ISODate>(() =>
    today.slice(0, 7) === monthKey ? today : `${monthKey}-01`,
  );
  const [syncedMonth, setSyncedMonth] = useState(monthKey);
  if (syncedMonth !== monthKey) {
    setSyncedMonth(monthKey);
    setSelected(today.slice(0, 7) === monthKey ? today : `${monthKey}-01`);
  }

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

  const dayTasks = byDate.get(selected) ?? [];
  const holiday = closures.get(selected);

  return (
    <div className="bg-surface flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="border-line text-ink-faint grid grid-cols-7 border-b text-[11px] font-medium">
        {WEEKDAYS.map((w, i) => (
          <div
            key={w}
            className={cn('py-1.5 text-center', i === 5 && 'text-sat', i === 6 && 'text-sun')}
          >
            {w}
          </div>
        ))}
      </div>
      <div className="border-line border-b">
        {weeks.map((week) => (
          <div key={week[0]} className="grid grid-cols-7">
            {week.map((date) => {
              const inMonth = date.slice(0, 7) === monthKey;
              const w = weekdayISO(date);
              const isToday = date === today;
              const isSelected = date === selected;
              const list = byDate.get(date) ?? [];
              const dots = [...new Map(list.map((t) => [t.programColor, t])).values()].slice(0, 4);
              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => setSelected(date)}
                  className={cn(
                    'flex h-[52px] flex-col items-center gap-1 pt-1.5',
                    isSelected && 'bg-brand-soft',
                    !isSelected && closures.get(date) && 'bg-holiday',
                  )}
                >
                  <span
                    className={cn(
                      'flex size-6 items-center justify-center rounded-full text-[12.5px] font-medium',
                      isToday && 'bg-brand text-white',
                      !isToday && (closures.get(date) || w === 0) && 'text-sun',
                      !isToday && w === 6 && 'text-sat',
                      !inMonth && 'text-ink-ghost',
                    )}
                  >
                    {Number(date.slice(8, 10))}
                  </span>
                  <span className="flex h-1.5 items-center gap-[3px]">
                    {dots.map((t) => (
                      <span
                        key={t.id}
                        className="size-1.5 rounded-full"
                        style={{
                          background: PALETTE[t.programColor].solid,
                          opacity: inMonth ? 1 : 0.4,
                        }}
                      />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 px-4 pt-3 pb-1.5">
        <span className="text-[14px] font-semibold">{formatMonthDayKo(selected)}</span>
        {holiday ? <span className="text-sun text-xs">{holiday}</span> : null}
        {selected === today ? (
          <span className="bg-brand-soft text-brand-deep rounded px-1.5 py-px text-[10.5px] font-semibold">
            오늘
          </span>
        ) : null}
        <span className="text-ink-faint ml-auto text-xs">{dayTasks.length}건</span>
        <QuickAdd date={selected} programs={programs} className="opacity-100" />
      </div>
      <div className="flex flex-col gap-1.5 px-3 pb-4">
        {dayTasks.length === 0 ? (
          <p className="text-ink-faint px-1 py-3 text-[12.5px]">
            {WEEKDAY_LABEL[weekdayISO(selected)]}요일에 예정된 할 일이 없습니다.
          </p>
        ) : (
          dayTasks.map((t) => (
            <div key={t.id} className="border-line bg-surface rounded-lg border p-1.5">
              <CalendarItem task={t} onToggle={onToggle} />
              <div className="text-ink-faint mt-1 px-1 text-[11px]">{t.programName}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
