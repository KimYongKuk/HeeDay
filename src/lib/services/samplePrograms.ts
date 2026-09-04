/**
 * Registers two sample programs through the real approval path, placing the template's
 * tasks evenly across the period the way a user might. Used by `pnpm db:seed --with-programs`.
 */
import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { listClosures } from '@/lib/db/repos/closures';
import { programTemplates } from '@/lib/db/schema';
import { DEFAULT_ASSIGNEE } from '@/lib/domain/defaults';
import type { ColorKey } from '@/lib/domain/enums';
import type { ISODate } from '@/lib/domain/types';
import { buildClosureSet, draftsFromSnapshot, evenSpread } from '@/lib/services/placement';
import { approveProgram } from '@/lib/services/programs';
import { buildTemplateSnapshot } from '@/lib/services/snapshot';

async function register(opts: {
  key: string;
  templateName: string;
  name: string;
  startDate: ISODate;
  endDate: ISODate;
  assignee: string;
  color: ColorKey;
}) {
  const db = getDb();
  const template = await db.query.programTemplates.findFirst({
    where: eq(programTemplates.name, opts.templateName),
    columns: { id: true },
  });
  if (!template) throw new Error(`template not found: ${opts.templateName}`);
  const snapshot = await buildTemplateSnapshot(db, template.id);
  if (!snapshot) throw new Error('snapshot failed');
  const closures = buildClosureSet(
    await listClosures(db, { from: opts.startDate, to: opts.endDate }),
  );
  const drafts = draftsFromSnapshot(snapshot);
  const dates = evenSpread(
    drafts.length,
    { startDate: opts.startDate, endDate: opts.endDate },
    closures,
  );

  const result = await approveProgram(db, {
    idempotencyKey: opts.key,
    templateId: template.id,
    program: {
      name: opts.name,
      startDate: opts.startDate,
      endDate: opts.endDate,
      assignee: opts.assignee,
      color: opts.color,
    },
    tasks: drafts.map((d, i) => ({
      templateItemId: d.templateItemId,
      title: d.title,
      dueDate: dates[i],
      required: d.required,
      checklist: d.checklist,
    })),
  });
  console.log(
    `  ${opts.name}: program #${result.programId}${result.reused ? ' (already registered)' : ` · ${result.taskCount} tasks`}`,
  );
}

export async function seedSamplePrograms(): Promise<void> {
  await register({
    key: '2f1c6d2a-6b8e-4f3e-9d51-0b1a8c0e0001',
    templateName: '웰다잉 프로그램',
    name: '2026 상반기 웰다잉 프로그램',
    startDate: '2026-06-02',
    endDate: '2026-07-07',
    assignee: DEFAULT_ASSIGNEE,
    color: 'rose',
  });
  await register({
    key: '2f1c6d2a-6b8e-4f3e-9d51-0b1a8c0e0002',
    templateName: '스마트폰 활용교실',
    name: '스마트폰 활용교실 2기',
    startDate: '2026-05-13',
    endDate: '2026-06-24',
    assignee: DEFAULT_ASSIGNEE,
    color: 'amber',
  });
}
