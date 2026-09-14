import { and, desc, eq } from 'drizzle-orm';
import type { Db, Tx } from '@/lib/db/client';
import { memos, programs, type MemoRow } from '@/lib/db/schema';
import type { MemoDto } from '@/lib/domain/dto';
import type { ColorKey } from '@/lib/domain/enums';
import type { MemoCreateInput, MemoPatchInput } from '@/lib/domain/zod';

function toDto(row: { memo: MemoRow; program: { name: string; color: ColorKey } | null }): MemoDto {
  return {
    id: row.memo.id,
    body: row.memo.body,
    programId: row.memo.programId,
    programName: row.program?.name ?? null,
    programColor: row.program?.color ?? null,
    createdAt: new Date(row.memo.createdAt).toISOString(),
    updatedAt: new Date(row.memo.updatedAt).toISOString(),
  };
}

const programSelection = { name: programs.name, color: programs.color };

/** Newest first. `programId` narrows to one program's memos. */
export async function listMemos(db: Db | Tx, filter: { programId?: number } = {}): Promise<MemoDto[]> {
  const conds = filter.programId ? [eq(memos.programId, filter.programId)] : [];
  const rows = await db
    .select({ memo: memos, program: programSelection })
    .from(memos)
    .leftJoin(programs, eq(programs.id, memos.programId))
    .where(conds.length > 0 ? and(...conds) : undefined)
    .orderBy(desc(memos.createdAt), desc(memos.id));
  return rows.map(toDto);
}

export async function getMemo(db: Db, id: number): Promise<MemoDto | null> {
  const [row] = await db
    .select({ memo: memos, program: programSelection })
    .from(memos)
    .leftJoin(programs, eq(programs.id, memos.programId))
    .where(eq(memos.id, id))
    .limit(1);
  return row ? toDto(row) : null;
}

export async function createMemo(db: Db, input: MemoCreateInput): Promise<number> {
  const [res] = await db.insert(memos).values({ body: input.body, programId: input.programId ?? null });
  return res.insertId;
}

export async function updateMemo(db: Db, id: number, patch: MemoPatchInput): Promise<boolean> {
  const set: Partial<typeof memos.$inferInsert> = {};
  if (patch.body !== undefined) set.body = patch.body;
  if (patch.programId !== undefined) set.programId = patch.programId;
  if (Object.keys(set).length === 0) return true;
  const [res] = await db.update(memos).set(set).where(eq(memos.id, id));
  return res.affectedRows > 0;
}

export async function deleteMemo(db: Db, id: number): Promise<boolean> {
  const [res] = await db.delete(memos).where(eq(memos.id, id));
  return res.affectedRows > 0;
}
