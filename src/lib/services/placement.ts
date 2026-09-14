/**
 * Placement helpers for the registration wizard. Pure functions only.
 *
 * The product rule: a template is an ordered list of tasks with no dates. When a program is
 * registered the user places each task on a date inside the program period. These helpers
 * build the unplaced drafts, flag questionable dates, and offer an optional even spread.
 */
import type { DateWarning, ISODate, TaskDraft, TemplateSnapshot } from '@/lib/domain/types';
import { WEEKDAY_LABEL } from '@/lib/domain/labels';
import { addDaysISO, compareISO, isWeekend, toEpochDay, weekdayISO } from '@/lib/utils/dates';

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
      baseKey: itemKey(it.id),
      session: null,
      templateItemId: it.id,
      title: it.title,
      categoryId: it.categoryId,
      categoryName: it.categoryName,
      dueDate: null,
      required: it.required,
      important: false,
      checklist: [...it.checklist],
    }));
}

/** Key for an additional 회차 of `baseKey`. */
export function occurrenceKey(baseKey: string, id: string): string {
  return `${baseKey}#${id}`;
}

/** `item:3#abc` -> `item:3`; a base key maps to itself. */
export function baseKeyOf(key: string): string {
  const i = key.indexOf('#');
  return i === -1 ? key : key.slice(0, i);
}

/** Display title: the base title plus a 회차 suffix when the task occurs more than once. */
export function draftTitle(d: Pick<TaskDraft, 'title' | 'session'>): string {
  return d.session === null ? d.title : `${d.title} ${d.session}회차`;
}

/** A task the user typed into the wizard by hand. */
export interface ExtraDraftInput {
  key: string;
  title: string;
  checklist: string[];
}

export interface WizardDraftInput {
  snapshot: TemplateSnapshot;
  /** template item keys the user excluded */
  removed: ReadonlyArray<string>;
  extras: ReadonlyArray<ExtraDraftInput>;
  /** base key -> keys of the additional 회차 the user added, in creation order */
  occurrences: Readonly<Record<string, ReadonlyArray<string>>>;
  /** draft key -> chosen date */
  placements: Readonly<Record<string, ISODate>>;
  /** draft keys the user starred as 중요 */
  important?: ReadonlyArray<string>;
}

/**
 * Every draft the wizard will register: template items (minus excluded ones) and hand-added
 * extras, each expanded into its 회차. When a task occurs more than once its drafts are
 * numbered 1..n by date, unplaced ones last in creation order, and titled `${title} n회차`.
 * The result keeps template order between tasks and 회차 order within a task.
 */
export function buildWizardDrafts(input: WizardDraftInput): TaskDraft[] {
  const removed = new Set(input.removed);
  const bases: TaskDraft[] = [
    ...draftsFromSnapshot(input.snapshot).filter((d) => !removed.has(d.key)),
    ...input.extras.map((e): TaskDraft => ({
      key: e.key,
      baseKey: e.key,
      session: null,
      templateItemId: null,
      title: e.title,
      categoryId: null,
      categoryName: null,
      dueDate: null,
      required: true,
      important: false,
      checklist: e.checklist,
    })),
  ];

  // A draft persisted before 회차 existed rehydrates without `occurrences`.
  const occurrences = input.occurrences ?? {};
  const important = new Set(input.important ?? []);
  const out: TaskDraft[] = [];
  for (const base of bases) {
    const keys = [base.key, ...(occurrences[base.key] ?? [])];
    const group = keys.map((key): TaskDraft => ({
      ...base,
      key,
      dueDate: input.placements[key] ?? null,
      important: important.has(key),
    }));
    if (group.length === 1) {
      out.push(...group);
      continue;
    }
    // Number by date so the earliest occurrence is 1회차, and list them in that order.
    const ordered = group
      .map((d, i) => ({ d, i }))
      .sort((a, b) => sortDrafts(a.d, b.d) || a.i - b.i)
      .map(({ d }, n) => ({ ...d, session: n + 1 }));
    out.push(...ordered);
  }
  return out;
}

/** Why a chosen date deserves a second look. Never blocks; the user decides. */
export function dateWarning(
  date: ISODate,
  period: { startDate: ISODate; endDate: ISODate },
  closures: ReadonlySet<ISODate>,
): DateWarning | null {
  if (compareISO(date, period.startDate) < 0 || compareISO(date, period.endDate) > 0)
    return 'OUT_OF_RANGE';
  if (closures.has(date)) return 'CLOSURE';
  if (isWeekend(date)) return 'WEEKEND';
  return null;
}

