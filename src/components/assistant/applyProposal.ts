/**
 * Applies a confirmed AI 도우미 proposal through the same REST API the screens use, and records
 * what 되돌리기 needs. Nothing here talks to the model.
 */
import { api } from '@/lib/api/client';
import type { WriteProposal } from '@/lib/ai/protocol';
import type { CalendarTaskDto } from '@/lib/domain/dto';
import { TASK_STATUS_LABEL } from '@/lib/domain/labels';
import { formatShort, todayInSeoul } from '@/lib/utils/dates';
import type { UndoInfo } from '@/stores/assistantStore';

export interface ApplyResult {
  /** Short Korean summary, also reported back to the model. */
  detail: string;
  undo: UndoInfo;
}

const patchTask = (id: number, patch: Record<string, unknown>) =>
  api<CalendarTaskDto>(`/api/tasks/${id}`, { method: 'PATCH', json: patch });

export async function applyProposal(p: WriteProposal): Promise<ApplyResult> {
  switch (p.kind) {
    case 'add_task': {
      const created = await api<CalendarTaskDto>('/api/tasks', {
        method: 'POST',
        json: {
          programId: p.program.id,
          title: p.title,
          dueDate: p.dueDate,
          ...(p.checklist.length > 0 ? { checklist: p.checklist } : {}),
          ...(p.notes ? { notes: p.notes } : {}),
        },
      });
      return { detail: `할 일 id ${created.id}로 추가되었습니다.`, undo: { kind: 'delete_task', taskId: created.id } };
    }
    case 'set_task_status': {
      for (const t of p.tasks) await patchTask(t.id, { status: p.status });
      return {
        detail: `${p.tasks.length}건이 ${TASK_STATUS_LABEL[p.status]}(으)로 변경되었습니다.`,
        undo: { kind: 'patch_tasks', patches: p.tasks.map((t) => ({ id: t.id, patch: { status: t.status } })) },
      };
    }
    case 'move_task': {
      await patchTask(p.task.id, { dueDate: p.toDate });
      return {
        detail: `${p.toDate}(으)로 이동되었습니다.`,
        undo: { kind: 'patch_tasks', patches: [{ id: p.task.id, patch: { dueDate: p.task.dueDate } }] },
      };
    }
    case 'append_task_note': {
      // Read the note now, not at proposal time, so an edit made in between is kept.
      const current = await api<CalendarTaskDto>(`/api/tasks/${p.task.id}`);
      const line = `[${formatShort(todayInSeoul())}] ${p.text}`;
      const notes = current.notes ? `${current.notes}\n${line}` : line;
      await patchTask(p.task.id, { notes });
      return {
        detail: '메모가 덧붙여졌습니다.',
        undo: { kind: 'patch_tasks', patches: [{ id: p.task.id, patch: { notes: current.notes } }] },
      };
    }
  }
}

export async function undoProposal(undo: UndoInfo): Promise<void> {
  if (undo.kind === 'delete_task') {
    await api<void>(`/api/tasks/${undo.taskId}`, { method: 'DELETE' });
    return;
  }
  for (const { id, patch } of undo.patches) await patchTask(id, patch);
}

/** One line naming the change, for notices and toasts. */
export function proposalSummary(p: WriteProposal): string {
  switch (p.kind) {
    case 'add_task':
      return `할 일 추가: ${p.title}`;
    case 'set_task_status':
      return `상태 변경(${TASK_STATUS_LABEL[p.status]}): ${p.tasks.map((t) => t.title).join(', ')}`;
    case 'move_task':
      return `날짜 변경: ${p.task.title} → ${p.toDate}`;
    case 'append_task_note':
      return `메모 추가: ${p.task.title}`;
  }
}
