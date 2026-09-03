import { getDb } from '@/lib/db/client';
import { createTemplate, listTemplates } from '@/lib/db/repos/templates';
import { templateInputSchema } from '@/lib/domain/zod';
import { ok, parseBody, route } from '@/lib/api/handler';

export const GET = route(async () => ok(await listTemplates(getDb())));

export const POST = route(async (req) => {
  const input = await parseBody(req, templateInputSchema);
  const id = await createTemplate(getDb(), input);
  return ok({ id }, { status: 201 });
});
