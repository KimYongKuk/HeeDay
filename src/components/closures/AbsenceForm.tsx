'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ABSENCE_ICON } from '@/components/calendar/AbsenceBadge';
import { DateField } from '@/components/common/DateField';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiClientError } from '@/lib/api/client';
import { useCreateAbsence } from '@/lib/api/queries';
import { ABSENCE_KINDS, type AbsenceKind } from '@/lib/domain/enums';
import { ABSENCE_KIND_LABEL } from '@/lib/domain/labels';
import type { ISODate } from '@/lib/domain/types';
import { ABSENCE_MAX_DAYS } from '@/lib/domain/zod';
import { cn } from '@/lib/utils';
import { compareISO, diffDaysISO } from '@/lib/utils/dates';

const PLACEHOLDER: Record<AbsenceKind, string> = {
  LEAVE: '예: 연차',
  TRIP: '예: 대구 출장',
  OTHER: '예: 외부 교육',
};

/**
 * Registers one absence period (휴가·출장·기타). Used on the 휴관·부재 screen and from a calendar
 * day cell, where `initialDate` prefills both ends so a single day needs only a name.
 */
export function AbsenceForm({
  initialDate,
  defaultMonth,
  compact,
  onCreated,
}: {
  initialDate?: ISODate;
  defaultMonth?: ISODate;
  /** popover layout: smaller controls, no heading */
  compact?: boolean;
  onCreated?: (input: { startDate: ISODate; endDate: ISODate; name: string }) => void;
}) {
  const create = useCreateAbsence();
  const [kind, setKind] = useState<AbsenceKind>('TRIP');
  const [startDate, setStartDate] = useState<ISODate | ''>(initialDate ?? '');
  const [endDate, setEndDate] = useState<ISODate | ''>(initialDate ?? '');
  const [name, setName] = useState('');

  const setStart = (d: ISODate) => {
    setStartDate(d);
    if (!endDate || compareISO(endDate, d) < 0) setEndDate(d);
  };

  const submit = async () => {
    if (!startDate) return toast.error('시작일을 선택하세요.');
    const end = endDate || startDate;
    if (compareISO(end, startDate) < 0) return toast.error('종료일은 시작일과 같거나 뒤여야 합니다.');
    if (diffDaysISO(startDate, end) > ABSENCE_MAX_DAYS)
      return toast.error(`부재 기간은 ${ABSENCE_MAX_DAYS}일을 넘을 수 없습니다.`);
    if (name.trim() === '') return toast.error('이름을 입력하세요.');
    try {
      await create.mutateAsync({ startDate, endDate: end, kind, name: name.trim() });
      toast.success(`${ABSENCE_KIND_LABEL[kind]}을(를) 표시했습니다.`);
      setName('');
      onCreated?.({ startDate, endDate: end, name: name.trim() });
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : '추가에 실패했습니다.');
    }
  };

  const labelCls = 'text-ink-faint mb-[5px] block text-[11.5px] font-medium';
  const fieldSize = compact ? 'sm' : 'md';

  return (
    <div className={cn('flex flex-col', compact ? 'gap-2.5' : 'gap-4')}>
      <div className="grid grid-cols-3 gap-1.5">
        {ABSENCE_KINDS.map((k) => {
          const Icon = ABSENCE_ICON[k];
          return (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              aria-pressed={kind === k}
              className={cn(
                'flex items-center justify-center gap-1.5 rounded-md border text-[12px] font-medium',
                compact ? 'h-7' : 'h-8',
                kind === k
                  ? 'border-away/40 bg-away-soft text-away'
                  : 'border-line bg-surface text-ink-soft hover:border-ink-ghost',
              )}
            >
              <Icon className="size-3.5" />
              {ABSENCE_KIND_LABEL[k]}
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className={labelCls}>시작일</span>
          <DateField
            value={startDate}
            onChange={setStart}
            size={fieldSize}
            format="short"
            className="w-full"
            defaultMonth={defaultMonth}
          />
        </label>
        <label className="block">
          <span className={labelCls}>종료일</span>
          <DateField
            value={endDate}
            onChange={setEndDate}
            size={fieldSize}
            format="short"
            className="w-full"
            defaultMonth={startDate || defaultMonth}
          />
        </label>
      </div>
      <label className="block">
        <span className={labelCls}>이름</span>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={PLACEHOLDER[kind]}
          maxLength={60}
          className={cn('bg-surface', compact ? 'h-8 text-[13px]' : 'h-9')}
          onKeyDown={(e) => e.key === 'Enter' && void submit()}
        />
      </label>
      <Button
        onClick={submit}
        disabled={create.isPending}
        className={cn('w-full font-semibold', compact ? 'h-8 text-xs' : 'h-9')}
      >
        <Plus data-icon="inline-start" strokeWidth={2} />
        부재 표시
      </Button>
    </div>
  );
}
