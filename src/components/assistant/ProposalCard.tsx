'use client';

import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import type { TaskRef, WriteProposal } from '@/lib/ai/protocol';
import { PALETTE } from '@/lib/domain/colors';
import { TASK_STATUS_LABEL } from '@/lib/domain/labels';
import type { DateWarning } from '@/lib/domain/types';
import { formatMonthDayKo } from '@/lib/utils/dates';
import type { ChatItem, ProposalState } from '@/stores/assistantStore';

const TITLE: Record<WriteProposal['kind'], string> = {
  add_task: '할 일 추가',
  set_task_status: '할 일 상태 변경',
  move_task: '할 일 날짜 변경',
  append_task_note: '할 일 메모 추가',
  update_task: '할 일 수정',
  delete_tasks: '할 일 삭제',
  add_memo: '메모 추가',
  update_memo: '메모 수정',
  delete_memos: '메모 삭제',
};

const DESTRUCTIVE: ReadonlySet<WriteProposal['kind']> = new Set(['delete_tasks', 'delete_memos']);

function MemoProgram({ program }: { program: { name: string; color: TaskRef['programColor'] } | null }) {
  if (!program) return null;
  return (
    <div className="flex items-center gap-1.5">
      <ProgramDot color={program.color} />
      <span className="text-ink-muted">{program.name}</span>
    </div>
  );
}

function MemoText({ text, strike }: { text: string; strike?: boolean }) {
  return (
    <p className={`bg-app line-clamp-4 rounded-md px-2 py-1.5 whitespace-pre-wrap ${strike ? 'text-ink-faint line-through' : ''}`}>
      {text}
    </p>
  );
}

const WARNING: Record<DateWarning, string> = {
  WEEKEND: '주말',
  CLOSURE: '휴관일',
  ABSENCE: '담당자 부재',
  OUT_OF_RANGE: '일정 기간 밖',
};

const STATE_LABEL: Partial<Record<ProposalState, string>> = {
  applied: '적용됨',
  cancelled: '취소됨',
  failed: '적용 실패',
  skipped: '적용 안 됨',
  undone: '되돌림',
};

function ProgramDot({ color }: { color: TaskRef['programColor'] }) {
  return <span className="size-2 shrink-0 rounded-full" style={{ background: PALETTE[color].solid }} />;
}

function TaskLine({ t }: { t: TaskRef }) {
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <ProgramDot color={t.programColor} />
      <span className="text-ink-muted shrink-0">{t.programName}</span>
      <span className="truncate font-medium">{t.title}</span>
      <span className="text-ink-faint ml-auto shrink-0">{formatMonthDayKo(t.dueDate)}</span>
    </div>
  );
}

function WarningTag({ warning }: { warning: DateWarning | null }) {
  if (!warning) return null;
  return (
    <span
      className={`rounded px-1.5 py-px text-[10.5px] font-semibold ${warning === 'OUT_OF_RANGE' ? 'bg-danger-soft text-sun' : 'bg-warn-soft text-warn'}`}
    >
      {WARNING[warning]}
    </span>
  );
}

