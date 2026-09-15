import { getDb } from '@/lib/db/client';
import { deleteAbsence } from '@/lib/db/repos/absences';
import { idParam, noContent, notFound, route } from '@/lib/api/handler';

type P = { id: string };

export const DELETE = route<P>(async (_req, ctx) => {
  const id = await idParam(ctx);
  const deleted = await deleteAbsence(getDb(), id);
  if (!deleted) throw notFound('부재');
  return noContent();
});
