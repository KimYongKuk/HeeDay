import { getDb } from '@/lib/db/client';
import { createCategory, listCategories } from '@/lib/db/repos/categories';
import { categoryInputSchema } from '@/lib/domain/zod';
import { ApiError, ok, parseBody, route } from '@/lib/api/handler';

export const GET = route(async () => ok(await listCategories(getDb())));

export const POST = route(async (req) => {
  const input = await parseBody(req, categoryInputSchema);
  try {
    const id = await createCategory(getDb(), input.name);
    return ok({ id }, { status: 201 });
  } catch (err) {
    if ((err as { code?: string }).code === 'ER_DUP_ENTRY') {
      throw new ApiError(409, 'DUPLICATE_NAME', '같은 이름의 분류가 이미 있습니다.');
    }
    throw err;
  }
});
