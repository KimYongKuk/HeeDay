import { describe, expect, it } from 'vitest';
import {
  addDaysISO,
  diffDaysISO,
  formatMonthDayKo,
  isISODate,
  isWeekend,
  todayInSeoul,
  weekdayISO,
} from './dates';

describe('dates', () => {
  it('validates ISO dates', () => {
    expect(isISODate('2026-06-02')).toBe(true);
    expect(isISODate('2026-02-30')).toBe(false);
    expect(isISODate('2026-6-2')).toBe(false);
  });

  it('adds days across month and year boundaries', () => {
    expect(addDaysISO('2026-06-02', -21)).toBe('2026-05-12');
    expect(addDaysISO('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDaysISO('2027-01-04', -3)).toBe('2027-01-01');
  });

  it('computes weekday without host time zone influence', () => {
    expect(weekdayISO('2026-06-01')).toBe(1); // Monday
    expect(weekdayISO('2026-06-07')).toBe(0); // Sunday
    expect(isWeekend('2026-05-23')).toBe(true);
    expect(isWeekend('2026-05-22')).toBe(false);
  });

  it('diffs days', () => {
    expect(diffDaysISO('2026-06-02', '2026-07-07')).toBe(35);
  });

  it('formats Korean month/day', () => {
    expect(formatMonthDayKo('2026-06-02')).toBe('6월 2일 (화)');
  });

  it('computes Seoul date from a UTC instant', () => {
    // 2026-06-09 16:00 UTC is 2026-06-10 01:00 KST
    expect(todayInSeoul(new Date('2026-06-09T16:00:00Z'))).toBe('2026-06-10');
  });
});
