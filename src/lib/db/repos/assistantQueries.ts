/**
 * Read-only queries for the AI 도우미 tools. Search and aggregation run in SQL so the model never
 * has to count rows itself. Standard MySQL only (WEEKDAY, DATE_FORMAT, CAST AS CHAR).
 */
import { and, asc, eq, gte, inArray, like, lte, ne, or, sql, type SQL } from 'drizzle-orm';
import type { Db } from '@/lib/db/client';
import { programs, tasks } from '@/lib/db/schema';
import type { ColorKey, TaskStatus } from '@/lib/domain/enums';
import type { ChecklistItem, ISODate } from '@/lib/domain/types';

export type TaskStatusFilter = TaskStatus | 'OPEN';

export interface TaskSearchFilter {
  from?: ISODate;
  to?: ISODate;
  programId?: number;
  status?: TaskStatusFilter;
  categoryName?: string;
  keyword?: string;
  requiredOnly?: boolean;
  importantOnly?: boolean;
  includeArchived?: boolean;
  limit: number;
}

export interface TaskSearchRow {
  id: number;
  title: string;
  dueDate: ISODate;
  status: TaskStatus;
  required: boolean;
  important: boolean;
  categoryName: string | null;
  programId: number;
  programName: string;
  programColor: ColorKey;
  programStart: ISODate;
  programEnd: ISODate;
  checklist: ChecklistItem[];
  notes: string | null;
}

const rowSelection = {
  id: tasks.id,
  title: tasks.title,
  dueDate: tasks.dueDate,
  status: tasks.status,
  required: tasks.required,
  important: tasks.important,
  categoryName: tasks.categoryName,
  programId: tasks.programId,
  programName: programs.name,
  programColor: programs.color,
  programStart: programs.startDate,
  programEnd: programs.endDate,
  checklist: tasks.checklist,
  notes: tasks.notes,
};

function toRow(
  r: Omit<TaskSearchRow, 'required' | 'important' | 'checklist'> & {
    required: unknown;
    important: unknown;
    checklist: ChecklistItem[] | null;
  },
): TaskSearchRow {
  return { ...r, required: Boolean(r.required), important: Boolean(r.important), checklist: r.checklist ?? [] };
}

/** `%` and `_` in user text are literals, not wildcards. */
function likePattern(text: string): string {
  return `%${text.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

function taskConditions(f: Omit<TaskSearchFilter, 'limit'>): SQL[] {
  const conds: SQL[] = [];
  if (!f.includeArchived) conds.push(eq(programs.status, 'ACTIVE'));
  if (f.from) conds.push(gte(tasks.dueDate, f.from));
  if (f.to) conds.push(lte(tasks.dueDate, f.to));
  if (f.programId) conds.push(eq(tasks.programId, f.programId));
  if (f.status === 'OPEN') conds.push(ne(tasks.status, 'DONE'));
  else if (f.status) conds.push(eq(tasks.status, f.status));
  if (f.categoryName) conds.push(eq(tasks.categoryName, f.categoryName));
  if (f.requiredOnly) conds.push(eq(tasks.required, true));
  if (f.importantOnly) conds.push(eq(tasks.important, true));
  if (f.keyword) {
    const p = likePattern(f.keyword);
    conds.push(or(like(tasks.title, p), like(tasks.notes, p), sql`cast(${tasks.checklist} as char) like ${p}`)!);
  }
  return conds;
}

export async function searchTasks(db: Db, f: TaskSearchFilter): Promise<{ total: number; rows: TaskSearchRow[] }> {
  const where = and(...taskConditions(f));
  const [countRow] = await db
    .select({ n: sql<number>`count(*)` })
    .from(tasks)
    .innerJoin(programs, eq(programs.id, tasks.programId))
    .where(where);
  const rows = await db
    .select(rowSelection)
    .from(tasks)
    .innerJoin(programs, eq(programs.id, tasks.programId))
    .where(where)
    .orderBy(asc(tasks.dueDate), asc(tasks.id))
    .limit(f.limit);
  return {
    total: Number(countRow?.n ?? 0),
    rows: rows.map(toRow),
  };
}

export async function getTasksByIds(db: Db, ids: number[]): Promise<TaskSearchRow[]> {
  if (ids.length === 0) return [];
  const rows = await db
    .select(rowSelection)
    .from(tasks)
    .innerJoin(programs, eq(programs.id, tasks.programId))
    .where(inArray(tasks.id, ids))
    .orderBy(asc(tasks.dueDate), asc(tasks.id));
  return rows.map(toRow);
}

export type StatsGroupBy = 'program' | 'category' | 'status' | 'week' | 'month';

export interface TaskStatsRow {
  key: string;
  total: number;
  todo: number;
  doing: number;
  done: number;
}

export async function taskStats(
  db: Db,
  f: Omit<TaskSearchFilter, 'limit' | 'keyword'> & { groupBy: StatsGroupBy },
): Promise<TaskStatsRow[]> {
  const keyExpr: SQL<string> = {
    program: sql<string>`${programs.name}`,
    category: sql<string>`coalesce(${tasks.categoryName}, '(분류 없음)')`,
    status: sql<string>`${tasks.status}`,
    // Week key is that week's Monday (WEEKDAY: Monday = 0).
    week: sql<string>`date_format(date_sub(${tasks.dueDate}, interval weekday(${tasks.dueDate}) day), '%Y-%m-%d')`,
    month: sql<string>`date_format(${tasks.dueDate}, '%Y-%m')`,
  }[f.groupBy];
  const rows = await db
    .select({
      key: keyExpr,
      total: sql<number>`count(*)`,
      todo: sql<number>`coalesce(sum(case when ${tasks.status} = 'TODO' then 1 else 0 end), 0)`,
      doing: sql<number>`coalesce(sum(case when ${tasks.status} = 'DOING' then 1 else 0 end), 0)`,
      done: sql<number>`coalesce(sum(case when ${tasks.status} = 'DONE' then 1 else 0 end), 0)`,
    })
    .from(tasks)
    .innerJoin(programs, eq(programs.id, tasks.programId))
    .where(and(...taskConditions(f)))
    .groupBy(keyExpr)
    .orderBy(keyExpr);
  return rows.map((r) => ({
    key: String(r.key),
    total: Number(r.total),
    todo: Number(r.todo),
    doing: Number(r.doing),
    done: Number(r.done),
  }));
}

export async function getProgramBrief(db: Db, id: number) {
  const [row] = await db
    .select({
      id: programs.id,
      name: programs.name,
      color: programs.color,
      startDate: programs.startDate,
      endDate: programs.endDate,
      status: programs.status,
    })
    .from(programs)
    .where(eq(programs.id, id))
    .limit(1);
  return row ?? null;
}
