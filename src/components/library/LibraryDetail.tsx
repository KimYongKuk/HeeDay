'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ChecklistEditor } from '@/components/library/ChecklistEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ApiClientError } from '@/lib/api/client';
import { useActionItem, useCreateActionItem, useDeleteActionItem, useUpdateActionItem } from '@/lib/api/queries';
import { PALETTE, tagStyle } from '@/lib/domain/colors';
import type { ActionItemDetailDto, CategoryDto } from '@/lib/domain/dto';
import { actionItemInputSchema } from '@/lib/domain/zod';

interface FormState {
  name: string;
  categoryId: number | null;
  description: string;
  checklist: string[];
}

function fromDto(d: ActionItemDetailDto): FormState {
  return {
    name: d.name,
    categoryId: d.categoryId,
    description: d.description ?? '',
    checklist: d.defaultChecklist,
  };
}

export function LibraryDetail({
  id,
  categories,
  defaultCategoryId,
  onCreated,
  onDeleted,
}: {
  id: number | 'new';
  categories: CategoryDto[];
  defaultCategoryId: number | null;
  onCreated: (id: number) => void;
  onDeleted: () => void;
}) {
  const isNew = id === 'new';
  const { data, isLoading } = useActionItem(isNew ? null : id);
  const empty: FormState = { name: '', categoryId: defaultCategoryId, description: '', checklist: [] };
  const [form, setForm] = useState<FormState>(empty);
  const [baseline, setBaseline] = useState<FormState>(empty);
  // Derive form state from the loaded record (setState during render, per React docs).
  const [syncedFrom, setSyncedFrom] = useState<ActionItemDetailDto | null>(null);
  if (!isNew && data && data !== syncedFrom) {
    const next = fromDto(data);
    setSyncedFrom(data);
    setForm(next);
    setBaseline(next);
  }

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(baseline), [form, baseline]);

  const create = useCreateActionItem();
  const update = useUpdateActionItem();
  const remove = useDeleteActionItem();
  const busy = create.isPending || update.isPending || remove.isPending;

  const categoryItems = categories.map((c) => ({ value: String(c.id), label: c.name }));
  const currentCategory = categories.find((c) => c.id === form.categoryId);

  const submit = async () => {
    const parsed = actionItemInputSchema.safeParse({
      name: form.name,
      categoryId: form.categoryId ?? 0,
      description: form.description.trim() === '' ? null : form.description,
      defaultChecklist: form.checklist.map((s) => s.trim()).filter(Boolean),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? '입력값을 확인하세요.');
      return;
    }
    try {
      if (isNew) {
        const { id: newId } = await create.mutateAsync(parsed.data);
        toast.success('할 일 항목을 추가했습니다.');
        onCreated(newId);
      } else {
        await update.mutateAsync({ id, input: parsed.data });
        toast.success('저장했습니다.');
      }
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : '저장에 실패했습니다.');
    }
  };

  const destroy = async () => {
    if (isNew) return;
    if (!window.confirm(`'${baseline.name}' 항목을 삭제하시겠습니까?`)) return;
    try {
      await remove.mutateAsync(id);
      toast.success('삭제했습니다.');
      onDeleted();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : '삭제에 실패했습니다.');
    }
  };

  if (!isNew && isLoading) {
    return <p className="p-6 text-[13px] text-ink-faint">불러오는 중</p>;
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className="flex min-h-full flex-col gap-[18px] px-6 py-5"
    >
      <div className="flex items-center gap-3">
        <h2 className="text-base font-semibold">{isNew ? '새 할 일 항목' : baseline.name}</h2>
        {currentCategory ? (
          <span className="rounded px-[7px] py-0.5 text-[11px] font-semibold" style={tagStyle(currentCategory.color)}>
            {currentCategory.name}
          </span>
        ) : null}
        <div className="flex-1" />
        {!isNew && data ? (
          <span className="text-xs text-ink-faint">
            {dirty ? '수정 중 · 저장되지 않음' : `최종 수정 ${formatDate(data.updatedAt)}`}
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_160px] gap-3">
        <label className="block">
          <span className="mb-[5px] block text-[11.5px] font-medium text-ink-faint">이름</span>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="예: 준비물 점검"
            autoFocus={isNew}
            className="h-9 bg-surface"
          />
        </label>
        <div>
          <span className="mb-[5px] block text-[11.5px] font-medium text-ink-faint">분류</span>
          <Select
            items={categoryItems}
            value={form.categoryId === null ? null : String(form.categoryId)}
            onValueChange={(v) => v && setForm({ ...form, categoryId: Number(v) })}
          >
            <SelectTrigger className="h-9 w-full bg-surface">
              <SelectValue placeholder="분류 선택" />
            </SelectTrigger>
            <SelectContent>
              {categoryItems.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <label className="block">
        <span className="mb-[5px] block text-[11.5px] font-medium text-ink-faint">설명</span>
        <Textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="수행 방법, 유의사항"
          rows={2}
          className="bg-surface leading-relaxed"
        />
      </label>

      <ChecklistEditor value={form.checklist} onChange={(checklist) => setForm({ ...form, checklist })} />

      {!isNew && data ? (
        <div>
          <span className="mb-[5px] block text-[11.5px] font-medium text-ink-faint">
            사용 중인 양식 · {data.usedBy.length}
          </span>
          {data.usedBy.length === 0 ? (
            <p className="text-[12.5px] text-ink-faint">사용 중인 양식이 없습니다.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {data.usedBy.map((u) => (
                <span
                  key={u.templateId}
                  className="flex h-7 items-center gap-1.5 rounded-md border border-line bg-surface pr-2.5 pl-2 text-[12.5px] font-medium"
                >
                  <span className="size-2 rounded-full" style={{ background: PALETTE[u.color].solid }} />
                  {u.templateName}
                </span>
              ))}
            </div>
          )}
        </div>
      ) : null}

      <div className="flex-1" />
      <div className="flex items-center gap-2.5 border-t border-line pt-3.5">
        {!isNew ? (
          <button
            type="button"
            onClick={destroy}
            disabled={busy || (data?.usageCount ?? 0) > 0}
            title={(data?.usageCount ?? 0) > 0 ? `${data?.usageCount}개 양식에서 사용 중` : undefined}
            className="text-[12.5px] font-medium text-sun disabled:cursor-not-allowed disabled:opacity-40"
          >
            항목 삭제
          </button>
        ) : null}
        <div className="flex-1" />
        <Button
          type="button"
          variant="outline"
          onClick={() => (isNew ? onDeleted() : setForm(baseline))}
          disabled={busy || (!isNew && !dirty)}
          className="h-9"
        >
          취소
        </Button>
        <Button type="submit" disabled={busy || (!isNew && !dirty)} className="h-9 font-semibold">
          저장
        </Button>
      </div>
    </form>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}
