'use client';

import { useMemo } from 'react';
import { DayCell } from '@/components/calendar/DayCell';
import { LaneLayer } from '@/components/calendar/LaneLayer';
import { useElementSize } from '@/hooks/useElementSize';
import { usePrinting } from '@/hooks/usePrinting';
import type { CalendarTaskDto, ProgramListDto } from '@/lib/domain/dto';
import type { ISODate } from '@/lib/domain/types';
import { assignLanes, chipCapacity } from '@/lib/services/calendarLayout';
import { compareISO } from '@/lib/utils/dates';
import { cn } from '@/lib/utils';

const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일'];

export function MonthView({
  weeks,
  monthKey,
  today,
  tasks,
  programs,
  closures,
  loading,
  onToggle,
}: {
  weeks: ISODate[][];
  monthKey: string;
  today: ISODate;
  tasks: CalendarTaskDto[];
  programs: ProgramListDto[];
  closures: Map<ISODate, string>;
  loading: boolean;
  onToggle: (task: CalendarTaskDto) => void;
}) {
  const { ref, height } = useElementSize<HTMLDivElement>();
  const printing = usePrinting();
  const rowHeight = height > 0 ? height / weeks.length : 150;
  const capacity = printing ? Number.POSITIVE_INFINITY : chipCapacity(rowHeight);

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

  const gridFrom = weeks[0][0];
  const gridTo = weeks[weeks.length - 1][6];
  const visiblePrograms = useMemo(
    () => programs.filter((p) => compareISO(p.endDate, gridFrom) >= 0 && compareISO(p.startDate, gridTo) <= 0),
    [programs, gridFrom, gridTo],
  );
  const lanes = useMemo(
    () => assignLanes(visiblePrograms.map((p) => ({ id: p.id, from: p.startDate, to: p.endDate }))),
    [visiblePrograms],
  );

  return (
    <div className="flex min-w-0 flex-1 flex-col bg-surface">
      <div className="grid h-8 shrink-0 grid-cols-7 border-b border-line text-[11.5px] font-medium text-ink-faint">
        {WEEKDAYS.map((w, i) => (
          <div key={w} className={cn('flex items-center pl-2.5', i === 5 && 'text-sat', i === 6 && 'text-sun')}>
            {w}
          </div>
        ))}
      </div>
      <div
        ref={ref}
        data-print-grid
        className={cn('grid min-h-0 flex-1', loading && 'opacity-70')}
        style={{ gridTemplateRows: `repeat(${weeks.length}, minmax(0, 1fr))` }}
      >
        {weeks.map((week) => (
          <div key={week[0]} className="relative grid min-h-0 grid-cols-7 border-b border-line last:border-b-0">
            {week.map((date) => (
              <DayCell
                key={date}
                date={date}
                inMonth={date.slice(0, 7) === monthKey}
                isToday={date === today}
                holidayName={closures.get(date)}
                tasks={byDate.get(date) ?? []}
                programs={programs}
                capacity={capacity}
                onToggle={onToggle}
              />
            ))}
            <LaneLayer week={week} programs={visiblePrograms} lanes={lanes} />
          </div>
        ))}
      </div>
    </div>
  );
}
