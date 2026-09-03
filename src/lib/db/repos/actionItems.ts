import { asc, eq, sql } from 'drizzle-orm';
import type { Db } from '@/lib/db/client';
import { actionItems, categories, programTemplates, templateItems } from '@/lib/db/schema';
import type { ActionItemDetailDto, ActionItemDto } from '@/lib/domain/dto';
import type { ActionItemInput } from '@/lib/domain/zod';

// Qualify the outer column explicitly (see repos/templates.ts).
const usageCountSql = sql<number>`(select count(*) from ${templateItems} ti where ti.action_item_id = ${actionItems}.id)`;

const selection = {
  id: actionItems.id,
  name: actionItems.name,
  categoryId: actionItems.categoryId,
  categoryName: categories.name,
  categoryColor: categories.color,
  description: actionItems.description,
  defaultChecklist: actionItems.defaultChecklist,
  updatedAt: actionItems.updatedAt,
  usageCount: usageCountSql,
};

type Row = {
  id: number;
  name: string;
  categoryId: number;
  categoryName: string;
  categoryColor: string;
  description: string | null;
  defaultChecklist: string[];
  updatedAt: Date | string;
  usageCount: number | string;
};

function toDto(row: Row): ActionItemDto {
  return {
    id: row.id,
    name: row.name,
    categoryId: row.categoryId,
    categoryName: row.categoryName,
    categoryColor: row.categoryColor,
    description: row.description,
    defaultChecklist: row.defaultChecklist ?? [],
    usageCount: Number(row.usageCount),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

export async function listActionItems(db: Db, filter?: { categoryId?: number }): Promise<ActionItemDto[]> {
  const rows = await db
    .select(selection)
    .from(actionItems)
    .innerJoin(categories, eq(categories.id, actionItems.categoryId))
    .where(filter?.categoryId ? eq(actionItems.categoryId, filter.categoryId) : undefined)
    .orderBy(asc(categories.sortOrder), asc(actionItems.name));
  return rows.map(toDto);
}

export async function getActionItem(db: Db, id: number): Promise<ActionItemDetailDto | null> {
  const [row] = await db
    .select(selection)
    .from(actionItems)
    .innerJoin(categories, eq(categories.id, actionItems.categoryId))
    .where(eq(actionItems.id, id))
    .limit(1);
  if (!row) return null;

  const usedBy = await db
    .selectDistinct({
      templateId: programTemplates.id,
      templateName: programTemplates.name,
      color: programTemplates.color,
    })
    .from(templateItems)
    .innerJoin(programTemplates, eq(programTemplates.id, templateItems.templateId))
    .where(eq(templateItems.actionItemId, id))
    .orderBy(asc(programTemplates.name));

  return { ...toDto(row), usedBy };
}

export async function createActionItem(db: Db, input: ActionItemInput): Promise<number> {
  const [res] = await db.insert(actionItems).values({
    name: input.name,
    categoryId: input.categoryId,
    description: input.description ?? null,
    defaultChecklist: input.defaultChecklist,
  });
  return res.insertId;
}

export async function updateActionItem(db: Db, id: number, input: Partial<ActionItemInput>): Promise<boolean> {
  const set: Partial<typeof actionItems.$inferInsert> = {};
  if (input.name !== undefined) set.name = input.name;
  if (input.categoryId !== undefined) set.categoryId = input.categoryId;
  if (input.description !== undefined) set.description = input.description ?? null;
  if (input.defaultChecklist !== undefined) set.defaultChecklist = input.defaultChecklist;
  if (Object.keys(set).length === 0) return true;
  const [res] = await db.update(actionItems).set(set).where(eq(actionItems.id, id));
  return res.affectedRows > 0;
}

export async function countActionItemUsage(db: Db, id: number): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(templateItems)
    .where(eq(templateItems.actionItemId, id));
  return Number(row?.count ?? 0);
}

export async function deleteActionItem(db: Db, id: number): Promise<boolean> {
  const [res] = await db.delete(actionItems).where(eq(actionItems.id, id));
  return res.affectedRows > 0;
}
