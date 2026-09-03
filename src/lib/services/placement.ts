/**
 * Placement helpers for the registration wizard. Pure functions only.
 *
 * The product rule: a template is an ordered list of tasks with no dates. When a program is
 * registered the user places each task on a date inside the program period. These helpers
 * build the unplaced drafts, flag questionable dates, and offer an optional even spread.
 */
import type { DateWarning, ISODate, TaskDraft, TemplateSnapshot } from '@/lib/domain/types';
import { addDaysISO, compareISO, isWeekend, toEpochDay } from '@/lib/utils/dates';

export function buildClosureSet(rows: ReadonlyArray<{ date: ISODate }>): ReadonlySet<ISODate> {
  return new Set(rows.map((r) => r.date));
}

export function isBusinessDay(date: ISODate, closures: ReadonlySet<ISODate>): boolean {
  return !isWeekend(date) && !closures.has(date);
}

export function itemKey(templateItemId: number): string {
  return `item:${templateItemId}`;
}

/** Unplaced drafts in template order. */
export function draftsFromSnapshot(snapshot: TemplateSnapshot): TaskDraft[] {
  return [...snapshot.items]
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
    .map((it) => ({
      key: itemKey(it.id),
      templateItemId: it.id,
      title: it.title,
      categoryId: it.categoryId,
      categoryName: it.categoryName,
      dueDate: null,
      required: it.required,
      checklist: [...it.checklist],
    }));
}

/** Why a chosen date deserves a second look. Never blocks; the user decides. */
export function dateWarning(
  date: ISODate,
  period: { startDate: ISODate; endDate: ISODate },
  closures: ReadonlySet<ISODate>,
): DateWarning | null {
  if (compareISO(date, period.startDate) < 0 || compareISO(date, period.endDate) > 0) return 'OUT_OF_RANGE';
  if (closures.has(date)) return 'CLOSURE';
  if (isWeekend(date)) return 'WEEKEND';
  return null;
}

/** Nearest business day at or before `date`, bounded by `floor`; falls forward if nothing fits. */
export function nearestBusinessDay(date: ISODate, closures: ReadonlySet<ISODate>, floor: ISODate): ISODate {
  let cur = date;
  for (let i = 0; i < 14; i += 1) {
    if (isBusinessDay(cur, closures)) return cur;
    if (compareISO(cur, floor) <= 0) break;
    cur = addDaysISO(cur, -1);
  }
  cur = date;
  for (let i = 0; i < 14; i += 1) {
    if (isBusinessDay(cur, closures)) return cur;
    cur = addDaysISO(cur, 1);
  }
  return date;
}

/**
 * Optional helper: spread `count` slots evenly across the period, snapped to business days.
 * Returns dates in order; the caller assigns them to unplaced drafts.
 */
export function evenSpread(
  count: number,
  period: { startDate: ISODate; endDate: ISODate },
  closures: ReadonlySet<ISODate>,
): ISODate[] {
  if (count <= 0) return [];
  const span = toEpochDay(period.endDate) - toEpochDay(period.startDate);
  const out: ISODate[] = [];
  for (let i = 0; i < count; i += 1) {
    const offset = count === 1 ? 0 : Math.round((i * span) / (count - 1));
    out.push(nearestBusinessDay(addDaysISO(period.startDate, offset), closures, period.startDate));
  }
  return out;
}

export function sortDrafts(a: TaskDraft, b: TaskDraft): number {
  if (a.dueDate === null && b.dueDate === null) return 0;
  if (a.dueDate === null) return 1;
  if (b.dueDate === null) return -1;
  return compareISO(a.dueDate, b.dueDate);
}
