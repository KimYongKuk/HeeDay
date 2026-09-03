import type { ColorKey } from './enums';

/** 'YYYY-MM-DD' */
export type ISODate = string;

export interface ChecklistItem {
  text: string;
  checked: boolean;
}

/** One template item frozen at approval time. Order is the only scheduling hint. */
export interface TemplateItemSnapshot {
  /** template_items.id at snapshot time */
  id: number;
  actionItemId: number;
  title: string;
  categoryId: number | null;
  categoryName: string | null;
  required: boolean;
  checklist: string[];
  sortOrder: number;
}

export interface TemplateSnapshot {
  templateId: number;
  name: string;
  color: ColorKey;
  items: TemplateItemSnapshot[];
  /** ISO timestamp */
  snapshotAt: string;
}

/** A task being placed in the wizard. `dueDate` is null until the user picks a date. */
export interface TaskDraft {
  /** `item:${templateItemId}` | `adhoc:${uuid}` */
  key: string;
  templateItemId: number | null;
  title: string;
  categoryId: number | null;
  categoryName: string | null;
  dueDate: ISODate | null;
  required: boolean;
  checklist: string[];
}

export type DateWarning = 'WEEKEND' | 'CLOSURE' | 'OUT_OF_RANGE';