function Body({ p }: { p: WriteProposal }) {
  switch (p.kind) {
    case 'add_task':
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <ProgramDot color={p.program.color} />
            <span className="text-ink-muted">{p.program.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{p.title}</span>
            <span className="text-ink-faint">{formatMonthDayKo(p.dueDate)}</span>
            <WarningTag warning={p.warning} />
          </div>
          {p.checklist.length > 0 ? (
            <ul className="text-ink-muted list-disc pl-4">
              {p.checklist.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          ) : null}
          {p.notes ? <p className="text-ink-muted whitespace-pre-wrap">메모: {p.notes}</p> : null}
        </div>
      );
    case 'set_task_status':
      return (
        <div className="space-y-1">
          {p.tasks.map((t) => (
            <div key={t.id}>
              <TaskLine t={t} />
              <div className="text-ink-faint pl-3.5">
                {TASK_STATUS_LABEL[t.status]} → <span className="text-ink font-medium">{TASK_STATUS_LABEL[p.status]}</span>
              </div>
            </div>
          ))}
        </div>
      );
    case 'move_task':
      return (
        <div className="space-y-1">
          <TaskLine t={p.task} />
          <div className="text-ink-faint flex items-center gap-2 pl-3.5">
            {formatMonthDayKo(p.task.dueDate)} → <span className="text-ink font-medium">{formatMonthDayKo(p.toDate)}</span>
            <WarningTag warning={p.warning} />
          </div>
        </div>
      );
    case 'append_task_note':
      return (
        <div className="space-y-1">
          <TaskLine t={p.task} />
          <p className="bg-app rounded-md px-2 py-1.5 whitespace-pre-wrap">{p.text}</p>
          <p className="text-ink-faint">기존 메모 뒤에 날짜와 함께 덧붙입니다.</p>
        </div>
      );
    case 'update_task':
      return (
        <div className="space-y-1">
          <TaskLine t={p.task} />
          <ul className="text-ink-muted space-y-0.5 pl-3.5">
            {p.title !== null ? (
              <li>
                제목: {p.task.title} → <span className="text-ink font-medium">{p.title}</span>
              </li>
            ) : null}
            {p.important !== null ? (
              <li>
                중요 표시: <span className="text-ink font-medium">{p.important ? '켜기 ★' : '끄기'}</span>
              </li>
            ) : null}
            {p.addChecklist.map((c) => (
              <li key={`a-${c}`}>
                체크리스트 추가: <span className="text-ink font-medium">{c}</span>
              </li>
            ))}
            {p.checkItems.map((c) => (
              <li key={`c-${c}`}>
                체크: <span className="text-ink font-medium">{c}</span>
              </li>
            ))}
            {p.uncheckItems.map((c) => (
              <li key={`u-${c}`}>
                체크 해제: <span className="text-ink font-medium">{c}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    case 'delete_tasks':
      return (
        <div className="space-y-1.5">
          {p.tasks.map((t) => (
            <div key={t.id}>
              <TaskLine t={t} />
              <div className="text-ink-faint pl-3.5">
                {TASK_STATUS_LABEL[t.status]}
                {t.checklist.length > 0 ? ` · 체크리스트 ${t.checklist.length}개` : ''}
                {t.notes ? ' · 메모 있음' : ''}
                {t.important ? ' · 중요' : ''}
              </div>
            </div>
          ))}
        </div>
      );
    case 'add_memo':
      return (
        <div className="space-y-1">
          <MemoProgram program={p.program} />
          <MemoText text={p.body} />
        </div>
      );
    case 'update_memo':
      return (
        <div className="space-y-1">
          <MemoProgram program={p.memo.programName && p.memo.programColor ? { name: p.memo.programName, color: p.memo.programColor } : null} />
          <p className="text-ink-faint">변경 전</p>
          <MemoText text={p.memo.body} strike />
          <p className="text-ink-faint">변경 후</p>
          <MemoText text={p.body} />
        </div>
      );
    case 'delete_memos':
      return (
        <div className="space-y-1.5">
          {p.memos.map((m) => (
            <div key={m.id} className="space-y-1">
              <MemoProgram program={m.programName && m.programColor ? { name: m.programName, color: m.programColor } : null} />
              <MemoText text={m.body} />
            </div>
          ))}
        </div>
      );
  }
}

export function ProposalCard({
  item,
  onDecide,
  onUndo,
}: {
  item: Extract<ChatItem, { role: 'proposal' }>;
  onDecide: (action: 'apply' | 'cancel') => void;
  onUndo: () => Promise<void>;
}) {
  const { proposal: p, state } = item;
  const settled = STATE_LABEL[state];
  const destructive = DESTRUCTIVE.has(p.kind);
  return (
    <div
      className={`bg-surface rounded-xl border p-3 text-[12.5px] shadow-sm ${destructive ? 'border-sun/40' : 'border-brand-line'}`}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className={`text-[12px] font-semibold ${destructive ? 'text-sun' : 'text-brand-deep'}`}>
          {TITLE[p.kind]}
          {p.kind === 'delete_tasks' ? ` ${p.tasks.length}건` : p.kind === 'delete_memos' ? ` ${p.memos.length}건` : ''}
        </span>
        {settled ? (
          <span className={`text-[11.5px] font-medium ${state === 'failed' ? 'text-sun' : 'text-ink-faint'}`}>{settled}</span>
        ) : null}
      </div>
      <Body p={p} />
      {item.detail && state === 'failed' ? <p className="text-sun mt-2">{item.detail}</p> : null}
      {state === 'pending' || state === 'applying' ? (
        <div className="mt-3 flex justify-end gap-2">
          <Button size="sm" variant="outline" disabled={state === 'applying'} onClick={() => onDecide('cancel')}>
            취소
          </Button>
          <Button
            size="sm"
            variant={destructive ? 'destructive' : 'default'}
            disabled={state === 'applying'}
            onClick={() => onDecide('apply')}
          >
            {state === 'applying' ? <Loader2 className="size-3.5 animate-spin" /> : null}
            {destructive ? '삭제' : '적용'}
          </Button>
        </div>
      ) : null}
      {state === 'applied' && item.undo ? (
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            className="text-ink-muted hover:text-ink text-[11.5px] underline-offset-2 hover:underline"
            onClick={() => onUndo().catch(() => toast.error('되돌리지 못했습니다.'))}
          >
            되돌리기
          </button>
        </div>
      ) : null}
    </div>
  );
}
