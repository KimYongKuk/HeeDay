import { asc, eq, inArray, sql } from 'drizzle-orm';
import type { Db, Tx } from '@/lib/db/client';
import { actionItems, categories, programTemplates, programs, templateItems } from '@/lib/db/schema';
import type { TemplateDetailDto, TemplateItemDto, TemplateListDto } from '@/lib/domain/dto';
import type { TemplateInput, TemplateItemInput } from '@/lib/domain/zod';

// Correlated subqueries must qualify the outer column explicitly: drizzle drops table
// qualifiers when the outer query has a single table, which would make `id` resolve
// to the inner table's id.
const itemCountSql = sql<number>`(select count(*) from ${templateItems} ti where ti.template_id = ${programTemplates}.id)`;
const programCountSql = sql<number>`(select count(*) from ${programs} pr where pr.template_id = ${programTemplates}.id)`;

export async function listTemplates(db: Db): Promise<TemplateListDto[]> {
  const rows = await db
    .select({
      id: programTemplates.id,
      name: programTemplates.name,
      color: programTemplates.color,
      description: programTemplates.description,
      defaultAssignee: programTemplates.defaultAssignee,
      updatedAt: programTemplates.updatedAt,
      itemCount: itemCountSql,
      programCount: programCountSql,
    })
    .from(programTemplates)
    .orderBy(asc(programTemplates.name));
  return rows.map((r) => ({
    ...r,
    itemCount: Number(r.itemCount),
    programCount: Number(r.programCount),
    updatedAt: new Date(r.updatedAt).toISOString(),
  }));
}

export async function listTemplateItems(db: Db | Tx, templateId: number): Promise<TemplateItemDto[]> {
  const rows = await db
    .select({
      id: templateItems.id,
      actionItemId: templateItems.actionItemId,
      actionItemName: actionItems.name,
      categoryId: actionItems.categoryId,
      categoryName: categories.name,
      categoryColor: categories.color,
      defaultChecklist: actionItems.defaultChecklist,
      required: templateItems.required,
      checklistOverride: templateItems.checklistOverride,
      sortOrder: templateItems.sortOrder,
    })
    .from(templateItems)
    .innerJoin(actionItems, eq(actionItems.id, templateItems.actionItemId))
    .innerJoin(categories, eq(categories.id, actionItems.categoryId))
    .where(eq(templateItems.templateId, templateId))
    .orderBy(asc(templateItems.sortOrder), asc(templateItems.id));
  return rows.map((r) => ({
    ...r,
    defaultChecklist: r.defaultChecklist ?? [],
    checklistOverride: r.checklistOverride ?? null,
    required: Boolean(r.required),
  }));
}

export async function getTemplate(db: Db | Tx, id: number): Promise<TemplateDetailDto | null> {
  const [row] = await db
    .select({
      id: programTemplates.id,
      name: programTemplates.name,
      color: programTemplates.color,
      description: programTemplates.description,
      defaultAssignee: programTemplates.defaultAssignee,
      updatedAt: programTemplates.updatedAt,
      programCount: programCountSql,
    })
    .from(programTemplates)
    .where(eq(programTemplates.id, id))
    .limit(1);
  if (!row) return null;
  const items = await listTemplateItems(db, id);
  return {
    ...row,
    programCount: Number(row.programCount),
    updatedAt: new Date(row.updatedAt).toISOString(),
    items,
  };
}

function toInsertRow(templateId: number, it: TemplateItemInput, index: number) {
  return {
    templateId,
    actionItemId: it.actionItemId,
    required: it.required,
    checklistOverride: it.checklistOverride ?? null,
    sortOrder: it.sortOrder ?? index,
  };
}

export async function createTemplate(
  db: Db,
  input: Omit<TemplateInput, 'items'> & { items?: TemplateItemInput[] },
): Promise<number> {
  return db.transaction(async (tx) => {
    const [res] = await tx.insert(programTemplates).values({
      name: input.name,
      color: input.color,
      description: input.description ?? null,
      defaultAssignee: input.defaultAssignee ?? null,
    });
    const templateId = res.insertId;
    if (input.items && input.items.length > 0) {
      await tx.insert(templateItems).values(input.items.map((it, i) => toInsertRow(templateId, it, i)));
    }
    return templateId;
  });
}

/** Full replace: meta + items. Items with a known id are updated, others inserted, missing ones deleted. */
export async function saveTemplate(db: Db, id: number, input: TemplateInput): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [res] = await tx
      .update(programTemplates)
      .set({
        name: input.name,
        color: input.color,
        description: input.description ?? null,
        defaultAssignee: input.defaultAssignee ?? null,
      })
      .where(eq(programTemplates.id, id));
    if (res.affectedRows === 0) return false;

    const existing = await tx.select({ id: templateItems.id }).from(templateItems).where(eq(templateItems.templateId, id));
    const existingIds = new Set(existing.map((r) => r.id));
    const keepIds = new Set(input.items.map((it) => it.id).filter((v): v is number => typeof v === 'number'));

    const toDelete = [...existingIds].filter((eid) => !keepIds.has(eid));
    if (toDelete.length > 0) await tx.delete(templateItems).where(inArray(templateItems.id, toDelete));

    const inserts: ReturnType<typeof toInsertRow>[] = [];
    for (const [index, it] of input.items.entries()) {
      if (it.id !== undefined && existingIds.has(it.id)) {
        await tx
          .update(templateItems)
          .set({
            actionItemId: it.actionItemId,
            required: it.required,
            checklistOverride: it.checklistOverride ?? null,
            sortOrder: it.sortOrder ?? index,
          })
          .where(eq(templateItems.id, it.id));
      } else {
        inserts.push(toInsertRow(id, it, index));
      }
    }
    if (inserts.length > 0) await tx.insert(templateItems).values(inserts);
    return true;
  });
}

export async function duplicateTemplate(db: Db, id: number): Promise<number | null> {
  const source = await getTemplate(db, id);
  if (!source) return null;
  return createTemplate(db, {
    name: `${source.name} (복사본)`,
    color: source.color,
    description: source.description,
    defaultAssignee: source.defaultAssignee,
    items: source.items.map((it, i) => ({
      actionItemId: it.actionItemId,
      required: it.required,
      checklistOverride: it.checklistOverride,
      sortOrder: i,
    })),
  });
}

export async function deleteTemplate(db: Db, id: number): Promise<boolean> {
  return db.transaction(async (tx) => {
    await tx.delete(templateItems).where(eq(templateItems.templateId, id));
    await tx.update(programs).set({ templateId: null }).where(eq(programs.templateId, id));
    const [res] = await tx.delete(programTemplates).where(eq(programTemplates.id, id));
    return res.affectedRows > 0;
  });
}
