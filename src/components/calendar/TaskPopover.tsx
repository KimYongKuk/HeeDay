'use client';

import { Plus, Trash2, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { DateField } from '@/components/common/DateField';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ApiClientError } from '@/lib/api/client';
import { useDeleteTask, useUpdateTask } from '@/lib/api/queries';
import { PALETTE } from '@/lib/domain/colors';
import type { CalendarTaskDto } from '@/lib/domain/dto';
import type { ChecklistItem, ISODate } from '@/lib/domain/types';

interface Draft {
  title: string;
  dueDate: ISODate;
  done: boolean;
  checklist: ChecklistItem[];
  notes: string;
}

function fromTask(t: CalendarTaskDto): Draft {
  return {
    title: t.title,
    dueDate: t.dueDate,
    done: t.done,
    checklist: t.checklist.map((c) => ({ ...c })),
    notes: t.notes ?? '',
  };
}

export function TaskPopover({ task, children }: { task: CalendarTaskDto; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger nativeButton={false} render={<div className="min-w-0 cursor-pointer" />}>
        {children}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[340px] p-0">
        {open ? <TaskEditor task={task} onClose={() => setOpen(false)} /> : null}
      </PopoverContent>
    </Popover>
  );
}

function TaskEditor({ task, onClose }: { task: CalendarTaskDto; onClose: () => void }) {
  const [d, setD] = useState<Draft>(() => fromTask(task));
  const update = useUpdateTask();
  const remove = useDeleteTask();
  const p = PALETTE[task.programColor];
  const busy = update.isPending || remove.isPending;
  const checked = d.checklist.filter((c) => c.checked).length;

  const save = async () => {
    if (d.title.trim() === '') return toast.error('할 일 이름을 입력하세요.');
    try {
      await update.mutateAsync({
        id: task.id,
        patch: {
          title: d.title.trim(),
          dueDate: d.dueDate,
          done: d.done,
          checklist: d.checklist
            .map((c) => ({ text: c.text.trim(), checked: c.checked }))
            .filter((c) => c.text),
          notes: d.notes.trim() === '' ? null : d.notes.trim(),
        },
      });
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : '저장에 실패했습니다.');
    }
  };

  const destroy = async () => {
    if (!window.confirm(`'${task.title}'을(를) 삭제하시겠습니까?`)) return;
    try {
      await remove.mutateAsync(task.id);
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : '삭제에 실패했습니다.');
    }
  };

  return (
    <div className="flex flex-col">
      <div className="border-line text-ink-faint flex items-center gap-2 border-b px-3.5 py-2.5 text-xs">
        <span className="size-2 rounded-full" style={{ background: p.solid }} />
        <span className="text-ink-soft truncate font-medium">{task.programName}</span>
        {task.categoryName ? <span>· {task.categoryName}</span> : null}
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="text-ink-ghost hover:text-ink ml-auto"
        >
          <X className="size-3.5" />
        </button>
      </div>

      <div className="flex flex-col gap-3 px-3.5 py-3">
        <Input
          value={d.title}
          onChange={(e) => setD({ ...d, title: e.target.value })}
          className="bg-surface h-9 text-[13.5px] font-medium"
        />
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <DateField
            value={d.dueDate}
            onChange={(dueDate) => setD({ ...d, dueDate })}
            className="w-full"
          />
          <label className="text-ink-soft flex items-center gap-2 text-[12.5px]">
            <Switch size="sm" checked={d.done} onCheckedChange={(done) => setD({ ...d, done })} />
            완료
          </label>
        </div>

        <div>
          <div className="text-ink-faint mb-1.5 flex items-center gap-2 text-[11.5px] font-medium">
            <span>체크리스트</span>
            {d.checklist.length > 0 ? (
              <span>
                {checked} / {d.checklist.length}
              </span>
            ) : null}
            <button
              type="button"
              onClick={() =>
                setD({ ...d, checklist: [...d.checklist, { text: '', checked: false }] })
              }
              className="text-brand hover:text-brand-deep ml-auto flex items-center gap-1"
            >
              <Plus className="size-3" strokeWidth={2} /> 추가
            </button>
          </div>
          <div className="flex flex-col gap-1">
            {d.checklist.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <Checkbox
                  checked={c.checked}
                  onCheckedChange={(v) =>
                    setD({
                      ...d,
                      checklist: d.checklist.map((x, idx) =>
                        idx === i ? { ...x, checked: Boolean(v) } : x,
                      ),
                    })
                  }
                />
                <input
                  value={c.text}
                  autoFocus={c.text === ''}
                  onChange={(e) =>
                    setD({
                      ...d,
                      checklist: d.checklist.map((x, idx) =>
                        idx === i ? { ...x, text: e.target.value } : x,
                      ),
                    })
                  }
                  placeholder="항목"
                  className={`hover:border-line focus:border-line focus:bg-surface h-7 min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1.5 text-[13px] outline-none ${c.checked ? 'text-ink-faint line-through' : ''}`}
                />
                <button
                  type="button"
                  onClick={() =>
                    setD({ ...d, checklist: d.checklist.filter((_, idx) => idx !== i) })
                  }
                  aria-label="삭제"
                  className="text-ink-ghost hover:text-ink"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <Textarea
          value={d.notes}
          onChange={(e) => setD({ ...d, notes: e.target.value })}
          placeholder="메모"
          rows={2}
          className="bg-surface text-[13px]"
        />
      </div>

      <div className="border-line flex items-center gap-2 border-t px-3.5 py-2.5">
        <button
          type="button"
          onClick={destroy}
          disabled={busy}
          className="text-sun flex items-center gap-1 text-[12px] font-medium hover:underline disabled:opacity-40"
        >
          <Trash2 className="size-3.5" /> 삭제
        </button>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={onClose} disabled={busy} className="h-8">
          취소
        </Button>
        <Button size="sm" onClick={save} disabled={busy} className="h-8 font-semibold">
          저장
        </Button>
      </div>
    </div>
  );
}
