'use client';

import { ChevronLeft, ChevronRight, Printer } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
    <div className="flex min-h-[52px] shrink-0 flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2 md:px-5 print:hidden">
      <h1 className="text-[17px] font-semibold tracking-[-0.01em] md:text-lg">{title}</h1>
      {subtitle ? (
        <span className="text-ink-faint hidden text-[12.5px] sm:inline">{subtitle}</span>
      ) : null}
      <div className="flex items-center gap-0.5 md:ml-1">
        <button
          type="button"
          onClick={onPrev}
          aria-label="이전"
          className="text-ink-muted hover:bg-surface hover:text-ink flex size-7 items-center justify-center rounded-md"
        >
          <ChevronLeft className="size-4" />
        </button>
        <button
          type="button"
          onClick={onNext}
          aria-label="다음"
          className="text-ink-muted hover:bg-surface hover:text-ink flex size-7 items-center justify-center rounded-md"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
      <button
        type="button"
        onClick={onToday}
        className="border-line bg-surface text-ink-soft hover:border-ink-ghost h-7 rounded-md border px-2.5 text-[12.5px] font-medium"
      >
        오늘
      </button>
      <div className="flex-1" />
      <Select
        items={items}
        value={programId ? String(programId) : 'ALL'}
        onValueChange={(v) => onProgramChange(!v || v === 'ALL' ? null : Number(v))}
      >
        <SelectTrigger
          size="sm"
          className="bg-surface h-[30px] max-w-[180px] text-[12.5px] md:min-w-[150px]"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end">
          {items.map((it) => {
            const p = programs.find((x) => String(x.id) === it.value);
            return (
              <SelectItem key={it.value} value={it.value}>
                {p ? (
                  <span
                    className="size-2 rounded-full"
                    style={{ background: PALETTE[p.color].solid }}
                  />
                ) : null}
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
              'text-ink-muted flex h-[26px] items-center rounded-md px-2.5 md:px-3',
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
          className="border-line bg-surface text-ink-muted hover:border-ink-ghost hover:text-ink hidden size-[30px] items-center justify-center rounded-md border md:flex"
        >
          <Printer className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
