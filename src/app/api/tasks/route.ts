import { getDb } from '@/lib/db/client';
import { createTask, getCalendarTask, listCalendarTasks } from '@/lib/db/repos/tasks';
import { taskCreateSchema } from '@/lib/domain/zod';
import { ApiError, ok, parseBody, route } from '@/lib/api/handler';
import { isISODate } from '@/lib/utils/dates';

export const GET = route(async (req) => {
  const params = new URL(req.url).searchParams;
  const programRaw = params.get('programId');
  const programId = programRaw && /^\d+$/.test(programRaw) ? Number(programRaw) : undefined;
  const from = params.get('from');
  const to = params.get('to');
  if (!from || !to || !isISODate(from) || !isISODate(to) || from > to) {
    throw new ApiError(400, 'BAD_RANGE', 'from, to 날짜 범위가 필요합니다.');
  }
  return ok(await listCalendarTasks(getDb(), { from, to, programId }));
});

export const POST = route(async (req) => {
  const input = await parseBody(req, taskCreateSchema);
  const db = getDb();
  const id = await createTask(db, input);
  return ok(await getCalendarTask(db, id), { status: 201 });
});
