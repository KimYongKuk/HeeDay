'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { DateField } from '@/components/common/DateField';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiClientError } from '@/lib/api/client';
import { useClosures, useCreateClosure, useDeleteClosure } from '@/lib/api/queries';
import { CLOSURE_KIND_LABEL } from '@/lib/domain/labels';
import type { ISODate } from '@/lib/domain/types';
import { cn } from '@/lib/utils';
import { formatMonthDayKo, isWeekend, todayInSeoul } from '@/lib/utils/dates';

export function ClosuresScreen() {
  const currentYear = Number(todayInSeoul().slice(0, 4));
  const [year, setYear] = useState(currentYear);
  const { data: closures = [], isLoading } = useClosures({ from: `${year}-01-01`, to: `${year}-12-31` });
  const create = useCreateClosure();
  const remove = useDeleteClosure();

  const [date, setDate] = useState<ISODate | ''>('');
  const [name, setName] = useState('');

  const add = async () => {
    if (!date) return toast.error('날짜를 선택하세요.');
    if (name.trim() === '') return toast.error('이름을 입력하세요.');
    try {
      await create.mutateAsync({ date, name: name.trim(), kind: 'CENTER' });
      toast.success('휴관일을 추가했습니다.');
      setDate('');
      setName('');
      if (Number(date.slice(0, 4)) !== year) setYear(Number(date.slice(0, 4)));
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : '추가에 실패했습니다.');
    }
  };

  const destroy = async (id: number, label: string) => {
    if (!window.confirm(`'${label}'을(를) 삭제할까요?`)) return;
    try {
      await remove.mutateAsync(id);
      toast.success('삭제했습니다.');
    } catch {
      toast.error('삭제에 실패했습니다.');
    }
  };

  const years = [currentYear - 1, currentYear, currentYear + 1];

  return (
    <>
      <PageHeader title="휴관일" subtitle="공휴일 및 복지관 휴관일. 해당 날짜의 할 일은 직전 근무일로 조정됩니다.">
        <div className="flex h-[30px] items-center rounded-lg bg-[#e9e7e2] p-0.5 text-[12.5px] font-medium">
          {years.map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => setYear(y)}
              className={cn(
                'flex h-[26px] items-center rounded-md px-3 text-ink-muted',
                y === year && 'bg-surface text-ink shadow-[0_1px_2px_rgba(20,18,12,0.08)]',
              )}
            >
              {y}년
            </button>
          ))}
        </div>
      </PageHeader>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_360px] border-t border-line">
        <div className="min-h-0 overflow-y-auto bg-surface">
          <div className="grid h-8 grid-cols-[150px_minmax(0,1fr)_120px_40px] items-center border-b border-line px-5 text-[11px] font-medium text-ink-faint">
            <span>날짜</span>
            <span>이름</span>
            <span>구분</span>
            <span />
          </div>
          {isLoading ? (
            <p className="px-5 py-6 text-[13px] text-ink-faint">불러오는 중…</p>
          ) : closures.length === 0 ? (
            <p className="px-5 py-6 text-[13px] text-ink-faint">{year}년에 등록된 휴관일이 없습니다.</p>
          ) : (
            closures.map((c) => (
              <div
                key={c.id}
                className="grid h-11 grid-cols-[150px_minmax(0,1fr)_120px_40px] items-center border-b border-hairline px-5 text-[13.5px]"
              >
                <span className={cn('font-medium', isWeekend(c.date) ? 'text-ink-faint' : 'text-sun')}>
                  {formatMonthDayKo(c.date)}
                </span>
                <span className="truncate">{c.name}</span>
                <span className="text-xs text-ink-faint">{CLOSURE_KIND_LABEL[c.kind]}</span>
                <button
                  type="button"
                  onClick={() => destroy(c.id, c.name)}
                  aria-label="삭제"
                  className="flex size-7 items-center justify-center rounded text-ink-ghost hover:bg-app hover:text-sun"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        <aside className="border-l border-line p-5">
          <h2 className="text-[13.5px] font-semibold">휴관일 추가</h2>
          <p className="mt-1 mb-4 text-xs leading-relaxed text-ink-faint">
            직원 워크숍, 대체휴무, 시설 점검 등 복지관 휴관일을 등록하면 할 일 날짜 계산에 반영됩니다.
          </p>
          <label className="mb-3 block">
            <span className="mb-[5px] block text-[11.5px] font-medium text-ink-faint">날짜</span>
            <DateField value={date} onChange={setDate} className="w-full" defaultMonth={`${year}-01-01`} />
          </label>
          <label className="mb-4 block">
            <span className="mb-[5px] block text-[11.5px] font-medium text-ink-faint">이름</span>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 직원 워크숍"
              className="h-9 bg-surface"
              onKeyDown={(e) => e.key === 'Enter' && void add()}
            />
          </label>
          <Button onClick={add} disabled={create.isPending} className="h-9 w-full font-semibold">
            <Plus data-icon="inline-start" strokeWidth={2} />
            추가
          </Button>
        </aside>
      </div>
    </>
  );
}
