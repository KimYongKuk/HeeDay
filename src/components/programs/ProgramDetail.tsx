'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Archive, ArchiveRestore, Check, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { ApiClientError, api } from '@/lib/api/client';
import { useDeleteProgram, useProgram, useUpdateTask } from '@/lib/api/queries';
import { PALETTE } from '@/lib/domain/colors';
import type { TaskDto } from '@/lib/domain/dto';
import { cn } from '@/lib/utils';
import { formatFullKo, formatMonthDayKo } from '@/lib/utils/dates';

export function ProgramDetail({ id }: { id: number }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: program, isLoading, isError } = useProgram(id);
  const update = useUpdateTask();
  const remove = useDeleteProgram();

  if (isError) return <EmptyState title="일정을 찾을 수 없습니다" />;
  if (isLoading || !program) return <p className="text-ink-faint p-6 text-[13px]">불러오는 중</p>;

  const pal = PALETTE[program.color];

  const toggle = async (t: TaskDto) => {
    try {
      await update.mutateAsync({ id: t.id, patch: { done: !t.done } });
      qc.invalidateQueries({ queryKey: ['programs', id] });
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : '변경에 실패했습니다.');
    }
  };

  const setStatus = async (status: 'ACTIVE' | 'ARCHIVED') => {
    try {
      await api(`/api/programs/${id}`, { method: 'PATCH', json: { status } });
      qc.invalidateQueries({ queryKey: ['programs'] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
      toast.success(
        status === 'ARCHIVED'
          ? '보관했습니다. 캘린더에 표시되지 않습니다.'
          : '다시 활성화했습니다.',
      );
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : '변경에 실패했습니다.');
    }
  };

  const destroy = async () => {
    if (
      !window.confirm(
        `'${program.name}' 일정과 할 일 ${program.tasks.length}건을 삭제하시겠습니까?`,
      )
    )
      return;
    try {
      await remove.mutateAsync(id);
      toast.success('삭제했습니다.');
      router.push('/calendar');
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : '삭제에 실패했습니다.');
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-line flex min-h-[60px] shrink-0 flex-wrap items-center gap-x-3.5 gap-y-2 border-b px-4 py-2 md:px-6">
        <span className="size-3.5 rounded" style={{ background: pal.solid }} />
        <h1 className="truncate text-lg font-semibold tracking-[-0.01em]">{program.name}</h1>
        {program.status === 'ARCHIVED' ? (
          <span className="bg-hairline text-ink-muted rounded px-1.5 py-px text-[11px] font-semibold">
            보관됨
          </span>
        ) : null}
        <span className="text-ink-faint basis-full text-[12.5px] md:basis-auto">
          {formatFullKo(program.startDate)} – {formatFullKo(program.endDate)}
          {program.assignee ? ` · 담당 ${program.assignee}` : ''} · 양식 {program.templateName}
        </span>
        <div className="flex-1" />
        <Link
          href={`/calendar?date=${program.startDate}&program=${program.id}`}
          className="text-brand text-[12.5px] font-medium hover:underline"
        >
          캘린더에서 보기
        </Link>
        {program.status === 'ACTIVE' ? (
          <Button variant="outline" onClick={() => setStatus('ARCHIVED')} className="h-[34px]">
            <Archive data-icon="inline-start" /> 보관
          </Button>
        ) : (
          <Button variant="outline" onClick={() => setStatus('ACTIVE')} className="h-[34px]">
            <ArchiveRestore data-icon="inline-start" /> 활성화
          </Button>
        )}
        <Button
          variant="destructive"
          onClick={destroy}
          disabled={remove.isPending}
          className="h-[34px]"
        >
          <Trash2 data-icon="inline-start" /> 삭제
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pt-5 pb-8 md:px-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Stat label="할 일" value={`${program.doneCount} / ${program.taskCount}건 완료`} />
          <Stat
            label="기간"
            value={`${formatMonthDayKo(program.startDate, false)} – ${formatMonthDayKo(program.endDate, false)}`}
          />
          <Stat label="등록일" value={formatMonthDayKo(program.createdAt.slice(0, 10))} />
        </div>

        <section>
          <h2 className="mb-2 text-[13.5px] font-semibold">
            할 일 <span className="text-ink-faint">{program.tasks.length}건</span>
          </h2>
          <div className="border-line bg-surface overflow-hidden rounded-[10px] border">
            {program.tasks.length === 0 ? (
              <p className="text-ink-faint px-3 py-4 text-[12.5px]">등록된 할 일이 없습니다.</p>
            ) : (
              program.tasks.map((t) => (
                <div
                  key={t.id}
                  className="border-hairline grid min-h-10 grid-cols-[96px_minmax(0,1fr)] items-center gap-3 border-b px-3 py-1.5 text-[13.5px] last:border-b-0 md:grid-cols-[118px_minmax(0,1fr)_120px_120px]"
                >
                  <span className="text-ink-muted text-[12.5px]">
                    {formatMonthDayKo(t.dueDate)}
                  </span>
                  <div className="flex min-w-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggle(t)}
                      aria-label={t.done ? '완료 취소' : '완료'}
                      className={cn(
                        'flex size-3.5 shrink-0 items-center justify-center rounded-[4px] border-[1.5px]',
                        t.done ? 'text-white' : 'opacity-60',
                      )}
                      style={
                        t.done
                          ? { background: pal.text, borderColor: pal.text }
                          : { borderColor: pal.text, color: pal.text }
                      }
                    >
                      {t.done ? <Check className="size-2.5" strokeWidth={3} /> : null}
                    </button>
                    <span className={cn('truncate', t.done && 'text-ink-faint line-through')}>
                      {t.title}
                    </span>
                    {!t.required ? (
                      <span className="text-ink-faint shrink-0 text-[10.5px]">선택</span>
                    ) : null}
                  </div>
                  <span className="text-ink-faint hidden truncate text-xs md:block">
                    {t.categoryName ?? (t.templateItemId === null ? '직접 추가' : '')}
                  </span>
                  <span className="text-ink-faint hidden text-right text-xs md:block">
                    {t.checklist.length > 0
                      ? `체크리스트 ${t.checklist.filter((c) => c.checked).length}/${t.checklist.length}`
                      : ''}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-line bg-surface rounded-[10px] border px-4 py-3">
      <div className="text-ink-faint text-[11.5px] font-medium">{label}</div>
      <div className="mt-0.5 text-[15px] font-semibold">{value}</div>
    </div>
  );
}
