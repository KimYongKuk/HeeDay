'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { TaskPopover } from '@/components/calendar/TaskPopover';
import { PALETTE } from '@/lib/domain/colors';
import type { CalendarTaskDto, ProgramListDto } from '@/lib/domain/dto';
import type { ISODate } from '@/lib/domain/types';
import { percentInWindow, type TimelineWindow } from '@/lib/services/calendarLayout';
import { cn } from '@/lib/utils';
import { addDaysISO, compareISO, formatShort } from '@/lib/utils/dates';

const LABEL_W = 220;

export function TimelineView({
  window: win,
  today,
  tasks,
  programs,
}: {
  window: TimelineWindow;
  today: ISODate;
  tasks: CalendarTaskDto[];
  programs: ProgramListDto[];
}) {
  const rows = useMemo(
    () =>
      programs
        .filter((p) => compareISO(p.endDate, win.from) >= 0 && compareISO(p.startDate, win.to) <= 0)
        .sort((a, b) => compareISO(a.startDate, b.startDate) || a.id - b.id),
    [programs, win],
  );

  const tasksByProgram = useMemo(() => {
    const map = new Map<number, CalendarTaskDto[]>();
    for (const t of tasks) {
      const list = map.get(t.programId) ?? [];
      list.push(t);
      map.set(t.programId, list);
    }
    return map;
  }, [tasks]);

  const todayInWindow = compareISO(today, win.from) >= 0 && compareISO(today, win.to) <= 0;
  const todayPct = percentInWindow(today, win, { center: true });
  const seg = (from: ISODate, to: ISODate) => {
    const left = percentInWindow(from, win);
    const right = percentInWindow(addDaysISO(to, 1), win);
    return { left: `${left}%`, width: `${Math.max(0, right - left)}%` };
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto bg-surface">
      <div className="sticky top-0 z-10 grid h-10 shrink-0 border-b border-line bg-surface" style={{ gridTemplateColumns: `${LABEL_W}px minmax(0, 1fr)` }}>
        <div className="flex items-center border-r border-line pl-4 text-[11.5px] font-medium text-ink-faint">프로그램 {rows.length}</div>
        <div className="grid" style={{ gridTemplateColumns: `repeat(${win.weekStarts.length}, minmax(0, 1fr))` }}>
          {win.weekStarts.map((d) => (
            <div key={d} className={cn('flex items-center border-l border-hairline pl-2 text-[11.5px] font-medium text-ink-faint', Number(d.slice(8, 10)) <= 7 && 'font-semibold text-ink')}>
              {Number(d.slice(5, 7))}월 {Number(d.slice(8, 10))}일
            </div>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="p-6 text-[13px] text-ink-faint">이 기간에 해당하는 프로그램이 없습니다.</p>
      ) : (
        rows.map((p) => {
          const pal = PALETTE[p.color];
          const list = tasksByProgram.get(p.id) ?? [];
          const showLabels = list.length <= 8;
          return (
            <div key={p.id} className="grid h-[84px] border-b border-line" style={{ gridTemplateColumns: `${LABEL_W}px minmax(0, 1fr)` }}>
              <div className="flex flex-col gap-[3px] border-r border-line px-4 py-3.5">
                <Link href={`/programs/${p.id}`} className="flex items-center gap-2 text-[13.5px] font-semibold hover:text-brand">
                  <span className="size-2 shrink-0 rounded-full" style={{ background: pal.solid }} />
                  <span className="truncate">{p.name}</span>
                </Link>
                <span className="pl-4 text-[11.5px] text-ink-faint">
                  {formatShort(p.startDate)} – {formatShort(p.endDate)} · 할 일 {p.doneCount}/{p.taskCount}
                </span>
                {p.assignee ? <span className="pl-4 text-[11.5px] text-ink-faint">담당 {p.assignee}</span> : null}
              </div>
              <div
                className="relative"
                style={{ backgroundImage: 'linear-gradient(to right, #efede8 1px, transparent 1px)', backgroundSize: `${100 / win.weekStarts.length}% 100%` }}
              >
                <div
                  className="absolute top-6 flex h-[22px] items-center overflow-hidden rounded-md pr-2 pl-3 text-[11px] font-semibold whitespace-nowrap text-white"
                  style={{ ...seg(p.startDate, p.endDate), background: pal.solid }}
                >
                  {p.name}
                </div>
                {list.map((t) => (
                  <TaskPopover key={t.id} task={t}>
                    <div
                      title={`${t.title} · ${formatShort(t.dueDate)}`}
                      className="absolute top-14 flex -translate-x-1 items-center gap-1 text-[10.5px] text-ink-muted"
                      style={{ left: `${percentInWindow(t.dueDate, win, { center: true })}%` }}
                    >
                      <span className={cn('block size-2 rotate-45 rounded-[2px]', t.done && 'opacity-40')} style={{ background: pal.solid }} />
                      {showLabels ? <span className={cn('whitespace-nowrap', t.done && 'text-ink-ghost line-through')}>{t.title}</span> : null}
                    </div>
                  </TaskPopover>
                ))}
              </div>
            </div>
          );
        })
      )}

      {todayInWindow ? (
        <>
          <div className="pointer-events-none absolute top-0 bottom-0 w-[1.5px] bg-brand" style={{ left: `calc(${LABEL_W}px + (100% - ${LABEL_W}px) * ${todayPct / 100})` }} />
          <div className="pointer-events-none absolute top-11 -translate-x-1/2 rounded bg-brand px-1.5 py-0.5 text-[10.5px] font-semibold text-white" style={{ left: `calc(${LABEL_W}px + (100% - ${LABEL_W}px) * ${todayPct / 100})` }}>
            오늘
          </div>
        </>
      ) : null}
    </div>
  );
}
