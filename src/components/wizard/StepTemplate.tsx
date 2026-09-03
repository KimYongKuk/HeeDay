'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { fetchTemplateSnapshot, useTemplates } from '@/lib/api/queries';
import { PALETTE } from '@/lib/domain/colors';
import { useWizardStore } from '@/stores/wizardStore';
import { cn } from '@/lib/utils';
import { todayInSeoul } from '@/lib/utils/dates';

export function StepTemplate() {
  const { data: templates = [], isLoading } = useTemplates();
  const s = useWizardStore();
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const pick = async (id: number) => {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setLoadingId(id);
    try {
      const snapshot = await fetchTemplateSnapshot(id);
      s.pickTemplate(snapshot, {
        name: `${todayInSeoul().slice(0, 4)} ${snapshot.name}`,
        assignee: t.defaultAssignee ?? '',
      });
    } catch {
      toast.error('양식을 불러오지 못했습니다.');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="px-4 pt-6 pb-8 md:px-7">
      {s.templateId !== null ? (
        <div className="bg-brand-soft text-brand-deep mb-5 flex h-10 items-center gap-3 rounded-lg px-3.5 text-[12.5px]">
          <span>
            작성 중인 초안이 있습니다.{' '}
            <strong className="font-semibold">{s.form.name || s.snapshot?.name}</strong>
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
        선택한 양식의 할 일이 기간에 맞춰 자동 배치됩니다.
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
