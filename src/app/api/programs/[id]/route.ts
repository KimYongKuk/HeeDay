import { getDb } from '@/lib/db/client';
import { deleteProgram, getProgram, updateProgram } from '@/lib/db/repos/programs';
import { programPatchSchema } from '@/lib/domain/zod';
import { idParam, noContent, notFound, ok, parseBody, route } from '@/lib/api/handler';

type P = { id: string };

export const GET = route<P>(async (_req, ctx) => {
  const id = await idParam(ctx);
  const program = await getProgram(getDb(), id);
  if (!program) throw notFound('일정');
  return ok(program);
});

export const PATCH = route<P>(async (req, ctx) => {
  const id = await idParam(ctx);
  const input = await parseBody(req, programPatchSchema);
  const db = getDb();
  const updated = await updateProgram(db, id, input);
  if (!updated) throw notFound('일정');
  return ok(await getProgram(db, id));
});

export const DELETE = route<P>(async (_req, ctx) => {
  const id = await idParam(ctx);
  const deleted = await deleteProgram(getDb(), id);
  if (!deleted) throw notFound('일정');
  return noContent();
});
