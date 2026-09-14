import { getDb } from '@/lib/db/client';
import { deleteMemo, getMemo, updateMemo } from '@/lib/db/repos/memos';
import { memoPatchSchema } from '@/lib/domain/zod';
import { idParam, noContent, notFound, ok, parseBody, route } from '@/lib/api/handler';

type P = { id: string };

export const PATCH = route<P>(async (req, ctx) => {
  const id = await idParam(ctx);
  const patch = await parseBody(req, memoPatchSchema);
  const db = getDb();
  const updated = await updateMemo(db, id, patch);
  if (!updated) throw notFound('메모');
  return ok(await getMemo(db, id));
});

export const DELETE = route<P>(async (_req, ctx) => {
  const id = await idParam(ctx);
  const deleted = await deleteMemo(getDb(), id);
  if (!deleted) throw notFound('메모');
  return noContent();
});
