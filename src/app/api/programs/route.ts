import { getDb } from '@/lib/db/client';
import { listPrograms } from '@/lib/db/repos/programs';
import { PROGRAM_STATUSES, type ProgramStatus } from '@/lib/domain/enums';
import { programApproveSchema } from '@/lib/domain/zod';
import { ok, parseBody, route } from '@/lib/api/handler';
import { approveProgram } from '@/lib/services/programs';

export const GET = route(async (req) => {
  const raw = new URL(req.url).searchParams.get('status');
  const status = raw && (PROGRAM_STATUSES as readonly string[]).includes(raw) ? (raw as ProgramStatus) : undefined;
  return ok(await listPrograms(getDb(), { status }));
});

export const POST = route(async (req) => {
  const input = await parseBody(req, programApproveSchema);
  const result = await approveProgram(getDb(), input);
  return ok(result, { status: result.reused ? 200 : 201 });
});
