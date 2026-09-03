import { and, asc, eq, gte, lte } from 'drizzle-orm';
import type { Db, Tx } from '@/lib/db/client';
import { programs, tasks, type TaskRow } from '@/lib/db/schema';
import type { CalendarTaskDto, TaskDto } from '@/lib/domain/dto';
import type { ColorKey } from '@/lib/domain/enums';
import type { ISODate, TemplateSnapshot } from '@/lib/domain/types';
import type { PlacedTaskInput, TaskCreateInput, TaskPatchInput } from '@/lib/domain/zod';

const CHUNK = 200;

export function toTaskDto(row: TaskRow): TaskDto {
  return {
    id: row.id,
    programId: row.programId,
    templateItemId: row.templateItemId,
    title: row.title,
    categoryId: row.categoryId,
    categoryName: row.categoryName,
    dueDate: row.dueDate,
    required: Boolean(row.required),
    done: Boolean(row.done),
    doneAt: row.doneAt ? new Date(row.doneAt).toISOString() : null,
    checklist: row.checklist ?? [],
    notes: row.notes,
  };
}

/** Rows for the tasks a user placed in the wizard; category comes from the snapshot item. */
export function placedToRows(programId: number, snapshot: TemplateSnapshot, placed: ReadonlyArray<PlacedTaskInput>) {
  const byId = new Map(snapshot.items.map((it) => [it.id, it]));
  return placed.map((p): typeof tasks.$inferInsert => {
    const item = p.templateItemId !== null ? byId.get(p.templateItemId) : undefined;
    return {
      programId,
      templateItemId: item ? item.id : null,
      title: p.title,
      categoryId: item?.categoryId ?? null,
      categoryName: item?.categoryName ?? null,
      dueDate: p.dueDate,
      required: p.required,
      done: false,
      doneAt: null,
      checklist: p.checklist.map((text) => ({ text, checked: false })),
      notes: null,
    };
  });
}

export async function insertTaskRows(tx: Tx | Db, rows: ReadonlyArray<typeof tasks.$inferInsert>): Promise<number> {
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    if (chunk.length > 0) await tx.insert(tasks).values(chunk);
  }
  return rows.length;
}

export async function listTasksByProgram(db: Db | Tx, programId: number): Promise<TaskDto[]> {
  const rows = await db
    .select()
    .from(tasks)
    .where(eq(tasks.programId, programId))
    .orderBy(asc(tasks.dueDate), asc(tasks.id));
  return rows.map(toTaskDto);
}

const programSelection = { name: programs.name, color: programs.color, snapshot: programs.templateSnapshot };

function withProgram(row: { task: TaskRow; program: { name: string; color: ColorKey; snapshot: unknown } }): CalendarTaskDto {
  const snap = row.program.snapshot as { name?: string } | null;
  return {
    ...toTaskDto(row.task),
    programName: row.program.name,
    programColor: row.program.color,
    templateName: snap?.name ?? row.program.name,
  };
}

export async function listCalendarTasks(
  db: Db,
  range: { from: ISODate; to: ISODate; programId?: number },
): Promise<CalendarTaskDto[]> {
  const conds = [gte(tasks.dueDate, range.from), lte(tasks.dueDate, range.to), eq(programs.status, 'ACTIVE')];
  if (range.programId) conds.push(eq(tasks.programId, range.programId));
  const rows = await db
    .select({ task: tasks, program: programSelection })
    .from(tasks)
    .innerJoin(programs, eq(programs.id, tasks.programId))
    .where(and(...conds))
    .orderBy(asc(tasks.dueDate), asc(tasks.id));
  return rows.map(withProgram);
}

export async function getCalendarTask(db: Db, id: number): Promise<CalendarTaskDto | null> {
  const [row] = await db
    .select({ task: tasks, program: programSelection })
    .from(tasks)
    .innerJoin(programs, eq(programs.id, tasks.programId))
    .where(eq(tasks.id, id))
    .limit(1);
  return row ? withProgram(row) : null;
}

export async function createTask(db: Db, input: TaskCreateInput): Promise<number> {
  const [res] = await db.insert(tasks).values({
    programId: input.programId,
    templateItemId: null,
    title: input.title,
    categoryId: null,
    categoryName: null,
    dueDate: input.dueDate,
    required: true,
    done: false,
    doneAt: null,
    checklist: (input.checklist ?? []).map((text) => ({ text, checked: false })),
    notes: input.notes ?? null,
  });
  return res.insertId;
}

export async function updateTask(db: Db, id: number, patch: TaskPatchInput): Promise<boolean> {
  const set: Partial<typeof tasks.$inferInsert> = {};
  if (patch.title !== undefined) set.title = patch.title;
  if (patch.dueDate !== undefined) set.dueDate = patch.dueDate;
  if (patch.notes !== undefined) set.notes = patch.notes;
  if (patch.checklist !== undefined) set.checklist = patch.checklist;
  if (patch.done !== undefined) {
    set.done = patch.done;
    set.doneAt = patch.done ? new Date() : null;
  }
  if (Object.keys(set).length === 0) return true;
  const [res] = await db.update(tasks).set(set).where(eq(tasks.id, id));
  return res.affectedRows > 0;
}

export async function deleteTask(db: Db, id: number): Promise<boolean> {
  const [res] = await db.delete(tasks).where(eq(tasks.id, id));
  return res.affectedRows > 0;
}

export async function deleteTasksByProgram(tx: Tx | Db, programId: number): Promise<void> {
  await tx.delete(tasks).where(eq(tasks.programId, programId));
}
