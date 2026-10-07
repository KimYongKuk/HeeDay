import { z } from 'zod';
import { getActionItem, listActionItems } from '@/lib/db/repos/actionItems';
import { searchTasks, taskStats, type TaskSearchRow } from '@/lib/db/repos/assistantQueries';
import { listAbsences } from '@/lib/db/repos/absences';
import { listClosures } from '@/lib/db/repos/closures';
import { listMemos } from '@/lib/db/repos/memos';
import { getProgram, listPrograms } from '@/lib/db/repos/programs';
import { getTemplate, listTemplates } from '@/lib/db/repos/templates';
import { TASK_STATUSES } from '@/lib/domain/enums';
import { ABSENCE_KIND_LABEL, CLOSURE_KIND_LABEL, TASK_STATUS_LABEL, WEEKDAY_LABEL } from '@/lib/domain/labels';
import type { ChecklistItem, ISODate } from '@/lib/domain/types';
import { absenceByDate, buildClosureSet, dateWarning, expandAbsences } from '@/lib/services/placement';
import { weekdayISO } from '@/lib/utils/dates';
import { assertRange, dateInput, readTool, ToolInputError } from './define';

const NOTE_LIMIT = 600;

const WARNING_LABEL = { WEEKEND: '주말', CLOSURE: '휴관일', ABSENCE: '담당자 부재', OUT_OF_RANGE: '일정 기간 밖' } as const;

function checklistSummary(list: ChecklistItem[]): string | null {
  if (list.length === 0) return null;
  const done = list.filter((c) => c.checked).length;
  const open = list.filter((c) => !c.checked).map((c) => c.text);
  return open.length === 0 ? `${done}/${list.length} 완료` : `${done}/${list.length} 완료, 남은 항목: ${open.join(', ')}`;
}

/** "2026-10-07 (수)": the weekday saves the model a calendar calculation. */
export function withWeekday(date: ISODate): string {
  return `${date} (${WEEKDAY_LABEL[weekdayISO(date)]})`;
}

function clip(text: string | null): string | null {
  if (!text) return null;
  return text.length > NOTE_LIMIT ? `${text.slice(0, NOTE_LIMIT)}… (생략)` : text;
}

function taskOut(t: TaskSearchRow) {
  return {
    id: t.id,
    title: t.title,
    date: withWeekday(t.dueDate),
    status: TASK_STATUS_LABEL[t.status],
    required: t.required,
    important: t.important,
    category: t.categoryName,
    program: { id: t.programId, name: t.programName },
    checklist: checklistSummary(t.checklist),
    notes: clip(t.notes),
  };
}

const statusFilter = z
  .enum([...TASK_STATUSES, 'OPEN'])
  .describe('TODO=대기, DOING=진행 중, DONE=완료, OPEN=완료 전(대기+진행 중)');

const listProgramsTool = readTool({
  name: 'list_programs',
  label: '일정 목록 조회 중',
  description:
    '등록된 일정(프로그램 인스턴스) 목록. 기간, 담당자, 양식 이름, 할 일 전체/완료 건수를 반환합니다. 일정 id는 다른 도구의 programId로 씁니다.',
  input: z.object({
    status: z.enum(['ACTIVE', 'ARCHIVED', 'ALL']).default('ACTIVE').describe('ACTIVE=진행, ARCHIVED=보관'),
  }),
  async run({ db }, { status }) {
    const rows = await listPrograms(db, status === 'ALL' ? {} : { status });
    return rows.map((p) => ({
      id: p.id,
      name: p.name,
      template: p.templateName,
      period: `${p.startDate} ~ ${p.endDate}`,
      assignee: p.assignee,
      archived: p.status === 'ARCHIVED',
      tasks: { total: p.taskCount, done: p.doneCount },
    }));
  },
});

const getProgramTool = readTool({
  name: 'get_program',
  label: '일정 상세 조회 중',
  description: '일정 하나의 상세와 그 일정의 할 일 전체(날짜, 상태, 분류, 체크리스트, 메모).',
  input: z.object({ programId: z.number().int().positive() }),
  async run({ db }, { programId }) {
    const p = await getProgram(db, programId);
    if (!p) throw new ToolInputError(`일정 ${programId}을(를) 찾을 수 없습니다.`);
    return {
      id: p.id,
      name: p.name,
      template: p.templateName,
      period: `${p.startDate} ~ ${p.endDate}`,
      assignee: p.assignee,
      archived: p.status === 'ARCHIVED',
      tasks: p.tasks.map((t) => ({
        id: t.id,
        title: t.title,
        date: withWeekday(t.dueDate),
        status: TASK_STATUS_LABEL[t.status],
        required: t.required,
        important: t.important,
        category: t.categoryName,
        checklist: checklistSummary(t.checklist),
        notes: clip(t.notes),
      })),
    };
  },
});

