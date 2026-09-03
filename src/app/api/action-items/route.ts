import { getDb } from '@/lib/db/client';
import { createActionItem, listActionItems } from '@/lib/db/repos/actionItems';
import { actionItemInputSchema } from '@/lib/domain/zod';
import { ok, parseBody, route } from '@/lib/api/handler';

export const GET = route(async (req) => {
  const raw = new URL(req.url).searchParams.get('categoryId');
  const categoryId = raw && /^\d+$/.test(raw) ? Number(raw) : undefined;
  return ok(await listActionItems(getDb(), { categoryId }));
});

export const POST = route(async (req) => {
  const input = await parseBody(req, actionItemInputSchema);
  const id = await createActionItem(getDb(), input);
  return ok({ id }, { status: 201 });
});
