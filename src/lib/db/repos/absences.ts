import { and, asc, eq, gte, lte } from 'drizzle-orm';
import type { Db, Tx } from '@/lib/db/client';
import { absences } from '@/lib/db/schema';
import type { AbsenceDto } from '@/lib/domain/dto';
import type { ISODate } from '@/lib/domain/types';
import type { AbsenceInput } from '@/lib/domain/zod';

/** Absences overlapping `range` (a period counts when any of its days falls inside). */
export async function listAbsences(
  db: Db | Tx,
  range: { from?: ISODate; to?: ISODate } = {},
): Promise<AbsenceDto[]> {
  const conds = [];
  if (range.from) conds.push(gte(absences.endDate, range.from));
  if (range.to) conds.push(lte(absences.startDate, range.to));
  return db
    .select({
      id: absences.id,
      startDate: absences.startDate,
      endDate: absences.endDate,
      kind: absences.kind,
      name: absences.name,
    })
    .from(absences)
    .where(conds.length > 0 ? and(...conds) : undefined)
    .orderBy(asc(absences.startDate), asc(absences.id));
}

export async function createAbsence(db: Db, input: AbsenceInput): Promise<number> {
  const [res] = await db.insert(absences).values({
    startDate: input.startDate,
    endDate: input.endDate,
    kind: input.kind,
    name: input.name,
  });
  return res.insertId;
}

export async function deleteAbsence(db: Db, id: number): Promise<boolean> {
  const [res] = await db.delete(absences).where(eq(absences.id, id));
  return res.affectedRows > 0;
}
