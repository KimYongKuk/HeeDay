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
    form.startDate && form.endDate && form.startDate <= form.endDate
      ? diffDaysISO(form.startDate, form.endDate) + 1
      : null;

  return (
    <div className="mx-auto max-w-[640px] px-4 pt-6 pb-8 md:px-7">
      <div className="mb-5 flex items-center gap-2.5">
        <span className="size-3 rounded" style={{ background: PALETTE[form.color].solid }} />
        <span className="text-ink-faint text-xs">프로그램 양식</span>
        <span className="text-[13.5px] font-semibold">{s.snapshot?.name}</span>
        <span className="text-ink-faint text-xs">· 할 일 {s.snapshot?.items.length ?? 0}개</span>
      </div>

      <div className="border-line bg-surface flex flex-col gap-4 rounded-xl border p-[18px]">
        <label className="block">
          <span className="text-ink-faint mb-[5px] block text-[11.5px] font-medium">일정 이름</span>
          <Input
            value={form.name}
            onChange={(e) => s.patchForm({ name: e.target.value })}
            placeholder="예: 2026 상반기 웰다잉 프로그램"
            autoFocus
            className="bg-surface h-9"
          />
        </label>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <div>
            <span className="text-ink-faint mb-[5px] block text-[11.5px] font-medium">시작일</span>
            <DateField
              value={form.startDate}
              onChange={(d) =>
                s.patchForm({
                  startDate: d,
                  endDate: form.endDate && form.endDate < d ? '' : form.endDate,
                })
              }
              className="w-full"
            />
          </div>
          <div>
            <span className="text-ink-faint mb-[5px] block text-[11.5px] font-medium">종료일</span>
            <DateField
              value={form.endDate}
              onChange={(d) => s.patchForm({ endDate: d })}
              defaultMonth={form.startDate || undefined}
              className="w-full"
            />
          </div>
        </div>
        {span !== null ? (
          <p className="text-ink-faint -mt-2 text-xs">
            총 {span}일 · 다음 단계에서 이 기간 안에 할 일을 배치합니다.
          </p>
        ) : null}

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <label className="block">
            <span className="text-ink-faint mb-[5px] block text-[11.5px] font-medium">담당자</span>
            <Input
              value={form.assignee}
              onChange={(e) => s.patchForm({ assignee: e.target.value })}
              placeholder="예: 김○○"
              className="bg-surface h-9"
            />
          </label>
          <div>
            <span className="text-ink-faint mb-[9px] block text-[11.5px] font-medium">색상</span>
            <div className="flex h-9 items-center">
              <ColorSwatches value={form.color} onChange={(color) => s.patchForm({ color })} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
