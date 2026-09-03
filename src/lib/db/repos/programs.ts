import { desc, eq, sql } from 'drizzle-orm';
import type { Db, Tx } from '@/lib/db/client';
import { programs, tasks, type ProgramRow } from '@/lib/db/schema';
import type { ProgramDetailDto, ProgramListDto } from '@/lib/domain/dto';
import type { ProgramStatus } from '@/lib/domain/enums';
import type { ISODate } from '@/lib/domain/types';
import { listTasksByProgram } from './tasks';

interface Counts {
  taskCount: number;
  doneCount: number;
  firstTaskDate: ISODate | null;
  lastTaskDate: ISODate | null;
}

const countColumns = {
  taskCount: sql<number>`count(${tasks.id})`,
  doneCount: sql<number>`coalesce(sum(case when ${tasks.done} = 1 then 1 else 0 end), 0)`,
  firstTaskDate: sql<string | null>`min(${tasks.dueDate})`,
  lastTaskDate: sql<string | null>`max(${tasks.dueDate})`,
};

function toCounts(r: { taskCount: number | string; doneCount: number | string; firstTaskDate: string | null; lastTaskDate: string | null }): Counts {
  return {
    taskCount: Number(r.taskCount),
    doneCount: Number(r.doneCount),
    firstTaskDate: r.firstTaskDate,
    lastTaskDate: r.lastTaskDate,
  };
}

function baseDto(row: ProgramRow, counts: Counts): ProgramListDto {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    startDate: row.startDate,
    endDate: row.endDate,
    assignee: row.assignee,
    status: row.status,
    templateId: row.templateId,
    templateName: row.templateSnapshot?.name ?? '',
    createdAt: new Date(row.createdAt).toISOString(),
    ...counts,
  };
}

export async function listPrograms(db: Db, opts: { status?: ProgramStatus } = {}): Promise<ProgramListDto[]> {
  const rows = await db
    .select({ program: programs, ...countColumns })
    .from(programs)
    .leftJoin(tasks, eq(tasks.programId, programs.id))
    .where(opts.status ? eq(programs.status, opts.status) : undefined)
    .groupBy(programs.id)
    .orderBy(desc(programs.startDate), desc(programs.id));
  return rows.map((r) => baseDto(r.program, toCounts(r)));
}

export async function getProgram(db: Db, id: number): Promise<ProgramDetailDto | null> {
  const [row] = await db
    .select({ program: programs, ...countColumns })
    .from(programs)
    .leftJoin(tasks, eq(tasks.programId, programs.id))
    .where(eq(programs.id, id))
    .groupBy(programs.id)
    .limit(1);
  if (!row) return null;
  const taskRows = await listTasksByProgram(db, id);
  return { ...baseDto(row.program, toCounts(row)), templateSnapshot: row.program.templateSnapshot, tasks: taskRows };
}

export async function findProgramIdByIdempotencyKey(db: Db | Tx, key: string): Promise<number | null> {
  const [row] = await db.select({ id: programs.id }).from(programs).where(eq(programs.idempotencyKey, key)).limit(1);
  return row?.id ?? null;
}

export async function insertProgram(tx: Tx | Db, values: typeof programs.$inferInsert): Promise<number> {
  const [res] = await tx.insert(programs).values(values);
  return res.insertId;
}

export async function updateProgram(
  db: Db,
  id: number,
  patch: Partial<Pick<typeof programs.$inferInsert, 'name' | 'assignee' | 'color' | 'status'>>,
): Promise<boolean> {
  if (Object.keys(patch).length === 0) return true;
  const [res] = await db.update(programs).set(patch).where(eq(programs.id, id));
  return res.affectedRows > 0;
}

export async function deleteProgram(db: Db, id: number): Promise<boolean> {
  return db.transaction(async (tx) => {
    await tx.delete(tasks).where(eq(tasks.programId, id));
    const [res] = await tx.delete(programs).where(eq(programs.id, id));
    return res.affectedRows > 0;
  });
}
