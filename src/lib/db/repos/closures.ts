import { and, asc, eq, gte, lte } from 'drizzle-orm';
import type { Db, Tx } from '@/lib/db/client';
import { closureDays } from '@/lib/db/schema';
import type { ClosureDayDto } from '@/lib/domain/dto';
import type { ISODate } from '@/lib/domain/types';
import type { ClosureInput } from '@/lib/domain/zod';

export async function listClosures(
  db: Db | Tx,
  range: { from?: ISODate; to?: ISODate } = {},
): Promise<ClosureDayDto[]> {
  const conds = [];
  if (range.from) conds.push(gte(closureDays.date, range.from));
  if (range.to) conds.push(lte(closureDays.date, range.to));
  const rows = await db
    .select({
      id: closureDays.id,
      date: closureDays.date,
      name: closureDays.name,
      kind: closureDays.kind,
      source: closureDays.source,
    })
    .from(closureDays)
    .where(conds.length > 0 ? and(...conds) : undefined)
    .orderBy(asc(closureDays.date));
  return rows;
}

export async function createClosure(db: Db, input: ClosureInput, source = 'manual'): Promise<number> {
  const [res] = await db.insert(closureDays).values({
    date: input.date,
    name: input.name,
    kind: input.kind,
    source,
  });
  return res.insertId;
}

export async function deleteClosure(db: Db, id: number): Promise<boolean> {
  const [res] = await db.delete(closureDays).where(eq(closureDays.id, id));
  return res.affectedRows > 0;
}
