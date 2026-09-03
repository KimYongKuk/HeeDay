import { getDb } from '@/lib/db/client';
import { duplicateTemplate } from '@/lib/db/repos/templates';
import { idParam, notFound, ok, route } from '@/lib/api/handler';

type P = { id: string };

export const POST = route<P>(async (_req, ctx) => {
  const id = await idParam(ctx);
  const newId = await duplicateTemplate(getDb(), id);
  if (newId === null) throw notFound('프로그램 양식');
  return ok({ id: newId }, { status: 201 });
});
