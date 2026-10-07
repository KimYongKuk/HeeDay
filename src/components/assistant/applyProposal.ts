/**
 * Applies a confirmed AI 도우미 proposal through the same REST API the screens use, and records
 * what 되돌리기 needs. Nothing here talks to the model.
 */
import { api } from '@/lib/api/client';
import type { WriteProposal } from '@/lib/ai/protocol';
import type { CalendarTaskDto, MemoDto } from '@/lib/domain/dto';
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
    case 'update_task': {
      // Apply the checklist change to the current list so an edit made meanwhile is kept.
      const current = await api<CalendarTaskDto>(`/api/tasks/${p.task.id}`);
      const patch: Record<string, unknown> = {};
      if (p.title !== null) patch.title = p.title;
      if (p.important !== null) patch.important = p.important;
      if (p.addChecklist.length || p.checkItems.length || p.uncheckItems.length) {
        patch.checklist = [
          ...current.checklist.map((c) => ({
            ...c,
            checked: p.checkItems.includes(c.text) ? true : p.uncheckItems.includes(c.text) ? false : c.checked,
          })),
          ...p.addChecklist.filter((t) => !current.checklist.some((c) => c.text === t)).map((text) => ({ text, checked: false })),
        ];
      }
      await patchTask(p.task.id, patch);
      return {
        detail: '할 일이 수정되었습니다.',
        undo: {
          kind: 'patch_tasks',
          patches: [
            { id: p.task.id, patch: { title: current.title, important: current.important, checklist: current.checklist } },
          ],
        },
      };
    }
    case 'delete_tasks': {
      // Snapshot right before deleting, so 되돌리기 restores what was actually removed.
      const rows = await Promise.all(p.tasks.map((t) => api<CalendarTaskDto>(`/api/tasks/${t.id}`)));
      for (const t of rows) await api<void>(`/api/tasks/${t.id}`, { method: 'DELETE' });
      return { detail: `${rows.length}건이 삭제되었습니다.`, undo: { kind: 'restore_tasks', tasks: rows } };
    }
    case 'add_memo': {
      const created = await api<MemoDto>('/api/memos', {
        method: 'POST',
        json: { body: p.body, programId: p.program?.id ?? null },
      });
      return { detail: `메모 id ${created.id}로 추가되었습니다.`, undo: { kind: 'delete_memo', memoId: created.id } };
    }
    case 'update_memo': {
      await api<MemoDto>(`/api/memos/${p.memo.id}`, { method: 'PATCH', json: { body: p.body } });
      return { detail: '메모가 수정되었습니다.', undo: { kind: 'patch_memo', id: p.memo.id, patch: { body: p.memo.body } } };
    }
    case 'delete_memos': {
      for (const m of p.memos) await api<void>(`/api/memos/${m.id}`, { method: 'DELETE' });
      return { detail: `메모 ${p.memos.length}건이 삭제되었습니다.`, undo: { kind: 'restore_memos', memos: p.memos } };
    }
  }
}

export async function undoProposal(undo: UndoInfo): Promise<void> {
  switch (undo.kind) {
    case 'delete_task':
      await api<void>(`/api/tasks/${undo.taskId}`, { method: 'DELETE' });
      return;
    case 'patch_tasks':
      for (const { id, patch } of undo.patches) await patchTask(id, patch);
      return;
    case 'restore_tasks':
      await api<void>('/api/tasks/restore', { method: 'POST', json: { tasks: undo.tasks } });
      return;
    case 'delete_memo':
      await api<void>(`/api/memos/${undo.memoId}`, { method: 'DELETE' });
      return;
    case 'patch_memo':
      await api<MemoDto>(`/api/memos/${undo.id}`, { method: 'PATCH', json: undo.patch });
      return;
    case 'restore_memos':
      await api<void>('/api/memos/restore', { method: 'POST', json: { memos: undo.memos } });
      return;
  }
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
    case 'update_task':
      return `할 일 수정: ${p.task.title}`;
    case 'delete_tasks':
      return `할 일 삭제: ${p.tasks.map((t) => t.title).join(', ')}`;
    case 'add_memo':
      return `메모 추가: ${p.body.slice(0, 20)}`;
    case 'update_memo':
      return `메모 수정: ${p.memo.body.slice(0, 20)}`;
    case 'delete_memos':
      return `메모 삭제 ${p.memos.length}건`;
  }
}
