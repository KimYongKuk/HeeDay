import { getDb } from '@/lib/db/client';
import { restoreTasks } from '@/lib/db/repos/tasks';
import { taskRestoreSchema } from '@/lib/domain/zod';
import { ApiError, noContent, parseBody, route } from '@/lib/api/handler';

/** Duplicate id: already restored. Missing parent (program deleted since): cannot restore. */
function restoreError(err: unknown, what: string): never {
  const code = (err as { code?: string; cause?: { code?: string } })?.cause?.code ?? (err as { code?: string })?.code;
  if (code === 'ER_DUP_ENTRY') throw new ApiError(409, 'ALREADY_RESTORED', `이미 복원된 ${what}입니다.`);
  if (code === 'ER_NO_REFERENCED_ROW_2' || code === 'ER_NO_REFERENCED_ROW')
    throw new ApiError(409, 'PARENT_GONE', `연결된 일정이 삭제되어 ${what}을(를) 복원할 수 없습니다.`);
  throw err;
}

/** 되돌리기 after a delete: puts the tasks back with the same ids. */
export const POST = route(async (req) => {
  const { tasks } = await parseBody(req, taskRestoreSchema);
  await restoreTasks(getDb(), tasks).catch((err) => restoreError(err, '할 일'));
  return noContent();
});