const searchTasksTool = readTool({
  name: 'search_tasks',
  label: '할 일 검색 중',
  description:
    '조건으로 할 일을 검색합니다. keyword는 제목, 메모, 체크리스트 문구를 모두 찾습니다. 기본은 진행 중인(보관 안 된) 일정만 대상입니다. total은 조건에 맞는 전체 건수이고 rows는 최대 limit건입니다.',
  input: z.object({
    from: dateInput.optional(),
    to: dateInput.optional(),
    programId: z.number().int().positive().optional(),
    status: statusFilter.optional(),
    categoryName: z.string().max(40).optional().describe('분류 이름 (기획, 행정, 홍보, 운영, 정산, 보고 등)'),
    keyword: z.string().trim().min(1).max(50).optional(),
    requiredOnly: z.boolean().optional().describe('필수 항목만'),
    importantOnly: z.boolean().optional().describe('중요 표시(별표)한 할 일만'),
    includeArchived: z.boolean().optional(),
    limit: z.number().int().min(1).max(100).default(40),
  }),
  async run({ db }, input) {
    if (input.from && input.to) assertRange(input.from, input.to, 800);
    const { total, rows } = await searchTasks(db, input);
    return { total, shown: rows.length, rows: rows.map(taskOut) };
  },
});

const taskStatsTool = readTool({
  name: 'task_stats',
  label: '할 일 집계 중',
  description:
    '할 일 건수를 묶어서 셉니다(전체, 대기, 진행 중, 완료). groupBy=week의 key는 그 주의 월요일 날짜입니다. 개수, 비율, 업무량 질문에는 직접 세지 말고 이 도구를 씁니다.',
  input: z.object({
    from: dateInput,
    to: dateInput,
    groupBy: z.enum(['program', 'category', 'status', 'week', 'month']),
    programId: z.number().int().positive().optional(),
    status: statusFilter.optional(),
    categoryName: z.string().max(40).optional(),
    includeArchived: z.boolean().optional(),
  }),
  async run({ db }, input) {
    assertRange(input.from, input.to, 800);
    const rows = await taskStats(db, input);
    return rows.map((r) => (input.groupBy === 'status' ? { ...r, key: TASK_STATUS_LABEL[r.key as 'TODO'] ?? r.key } : r));
  },
});

const listTemplatesTool = readTool({
  name: 'list_templates',
  label: '프로그램 양식 조회 중',
  description: '프로그램 양식 목록과 항목 수, 이 양식으로 등록된 일정 수.',
  input: z.object({}),
  async run({ db }) {
    const rows = await listTemplates(db);
    return rows.map((t) => ({ id: t.id, name: t.name, description: t.description, items: t.itemCount, programs: t.programCount }));
  },
});

const getTemplateTool = readTool({
  name: 'get_template',
  label: '프로그램 양식 조회 중',
  description: '양식 하나의 순서대로 된 할 일 항목(분류, 필수 여부, 체크리스트).',
  input: z.object({ templateId: z.number().int().positive() }),
  async run({ db }, { templateId }) {
    const t = await getTemplate(db, templateId);
    if (!t) throw new ToolInputError(`양식 ${templateId}을(를) 찾을 수 없습니다.`);
    return {
      id: t.id,
      name: t.name,
      description: t.description,
      items: t.items.map((it, i) => ({
        order: i + 1,
        name: it.actionItemName,
        category: it.categoryName,
        required: it.required,
        checklist: it.checklistOverride ?? it.defaultChecklist,
      })),
    };
  },
});

const listActionItemsTool = readTool({
  name: 'list_action_items',
  label: '할 일 목록 조회 중',
  description:
    '할 일 목록(재사용하는 할 일 정의) 검색. 일치하는 항목이 5개 이하이면 각 항목을 쓰는 양식도 함께 반환합니다.',
  input: z.object({
    keyword: z.string().trim().max(50).optional(),
    categoryName: z.string().max(40).optional(),
  }),
  async run({ db }, { keyword, categoryName }) {
    const all = await listActionItems(db);
    const q = keyword?.toLowerCase();
    const rows = all.filter(
      (a) =>
        (!categoryName || a.categoryName === categoryName) &&
        (!q || a.name.toLowerCase().includes(q) || (a.description ?? '').toLowerCase().includes(q)),
    );
    const withUsage = rows.length <= 5;
    return Promise.all(
      rows.map(async (a) => ({
        id: a.id,
        name: a.name,
        category: a.categoryName,
        description: a.description,
        checklist: a.defaultChecklist,
        usedByTemplates: withUsage ? ((await getActionItem(db, a.id))?.usedBy.map((u) => u.templateName) ?? []) : a.usageCount,
      })),
    );
  },
});

