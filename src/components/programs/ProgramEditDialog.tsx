'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { ColorSwatches } from '@/components/common/ColorSwatches';
import { DateField } from '@/components/common/DateField';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ApiClientError } from '@/lib/api/client';
import { useUpdateProgram } from '@/lib/api/queries';
import { DEFAULT_ASSIGNEE } from '@/lib/domain/defaults';
import type { ProgramDetailDto } from '@/lib/domain/dto';
import type { ColorKey } from '@/lib/domain/enums';
import type { ISODate } from '@/lib/domain/types';
import { diffDaysISO } from '@/lib/utils/dates';

interface Draft {
  name: string;
  startDate: ISODate;
  endDate: ISODate;
  assignee: string;
  color: ColorKey;
}

/**
 * Edits the program's own fields (이름·기간·담당자·색). Tasks are never moved: shrinking the
 * period only reports how many placed tasks now fall outside it, the same rule as the wizard.
 */
export function ProgramEditDialog({
  program,
  open,
  onOpenChange,
}: {
  program: ProgramDetailDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        {open ? <EditForm program={program} onClose={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function EditForm({ program, onClose }: { program: ProgramDetailDto; onClose: () => void }) {
  const update = useUpdateProgram();
  const [d, setD] = useState<Draft>({
    name: program.name,
    startDate: program.startDate,
    endDate: program.endDate,
    assignee: program.assignee ?? '',
    color: program.color,
  });

  const rangeOk = d.startDate <= d.endDate;
  const outside = rangeOk
    ? program.tasks.filter((t) => t.dueDate < d.startDate || t.dueDate > d.endDate).length
    : 0;
  const span = rangeOk ? diffDaysISO(d.startDate, d.endDate) + 1 : null;

  const save = async () => {
    if (d.name.trim() === '') return toast.error('일정 이름을 입력하세요.');
    if (!rangeOk) return toast.error('종료일은 시작일보다 빠를 수 없습니다.');
    try {
      await update.mutateAsync({
        id: program.id,
        patch: {
          name: d.name.trim(),
          startDate: d.startDate,
          endDate: d.endDate,
          assignee: d.assignee.trim() === '' ? null : d.assignee.trim(),
          color: d.color,
        },
      });
      toast.success('일정을 수정했습니다.');
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : '저장에 실패했습니다.');
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>일정 수정</DialogTitle>
        <DialogDescription>
          할 일은 그대로 두고 일정 정보만 바꿉니다. 양식 {program.templateName}
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-4">
        <label className="block">
          <span className="text-ink-faint mb-[5px] block text-[11.5px] font-medium">일정 이름</span>
          <Input
            value={d.name}
            onChange={(e) => setD({ ...d, name: e.target.value })}
            autoFocus
            className="bg-surface h-9"
          />
        </label>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <div>
            <span className="text-ink-faint mb-[5px] block text-[11.5px] font-medium">시작일</span>
            <DateField
              value={d.startDate}
              onChange={(startDate) => setD({ ...d, startDate })}
              className="w-full"
            />
          </div>
          <div>
            <span className="text-ink-faint mb-[5px] block text-[11.5px] font-medium">종료일</span>
            <DateField
              value={d.endDate}
              onChange={(endDate) => setD({ ...d, endDate })}
              defaultMonth={d.startDate}
              className="w-full"
            />
          </div>
        </div>
        <p className="text-ink-faint -mt-2 text-xs">
          {!rangeOk ? (
            <span className="text-sun">종료일은 시작일보다 빠를 수 없습니다.</span>
          ) : (
            <>
              총 {span}일
              {outside > 0 ? (
                <span className="text-warn"> · 기간 밖 할 일 {outside}건 (날짜는 옮기지 않습니다)</span>
              ) : null}
            </>
          )}
        </p>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <label className="block">
            <span className="text-ink-faint mb-[5px] block text-[11.5px] font-medium">담당자</span>
            <Input
              value={d.assignee}
              onChange={(e) => setD({ ...d, assignee: e.target.value })}
              placeholder={DEFAULT_ASSIGNEE}
              className="bg-surface h-9"
            />
          </label>
          <div>
            <span className="text-ink-faint mb-[9px] block text-[11.5px] font-medium">색상</span>
            <div className="flex h-9 items-center">
              <ColorSwatches value={d.color} onChange={(color) => setD({ ...d, color })} />
            </div>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={update.isPending} className="h-9">
          취소
        </Button>
        <Button onClick={save} disabled={update.isPending} className="h-9 font-semibold">
          저장
        </Button>
      </DialogFooter>
    </>
  );
}
