'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { CalendarToolbar, type CalendarView } from '@/components/calendar/CalendarToolbar';
import { CalendarDnd } from '@/components/calendar/dnd';
import { MonthView } from '@/components/calendar/MonthView';
import { RightPanel } from '@/components/calendar/RightPanel';
import { TimelineView } from '@/components/calendar/TimelineView';
import { WeekView } from '@/components/calendar/WeekView';
import { ApiClientError } from '@/lib/api/client';
import { useClosures, usePrograms, useTasks, useUpdateTask } from '@/lib/api/queries';
import type { CalendarTaskDto } from '@/lib/domain/dto';
import type { ISODate } from '@/lib/domain/types';
import { addMonthsISO, monthGrid, timelineWindow, weekOf } from '@/lib/services/calendarLayout';
import { addDaysISO, formatMonthDayKo, isISODate, todayInSeoul } from '@/lib/utils/dates';

const VIEWS: CalendarView[] = ['month', 'week', 'timeline'];

export function CalendarScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const today = todayInSeoul();

  const view = (VIEWS as string[]).includes(params.get('view') ?? '') ? (params.get('view') as CalendarView) : 'month';
  const dateParam = params.get('date');
  const date: ISODate = dateParam && isISODate(dateParam) ? dateParam : today;
  const programParam = params.get('program');
  const programId = programParam && /^\d+$/.test(programParam) ? Number(programParam) : undefined;

  const setParams = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null) next.delete(k);
        else next.set(k, v);
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  const weeks = useMemo(() => monthGrid(date), [date]);
  const days = useMemo(() => weekOf(date), [date]);
  const win = useMemo(() => timelineWindow(date), [date]);
  const thisWeek = useMemo(() => weekOf(today), [today]);

  const range =
    view === 'month'
      ? { from: weeks[0][0], to: weeks[weeks.length - 1][6] }
      : view === 'week'
        ? { from: days[0], to: days[6] }
        : { from: win.from, to: win.to };

  const { data: tasks = [], isLoading } = useTasks({ ...range, programId });
  const { data: todayTasks = [] } = useTasks({ from: today, to: today, programId });
  const { data: weekTasks = [] } = useTasks({ from: thisWeek[0], to: thisWeek[6], programId });
  const { data: programs = [] } = usePrograms({ status: 'ACTIVE' });
  const { data: closureRows = [] } = useClosures(range);
  const update = useUpdateTask();

  const closures = useMemo(() => new Map(closureRows.map((c) => [c.date, c.name])), [closureRows]);
  const shownPrograms = programId ? programs.filter((p) => p.id === programId) : programs;

  const onToggle = useCallback(
    async (task: CalendarTaskDto) => {
      try {
        await update.mutateAsync({ id: task.id, patch: { done: !task.done } });
      } catch (err) {
        toast.error(err instanceof ApiClientError ? err.message : '변경에 실패했습니다.');
      }
    },
    [update],
  );

  const onMove = useCallback(
    async (task: CalendarTaskDto, dueDate: ISODate) => {
      try {
        await update.mutateAsync({ id: task.id, patch: { dueDate } });
        toast.success(`${formatMonthDayKo(dueDate)}로 이동했습니다.`);
      } catch (err) {
        toast.error(err instanceof ApiClientError ? err.message : '이동에 실패했습니다.');
      }
    },
    [update],
  );

  const [y, m] = date.split('-').map(Number);
  const title =
    view === 'month'
      ? `${y}년 ${m}월`
      : view === 'week'
        ? `${formatMonthDayKo(days[0], false)} – ${formatMonthDayKo(days[6], false)}`
        : `${Number(win.from.slice(0, 4))}년 ${Number(win.from.slice(5, 7))}월 – ${Number(win.to.slice(5, 7))}월`;
  const step =
    view === 'month'
      ? (n: number) => addMonthsISO(date, n)
      : view === 'week'
        ? (n: number) => addDaysISO(date, 7 * n)
        : (n: number) => addDaysISO(date, 28 * n);

  return (
    <>
      <CalendarToolbar
        title={title}
        subtitle={view === 'week' ? `${y}년` : undefined}
        view={view}
        programId={programId}
        programs={programs}
        onPrev={() => setParams({ date: step(-1) })}
        onNext={() => setParams({ date: step(1) })}
        onToday={() => setParams({ date: today })}
        onViewChange={(v) => setParams({ view: v === 'month' ? null : v })}
        onProgramChange={(id) => setParams({ program: id === null ? null : String(id) })}
        onPrint={view === 'month' ? () => window.print() : undefined}
      />
      {view === 'month' ? (
        <div data-print-header className="hidden items-baseline gap-3 px-1 pb-2 print:flex">
          <span className="text-xl font-semibold">{title}</span>
          <span className="text-sm text-ink-muted">달성군남부노인복지관 프로그램 일정</span>
          {programId ? <span className="text-sm text-ink-muted">· {programs.find((p) => p.id === programId)?.name}</span> : null}
          <span className="ml-auto text-xs text-ink-faint">출력 {formatMonthDayKo(today)}</span>
        </div>
      ) : null}
      <div className="flex min-h-0 flex-1 border-t border-line print:block print:border print:border-line">
        <CalendarDnd onMove={onMove}>
          {view === 'month' ? (
            <MonthView
              weeks={weeks}
              monthKey={date.slice(0, 7)}
              today={today}
              tasks={tasks}
              programs={shownPrograms}
              closures={closures}
              loading={isLoading}
              onToggle={onToggle}
            />
          ) : view === 'week' ? (
            <WeekView days={days} today={today} tasks={tasks} programs={shownPrograms} closures={closures} onToggle={onToggle} />
          ) : (
            <TimelineView window={win} today={today} tasks={tasks} programs={shownPrograms} />
          )}
        </CalendarDnd>
        {view === 'month' ? (
          <div className="flex print:hidden">
            <RightPanel today={today} todayTasks={todayTasks} weekTasks={weekTasks} programs={programs} onToggle={onToggle} />
          </div>
        ) : null}
      </div>
    </>
  );
}
