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
  const { data: closures = [], isLoading } = useClosures({
    from: `${year}-01-01`,
    to: `${year}-12-31`,
  });
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
      <PageHeader
        title="휴관일"
        subtitle="공휴일 및 복지관 휴관일. 해당 날짜의 할 일은 직전 근무일로 조정됩니다."
      >
        <div className="flex h-[30px] items-center rounded-lg bg-[#e9e7e2] p-0.5 text-[12.5px] font-medium">
          {years.map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => setYear(y)}
              className={cn(
                'text-ink-muted flex h-[26px] items-center rounded-md px-3',
                y === year && 'bg-surface text-ink shadow-[0_1px_2px_rgba(20,18,12,0.08)]',
              )}
            >
              {y}년
            </button>
          ))}
        </div>
      </PageHeader>

      <div className="border-line grid min-h-0 flex-1 grid-cols-1 border-t md:grid-cols-[minmax(0,1fr)_360px]">
        <div className="bg-surface min-h-0 overflow-y-auto">
          <div className="border-line text-ink-faint grid h-8 grid-cols-[120px_minmax(0,1fr)_40px] items-center border-b px-4 text-[11px] font-medium md:grid-cols-[150px_minmax(0,1fr)_120px_40px] md:px-5">
            <span>날짜</span>
            <span>이름</span>
            <span className="hidden md:block">구분</span>
            <span />
          </div>
          {isLoading ? (
            <p className="text-ink-faint px-5 py-6 text-[13px]">불러오는 중…</p>
          ) : closures.length === 0 ? (
            <p className="text-ink-faint px-5 py-6 text-[13px]">
              {year}년에 등록된 휴관일이 없습니다.
            </p>
          ) : (
            closures.map((c) => (
              <div
                key={c.id}
                className="border-hairline grid h-11 grid-cols-[120px_minmax(0,1fr)_40px] items-center border-b px-4 text-[13.5px] md:grid-cols-[150px_minmax(0,1fr)_120px_40px] md:px-5"
              >
                <span
                  className={cn('font-medium', isWeekend(c.date) ? 'text-ink-faint' : 'text-sun')}
                >
                  {formatMonthDayKo(c.date)}
                </span>
                <span className="truncate">{c.name}</span>
                <span className="text-ink-faint hidden text-xs md:block">
                  {CLOSURE_KIND_LABEL[c.kind]}
                </span>
                <button
                  type="button"
                  onClick={() => destroy(c.id, c.name)}
                  aria-label="삭제"
                  className="text-ink-ghost hover:bg-app hover:text-sun flex size-7 items-center justify-center rounded"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        <aside className="border-line order-first border-b p-4 md:order-none md:border-b-0 md:border-l md:p-5">
          <h2 className="text-[13.5px] font-semibold">휴관일 추가</h2>
          <p className="text-ink-faint mt-1 mb-4 text-xs leading-relaxed">
            직원 워크숍, 대체휴무, 시설 점검 등 복지관 휴관일을 등록하면 할 일 날짜 계산에
            반영됩니다.
          </p>
          <label className="mb-3 block">
            <span className="text-ink-faint mb-[5px] block text-[11.5px] font-medium">날짜</span>
            <DateField
              value={date}
              onChange={setDate}
              className="w-full"
              defaultMonth={`${year}-01-01`}
            />
          </label>
          <label className="mb-4 block">
            <span className="text-ink-faint mb-[5px] block text-[11.5px] font-medium">이름</span>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 직원 워크숍"
              className="bg-surface h-9"
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
