'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { fetchTemplateSnapshot, useTemplates } from '@/lib/api/queries';
import { PALETTE } from '@/lib/domain/colors';
import { DEFAULT_ASSIGNEE } from '@/lib/domain/defaults';
import { draftWorkCount, useWizardStore } from '@/stores/wizardStore';
import { cn } from '@/lib/utils';
import { formatMonthDayKo, todayInSeoul } from '@/lib/utils/dates';

export function StepTemplate() {
  const { data: templates = [], isLoading } = useTemplates();
  const s = useWizardStore();
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const period =
    s.form.startDate && s.form.endDate
      ? `${formatMonthDayKo(s.form.startDate)} – ${formatMonthDayKo(s.form.endDate)}`
      : null;

  /** Switching templates discards the old template's placements. Say so before doing it. */
  const confirmSwitch = (nextName: string): boolean => {
    const work = draftWorkCount(s);
    if (work === 0) return true;
    const kept = [
      period ? `기간 ${period}` : null,
      s.form.assignee ? `담당자 ${s.form.assignee}` : null,
    ]
      .filter(Boolean)
      .join(', ');
    return window.confirm(
      `${nextName} 양식으로 바꾸면 지금 배치한 할 일 ${work}건이 사라집니다.` +
        (kept ? `\n${kept}는 그대로 유지됩니다.` : '') +
        '\n\n계속하시겠습니까?',
    );
  };

  const pick = async (id: number) => {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    const switching = s.templateId !== null && s.templateId !== id;
    if (switching && !confirmSwitch(t.name)) return;
    setLoadingId(id);
    try {
      const snapshot = await fetchTemplateSnapshot(id);
      s.pickTemplate(snapshot, {
        name: `${todayInSeoul().slice(0, 4)} ${snapshot.name}`,
        assignee: t.defaultAssignee ?? DEFAULT_ASSIGNEE,
      });
      if (switching)
        toast.success(
          `${t.name} 양식으로 바꿨습니다. 기간과 담당자는 유지되고 할 일은 다시 배치합니다.`,
        );
    } catch {
      toast.error('양식을 불러오지 못했습니다.');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="px-4 pt-6 pb-8 md:px-7">
      {s.templateId !== null ? (
        <div className="bg-brand-soft text-brand-deep mb-5 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-3.5 py-2.5 text-[12.5px]">
          <span>
            작성 중인 초안{' '}
            <strong className="font-semibold">{s.form.name || s.snapshot?.name}</strong>
          </span>
          <span className="opacity-70">
            {s.snapshot?.name} 양식 · {period ?? '기간 미입력'} · 할 일{' '}
            {Object.keys(s.placements).length}건 배치
          </span>
          <button
            type="button"
            onClick={() => s.setStep(2)}
            className="bg-brand hover:bg-brand-deep ml-auto rounded-md px-2.5 py-1 text-xs font-semibold text-white"
          >
            이어서 작성
          </button>
        </div>
      ) : null}

      <h2 className="text-[15px] font-semibold">프로그램 양식 선택</h2>
      <p className="text-ink-faint mt-1 mb-5 text-[13px]">
        {s.templateId !== null
          ? '다른 양식을 선택하면 배치한 할 일은 사라지고 기간과 담당자는 유지됩니다.'
          : '선택한 양식의 할 일을 다음 단계에서 기간 안에 직접 배치합니다.'}
      </p>

      {isLoading ? (
        <p className="text-ink-faint text-[13px]">불러오는 중…</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => {
            const active = t.id === s.templateId;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => pick(t.id)}
                disabled={loadingId !== null}
                className={cn(
                  'border-line bg-surface hover:border-ink-ghost flex flex-col gap-2 rounded-xl border p-4 text-left transition-all hover:shadow-[0_2px_8px_rgba(20,18,12,0.06)]',
                  active && 'border-brand ring-brand/20 ring-2',
                  loadingId === t.id && 'opacity-60',
                )}
              >
                <div className="flex items-center gap-2.5">
                  <span className="size-3 rounded" style={{ background: PALETTE[t.color].solid }} />
                  <span className="text-[14px] font-semibold">{t.name}</span>
                  {active ? (
                    <span className="bg-brand ml-auto rounded px-1.5 py-px text-[10.5px] font-semibold text-white">
                      선택됨
                    </span>
                  ) : null}
                </div>
                <p className="text-ink-muted min-h-[2.5em] text-[12.5px] leading-relaxed">
                  {t.description ?? '설명이 없습니다.'}
                </p>
                <div className="text-ink-faint flex items-center gap-3 text-[11.5px]">
                  <span>할 일 {t.itemCount}개</span>
                  <span>등록된 일정 {t.programCount}건</span>
                  {t.defaultAssignee ? <span>담당 {t.defaultAssignee}</span> : null}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
