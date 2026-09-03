import type { ISODate } from '@/lib/domain/types';
import { WEEKDAY_LABEL } from '@/lib/domain/labels';

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

export function isISODate(value: unknown): value is ISODate {
  if (typeof value !== 'string') return false;
  const m = ISO_RE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const t = Date.UTC(y, mo - 1, d);
  const dt = new Date(t);
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

export function assertISODate(value: string): ISODate {
  if (!isISODate(value)) throw new Error(`Invalid ISO date: ${value}`);
  return value;
}

/** Days since 1970-01-01 (UTC). Host time zone never matters. */
export function toEpochDay(date: ISODate): number {
  const m = ISO_RE.exec(date);
  if (!m) throw new Error(`Invalid ISO date: ${date}`);
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / MS_PER_DAY;
}

export function fromEpochDay(day: number): ISODate {
  const dt = new Date(day * MS_PER_DAY);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dt.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDaysISO(date: ISODate, days: number): ISODate {
  return fromEpochDay(toEpochDay(date) + days);
}

/** 0 = Sunday … 6 = Saturday */
export function weekdayISO(date: ISODate): number {
  return new Date(toEpochDay(date) * MS_PER_DAY).getUTCDay();
}

/** b - a in days */
export function diffDaysISO(a: ISODate, b: ISODate): number {
  return toEpochDay(b) - toEpochDay(a);
}

export function compareISO(a: ISODate, b: ISODate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function isWeekend(date: ISODate): boolean {
  const w = weekdayISO(date);
  return w === 0 || w === 6;
}

/** Today's calendar date in Asia/Seoul regardless of server time zone. */
export function todayInSeoul(now: Date = new Date()): ISODate {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** "6월 2일 (화)" */
export function formatMonthDayKo(date: ISODate, withWeekday = true): string {
  const m = ISO_RE.exec(date);
  if (!m) return date;
  const base = `${Number(m[2])}월 ${Number(m[3])}일`;
  return withWeekday ? `${base} (${WEEKDAY_LABEL[weekdayISO(date)]})` : base;
}

/** "2026. 6. 2 (화)" */
export function formatFullKo(date: ISODate): string {
  const m = ISO_RE.exec(date);
  if (!m) return date;
  return `${m[1]}. ${Number(m[2])}. ${Number(m[3])} (${WEEKDAY_LABEL[weekdayISO(date)]})`;
}

/** "6/2" */
export function formatShort(date: ISODate): string {
  const m = ISO_RE.exec(date);
  if (!m) return date;
  return `${Number(m[2])}/${Number(m[3])}`;
}

/** Local Date (midnight) -> ISO, for react-day-picker interop. */
export function dateToISO(d: Date): ISODate {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** ISO -> local Date at midnight, for react-day-picker interop. */
export function isoToDate(date: ISODate): Date {
  const m = ISO_RE.exec(date);
  if (!m) throw new Error(`Invalid ISO date: ${date}`);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}
