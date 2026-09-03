/**
 * Pure layout helpers for the month view: grid construction, program lane assignment,
 * and per-week segment clipping. No React, no DB.
 */
import type { ISODate } from '@/lib/domain/types';
import { addDaysISO, compareISO, toEpochDay, weekdayISO } from '@/lib/utils/dates';

/** Monday-start week containing `date`. */
export function startOfWeekISO(date: ISODate): ISODate {
  const w = weekdayISO(date); // 0 = Sunday
  return addDaysISO(date, -((w + 6) % 7));
}

export function startOfMonthISO(date: ISODate): ISODate {
  return `${date.slice(0, 7)}-01`;
}

export function endOfMonthISO(date: ISODate): ISODate {
  const [y, m] = date.split('-').map(Number);
  const first = new Date(Date.UTC(y, m, 1)); // first of next month
  return addDaysISO(`${first.getUTCFullYear()}-${String(first.getUTCMonth() + 1).padStart(2, '0')}-01`, -1);
}

export function addMonthsISO(date: ISODate, months: number): ISODate {
  const [y, m, d] = date.split('-').map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const ty = target.getUTCFullYear();
  const tm = target.getUTCMonth() + 1;
  const last = Number(endOfMonthISO(`${ty}-${String(tm).padStart(2, '0')}-01`).slice(8, 10));
  return `${ty}-${String(tm).padStart(2, '0')}-${String(Math.min(d, last)).padStart(2, '0')}`;
}

/** Weeks (Mon..Sun) covering the month of `date`. 5 or 6 rows. */
export function monthGrid(date: ISODate): ISODate[][] {
  const start = startOfWeekISO(startOfMonthISO(date));
  const monthEnd = endOfMonthISO(date);
  const weeks: ISODate[][] = [];
  let cur = start;
  while (compareISO(cur, monthEnd) <= 0) {
    const week: ISODate[] = [];
    for (let i = 0; i < 7; i += 1) {
      week.push(cur);
      cur = addDaysISO(cur, 1);
    }
    weeks.push(week);
  }
  return weeks;
}

export interface Span {
  id: number;
  from: ISODate;
  to: ISODate;
}

/**
 * Greedy first-fit lane assignment over the whole visible grid so a program keeps
 * its row across weeks. Sorted by start, then longer first, then id.
 */
export function assignLanes(spans: ReadonlyArray<Span>): Map<number, number> {
  const sorted = [...spans].sort(
    (a, b) =>
      compareISO(a.from, b.from) ||
      toEpochDay(b.to) - toEpochDay(b.from) - (toEpochDay(a.to) - toEpochDay(a.from)) ||
      a.id - b.id,
  );
  const laneEnds: ISODate[] = [];
  const out = new Map<number, number>();
  for (const s of sorted) {
    let lane = laneEnds.findIndex((end) => compareISO(end, s.from) < 0);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(s.to);
    } else {
      laneEnds[lane] = s.to;
    }
    out.set(s.id, lane);
  }
  return out;
}

export interface Segment {
  /** 0-based column indexes, inclusive */
  colStart: number;
  colEnd: number;
  roundedLeft: boolean;
  roundedRight: boolean;
}

/** Clip a span to a week row (7 days starting Monday). Returns null when they do not overlap. */
export function weekSegment(span: Pick<Span, 'from' | 'to'>, week: ReadonlyArray<ISODate>): Segment | null {
  const weekStart = week[0];
  const weekEnd = week[week.length - 1];
  if (compareISO(span.to, weekStart) < 0 || compareISO(span.from, weekEnd) > 0) return null;
  const from = compareISO(span.from, weekStart) < 0 ? weekStart : span.from;
  const to = compareISO(span.to, weekEnd) > 0 ? weekEnd : span.to;
  return {
    colStart: toEpochDay(from) - toEpochDay(weekStart),
    colEnd: toEpochDay(to) - toEpochDay(weekStart),
    roundedLeft: span.from === from,
    roundedRight: span.to === to,
  };
}

/** How many chips fit in a day cell of `rowHeight` px. */
export function chipCapacity(rowHeight: number, opts: { dayNumber?: number; laneArea?: number; padding?: number; chip?: number } = {}) {
  const dayNumber = opts.dayNumber ?? 22;
  const laneArea = opts.laneArea ?? 30;
  const padding = opts.padding ?? 10;
  const chip = opts.chip ?? 25; // 22px chip + 3px gap
  return Math.max(1, Math.floor((rowHeight - dayNumber - laneArea - padding) / chip));
}

/** The 7 days (Mon..Sun) of the week containing `date`. */
export function weekOf(date: ISODate): ISODate[] {
  const start = startOfWeekISO(date);
  return Array.from({ length: 7 }, (_, i) => addDaysISO(start, i));
}

export interface TimelineWindow {
  from: ISODate;
  to: ISODate;
  /** first day of each week column */
  weekStarts: ISODate[];
  days: number;
}

/** 8-week window: two weeks before the week of `date`, six after. */
export function timelineWindow(date: ISODate, weeks = 8, before = 2): TimelineWindow {
  const from = addDaysISO(startOfWeekISO(date), -7 * before);
  const days = weeks * 7;
  return {
    from,
    to: addDaysISO(from, days - 1),
    weekStarts: Array.from({ length: weeks }, (_, i) => addDaysISO(from, i * 7)),
    days,
  };
}

/** Percent offset of `date` (start of day) inside the window, clamped to [0, 100]. */
export function percentInWindow(date: ISODate, win: TimelineWindow, opts: { center?: boolean } = {}): number {
  const d = toEpochDay(date) - toEpochDay(win.from) + (opts.center ? 0.5 : 0);
  return Math.min(100, Math.max(0, (d / win.days) * 100));
}
