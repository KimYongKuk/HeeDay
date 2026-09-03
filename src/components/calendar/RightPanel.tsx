'use client';

import { Check } from 'lucide-react';
import Link from 'next/link';
import { PALETTE } from '@/lib/domain/colors';
import type { CalendarTaskDto, ProgramListDto } from '@/lib/domain/dto';
import { WEEKDAY_LABEL } from '@/lib/domain/labels';
import type { ISODate } from '@/lib/domain/types';
import { cn } from '@/lib/utils';
import { formatShort, weekdayISO } from '@/lib/utils/dates';

function Row({
  task,
  onToggle,
}: {
  task: CalendarTaskDto;
  onToggle?: (task: CalendarTaskDto) => void;
}) {
  const p = PALETTE[task.programColor];
  return (
    <div className="border-hairline flex h-[34px] items-center gap-2.5 border-t text-[13.5px] first:border-t-0">
      <button
        type="button"
        onClick={() => onToggle?.(task)}
        aria-label={task.done ? '완료 취소' : '완료'}
        className={cn(
          'flex size-3.5 shrink-0 items-center justify-center rounded-[4px] border-[1.5px]',
          task.done ? 'text-white' : 'opacity-60 hover:opacity-100',
        )}
        style={
          task.done
            ? { background: p.text, borderColor: p.text }
            : { borderColor: p.text, color: p.text }
        }
      >
        {task.done ? <Check className="size-2.5" strokeWidth={3} /> : null}
      </button>
      <span className={cn('truncate', task.done && 'text-ink-faint line-through')}>
        {task.title}
      </span>
      <span className="text-ink-faint ml-auto shrink-0 text-xs">{task.templateName}</span>
    </div>
  );
}

function Section({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 flex items-baseline gap-2">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        {sub ? <span className="text-ink-faint text-[12.5px]">{sub}</span> : null}
      </div>
      {children}
    </section>
  );
}

export function RightPanel({
  today,
  todayTasks,
  weekTasks,
  programs,
  onToggle,
}: {
  today: ISODate;
  todayTasks: CalendarTaskDto[];
  weekTasks: CalendarTaskDto[];
  programs: ProgramListDto[];
  onToggle: (task: CalendarTaskDto) => void;
}) {
  const [, m, d] = today.split('-').map(Number);
  const todaySorted = [...todayTasks].sort((a, b) => Number(a.done) - Number(b.done));
  const upcoming = weekTasks.filter((t) => t.dueDate > today && !t.done).slice(0, 8);
  const current = programs
    .filter((p) => p.endDate >= today || p.startDate > today)
    .sort((a, b) => (a.startDate < b.startDate ? -1 : 1));

  return (
    <aside className="border-line bg-app flex w-[312px] shrink-0 flex-col gap-[22px] overflow-y-auto border-l px-5 pt-[18px] pb-6">
      <Section title="오늘" sub={`${m}월 ${d}일 ${WEEKDAY_LABEL[weekdayISO(today)]}요일`}>
        <div className="border-line bg-surface rounded-[10px] border px-3">
          {todaySorted.length === 0 ? (
            <p className="text-ink-faint py-3 text-[12.5px]">오늘 예정된 할 일이 없습니다.</p>
          ) : (
            todaySorted.map((t) => <Row key={t.id} task={t} onToggle={onToggle} />)
          )}
        </div>
      </Section>

      <Section title="이번 주" sub="오늘 이후">
        <div className="border-line bg-surface rounded-[10px] border px-3">
          {upcoming.length === 0 ? (
            <p className="text-ink-faint py-3 text-[12.5px]">남은 할 일이 없습니다.</p>
          ) : (
            upcoming.map((t) => (
              <div
                key={t.id}
                className="border-hairline flex h-[34px] items-center gap-2.5 border-t text-[13.5px] first:border-t-0"
              >
                <span className="text-ink-faint w-9 shrink-0 text-xs">
                  {formatShort(t.dueDate)}
                </span>
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ background: PALETTE[t.programColor].solid }}
                />
                <span className="truncate">{t.title}</span>
              </div>
            ))
          )}
        </div>
      </Section>

      <Section title="프로그램 현황">
        {current.length === 0 ? (
          <p className="text-ink-faint text-[12.5px]">진행 중인 프로그램이 없습니다.</p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {current.map((p) => {
              const upcomingProgram = p.startDate > today;
              const ratio = p.taskCount > 0 ? p.doneCount / p.taskCount : 0;
              return (
                <div key={p.id} className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 text-[13px]">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ background: PALETTE[p.color].solid }}
                    />
                    <Link
                      href={`/programs/${p.id}`}
                      className="hover:text-brand truncate hover:underline"
                    >
                      {p.name}
                    </Link>
                    <span className="text-ink-faint ml-auto shrink-0 text-xs">
                      {upcomingProgram ? '준비 중' : `${p.doneCount} / ${p.taskCount}건`}
                    </span>
                  </div>
                  <div className="bg-line h-1 overflow-hidden rounded-sm">
                    <div
                      className="h-full"
                      style={{
                        width: `${Math.round(ratio * 100)}%`,
                        background: PALETTE[p.color].solid,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </aside>
  );
}