const listClosuresTool = readTool({
  name: 'list_closures',
  label: '휴관일 조회 중',
  description: '기간 안의 휴관일과 공휴일.',
  input: z.object({ from: dateInput, to: dateInput }),
  async run({ db }, { from, to }) {
    assertRange(from, to, 800);
    const rows = await listClosures(db, { from, to });
    return rows.map((c) => ({ date: c.date, name: c.name, kind: CLOSURE_KIND_LABEL[c.kind] }));
  },
});

const findDateConflictsTool = readTool({
  name: 'find_date_conflicts',
  label: '날짜 점검 중',
  description: '주말, 휴관일, 담당자 부재일(휴가·출장), 또는 일정 기간 밖 날짜에 잡힌 할 일을 찾습니다.',
  input: z.object({
    from: dateInput,
    to: dateInput,
    programId: z.number().int().positive().optional(),
    includeDone: z.boolean().default(false),
  }),
  async run({ db }, { from, to, programId, includeDone }) {
    assertRange(from, to);
    const [closures, absences, { rows }] = await Promise.all([
      listClosures(db, { from, to }),
      listAbsences(db, { from, to }),
      searchTasks(db, { from, to, programId, status: includeDone ? undefined : 'OPEN', limit: 1000 }),
    ]);
    const set = buildClosureSet(closures);
    const absentDays = expandAbsences(absences);
    const closureName = new Map(closures.map((c) => [c.date, c.name]));
    const absenceOn = absenceByDate(absences);
    const problem = (w: keyof typeof WARNING_LABEL, date: string) => {
      if (w === 'CLOSURE') return `휴관일 (${closureName.get(date)})`;
      const a = absenceOn.get(date);
      if (w === 'ABSENCE' && a) return `담당자 ${ABSENCE_KIND_LABEL[a.kind]} (${a.name})`;
      return WARNING_LABEL[w];
    };
    return rows.flatMap((t) => {
      const w = dateWarning(t.dueDate, { startDate: t.programStart, endDate: t.programEnd }, set, absentDays);
      if (!w) return [];
      return [{ ...taskOut(t), notes: undefined, problem: problem(w, t.dueDate) }];
    });
  },
});

const listAbsencesTool = readTool({
  name: 'list_absences',
  label: '담당자 부재 조회 중',
  description: '기간과 겹치는 담당자 부재(휴가, 출장 등) 목록. 부재 기간에는 업무를 배치하지 않는 것이 좋습니다.',
  input: z.object({ from: dateInput, to: dateInput }),
  async run({ db }, { from, to }) {
    assertRange(from, to, 800);
    const rows = await listAbsences(db, { from, to });
    return rows.map((a) => ({ period: `${a.startDate} ~ ${a.endDate}`, kind: ABSENCE_KIND_LABEL[a.kind], name: a.name }));
  },
});

const searchMemosTool = readTool({
  name: 'search_memos',
  label: '메모 조회 중',
  description:
    '메모 화면의 메모(할 일 메모와 별개인 자유 메모)를 최신순으로 찾습니다. keyword는 본문을 찾고, programId로 일정에 연결된 메모만 볼 수 있습니다.',
  input: z.object({
    keyword: z.string().trim().min(1).max(50).optional(),
    programId: z.number().int().positive().optional(),
    limit: z.number().int().min(1).max(50).default(20),
  }),
  async run({ db }, { keyword, programId, limit }) {
    const all = await listMemos(db, programId ? { programId } : {});
    const q = keyword?.toLowerCase();
    const rows = q ? all.filter((m) => m.body.toLowerCase().includes(q)) : all;
    return {
      total: rows.length,
      shown: Math.min(rows.length, limit),
      rows: rows.slice(0, limit).map((m) => ({
        id: m.id,
        body: clip(m.body),
        program: m.programId ? { id: m.programId, name: m.programName } : null,
        updatedAt: m.updatedAt.slice(0, 10),
      })),
    };
  },
});

export const READ_TOOLS = [
  listProgramsTool,
  getProgramTool,
  searchTasksTool,
  taskStatsTool,
  listTemplatesTool,
  getTemplateTool,
  listActionItemsTool,
  listClosuresTool,
  findDateConflictsTool,
  listAbsencesTool,
  searchMemosTool,
];

export { WARNING_LABEL };
