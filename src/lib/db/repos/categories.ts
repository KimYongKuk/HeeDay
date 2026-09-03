import { asc, eq, sql } from 'drizzle-orm';
import type { Db } from '@/lib/db/client';
import { actionItems, categories } from '@/lib/db/schema';
import { TAG_COLOR_KEYS } from '@/lib/domain/colors';
import type { CategoryDto } from '@/lib/domain/dto';

// Qualify the outer column explicitly (see repos/templates.ts).
const itemCountSql = sql<number>`(select count(*) from ${actionItems} ai where ai.category_id = ${categories}.id)`;

export async function listCategories(db: Db): Promise<CategoryDto[]> {
  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      color: categories.color,
      sortOrder: categories.sortOrder,
      itemCount: itemCountSql,
    })
    .from(categories)
    .orderBy(asc(categories.sortOrder), asc(categories.id));
  return rows.map((r) => ({ ...r, itemCount: Number(r.itemCount) }));
}

export async function createCategory(db: Db, name: string, color?: string): Promise<number> {
  const [agg] = await db
    .select({ count: sql<number>`count(*)`, maxOrder: sql<number>`coalesce(max(${categories.sortOrder}), 0)` })
    .from(categories);
  const count = Number(agg?.count ?? 0);
  const [res] = await db.insert(categories).values({
    name,
    color: color ?? TAG_COLOR_KEYS[count % TAG_COLOR_KEYS.length],
    sortOrder: Number(agg?.maxOrder ?? 0) + 1,
  });
  return res.insertId;
}

export async function renameCategory(db: Db, id: number, name: string): Promise<boolean> {
  const [res] = await db.update(categories).set({ name }).where(eq(categories.id, id));
  return res.affectedRows > 0;
}

export async function countCategoryItems(db: Db, id: number): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(actionItems)
    .where(eq(actionItems.categoryId, id));
  return Number(row?.count ?? 0);
}

export async function deleteCategory(db: Db, id: number): Promise<boolean> {
  const [res] = await db.delete(categories).where(eq(categories.id, id));
  return res.affectedRows > 0;
}
