import { getDb } from '@/lib/db/client';
import { deleteTask, getCalendarTask, updateTask } from '@/lib/db/repos/tasks';
import { taskPatchSchema } from '@/lib/domain/zod';
import { idParam, noContent, notFound, ok, parseBody, route } from '@/lib/api/handler';

type P = { id: string };

export const GET = route<P>(async (_req, ctx) => {
  const id = await idParam(ctx);
  const task = await getCalendarTask(getDb(), id);
  if (!task) throw notFound('할 일');
  return ok(task);
});

export const PATCH = route<P>(async (req, ctx) => {
  const id = await idParam(ctx);
  const patch = await parseBody(req, taskPatchSchema);
  const db = getDb();
  const updated = await updateTask(db, id, patch);
  if (!updated) throw notFound('할 일');
  return ok(await getCalendarTask(db, id));
});

export const DELETE = route<P>(async (_req, ctx) => {
  const id = await idParam(ctx);
  const deleted = await deleteTask(getDb(), id);
  if (!deleted) throw notFound('할 일');
  return noContent();
});
