import { getDb } from '@/lib/db/client';
import { createAbsence, listAbsences } from '@/lib/db/repos/absences';
import { absenceInputSchema } from '@/lib/domain/zod';
import { ApiError, ok, parseBody, route } from '@/lib/api/handler';
import { isISODate } from '@/lib/utils/dates';

export const GET = route(async (req) => {
  const params = new URL(req.url).searchParams;
  const year = params.get('year');
  let from = params.get('from') ?? undefined;
  let to = params.get('to') ?? undefined;
  if (year && /^\d{4}$/.test(year)) {
    from = `${year}-01-01`;
    to = `${year}-12-31`;
  }
  if ((from && !isISODate(from)) || (to && !isISODate(to))) {
    throw new ApiError(400, 'BAD_RANGE', '날짜 범위가 올바르지 않습니다.');
  }
  return ok(await listAbsences(getDb(), { from, to }));
});

export const POST = route(async (req) => {
  const input = await parseBody(req, absenceInputSchema);
  const id = await createAbsence(getDb(), input);
  return ok({ id }, { status: 201 });
});
