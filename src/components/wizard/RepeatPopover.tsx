'use client';

import { Repeat } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { ISODate, TaskDraft } from '@/lib/domain/types';
import {
  dateWarning,
  REPEAT_CAP,
  REPEAT_RULES,
  repeatDates,
  repeatLabel,
  type RepeatRule,
} from '@/lib/services/placement';
import { useWizardStore } from '@/stores/wizardStore';
import { cn } from '@/lib/utils';
import { formatShort } from '@/lib/utils/dates';

const RULE_LABEL: Record<RepeatRule, string> = {
  WEEKLY: '매주',
  BIWEEKLY: '2주마다',
  MONTHLY_DATE: '매월 같은 날짜',
  MONTHLY_WEEKDAY: '매월 같은 주차 요일',
};

/**
 * Expands a dated draft into repeated 회차 inside the program period. The rule is applied once
 * here and never stored; afterwards each 회차 is an ordinary row the user can move or delete.
 */
export function RepeatPopover({
  draft,
  seed,
  taken,
  period,
  closures,
}: {
  draft: TaskDraft;
  /** the date the repeat starts from */
  seed: ISODate;
  /** dates this task's group already occupies */
  taken: ReadonlySet<ISODate>;
  period: { startDate: ISODate; endDate: ISODate };
  closures: ReadonlySet<ISODate>;
}) {
  const addOccurrences = useWizardStore((s) => s.addOccurrences);
  const [open, setOpen] = useState(false);
  const [rule, setRule] = useState<RepeatRule>('WEEKLY');
  const [untilEnd, setUntilEnd] = useState(true);
  const [count, setCount] = useState(4);

  const limit = untilEnd ? REPEAT_CAP : Math.max(0, Math.min(REPEAT_CAP, count - 1));
  const dates = repeatDates(seed, rule, period, limit).filter((d) => !taken.has(d));
  const flagged = dates.filter((d) => dateWarning(d, period, closures) !== null).length;

  const apply = () => {
    if (dates.length === 0) return;
    addOccurrences(draft.key, dates);
    toast.success(`${draft.title} 회차 ${dates.length}개를 추가했습니다. (${repeatLabel(seed, rule)})`);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label="반복 배치"
            title="이 날짜부터 매주 또는 매달 반복해 회차를 추가합니다"
            className="text-ink-ghost hover:bg-app hover:text-brand flex size-7 items-center justify-center rounded"
          />
        }
      >
        <Repeat className="size-3.5" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[272px] gap-3 p-3">
        <div className="flex flex-col gap-0.5">
          <span className="truncate text-[12.5px] font-semibold">{draft.title} 반복</span>
          <span className="text-ink-faint text-[11.5px]">
            {formatShort(seed)}부터 {repeatLabel(seed, rule)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          {REPEAT_RULES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRule(r)}
              className={cn(
                'h-8 rounded-md border px-2 text-[12px] font-medium',
                rule === r
                  ? 'border-brand bg-brand-soft/60 text-brand'
                  : 'border-line bg-surface text-ink-soft hover:border-ink-ghost',
              )}
            >
              {RULE_LABEL[r]}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-1.5 text-[12.5px]">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="repeat-end"
              checked={untilEnd}
              onChange={() => setUntilEnd(true)}
              className="accent-brand"
            />
            종료일까지 ({formatShort(period.endDate)})
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="repeat-end"
              checked={!untilEnd}
              onChange={() => setUntilEnd(false)}
              className="accent-brand"
            />
            <span>총</span>
            <input
              type="number"
              min={2}
              max={REPEAT_CAP + 1}
              value={count}
              onChange={(e) => setCount(Number(e.target.value) || 2)}
              onFocus={() => setUntilEnd(false)}
              className="border-line bg-surface focus:border-ring h-7 w-14 rounded-md border px-2 text-right text-[12.5px] outline-none"
            />
            <span>회</span>
          </label>
        </div>

        <div className="text-ink-faint text-[11.5px] leading-relaxed">
          {dates.length === 0 ? (
            <span>기간 안에 추가할 날짜가 없습니다.</span>
          ) : (
            <>
              <span>
                {dates.length}개 추가, 마지막 {formatShort(dates[dates.length - 1])}
              </span>
              {flagged > 0 ? (
                <span className="text-warn"> · 주말·휴관일 {flagged}건 포함</span>
              ) : null}
            </>
          )}
        </div>

        <button
          type="button"
          onClick={apply}
          disabled={dates.length === 0}
          className="bg-brand hover:bg-brand-deep h-8 rounded-md text-xs font-semibold text-white disabled:opacity-50"
        >
          회차 {dates.length}개 추가
        </button>
      </PopoverContent>
    </Popover>
  );
}
