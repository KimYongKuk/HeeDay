'use client';

import { ChevronLeft, ChevronRight, Printer } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PALETTE } from '@/lib/domain/colors';
import type { ProgramListDto } from '@/lib/domain/dto';
import { cn } from '@/lib/utils';

export type CalendarView = 'month' | 'week' | 'timeline';

const VIEW_LABEL: Record<CalendarView, string> = { month: '월', week: '주', timeline: '타임라인' };

export function CalendarToolbar({
  title,
  subtitle,
  view,
  programId,
  programs,
  onPrev,
  onNext,
  onToday,
  onViewChange,
  onProgramChange,
  onPrint,
}: {
  title: string;
  subtitle?: string;
  view: CalendarView;
  programId?: number;
  programs: ProgramListDto[];
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onViewChange: (v: CalendarView) => void;
  onProgramChange: (id: number | null) => void;
  onPrint?: () => void;
}) {
  const items = [
    { value: 'ALL', label: '프로그램: 전체' },
    ...programs.map((p) => ({ value: String(p.id), label: p.name })),
  ];

  return (
    <div className="flex h-[52px] shrink-0 items-center gap-3 px-5 print:hidden">
      <h1 className="text-lg font-semibold tracking-[-0.01em]">{title}</h1>
      {subtitle ? <span className="text-[12.5px] text-ink-faint">{subtitle}</span> : null}
      <div className="ml-1 flex items-center gap-0.5">
        <button
          type="button"
          onClick={onPrev}
          aria-label="이전"
          className="flex size-7 items-center justify-center rounded-md text-ink-muted hover:bg-surface hover:text-ink"
        >
          <ChevronLeft className="size-4" />
        </button>
        <button
          type="button"
          onClick={onNext}
          aria-label="다음"
          className="flex size-7 items-center justify-center rounded-md text-ink-muted hover:bg-surface hover:text-ink"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
      <button
        type="button"
        onClick={onToday}
        className="h-7 rounded-md border border-line bg-surface px-2.5 text-[12.5px] font-medium text-ink-soft hover:border-ink-ghost"
      >
        오늘
      </button>
      <div className="flex-1" />
      <Select
        items={items}
        value={programId ? String(programId) : 'ALL'}
        onValueChange={(v) => onProgramChange(!v || v === 'ALL' ? null : Number(v))}
      >
        <SelectTrigger size="sm" className="h-[30px] min-w-[150px] bg-surface text-[12.5px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end">
          {items.map((it) => {
            const p = programs.find((x) => String(x.id) === it.value);
            return (
              <SelectItem key={it.value} value={it.value}>
                {p ? <span className="size-2 rounded-full" style={{ background: PALETTE[p.color].solid }} /> : null}
                {it.label}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      <div className="flex h-[30px] items-center rounded-lg bg-[#e9e7e2] p-0.5 text-[12.5px] font-medium">
        {(Object.keys(VIEW_LABEL) as CalendarView[]).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onViewChange(v)}
            className={cn(
              'flex h-[26px] items-center rounded-md px-3 text-ink-muted',
              view === v && 'bg-surface text-ink shadow-[0_1px_2px_rgba(20,18,12,0.08)]',
            )}
          >
            {VIEW_LABEL[v]}
          </button>
        ))}
      </div>
      {onPrint ? (
        <button
          type="button"
          onClick={onPrint}
          aria-label="인쇄"
          title="월간 캘린더 인쇄"
          className="flex size-[30px] items-center justify-center rounded-md border border-line bg-surface text-ink-muted hover:border-ink-ghost hover:text-ink"
        >
          <Printer className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
