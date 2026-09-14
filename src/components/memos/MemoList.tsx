'use client';

import { Hash, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ApiClientError } from '@/lib/api/client';
import { useCreateMemo, useDeleteMemo, useUpdateMemo } from '@/lib/api/queries';
import { PALETTE } from '@/lib/domain/colors';
import type { ColorKey } from '@/lib/domain/enums';
import type { MemoDto, ProgramListDto } from '@/lib/domain/dto';
import { cn } from '@/lib/utils';

/**
 * "9/14" from the stored timestamp. The DB hands back its own (Seoul) wall-clock time stamped
 * as UTC, so read the date digits straight from the string instead of converting.
 */
function shortDate(iso: string): string {
  return `${Number(iso.slice(5, 7))}/${Number(iso.slice(8, 10))}`;
}

function TagChip({
  name,
  color,
  className,
}: {
  name: string;
  color: ColorKey;
  className?: string;
}) {
  const p = PALETTE[color];
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1 rounded px-1.5 py-px text-[10.5px] font-semibold',
        className,
      )}
      style={{ background: p.bg, color: p.text }}
    >
      <span className="size-1.5 shrink-0 rounded-full" style={{ background: p.solid }} />
      <span className="truncate">{name}</span>
    </span>
  );
}

/**
 * The `#` affordance: with no tag it is a small hash button, with a tag it is the program chip.
 * Either opens a picker of the active programs plus "태그 없음".
 */
function ProgramTagPicker({
  value,
  programs,
  onChange,
  current,
}: {
  value: number | null;
  programs: ProgramListDto[];
  onChange: (programId: number | null) => void;
  /** name/color to show when the tagged program is not in `programs` (archived) */
  current?: { name: string; color: ColorKey } | null;
}) {
  const [open, setOpen] = useState(false);
  const candidates = programs.filter((p) => p.status === 'ACTIVE');
  const tagged = value !== null ? (candidates.find((p) => p.id === value) ?? current ?? null) : null;

  const pick = (id: number | null) => {
    onChange(id);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label={tagged ? '프로그램 태그 변경' : '프로그램 태그'}
            title="프로그램 태그"
            className={cn(
              'flex min-w-0 items-center rounded',
              !tagged &&
                'text-ink-ghost hover:text-brand hover:bg-app size-5 shrink-0 justify-center',
            )}
          />
        }
      >
        {tagged ? (
          <TagChip name={tagged.name} color={tagged.color} className="hover:opacity-75" />
        ) : (
          <Hash className="size-3.5" />
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 gap-0 p-1">
        {candidates.length === 0 ? (
          <p className="text-ink-faint px-2 py-2 text-xs">진행 중인 프로그램이 없습니다.</p>
        ) : (
          candidates.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => pick(p.id)}
              className={cn(
                'hover:bg-app flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-[12.5px]',
                value === p.id && 'bg-app font-semibold',
              )}
            >
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ background: PALETTE[p.color].solid }}
              />
              <span className="truncate">{p.name}</span>
            </button>
          ))
        )}
        {value !== null ? (
          <button
            type="button"
            onClick={() => pick(null)}
            className="text-ink-muted hover:bg-app border-hairline mt-1 flex h-8 w-full items-center gap-2 rounded-md border-t px-2 text-left text-[12.5px]"
          >
            <X className="size-3.5" /> 태그 해제
          </button>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

/**
 * Composer for a new memo. `fixedProgramId` hides the tag picker and tags every memo with
 * that program (program detail); otherwise the `#` picker offers the active programs.
 */
export function MemoComposer({
  programs,
  fixedProgramId,
  compact,
  autoFocus,
  onCreated,
}: {
  programs: ProgramListDto[];
  fixedProgramId?: number;
  compact?: boolean;
  autoFocus?: boolean;
  onCreated?: () => void;
}) {
  const create = useCreateMemo();
  const [body, setBody] = useState('');
  const [programId, setProgramId] = useState<number | null>(null);

  const submit = async () => {
    if (body.trim() === '') return toast.error('메모 내용을 입력하세요.');
    try {
      await create.mutateAsync({ body: body.trim(), programId: fixedProgramId ?? programId });
      setBody('');
      onCreated?.();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : '추가에 실패했습니다.');
    }
  };

  return (
    <div className="border-line bg-surface flex flex-col gap-1.5 rounded-[10px] border p-2">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            void submit();
          }
        }}
        autoFocus={autoFocus}
        placeholder={compact ? '메모 (Enter로 추가)' : '못한 일, 해야 할 일을 적어 둡니다. Enter로 추가, Shift+Enter로 줄바꿈'}
        rows={compact ? 2 : 3}
        maxLength={2000}
        className="placeholder:text-ink-ghost field-sizing-content min-h-[40px] w-full resize-none bg-transparent px-1 py-0.5 text-[13px] leading-relaxed outline-none"
      />
      <div className="flex items-center gap-2">
        {fixedProgramId === undefined ? (
          <ProgramTagPicker value={programId} programs={programs} onChange={setProgramId} />
        ) : null}
        <div className="flex-1" />
        <button
          type="button"
          onClick={submit}
          disabled={create.isPending || body.trim() === ''}
          className="bg-brand hover:bg-brand-deep flex h-7 shrink-0 items-center gap-1 rounded-md px-2.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          <Plus className="size-3.5" strokeWidth={2.2} /> 추가
        </button>
      </div>
    </div>
  );
}