/** Nearest business day at or before `date`, bounded by `floor`; falls forward if nothing fits. */
export function nearestBusinessDay(
  date: ISODate,
  closures: ReadonlySet<ISODate>,
  floor: ISODate,
): ISODate {
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

/** How a placed task repeats inside the program period. Expanded once into 회차; never stored. */
export type RepeatRule = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY_DATE' | 'MONTHLY_WEEKDAY';

export const REPEAT_RULES: ReadonlyArray<RepeatRule> = [
  'WEEKLY',
  'BIWEEKLY',
  'MONTHLY_DATE',
  'MONTHLY_WEEKDAY',
];

/** Hard cap on the 회차 one repeat can add, so a long period never floods the wizard. */
export const REPEAT_CAP = 60;

const ORDINAL_LABEL = ['첫째', '둘째', '셋째', '넷째', '다섯째'];

function nthWeekdayOfMonth(date: ISODate): number {
  return Math.ceil(Number(date.slice(8, 10)) / 7);
}

function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** `YYYY-MM-DD` for the nth (1-based) `weekday` of the month; null when the month has no such day. */
function nthWeekdayISO(y: number, m: number, weekday: number, n: number): ISODate | null {
  const first = weekdayISO(`${y}-${String(m).padStart(2, '0')}-01`);
  const day = 1 + ((weekday - first + 7) % 7) + (n - 1) * 7;
  if (day > daysInMonth(y, m)) return null;
  return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** "매주 수요일", "2주마다 수요일", "매월 15일", "매월 둘째 수요일" */
export function repeatLabel(from: ISODate, rule: RepeatRule): string {
  const w = WEEKDAY_LABEL[weekdayISO(from)];
  switch (rule) {
    case 'WEEKLY':
      return `매주 ${w}요일`;
    case 'BIWEEKLY':
      return `2주마다 ${w}요일`;
    case 'MONTHLY_DATE':
      return `매월 ${Number(from.slice(8, 10))}일`;
    case 'MONTHLY_WEEKDAY':
      return `매월 ${ORDINAL_LABEL[nthWeekdayOfMonth(from) - 1]} ${w}요일`;
  }
}

/**
 * Dates after `from` that follow `rule`, never past the period end and at most `limit` of them
 * (capped at REPEAT_CAP). Monthly rules skip months that lack the day (31일, 다섯째 주).
 * `from` itself is not included; the caller already has that 회차.
 */
export function repeatDates(
  from: ISODate,
  rule: RepeatRule,
  period: { endDate: ISODate },
  limit: number = REPEAT_CAP,
): ISODate[] {
  const max = Math.max(0, Math.min(limit, REPEAT_CAP));
  const out: ISODate[] = [];
  if (max === 0 || compareISO(from, period.endDate) >= 0) return out;

  if (rule === 'WEEKLY' || rule === 'BIWEEKLY') {
    const step = rule === 'WEEKLY' ? 7 : 14;
    let cur = addDaysISO(from, step);
    while (compareISO(cur, period.endDate) <= 0 && out.length < max) {
      out.push(cur);
      cur = addDaysISO(cur, step);
    }
    return out;
  }

  const [y0, m0, d0] = from.split('-').map(Number);
  const weekday = weekdayISO(from);
  const nth = nthWeekdayOfMonth(from);
  // Walk month by month; stop once the first of a month is already past the period.
  for (let i = 1; out.length < max; i += 1) {
    const total = m0 - 1 + i;
    const y = y0 + Math.floor(total / 12);
    const m = (total % 12) + 1;
    const first = `${y}-${String(m).padStart(2, '0')}-01`;
    if (compareISO(first, period.endDate) > 0) break;
    const next =
      rule === 'MONTHLY_DATE'
        ? d0 <= daysInMonth(y, m)
          ? `${y}-${String(m).padStart(2, '0')}-${String(d0).padStart(2, '0')}`
          : null
        : nthWeekdayISO(y, m, weekday, nth);
    if (next === null) continue;
    if (compareISO(next, period.endDate) > 0) break;
    out.push(next);
  }
  return out;
}
