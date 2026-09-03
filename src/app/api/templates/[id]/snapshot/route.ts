import { getDb } from '@/lib/db/client';
import { buildTemplateSnapshot } from '@/lib/services/snapshot';
import { idParam, notFound, ok, route } from '@/lib/api/handler';

type P = { id: string };

export const GET = route<P>(async (_req, ctx) => {
  const id = await idParam(ctx);
  const snapshot = await buildTemplateSnapshot(getDb(), id);
  if (!snapshot) throw notFound('프로그램 양식');
  return ok(snapshot);
});
