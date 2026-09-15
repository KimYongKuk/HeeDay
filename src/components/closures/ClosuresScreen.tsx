'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ABSENCE_ICON } from '@/components/calendar/AbsenceBadge';
import { AbsenceForm } from '@/components/closures/AbsenceForm';
import { DateField } from '@/components/common/DateField';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiClientError } from '@/lib/api/client';
import {
  useAbsences,
  useClosures,
  useCreateClosure,
  useDeleteAbsence,
  useDeleteClosure,
} from '@/lib/api/queries';
import type { AbsenceDto, ClosureDayDto } from '@/lib/domain/dto';
import { ABSENCE_KIND_LABEL, CLOSURE_KIND_LABEL } from '@/lib/domain/labels';
import type { ISODate } from '@/lib/domain/types';
import { cn } from '@/lib/utils';
import { compareISO, formatMonthDayKo, isWeekend, todayInSeoul } from '@/lib/utils/dates';

type Row =
  | { type: 'closure'; sortDate: ISODate; row: ClosureDayDto }
  | { type: 'absence'; sortDate: ISODate; row: AbsenceDto };

type FormTab = 'closure' | 'absence';

/** 휴관(기관)과 부재(담당자)를 한 목록으로 관리한다. 두 가지 모두 마법사에서 경고로만 쓰인다. */
export function ClosuresScreen() {
  const currentYear = Number(todayInSeoul().slice(0, 4));
  const [year, setYear] = useState(currentYear);
  const range = { from: `${year}-01-01` as ISODate, to: `${year}-12-31` as ISODate };
  const { data: closures = [], isLoading: loadingClosures } = useClosures(range);
  const { data: absences = [], isLoading: loadingAbsences } = useAbsences(range);
  const createClosure = useCreateClosure();
  const removeClosure = useDeleteClosure();
  const removeAbsence = useDeleteAbsence();

  const [tab, setTab] = useState<FormTab>('closure');
  const [date, setDate] = useState<ISODate | ''>('');
  const [name, setName] = useState('');

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [
      ...closures.map((c): Row => ({ type: 'closure', sortDate: c.date, row: c })),
      ...absences.map((a): Row => ({ type: 'absence', sortDate: a.startDate, row: a })),
    ];
    return out.sort((a, b) => compareISO(a.sortDate, b.sortDate) || a.row.id - b.row.id);
  }, [closures, absences]);

  const jumpToYear = (d: ISODate) => {
    if (Number(d.slice(0, 4)) !== year) setYear(Number(d.slice(0, 4)));
  };

  const addClosure = async () => {
    if (!date) return toast.error('날짜를 선택하세요.');
    if (name.trim() === '') return toast.error('이름을 입력하세요.');
    try {
      await createClosure.mutateAsync({ date, name: name.trim(), kind: 'CENTER' });
      toast.success('휴관일을 추가했습니다.');
      setDate('');
      setName('');
      jumpToYear(date);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : '추가에 실패했습니다.');
    }
  };

  const destroy = async (r: Row) => {
    if (!window.confirm(`'${r.row.name}'을(를) 삭제할까요?`)) return;
    try {
      if (r.type === 'closure') await removeClosure.mutateAsync(r.row.id);
      else await removeAbsence.mutateAsync(r.row.id);
      toast.success('삭제했습니다.');
    } catch {
      toast.error('삭제에 실패했습니다.');
    }
  };

  const years = [currentYear - 1, currentYear, currentYear + 1];
  const isLoading = loadingClosures || loadingAbsences;
  const gridCols =
    'grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_40px] md:grid-cols-[230px_minmax(0,1fr)_120px_40px]';

  return (
    <>
      <PageHeader
        title="휴관·부재"
        subtitle="공휴일과 복지관 휴관일, 담당자 부재(휴가·출장). 해당 날짜는 캘린더에 표시되고 일정 등록 시 경고로 안내됩니다."
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
          <div
            className={cn(
              'border-line text-ink-faint grid h-8 items-center border-b px-4 text-[11px] font-medium md:px-5',
              gridCols,
            )}
          >
            <span>날짜</span>
            <span>이름</span>
            <span className="hidden md:block">구분</span>
            <span />
          </div>
          {isLoading ? (
            <p className="text-ink-faint px-5 py-6 text-[13px]">불러오는 중…</p>
          ) : rows.length === 0 ? (
            <p className="text-ink-faint px-5 py-6 text-[13px]">
              {year}년에 등록된 휴관일이나 부재가 없습니다.
            </p>
          ) : (
            rows.map((r) => {
              const key = `${r.type}:${r.row.id}`;
              if (r.type === 'closure') {
                const c = r.row;
                return (
                  <div
                    key={key}
                    className={cn(
                      'border-hairline grid h-11 items-center border-b px-4 text-[13.5px] md:px-5',
                      gridCols,
                    )}
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
                    <DeleteButton onClick={() => destroy(r)} />
                  </div>
                );
              }
              const a = r.row;
              const Icon = ABSENCE_ICON[a.kind];
              const single = a.startDate === a.endDate;
              return (
                <div
                  key={key}
                  className={cn(
                    'border-hairline grid h-11 items-center border-b px-4 text-[13.5px] md:px-5',
                    gridCols,
                  )}
                >
                  <span className="text-away truncate font-medium">
                    {single
                      ? formatMonthDayKo(a.startDate)
                      : `${formatMonthDayKo(a.startDate, false)} ~ ${formatMonthDayKo(a.endDate, false)}`}
                  </span>
                  <span className="truncate">{a.name}</span>
                  <span className="text-away hidden items-center gap-1 text-xs md:flex">
                    <Icon className="size-3" strokeWidth={2.25} />
                    {ABSENCE_KIND_LABEL[a.kind]}
                  </span>
                  <DeleteButton onClick={() => destroy(r)} />
                </div>
              );
            })
          )}
        </div>

        <aside className="border-line order-first border-b p-4 md:order-none md:border-b-0 md:border-l md:p-5">
          <div className="mb-4 grid grid-cols-2 rounded-lg bg-[#e9e7e2] p-0.5 text-[12.5px] font-medium">
            {(
              [
                ['closure', '휴관일'],
                ['absence', '부재'],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setTab(k)}
                aria-pressed={tab === k}
                className={cn(
                  'text-ink-muted flex h-[26px] items-center justify-center rounded-md',
                  tab === k && 'bg-surface text-ink shadow-[0_1px_2px_rgba(20,18,12,0.08)]',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === 'closure' ? (
            <>
              <h2 className="text-[13.5px] font-semibold">휴관일 추가</h2>
              <p className="text-ink-faint mt-1 mb-4 text-xs leading-relaxed">
                직원 워크숍, 대체휴무, 시설 점검 등 복지관이 문을 닫는 날입니다. 캘린더에 붉게
                표시됩니다.
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
                  onKeyDown={(e) => e.key === 'Enter' && void addClosure()}
                />
              </label>
              <Button
                onClick={addClosure}
                disabled={createClosure.isPending}
                className="h-9 w-full font-semibold"
              >
                <Plus data-icon="inline-start" strokeWidth={2} />
                추가
              </Button>
            </>
          ) : (
            <>
              <h2 className="text-[13.5px] font-semibold">부재 표시</h2>
              <p className="text-ink-faint mt-1 mb-4 text-xs leading-relaxed">
                휴가, 출장, 외부 교육처럼 담당자가 자리를 비우는 기간입니다. 복지관은 열려 있고,
                캘린더 날짜 옆에 아이콘으로 표시됩니다.
              </p>
              <AbsenceForm
                defaultMonth={year === currentYear ? todayInSeoul() : `${year}-01-01`}
                onCreated={(a) => jumpToYear(a.startDate)}
              />
            </>
          )}
        </aside>
      </div>
    </>
  );
}

function DeleteButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="삭제"
      className="text-ink-ghost hover:bg-app hover:text-sun flex size-7 items-center justify-center rounded"
    >
      <Trash2 className="size-3.5" />
    </button>
  );
}
