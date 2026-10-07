/**
 * Write tools never touch the database. Each validates its target, then returns a proposal the
 * widget shows as a confirmation card; 적용 goes through the same REST API the screens use.
 */
import { z } from 'zod';
import { getProgramBrief, getTasksByIds, type TaskSearchRow } from '@/lib/db/repos/assistantQueries';
import { listAbsences } from '@/lib/db/repos/absences';
import { listClosures } from '@/lib/db/repos/closures';
import { getMemo } from '@/lib/db/repos/memos';
import { getCalendarTask } from '@/lib/db/repos/tasks';
import { TASK_STATUSES } from '@/lib/domain/enums';
import type { ISODate } from '@/lib/domain/types';
import { buildClosureSet, dateWarning, expandAbsences } from '@/lib/services/placement';
import type { TaskRef } from '../protocol';
import { dateInput, ToolInputError, writeTool, type ToolContext } from './define';

const CONFIRM_NOTE = '실행되지 않고 사용자 확인 카드로 표시됩니다. 결과는 다음 메시지에서 받습니다.';

function ref(t: TaskSearchRow): TaskRef {
  return {
    id: t.id,
    title: t.title,
    dueDate: t.dueDate,
    status: t.status,
    programId: t.programId,
    programName: t.programName,
    programColor: t.programColor,
  };
}

async function loadTasks(ctx: ToolContext, ids: number[]): Promise<TaskSearchRow[]> {
  const unique = [...new Set(ids)];
  const rows = await getTasksByIds(ctx.db, unique);
  const missing = unique.filter((id) => !rows.some((r) => r.id === id));
  if (missing.length > 0) throw new ToolInputError(`할 일 ${missing.join(', ')}을(를) 찾을 수 없습니다. search_tasks로 id를 확인합니다.`);
  return rows;
}

async function warningFor(ctx: ToolContext, date: ISODate, period: { startDate: ISODate; endDate: ISODate }) {
  const [closures, absences] = await Promise.all([
    listClosures(ctx.db, { from: date, to: date }),
    listAbsences(ctx.db, { from: date, to: date }),
  ]);
  return dateWarning(date, period, buildClosureSet(closures), expandAbsences(absences));
}

const addTask = writeTool({
  name: 'add_task',
  description: `기존 일정에 할 일 하나를 추가하는 제안을 만듭니다. programId는 list_programs로 확인합니다. ${CONFIRM_NOTE}`,
  input: z.object({
    programId: z.number().int().positive(),
    title: z.string().trim().min(1).max(120),
    dueDate: dateInput,
    checklist: z.array(z.string().trim().min(1).max(100)).max(20).optional(),
    notes: z.string().trim().max(1000).optional(),
  }),
  async propose(ctx, input, toolUseId) {
    const p = await getProgramBrief(ctx.db, input.programId);
    if (!p) throw new ToolInputError(`일정 ${input.programId}을(를) 찾을 수 없습니다.`);
    if (p.status === 'ARCHIVED') throw new ToolInputError(`'${p.name}'은(는) 보관된 일정이라 할 일을 추가하지 않습니다.`);
    return {
      kind: 'add_task',
      toolUseId,
      program: { id: p.id, name: p.name, color: p.color },
      title: input.title,
      dueDate: input.dueDate,
      checklist: input.checklist ?? [],
      notes: input.notes ?? null,
      warning: await warningFor(ctx, input.dueDate, p),
    };
  },
});

const setTaskStatus = writeTool({
  name: 'set_task_status',
  description: `할 일의 상태를 바꾸는 제안을 만듭니다(TODO=대기, DOING=진행 중, DONE=완료). 최대 10건. ${CONFIRM_NOTE}`,
  input: z.object({
    taskIds: z.array(z.number().int().positive()).min(1).max(10),
    status: z.enum(TASK_STATUSES),
  }),
  async propose(ctx, { taskIds, status }, toolUseId) {
    const rows = await loadTasks(ctx, taskIds);
    return { kind: 'set_task_status', toolUseId, status, tasks: rows.map(ref) };
  },
});

