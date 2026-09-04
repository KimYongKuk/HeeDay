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

/**
 * A task being placed in the wizard. `dueDate` is null until the user picks a date.
 * A task may occur several times in one program (회차): each extra occurrence is its own draft
 * whose key is `${baseKey}#${uuid}` and whose `session` is numbered by date order.
 */
export interface TaskDraft {
  /** `item:${templateItemId}` | `adhoc:${uuid}`, optionally followed by `#${uuid}` for a 회차 */
  key: string;
  /** Key of the draft this one was cloned from (itself for a base draft). */
  baseKey: string;
  /** 1-based 회차 number when the task occurs more than once; null otherwise. */
  session: number | null;
  templateItemId: number | null;
  /** Base title without the 회차 suffix; see `draftTitle()`. */
  title: string;
  categoryId: number | null;
  categoryName: string | null;
  dueDate: ISODate | null;
  required: boolean;
  checklist: string[];
}

export type DateWarning = 'WEEKEND' | 'CLOSURE' | 'OUT_OF_RANGE';
