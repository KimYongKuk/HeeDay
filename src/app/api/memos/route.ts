import { getDb } from '@/lib/db/client';
import { createMemo, getMemo, listMemos } from '@/lib/db/repos/memos';
import { memoCreateSchema } from '@/lib/domain/zod';
import { ok, parseBody, route } from '@/lib/api/handler';

export const GET = route(async (req) => {
  const raw = new URL(req.url).searchParams.get('programId');
  const programId = raw && /^\d+$/.test(raw) ? Number(raw) : undefined;
  return ok(await listMemos(getDb(), { programId }));
});

export const POST = route(async (req) => {
  const input = await parseBody(req, memoCreateSchema);
  const db = getDb();
  const id = await createMemo(db, input);
  return ok(await getMemo(db, id), { status: 201 });
});
