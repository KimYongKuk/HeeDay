import { getDb } from '@/lib/db/client';
import { countCategoryItems, deleteCategory, renameCategory } from '@/lib/db/repos/categories';
import { categoryInputSchema } from '@/lib/domain/zod';
import { ApiError, idParam, noContent, notFound, ok, parseBody, route } from '@/lib/api/handler';

type P = { id: string };

export const PATCH = route<P>(async (req, ctx) => {
  const id = await idParam(ctx);
  const input = await parseBody(req, categoryInputSchema);
  try {
    const updated = await renameCategory(getDb(), id, input.name);
    if (!updated) throw notFound('분류');
    return ok({ id });
  } catch (err) {
    if ((err as { code?: string }).code === 'ER_DUP_ENTRY') {
      throw new ApiError(409, 'DUPLICATE_NAME', '같은 이름의 분류가 이미 있습니다.');
    }
    throw err;
  }
});

export const DELETE = route<P>(async (_req, ctx) => {
  const id = await idParam(ctx);
  const db = getDb();
  const count = await countCategoryItems(db, id);
  if (count > 0) {
    throw new ApiError(409, 'IN_USE', `이 분류에 할 일 항목 ${count}개가 있어 삭제할 수 없습니다.`);
  }
  const deleted = await deleteCategory(db, id);
  if (!deleted) throw notFound('분류');
  return noContent();
});
