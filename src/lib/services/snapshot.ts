import type { Db, Tx } from '@/lib/db/client';
import { getTemplate } from '@/lib/db/repos/templates';
import type { TemplateDetailDto } from '@/lib/domain/dto';
import type { TemplateSnapshot } from '@/lib/domain/types';

/** Pure mapping from a template detail to the immutable snapshot stored on a program. */
export function snapshotFromTemplate(t: TemplateDetailDto, now: Date = new Date()): TemplateSnapshot {
  return {
    templateId: t.id,
    name: t.name,
    color: t.color,
    snapshotAt: now.toISOString(),
    items: t.items.map((it) => ({
      id: it.id,
      actionItemId: it.actionItemId,
      title: it.actionItemName,
      categoryId: it.categoryId,
      categoryName: it.categoryName,
      required: it.required,
      checklist: it.checklistOverride ?? it.defaultChecklist,
      sortOrder: it.sortOrder,
    })),
  };
}

export async function buildTemplateSnapshot(db: Db | Tx, templateId: number): Promise<TemplateSnapshot | null> {
  const t = await getTemplate(db, templateId);
  return t ? snapshotFromTemplate(t) : null;
}
