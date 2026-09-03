'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ApiClientError } from '@/lib/api/client';
import { useCreateTask } from '@/lib/api/queries';
import { PALETTE } from '@/lib/domain/colors';
import type { ProgramListDto } from '@/lib/domain/dto';
import type { ISODate } from '@/lib/domain/types';
import { cn } from '@/lib/utils';
import { formatMonthDayKo } from '@/lib/utils/dates';

/** "+" affordance for adding an ad-hoc task on a date. */
export function QuickAdd({
  date,
  programs,
  className,
}: {
  date: ISODate;
  programs: ProgramListDto[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [programId, setProgramId] = useState<string | null>(null);
  const create = useCreateTask();

  const candidates = programs.filter((p) => p.status === 'ACTIVE');
  const effectiveProgram = programId ?? (candidates.length === 1 ? String(candidates[0].id) : null);

  const submit = async () => {
    if (!effectiveProgram) return toast.error('프로그램을 선택하세요.');
    if (title.trim() === '') return toast.error('할 일 이름을 입력하세요.');
    try {
      await create.mutateAsync({
        programId: Number(effectiveProgram),
        title: title.trim(),
        dueDate: date,
      });
      setTitle('');
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : '추가에 실패했습니다.');
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label="할 일 추가"
            className={cn(
              'text-ink-ghost hover:bg-app hover:text-ink flex size-5 items-center justify-center rounded',
              className,
            )}
          />
        }
      >
        <Plus className="size-3.5" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 gap-2.5 p-3">
        <div className="text-[12.5px] font-semibold">{formatMonthDayKo(date)} 할 일 추가</div>
        {candidates.length === 0 ? (
          <p className="text-ink-faint text-xs">
            진행 중인 프로그램이 없습니다. 일정을 먼저 등록하세요.
          </p>
        ) : (
          <>
            <Select
              items={candidates.map((p) => ({ value: String(p.id), label: p.name }))}
              value={effectiveProgram}
              onValueChange={(v) => setProgramId(v)}
            >
              <SelectTrigger size="sm" className="bg-surface w-full">
                <SelectValue placeholder="프로그램 선택" />
              </SelectTrigger>
              <SelectContent>
                {candidates.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    <span
                      className="size-2 rounded-full"
                      style={{ background: PALETTE[p.color].solid }}
                    />
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void submit()}
              autoFocus
              placeholder="할 일 이름"
              className="border-line bg-surface focus:border-ring h-8 rounded-md border px-2.5 text-[13px] outline-none"
            />
            <button
              type="button"
              onClick={submit}
              disabled={create.isPending}
              className="bg-brand hover:bg-brand-deep h-8 rounded-md text-xs font-semibold text-white disabled:opacity-50"
            >
              추가
            </button>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