const moveTask = writeTool({
  name: 'move_task',
  description: `할 일 하나의 날짜를 바꾸는 제안을 만듭니다. ${CONFIRM_NOTE}`,
  input: z.object({ taskId: z.number().int().positive(), toDate: dateInput }),
  async propose(ctx, { taskId, toDate }, toolUseId) {
    const [t] = await loadTasks(ctx, [taskId]);
    if (t.dueDate === toDate) throw new ToolInputError('이미 그 날짜에 있는 할 일입니다.');
    return {
      kind: 'move_task',
      toolUseId,
      task: ref(t),
      toDate,
      warning: await warningFor(ctx, toDate, { startDate: t.programStart, endDate: t.programEnd }),
    };
  },
});

const appendTaskNote = writeTool({
  name: 'append_task_note',
  description: `할 일 메모 끝에 내용을 덧붙이는 제안을 만듭니다. 기존 메모는 지우지 않습니다. 날짜 머리말은 자동으로 붙습니다. ${CONFIRM_NOTE}`,
  input: z.object({ taskId: z.number().int().positive(), text: z.string().trim().min(1).max(500) }),
  async propose(ctx, { taskId, text }, toolUseId) {
    const [t] = await loadTasks(ctx, [taskId]);
    if ((t.notes?.length ?? 0) + text.length > 1900) throw new ToolInputError('메모가 길어 더 덧붙일 수 없습니다(최대 2,000자).');
    return { kind: 'append_task_note', toolUseId, task: ref(t), text };
  },
});

/** Exact text first, then a unique partial match; anything else is an input error naming the items. */
function matchItems(wanted: string[], items: { text: string }[], label: string): string[] {
  return wanted.map((w) => {
    const exact = items.find((c) => c.text === w);
    if (exact) return exact.text;
    const partial = items.filter((c) => c.text.includes(w));
    if (partial.length === 1) return partial[0].text;
    const list = items.map((c) => c.text).join(', ') || '(없음)';
    throw new ToolInputError(`${label} '${w}'을(를) 하나로 특정할 수 없습니다. 현재 항목: ${list}`);
  });
}

const updateTask = writeTool({
  name: 'update_task',
  description: `할 일 하나의 제목, 중요 표시, 체크리스트를 고치는 제안을 만듭니다. 체크리스트는 항목 추가(addChecklist), 체크(checkItems), 체크 해제(uncheckItems)만 하고 기존 항목은 지우지 않습니다. 상태는 set_task_status, 날짜는 move_task, 메모는 append_task_note를 씁니다. ${CONFIRM_NOTE}`,
  input: z.object({
    taskId: z.number().int().positive(),
    title: z.string().trim().min(1).max(120).optional(),
    important: z.boolean().optional().describe('중요 표시(별표) 켜기/끄기'),
    addChecklist: z.array(z.string().trim().min(1).max(100)).max(10).optional(),
    checkItems: z.array(z.string().trim().min(1).max(100)).max(20).optional().describe('체크할 기존 항목 문구'),
    uncheckItems: z.array(z.string().trim().min(1).max(100)).max(20).optional().describe('체크 해제할 기존 항목 문구'),
  }),
  async propose(ctx, input, toolUseId) {
    const [t] = await loadTasks(ctx, [input.taskId]);
    const title = input.title && input.title !== t.title ? input.title : null;
    const important = input.important !== undefined && input.important !== t.important ? input.important : null;
    const addChecklist = (input.addChecklist ?? []).filter((x) => !t.checklist.some((c) => c.text === x));
    const checkItems = matchItems(input.checkItems ?? [], t.checklist, '체크리스트 항목').filter(
      (x) => !t.checklist.find((c) => c.text === x)?.checked,
    );
    const uncheckItems = matchItems(input.uncheckItems ?? [], t.checklist, '체크리스트 항목').filter(
      (x) => t.checklist.find((c) => c.text === x)?.checked,
    );
    if (t.checklist.length + addChecklist.length > 50) throw new ToolInputError('체크리스트는 50개까지입니다.');
    if (title === null && important === null && !addChecklist.length && !checkItems.length && !uncheckItems.length)
      throw new ToolInputError('바뀌는 내용이 없습니다. 이미 그 상태입니다.');
    return {
      kind: 'update_task',
      toolUseId,
      task: { ...ref(t), important: t.important },
      title,
      important,
      addChecklist,
      checkItems,
      uncheckItems,
    };
  },
});

