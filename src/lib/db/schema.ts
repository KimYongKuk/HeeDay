import { sql } from 'drizzle-orm';
import {
  boolean,
  date,
  datetime,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/mysql-core';
import { CLOSURE_KINDS, COLOR_KEYS, PROGRAM_STATUSES } from '@/lib/domain/enums';
import type { ChecklistItem, TemplateSnapshot } from '@/lib/domain/types';

const timestamps = {
  createdAt: datetime('created_at', { fsp: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3)`),
  updatedAt: datetime('updated_at', { fsp: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3)`)
    .$onUpdate(() => new Date()),
};

/** User-managed tabs for the action item library (기획, 행정, …). */
export const categories = mysqlTable(
  'categories',
  {
    id: int('id').autoincrement().primaryKey(),
    name: varchar('name', { length: 40 }).notNull(),
    color: varchar('color', { length: 20 }).notNull().default('stone'),
    sortOrder: int('sort_order').notNull().default(0),
    createdAt: datetime('created_at', { fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
  },
  (t) => [uniqueIndex('uq_categories_name').on(t.name)],
);

export const actionItems = mysqlTable(
  'action_items',
  {
    id: int('id').autoincrement().primaryKey(),
    name: varchar('name', { length: 100 }).notNull(),
    categoryId: int('category_id')
      .notNull()
      .references(() => categories.id),
    description: text('description'),
    defaultChecklist: json('default_checklist').$type<string[]>().notNull(),
    ...timestamps,
  },
  (t) => [index('idx_action_items_category').on(t.categoryId), index('idx_action_items_name').on(t.name)],
);

export const programTemplates = mysqlTable('program_templates', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  color: mysqlEnum('color', COLOR_KEYS).notNull(),
  description: varchar('description', { length: 300 }),
  defaultAssignee: varchar('default_assignee', { length: 60 }),
  ...timestamps,
});

/** Ordered list of action items a template pulls in. Order is the only scheduling hint. */
export const templateItems = mysqlTable(
  'template_items',
  {
    id: int('id').autoincrement().primaryKey(),
    templateId: int('template_id')
      .notNull()
      .references(() => programTemplates.id),
    actionItemId: int('action_item_id')
      .notNull()
      .references(() => actionItems.id),
    required: boolean('required').notNull().default(true),
    checklistOverride: json('checklist_override').$type<string[]>(),
    sortOrder: int('sort_order').notNull().default(0),
  },
  (t) => [
    index('idx_template_items_template').on(t.templateId, t.sortOrder),
    index('idx_template_items_action').on(t.actionItemId),
  ],
);

export const programs = mysqlTable(
  'programs',
  {
    id: int('id').autoincrement().primaryKey(),
    name: varchar('name', { length: 120 }).notNull(),
    templateId: int('template_id'),
    templateSnapshot: json('template_snapshot').$type<TemplateSnapshot>().notNull(),
    startDate: date('start_date', { mode: 'string' }).notNull(),
    endDate: date('end_date', { mode: 'string' }).notNull(),
    assignee: varchar('assignee', { length: 60 }),
    color: mysqlEnum('color', COLOR_KEYS).notNull(),
    status: mysqlEnum('status', PROGRAM_STATUSES).notNull().default('ACTIVE'),
    idempotencyKey: varchar('idempotency_key', { length: 36 }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('uq_programs_idempotency').on(t.idempotencyKey),
    index('idx_programs_range').on(t.startDate, t.endDate),
    index('idx_programs_status').on(t.status),
  ],
);

export const tasks = mysqlTable(
  'tasks',
  {
    id: int('id').autoincrement().primaryKey(),
    programId: int('program_id')
      .notNull()
      .references(() => programs.id),
    templateItemId: int('template_item_id'),
    title: varchar('title', { length: 120 }).notNull(),
    /** Denormalized from the snapshot so a deleted category leaves history intact. */
    categoryId: int('category_id'),
    categoryName: varchar('category_name', { length: 40 }),
    dueDate: date('due_date', { mode: 'string' }).notNull(),
    required: boolean('required').notNull().default(true),
    done: boolean('done').notNull().default(false),
    doneAt: datetime('done_at', { fsp: 3 }),
    checklist: json('checklist').$type<ChecklistItem[]>().notNull(),
    notes: text('notes'),
    ...timestamps,
  },
  (t) => [
    index('idx_tasks_due').on(t.dueDate),
    index('idx_tasks_program_due').on(t.programId, t.dueDate),
    index('idx_tasks_done_due').on(t.done, t.dueDate),
  ],
);

export const closureDays = mysqlTable(
  'closure_days',
  {
    id: int('id').autoincrement().primaryKey(),
    date: date('date', { mode: 'string' }).notNull(),
    name: varchar('name', { length: 60 }).notNull(),
    kind: mysqlEnum('kind', CLOSURE_KINDS).notNull(),
    source: varchar('source', { length: 20 }).notNull().default('seed'),
    createdAt: datetime('created_at', { fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
  },
  (t) => [uniqueIndex('uq_closure_days_date').on(t.date)],
);

export type CategoryRow = typeof categories.$inferSelect;
export type ActionItemRow = typeof actionItems.$inferSelect;
export type ProgramTemplateRow = typeof programTemplates.$inferSelect;
export type TemplateItemRow = typeof templateItems.$inferSelect;
export type ProgramRow = typeof programs.$inferSelect;
export type TaskRow = typeof tasks.$inferSelect;
export type ClosureDayRow = typeof closureDays.$inferSelect;
