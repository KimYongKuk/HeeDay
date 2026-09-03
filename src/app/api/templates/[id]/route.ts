import { getDb } from '@/lib/db/client';
import { deleteTemplate, getTemplate, saveTemplate } from '@/lib/db/repos/templates';
import { templateInputSchema } from '@/lib/domain/zod';
import { idParam, noContent, notFound, ok, parseBody, route } from '@/lib/api/handler';

type P = { id: string };

export const GET = route<P>(async (_req, ctx) => {
  const id = await idParam(ctx);
  const t = await getTemplate(getDb(), id);
  if (!t) throw notFound('프로그램 양식');
  return ok(t);
});

export const PUT = route<P>(async (req, ctx) => {
  const id = await idParam(ctx);
  const input = await parseBody(req, templateInputSchema);
  const db = getDb();
  const saved = await saveTemplate(db, id, input);
  if (!saved) throw notFound('프로그램 양식');
  return ok(await getTemplate(db, id));
});

export const DELETE = route<P>(async (_req, ctx) => {
  const id = await idParam(ctx);
  const deleted = await deleteTemplate(getDb(), id);
  if (!deleted) throw notFound('프로그램 양식');
  return noContent();
});