const deleteTasks = writeTool({
  name: 'delete_tasks',
  description: `할 일을 삭제하는 제안을 만듭니다. 최대 10건. 사용자가 삭제를 직접 요청했을 때만 씁니다. 일정(프로그램) 자체는 삭제하지 않습니다. ${CONFIRM_NOTE}`,
  input: z.object({ taskIds: z.array(z.number().int().positive()).min(1).max(10) }),
  async propose(ctx, { taskIds }, toolUseId) {
    const ids = [...new Set(taskIds)];
    const rows = await Promise.all(ids.map((id) => getCalendarTask(ctx.db, id)));
    const missing = ids.filter((_, i) => !rows[i]);
    if (missing.length > 0) throw new ToolInputError(`할 일 ${missing.join(', ')}을(를) 찾을 수 없습니다.`);
    return { kind: 'delete_tasks', toolUseId, tasks: rows.filter((r) => r !== null) };
  },
});

const addMemo = writeTool({
  name: 'add_memo',
  description: `메모 화면에 새 메모를 남기는 제안을 만듭니다. 특정 일정에 관한 메모면 programId를 붙입니다. 할 일에 붙는 메모는 append_task_note를 씁니다. ${CONFIRM_NOTE}`,
  input: z.object({
    body: z.string().trim().min(1).max(2000),
    programId: z.number().int().positive().optional(),
  }),
  async propose(ctx, { body, programId }, toolUseId) {
    let program = null;
    if (programId) {
      const p = await getProgramBrief(ctx.db, programId);
      if (!p) throw new ToolInputError(`일정 ${programId}을(를) 찾을 수 없습니다.`);
      program = { id: p.id, name: p.name, color: p.color };
    }
    return { kind: 'add_memo', toolUseId, body, program };
  },
});

async function loadMemo(ctx: ToolContext, id: number) {
  const m = await getMemo(ctx.db, id);
  if (!m) throw new ToolInputError(`메모 ${id}을(를) 찾을 수 없습니다. search_memos로 id를 확인합니다.`);
  return m;
}

const updateMemo = writeTool({
  name: 'update_memo',
  description: `메모 화면의 메모 하나를 고치는 제안을 만듭니다. 기본은 append(끝에 덧붙이기)이고, 사용자가 내용을 바꿔 달라고 할 때만 body(전체 교체)를 씁니다. ${CONFIRM_NOTE}`,
  input: z.object({
    memoId: z.number().int().positive(),
    append: z.string().trim().min(1).max(1000).optional(),
    body: z.string().trim().min(1).max(2000).optional().describe('바꿀 전체 본문'),
  }),
  async propose(ctx, { memoId, append, body }, toolUseId) {
    if (!append === !body) throw new ToolInputError('append와 body 중 하나만 지정합니다.');
    const m = await loadMemo(ctx, memoId);
    const next = body ?? `${m.body}\n${append}`;
    if (next.length > 2000) throw new ToolInputError('메모는 2,000자까지입니다.');
    if (next === m.body) throw new ToolInputError('바뀌는 내용이 없습니다.');
    return { kind: 'update_memo', toolUseId, memo: m, body: next };
  },
});

const deleteMemos = writeTool({
  name: 'delete_memos',
  description: `메모 화면의 메모를 삭제하는 제안을 만듭니다. 최대 10건. 사용자가 삭제를 직접 요청했을 때만 씁니다. ${CONFIRM_NOTE}`,
  input: z.object({ memoIds: z.array(z.number().int().positive()).min(1).max(10) }),
  async propose(ctx, { memoIds }, toolUseId) {
    const memos = await Promise.all([...new Set(memoIds)].map((id) => loadMemo(ctx, id)));
    return { kind: 'delete_memos', toolUseId, memos };
  },
});

export const WRITE_TOOLS = [
  addTask,
  setTaskStatus,
  moveTask,
  appendTaskNote,
  updateTask,
  deleteTasks,
  addMemo,
  updateMemo,
  deleteMemos,
];
