'use client';

import { ColorSwatches } from '@/components/common/ColorSwatches';
import { DateField } from '@/components/common/DateField';
import { Input } from '@/components/ui/input';
import { PALETTE } from '@/lib/domain/colors';
import { useWizardStore } from '@/stores/wizardStore';
import { diffDaysISO } from '@/lib/utils/dates';

export function StepDetails() {
  const s = useWizardStore();
  const { form } = s;
  const span =
    form.startDate && form.endDate && form.startDate <= form.endDate ? diffDaysISO(form.startDate, form.endDate) + 1 : null;

  return (
    <div className="mx-auto max-w-[640px] px-7 pt-6 pb-8">
      <div className="mb-5 flex items-center gap-2.5">
        <span className="size-3 rounded" style={{ background: PALETTE[form.color].solid }} />
        <span className="text-xs text-ink-faint">프로그램 양식</span>
        <span className="text-[13.5px] font-semibold">{s.snapshot?.name}</span>
        <span className="text-xs text-ink-faint">· 할 일 {s.snapshot?.items.length ?? 0}개</span>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-[18px]">
        <label className="block">
          <span className="mb-[5px] block text-[11.5px] font-medium text-ink-faint">일정 이름</span>
          <Input
            value={form.name}
            onChange={(e) => s.patchForm({ name: e.target.value })}
            placeholder="예: 2026 상반기 웰다잉 프로그램"
            autoFocus
            className="h-9 bg-surface"
          />
        </label>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <span className="mb-[5px] block text-[11.5px] font-medium text-ink-faint">시작일</span>
            <DateField
              value={form.startDate}
              onChange={(d) => s.patchForm({ startDate: d, endDate: form.endDate && form.endDate < d ? '' : form.endDate })}
              className="w-full"
            />
          </div>
          <div>
            <span className="mb-[5px] block text-[11.5px] font-medium text-ink-faint">종료일</span>
            <DateField
              value={form.endDate}
              onChange={(d) => s.patchForm({ endDate: d })}
              defaultMonth={form.startDate || undefined}
              className="w-full"
            />
          </div>
        </div>
        {span !== null ? (
          <p className="-mt-2 text-xs text-ink-faint">총 {span}일 · 다음 단계에서 이 기간 안에 할 일을 배치합니다.</p>
        ) : null}

        <div className="grid grid-cols-2 gap-2.5">
          <label className="block">
            <span className="mb-[5px] block text-[11.5px] font-medium text-ink-faint">담당자</span>
            <Input
              value={form.assignee}
              onChange={(e) => s.patchForm({ assignee: e.target.value })}
              placeholder="예: 김○○"
              className="h-9 bg-surface"
            />
          </label>
          <div>
            <span className="mb-[9px] block text-[11.5px] font-medium text-ink-faint">색상</span>
            <div className="flex h-9 items-center">
              <ColorSwatches value={form.color} onChange={(color) => s.patchForm({ color })} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