function MemoItem({
  memo,
  programs,
  showProgram,
}: {
  memo: MemoDto;
  programs: ProgramListDto[];
  showProgram: boolean;
}) {
  const update = useUpdateMemo();
  const remove = useDeleteMemo();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(memo.body);

  const startEdit = () => {
    setDraft(memo.body);
    setEditing(true);
  };

  const save = async () => {
    const body = draft.trim();
    if (body === '') return toast.error('메모 내용을 입력하세요.');
    if (body === memo.body) return setEditing(false);
    try {
      await update.mutateAsync({ id: memo.id, patch: { body } });
      setEditing(false);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : '저장에 실패했습니다.');
    }
  };

  const retag = async (programId: number | null) => {
    if (programId === memo.programId) return;
    try {
      await update.mutateAsync({ id: memo.id, patch: { programId } });
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : '태그 변경에 실패했습니다.');
    }
  };

  const destroy = async () => {
    if (!window.confirm('이 메모를 삭제하시겠습니까?')) return;
    try {
      await remove.mutateAsync(memo.id);
    } catch {
      toast.error('삭제에 실패했습니다.');
    }
  };

  return (
    <div className="group border-hairline flex flex-col gap-1 border-t px-1 py-2 first:border-t-0">
      {editing ? (
        <textarea
          value={draft}
          autoFocus
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setEditing(false);
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              void save();
            }
          }}
          maxLength={2000}
          className="border-line bg-surface focus:border-ring field-sizing-content min-h-[40px] w-full resize-none rounded-md border px-2 py-1 text-[13px] leading-relaxed outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={startEdit}
          title="클릭하여 수정"
          className="text-ink w-full text-left text-[13px] leading-relaxed break-words whitespace-pre-wrap"
        >
          {memo.body}
        </button>
      )}
      <div className="text-ink-faint flex min-w-0 items-center gap-2 text-[11px]">
        {showProgram ? (
          <ProgramTagPicker
            value={memo.programId}
            programs={programs}
            onChange={retag}
            current={
              memo.programName && memo.programColor
                ? { name: memo.programName, color: memo.programColor }
                : null
            }
          />
        ) : null}
        <span className="shrink-0">{shortDate(memo.createdAt)}</span>
        <button
          type="button"
          onClick={destroy}
          disabled={remove.isPending}
          aria-label="메모 삭제"
          className="text-ink-ghost hover:text-sun ml-auto flex size-5 items-center justify-center rounded opacity-0 group-hover:opacity-100 focus-visible:opacity-100 disabled:opacity-40 max-md:opacity-100"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

export function MemoList({
  memos,
  programs,
  showProgram = true,
  emptyText = '메모가 없습니다.',
  className,
}: {
  memos: MemoDto[];
  programs: ProgramListDto[];
  showProgram?: boolean;
  emptyText?: string;
  className?: string;
}) {
  return (
    <div className={cn('border-line bg-surface rounded-[10px] border px-2', className)}>
      {memos.length === 0 ? (
        <p className="text-ink-faint px-1 py-3 text-[12.5px]">{emptyText}</p>
      ) : (
        memos.map((m) => (
          <MemoItem key={m.id} memo={m} programs={programs} showProgram={showProgram} />
        ))
      )}
    </div>
  );
}
