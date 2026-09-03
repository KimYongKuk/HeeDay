import { getDb } from '@/lib/db/client';
import { deleteClosure } from '@/lib/db/repos/closures';
import { idParam, noContent, notFound, route } from '@/lib/api/handler';

type P = { id: string };

export const DELETE = route<P>(async (_req, ctx) => {
  const id = await idParam(ctx);
  const deleted = await deleteClosure(getDb(), id);
  if (!deleted) throw notFound('휴관일');
  return noContent();
});
