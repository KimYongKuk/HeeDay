'use client';

import { ChevronLeft, Clock3 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ColorSwatches } from '@/components/common/ColorSwatches';
import { EmptyState } from '@/components/common/EmptyState';
import { TemplateItemList } from '@/components/templates/TemplateItemList';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiClientError } from '@/lib/api/client';
import {
  useDeleteTemplate,
  useDuplicateTemplate,
  useSaveTemplate,
  useTemplate,
} from '@/lib/api/queries';
import { PALETTE } from '@/lib/domain/colors';
import { DEFAULT_ASSIGNEE } from '@/lib/domain/defaults';
import type { ActionItemDto, TemplateDetailDto } from '@/lib/domain/dto';
import { templateInputSchema } from '@/lib/domain/zod';
import { draftFromDto, draftToInput, type DraftItem, type TemplateDraft } from './types';

export function TemplateEditor({ id }: { id: number }) {
  const router = useRouter();
  const { data, isLoading, isError } = useTemplate(id);
  const [draft, setDraft] = useState<TemplateDraft | null>(null);
  const [baseline, setBaseline] = useState<string>('');
  // Derive the editable draft from the loaded record (setState during render, per React docs).
  const [syncedFrom, setSyncedFrom] = useState<TemplateDetailDto | null>(null);
  if (data && data !== syncedFrom) {
    const d = draftFromDto(data);
    setSyncedFrom(data);
    setDraft(d);
    setBaseline(JSON.stringify(d));
  }

  const dirty = useMemo(
    () => (draft ? JSON.stringify(draft) !== baseline : false),
    [draft, baseline],
  );
  const save = useSaveTemplate();
  const duplicate = useDuplicateTemplate();
  const remove = useDeleteTemplate();
  const busy = save.isPending || duplicate.isPending || remove.isPending;
  const usedActionItemIds = useMemo(
    () => new Set(draft?.items.map((it) => it.actionItemId) ?? []),
    [draft],
  );

  const patch = (fn: (d: TemplateDraft) => TemplateDraft) => setDraft((d) => (d ? fn(d) : d));
  const onChangeItem = (key: string, p: Partial<DraftItem>) =>
    patch((d) => ({ ...d, items: d.items.map((it) => (it.key === key ? { ...it, ...p } : it)) }));
  const onRemoveItem = (key: string) =>
    patch((d) => ({ ...d, items: d.items.filter((it) => it.key !== key) }));
  const onReorder = (keys: string[]) =>
    patch((d) => ({
      ...d,
      items: keys
        .map((k) => d.items.find((it) => it.key === k))
        .filter((it): it is DraftItem => Boolean(it)),
    }));
  const onAdd = (item: ActionItemDto) =>
    patch((d) => ({
      ...d,
      items: [
        ...d.items,
        {
          key: `new:${crypto.randomUUID()}`,
          actionItemId: item.id,
          actionItemName: item.name,
          categoryId: item.categoryId,
          categoryName: item.categoryName,
          categoryColor: item.categoryColor,
          defaultChecklist: item.defaultChecklist,
          required: true,
          checklistOverride: null,
        },
      ],
    }));

  const onSave = async () => {
    if (!draft) return;
    const parsed = templateInputSchema.safeParse(draftToInput(draft));
    if (!parsed.success)
      return toast.error(parsed.error.issues[0]?.message ?? '입력값을 확인하세요.');
    try {
      await save.mutateAsync({ id, input: parsed.data });
      toast.success('양식을 저장했습니다.');
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : '저장에 실패했습니다.');
    }
  };

  const onDuplicate = async () => {
    try {
      const { id: newId } = await duplicate.mutateAsync(id);
      toast.success('양식을 복제했습니다.');
      router.push(`/templates/${newId}`);
    } catch {
      toast.error('복제에 실패했습니다.');
    }
  };

  const onDelete = async () => {
    if (!draft) return;
    const msg =
      (data?.programCount ?? 0) > 0
        ? `'${draft.name}' 양식을 삭제하시겠습니까? 이미 등록된 일정 ${data?.programCount}건은 유지됩니다.`
        : `'${draft.name}' 양식을 삭제하시겠습니까?`;
    if (!window.confirm(msg)) return;
    try {
      await remove.mutateAsync(id);
      toast.success('삭제했습니다.');
      router.push('/templates');
    } catch {
      toast.error('삭제에 실패했습니다.');
    }
  };

  if (isError) return <EmptyState title="양식을 찾을 수 없습니다" />;
  if (isLoading || !draft) return <p className="text-ink-faint p-6 text-[13px]">불러오는 중</p>;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-line flex min-h-[60px] shrink-0 flex-wrap items-center gap-x-3.5 gap-y-2 border-b px-4 py-2 md:px-6">
        <Link
          href="/templates"
          className="text-brand flex items-center gap-1 text-[12.5px] font-medium md:hidden"
        >
          <ChevronLeft className="size-3.5" /> 양식 목록
        </Link>
        <span
          className="size-3.5 shrink-0 rounded"
          style={{ background: PALETTE[draft.color].solid }}
        />
        <input
          value={draft.name}
          onChange={(e) => patch((d) => ({ ...d, name: e.target.value }))}
          aria-label="양식 이름"
          className="hover:border-line focus:border-line focus:bg-surface max-w-[360px] min-w-0 min-w-[160px] flex-1 rounded-md border border-transparent bg-transparent px-1.5 py-1 text-lg font-semibold tracking-[-0.01em] outline-none"
        />
        <span className="text-ink-faint hidden shrink-0 text-[12.5px] sm:inline">
          등록된 일정 {data?.programCount ?? 0}건
        </span>
        <div className="flex-1" />
        <span className="text-ink-faint hidden items-center gap-1.5 text-xs sm:flex">
          <Clock3 className="size-3.5" />
          {dirty ? '수정 중 · 저장되지 않음' : '저장됨'}
        </span>
        <Button variant="outline" onClick={onDuplicate} disabled={busy} className="h-[34px]">
          복제
        </Button>
        <Button onClick={onSave} disabled={busy || !dirty} className="h-[34px] font-semibold">
          저장
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pt-[18px] pb-8 md:px-6">
        <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_auto]">
          <label className="block">
            <span className="text-ink-faint mb-[5px] block text-[11.5px] font-medium">설명</span>
            <Input
              value={draft.description}
              onChange={(e) => patch((d) => ({ ...d, description: e.target.value }))}
              placeholder="프로그램 개요"
              className="bg-surface h-[34px]"
            />
          </label>
          <label className="block">
            <span className="text-ink-faint mb-[5px] block text-[11.5px] font-medium">
              기본 담당자
            </span>
            <Input
              value={draft.defaultAssignee}
              onChange={(e) => patch((d) => ({ ...d, defaultAssignee: e.target.value }))}
              placeholder={DEFAULT_ASSIGNEE}
              className="bg-surface h-[34px]"
            />
          </label>
          <div className="pb-1.5">
            <span className="text-ink-faint mb-[9px] block text-[11.5px] font-medium">색상</span>
            <ColorSwatches
              value={draft.color}
              onChange={(color) => patch((d) => ({ ...d, color }))}
            />
          </div>
        </div>

        <div className="bg-brand-soft text-brand-deep flex min-h-9 items-center gap-2.5 rounded-lg px-3 py-2 text-[12.5px] leading-relaxed">
          이 양식으로 일정을 등록할 때 아래 할 일이 순서대로 제시되며, 날짜는 등록 과정에서 직접
          배치합니다. 양식 수정은 이미 등록된 일정에 영향을 주지 않습니다.
        </div>

        <TemplateItemList
          items={draft.items}
          usedActionItemIds={usedActionItemIds}
          onReorder={onReorder}
          onChangeItem={onChangeItem}
          onRemoveItem={onRemoveItem}
          onAdd={onAdd}
        />

        <div className="border-line mt-4 flex items-center border-t pt-4">
          <button
            type="button"
            onClick={onDelete}
            disabled={busy}
            className="text-sun text-[12.5px] font-medium hover:underline disabled:opacity-40"
          >
            양식 삭제
          </button>
        </div>
      </div>
    </div>
  );
}
