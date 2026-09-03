'use client';

import { ko } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { ISODate } from '@/lib/domain/types';
import { cn } from '@/lib/utils';
import { dateToISO, formatFullKo, isoToDate } from '@/lib/utils/dates';

export function DateField({
  value,
  onChange,
  placeholder = '날짜 선택',
  className,
  size = 'md',
  format = 'full',
  defaultMonth,
  disabled,
}: {
  value: ISODate | '';
  onChange: (d: ISODate) => void;
  placeholder?: string;
  className?: string;
  size?: 'sm' | 'md';
  format?: 'full' | 'short';
  defaultMonth?: ISODate;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const label = value
    ? format === 'full'
      ? formatFullKo(value)
      : formatShortKo(value)
    : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        render={
          <button
            type="button"
            className={cn(
              'border-line bg-surface text-ink hover:border-ink-ghost focus-visible:border-ring focus-visible:ring-ring/50 flex items-center justify-between gap-2 rounded-lg border px-3 text-left font-medium outline-none focus-visible:ring-3 disabled:opacity-50',
              size === 'md' ? 'h-9 text-[13.5px]' : 'h-7 rounded-md px-2 text-[12.5px]',
              !value && 'text-ink-faint font-normal',
              className,
            )}
          />
        }
      >
        <span className="truncate">{label}</span>
        <CalendarIcon
          className={cn('text-ink-ghost shrink-0', size === 'md' ? 'size-4' : 'size-3')}
        />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          locale={ko}
          weekStartsOn={1}
          selected={value ? isoToDate(value) : undefined}
          defaultMonth={
            value ? isoToDate(value) : defaultMonth ? isoToDate(defaultMonth) : undefined
          }
          onSelect={(d) => {
            if (d) {
              onChange(dateToISO(d));
              setOpen(false);
            }
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

function formatShortKo(date: ISODate): string {
  const [y, m, d] = date.split('-').map(Number);
  const weekday = ['일', '월', '화', '수', '목', '금', '토'][new Date(y, m - 1, d).getDay()];
  return `${m}. ${d} (${weekday})`;
}
