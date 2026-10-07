'use client';

import { Plus, Star } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import { AbsenceBadge, type AbsenceMark } from '@/components/calendar/AbsenceBadge';
import { TaskStatusBox } from '@/components/common/TaskStatusBox';
import { MemoComposer } from '@/components/memos/MemoList';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useMemos } from '@/lib/api/queries';
import { PALETTE } from '@/lib/domain/colors';
import type { CalendarTaskDto, ProgramListDto } from '@/lib/domain/dto';
import { ABSENCE_KIND_LABEL, WEEKDAY_LABEL } from '@/lib/domain/labels';
import type { ISODate } from '@/lib/domain/types';
import { cn } from '@/lib/utils';
import { compareDayTasks } from '@/lib/services/calendarLayout';
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
      <TaskStatusBox status={task.status} color={p.text} onClick={() => onToggle?.(task)} />
      {task.important ? (
        <Star className="text-star size-3 shrink-0" fill="currentColor" aria-label="중요" />
      ) : null}
      <span
        className={cn(
          'truncate',
          task.important && task.status !== 'DONE' && 'font-semibold',
          task.status === 'DONE' && 'text-ink-faint line-through',
        )}
      >
        {task.title}
      </span>
      <span className="text-ink-faint ml-auto shrink-0 text-xs">{task.templateName}</span>
    </div>
  );
}

function Section({
  title,
  sub,
  action,
  children,
}: {
  title: string;
  sub?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 flex items-baseline gap-2">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        {sub ? <span className="text-ink-faint text-[12.5px]">{sub}</span> : null}
        {action ? <span className="ml-auto self-center">{action}</span> : null}
      </div>
      {children}
    </section>
  );
}

/** "+" in the 메모 header: a popover composer so the panel itself never grows. */
function MemoQuickAdd({ programs }: { programs: ProgramListDto[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label="메모 추가"
            className="text-ink-ghost hover:bg-surface hover:text-ink flex size-6 items-center justify-center rounded"
          />
        }
      >
        <Plus className="size-4" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[300px] p-0 ring-0 shadow-lg">
        <MemoComposer programs={programs} autoFocus onCreated={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}

export function RightPanel({
  today,
  todayAbsence,
  todayTasks,
  weekTasks,
  importantTasks,
  programs,
  onToggle,
}: {
  today: ISODate;
  /** the absence (휴가·출장) covering today, if any */
  todayAbsence?: AbsenceMark;
  todayTasks: CalendarTaskDto[];
  weekTasks: CalendarTaskDto[];
  /** open 중요 tasks across every active program, earliest first */
  importantTasks: CalendarTaskDto[];
  programs: ProgramListDto[];
  onToggle: (task: CalendarTaskDto) => void;
}) {
  const [, m, d] = today.split('-').map(Number);
  const todaySorted = [...todayTasks].sort(compareDayTasks);
  const upcoming = weekTasks
    .filter((t) => t.dueDate > today && t.status !== 'DONE')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || compareDayTasks(a, b))
    .slice(0, 8);
  const important = importantTasks.slice(0, 10);
  const { data: memos = [] } = useMemos();
  const recentMemos = memos.slice(0, 3);
  const current = programs
    .filter((p) => p.endDate >= today || p.startDate > today)
    .sort((a, b) => (a.startDate < b.startDate ? -1 : 1));

  return (
    <aside className="border-line bg-app flex w-[312px] shrink-0 flex-col gap-[22px] overflow-y-auto border-l px-5 pt-[18px] pb-6">
      <Section title="오늘" sub={`${m}월 ${d}일 ${WEEKDAY_LABEL[weekdayISO(today)]}요일`}>
        {todayAbsence ? (
          <div className="bg-away-soft text-away mb-2 flex items-center gap-1.5 rounded-[10px] px-3 py-2 text-[12.5px] font-medium">
            <AbsenceBadge mark={todayAbsence} label={false} iconClassName="size-3.5" />
            <span className="truncate">
              {ABSENCE_KIND_LABEL[todayAbsence.kind]} · {todayAbsence.name}
            </span>
          </div>
        ) : null}
        <div className="border-line bg-surface rounded-[10px] border px-3">
          {todaySorted.length === 0 ? (
            <p className="text-ink-faint py-3 text-[12.5px]">오늘 예정된 할 일이 없습니다.</p>
          ) : (
            todaySorted.map((t) => <Row key={t.id} task={t} onToggle={onToggle} />)
          )}
        </div>
      </Section>

      <Section title="중요" sub={importantTasks.length > 0 ? `${importantTasks.length}건` : undefined}>
        <div className="border-line bg-surface rounded-[10px] border px-3">
          {important.length === 0 ? (
            <p className="text-ink-faint py-3 text-[12.5px]">
              중요로 표시한 할 일이 없습니다. 할 일의 별표를 눌러 표시합니다.
            </p>
          ) : (
            important.map((t) => (
              <div
                key={t.id}
                className="border-hairline flex h-[34px] items-center gap-2.5 border-t text-[13.5px] first:border-t-0"
              >
                <button
                  type="button"
                  onClick={() => onToggle(t)}
                  aria-label="완료"
                  className="flex size-3.5 shrink-0 items-center justify-center rounded-[4px] border-[1.5px] opacity-60 hover:opacity-100"
                  style={{ borderColor: PALETTE[t.programColor].text }}
                />
                <span
                  className={cn(
                    'w-9 shrink-0 text-xs',
                    t.dueDate < today ? 'text-sun font-semibold' : 'text-ink-faint',
                  )}
                >
                  {formatShort(t.dueDate)}
                </span>
                <span className="truncate font-semibold">{t.title}</span>
                <span className="text-ink-faint ml-auto shrink-0 text-xs">{t.templateName}</span>
              </div>
            ))
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

      <Section
        title="메모"
        sub={memos.length > 0 ? `${memos.length}건` : undefined}
        action={<MemoQuickAdd programs={programs} />}
      >
        <div className="border-line bg-surface rounded-[10px] border px-3">
          {recentMemos.length === 0 ? (
            <p className="text-ink-faint py-3 text-[12.5px]">
              못한 일이나 해야 할 일을 적어 둡니다. + 로 추가합니다.
            </p>
          ) : (
            recentMemos.map((memo) => (
              <Link
                key={memo.id}
                href="/memos"
                title={memo.body}
                className="border-hairline hover:text-brand flex h-[34px] items-center gap-2 border-t text-[13px] first:border-t-0"
              >
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{
                    background: memo.programColor
                      ? PALETTE[memo.programColor].solid
                      : 'var(--color-ink-ghost)',
                  }}
                />
                <span className="truncate">{memo.body.split('\n')[0]}</span>
              </Link>
            ))
          )}
          {memos.length > recentMemos.length ? (
            <Link
              href="/memos"
              className="text-brand border-hairline flex h-[30px] items-center border-t text-[12px] font-medium hover:underline"
            >
              전체 보기 ({memos.length})
            </Link>
          ) : null}
        </div>
      </Section>
    </aside>
  );
}
