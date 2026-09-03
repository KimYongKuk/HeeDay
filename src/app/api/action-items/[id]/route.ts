import { getDb } from '@/lib/db/client';
import {
  countActionItemUsage,
  deleteActionItem,
  getActionItem,
  updateActionItem,
} from '@/lib/db/repos/actionItems';
import { actionItemInputSchema } from '@/lib/domain/zod';
import { ApiError, idParam, noContent, notFound, ok, parseBody, route } from '@/lib/api/handler';

type P = { id: string };

export const GET = route<P>(async (_req, ctx) => {
  const id = await idParam(ctx);
  const item = await getActionItem(getDb(), id);
  if (!item) throw notFound('할 일 항목');
  return ok(item);
});

export const PATCH = route<P>(async (req, ctx) => {
  const id = await idParam(ctx);
  const input = await parseBody(req, actionItemInputSchema.partial());
  const db = getDb();
  const updated = await updateActionItem(db, id, input);
  if (!updated) throw notFound('할 일 항목');
  return ok(await getActionItem(db, id));
});

export const DELETE = route<P>(async (_req, ctx) => {
  const id = await idParam(ctx);
  const db = getDb();
  const usage = await countActionItemUsage(db, id);
  if (usage > 0) {
    throw new ApiError(409, 'IN_USE', `${usage}개 양식에서 사용 중이라 삭제할 수 없습니다.`);
  }
  const deleted = await deleteActionItem(db, id);
  if (!deleted) throw notFound('할 일 항목');
  return noContent();
});
