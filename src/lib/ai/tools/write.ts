/**
 * Write tools never touch the database. Each validates its target, then returns a proposal the
 * widget shows as a confirmation card; 적용 goes through the same REST API the screens use.
 */
import { z } from 'zod';
import { getProgramBrief, getTasksByIds, type TaskSearchRow } from '@/lib/db/repos/assistantQueries';
import { listAbsences } from '@/lib/db/repos/absences';
import { listClosures } from '@/lib/db/repos/closures';
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

export const WRITE_TOOLS = [addTask, setTaskStatus, moveTask, appendTaskNote];
