import type { Db } from '@/lib/db/client';
import { findProgramIdByIdempotencyKey, insertProgram } from '@/lib/db/repos/programs';
import { insertTaskRows, placedToRows } from '@/lib/db/repos/tasks';
import type { ApproveResultDto } from '@/lib/domain/dto';
import type { ProgramApproveInput } from '@/lib/domain/zod';
import { ApiError } from '@/lib/api/handler';
import { buildTemplateSnapshot } from '@/lib/services/snapshot';

function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === 'ER_DUP_ENTRY';
}

/**
 * Approve a wizard draft: snapshot the live template for the record, then materialize the
 * program and the tasks exactly as the user placed them. Idempotent on `idempotencyKey`.
 */
export async function approveProgram(db: Db, input: ProgramApproveInput): Promise<ApproveResultDto> {
  const existingId = await findProgramIdByIdempotencyKey(db, input.idempotencyKey);
  if (existingId !== null) return { programId: existingId, taskCount: 0, reused: true };

  const snapshot = await buildTemplateSnapshot(db, input.templateId);
  if (!snapshot) throw new ApiError(404, 'NOT_FOUND', '프로그램 양식을 찾을 수 없습니다.');

  try {
    const programId = await db.transaction(async (tx) => {
      const id = await insertProgram(tx, {
        name: input.program.name,
        templateId: input.templateId,
        templateSnapshot: snapshot,
        startDate: input.program.startDate,
        endDate: input.program.endDate,
        assignee: input.program.assignee ?? null,
        color: input.program.color,
        status: 'ACTIVE',
        idempotencyKey: input.idempotencyKey,
      });
      await insertTaskRows(tx, placedToRows(id, snapshot, input.tasks));
      return id;
    });
    return { programId, taskCount: input.tasks.length, reused: false };
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      const id = await findProgramIdByIdempotencyKey(db, input.idempotencyKey);
      if (id !== null) return { programId: id, taskCount: 0, reused: true };
    }
    throw err;
  }
}
