'use client';

import { Check, Clock3 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { StepDetails } from '@/components/wizard/StepDetails';
import { StepPlace, type PlacementSummary } from '@/components/wizard/StepPlace';
import { StepTemplate } from '@/components/wizard/StepTemplate';
import { Button } from '@/components/ui/button';
import { ApiClientError } from '@/lib/api/client';
import { useApproveProgram } from '@/lib/api/queries';
import { programFormSchema, type PlacedTaskInput } from '@/lib/domain/zod';
import { draftsFromSnapshot } from '@/lib/services/placement';
import { useWizardStore } from '@/stores/wizardStore';
import { cn } from '@/lib/utils';

const STEPS = [
  { n: 1, label: '양식 선택' },
  { n: 2, label: '기간 · 담당' },
  { n: 3, label: '할 일 배치 · 승인' },
] as const;

export function WizardScreen() {
  const router = useRouter();
  const s = useWizardStore();
  const approve = useApproveProgram();
  const [summary, setSummary] = useState<PlacementSummary>({ total: 0, placed: 0, unplaced: 0 });
  const onSummary = useCallback((next: PlacementSummary) => setSummary(next), []);

  if (!s.hydrated) return <p className="p-6 text-[13px] text-ink-faint">불러오는 중</p>;

  const validateDetails = (): string | null => {
    if (s.form.name.trim() === '') return '일정 이름을 입력하세요.';
    if (!s.form.startDate) return '시작일을 선택하세요.';
    if (!s.form.endDate) return '종료일을 선택하세요.';
    if (s.form.startDate > s.form.endDate) return '종료일은 시작일보다 빠를 수 없습니다.';
    return null;
  };

  const next = () => {
    const err = validateDetails();
    if (err) return toast.error(err);
    s.setStep(3);
  };

  const saveDraftAndLeave = () => {
    toast.success('초안을 저장했습니다. 일정 등록에서 이어서 작성할 수 있습니다.');
    router.push('/calendar');
  };

  const onApprove = async () => {
    if (!s.snapshot || !s.templateId) return;
    const parsed = programFormSchema.safeParse({
      name: s.form.name,
      startDate: s.form.startDate,
      endDate: s.form.endDate,
      assignee: s.form.assignee.trim() === '' ? null : s.form.assignee.trim(),
      color: s.form.color,
    });
    if (!parsed.success) return toast.error(parsed.error.issues[0]?.message ?? '입력값을 확인하세요.');

    const fromTemplate = draftsFromSnapshot(s.snapshot).filter((d) => !s.removed.includes(d.key));
    const unplaced = fromTemplate.filter((d) => !s.placements[d.key]).length + s.extras.filter((e) => !s.placements[e.key]).length;
    if (unplaced > 0) return toast.error(`날짜가 없는 할 일이 ${unplaced}개 있습니다. 날짜를 지정하거나 제외하세요.`);
    if (s.extras.some((e) => e.title.trim() === '')) return toast.error('추가한 할 일의 이름을 입력하세요.');

    const tasks: PlacedTaskInput[] = [
      ...fromTemplate.map((d) => ({
        templateItemId: d.templateItemId,
        title: d.title,
        dueDate: s.placements[d.key],
        required: d.required,
        checklist: d.checklist,
      })),
      ...s.extras.map((e) => ({
        templateItemId: null,
        title: e.title.trim(),
        dueDate: s.placements[e.key],
        required: true,
        checklist: e.checklist,
      })),
    ];

    try {
      const result = await approve.mutateAsync({ idempotencyKey: s.draftId, templateId: s.templateId, program: parsed.data, tasks });
      const startDate = s.form.startDate;
      s.reset();
      toast.success(result.reused ? '이미 등록된 일정입니다. 캘린더로 이동합니다.' : `할 일 ${result.taskCount}건이 캘린더에 등록되었습니다.`);
      router.push(`/calendar?date=${startDate}`);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : '등록에 실패했습니다.');
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-16 shrink-0 items-center gap-7 border-b border-line px-7">
        <h1 className="text-lg font-semibold tracking-[-0.01em]">일정 등록</h1>
        <ol className="flex items-center gap-[18px]">
          {STEPS.map((st, i) => {
            const done = s.step > st.n;
            const current = s.step === st.n;
            const reachable =
              st.n < s.step ||
              (st.n === 2 && s.templateId !== null) ||
              (st.n === 3 && s.templateId !== null && validateDetails() === null);
            return (
              <li key={st.n} className="flex items-center gap-[18px]">
                {i > 0 ? <span className="h-px w-7 bg-[#d9d7d1]" /> : null}
                <button
                  type="button"
                  disabled={!reachable || current}
                  onClick={() => reachable && s.setStep(st.n)}
                  className={cn('flex items-center gap-2 text-[13px] text-ink-muted disabled:cursor-default', current && 'font-semibold text-ink', reachable && !current && 'hover:text-ink')}
                >
                  <span className={cn('flex size-[22px] items-center justify-center rounded-full text-[11.5px] font-semibold', done ? 'bg-ink text-white' : current ? 'bg-brand text-white' : 'bg-[#d9d7d1] text-ink-muted')}>
                    {done ? <Check className="size-3" strokeWidth={2.5} /> : st.n}
                  </span>
                  {st.label}
                </button>
              </li>
            );
          })}
        </ol>
        <div className="flex-1" />
        <span className="flex items-center gap-1.5 text-[12.5px] text-ink-faint">
          <Clock3 className="size-3.5" />
          초안 자동 저장됨
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {s.step === 1 ? <StepTemplate /> : s.step === 2 ? <StepDetails /> : <StepPlace onSummary={onSummary} />}
      </div>

      <div className="flex h-[68px] shrink-0 items-center gap-2.5 border-t border-line bg-app px-7">
        {s.step > 1 ? (
          <Button variant="outline" onClick={() => s.setStep((s.step - 1) as 1 | 2)} className="h-9">
            이전
          </Button>
        ) : null}
        {s.templateId !== null ? (
          <button
            type="button"
            onClick={() => window.confirm('작성 중인 내용을 지우고 새로 시작하시겠습니까?') && s.reset()}
            className="text-[12.5px] font-medium text-ink-faint hover:text-sun"
          >
            새로 시작
          </button>
        ) : null}
        <div className="flex-1" />
        {s.step === 3 ? (
          <span className="text-[12.5px] text-ink-faint">
            {summary.unplaced > 0 ? `날짜 미지정 ${summary.unplaced}개` : `할 일 ${summary.total}개 배치 완료`}
          </span>
        ) : null}
        {s.templateId !== null ? (
          <Button variant="outline" onClick={saveDraftAndLeave} className="h-9">
            초안으로 저장
          </Button>
        ) : null}
        {s.step === 2 ? (
          <Button onClick={next} className="h-9 font-semibold">
            할 일 배치
          </Button>
        ) : null}
        {s.step === 3 ? (
          <Button onClick={onApprove} disabled={approve.isPending || summary.total === 0 || summary.unplaced > 0} className="h-9 gap-2 font-semibold">
            승인하고 캘린더에 등록
            <span className="rounded-full bg-white/20 px-[7px] py-px text-[11.5px] font-semibold">{summary.placed}건</span>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
