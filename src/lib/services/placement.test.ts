import { describe, expect, it } from 'vitest';
import type { TemplateSnapshot } from '@/lib/domain/types';
import { KR_HOLIDAYS_2026 } from './holidays';
import { buildClosureSet, dateWarning, draftsFromSnapshot, evenSpread, nearestBusinessDay } from './placement';

const closures = buildClosureSet(KR_HOLIDAYS_2026);
const period = { startDate: '2026-06-02', endDate: '2026-07-07' };

const snapshot: TemplateSnapshot = {
  templateId: 1,
  name: '웰다잉 프로그램',
  color: 'rose',
  snapshotAt: '',
  items: [
    { id: 3, actionItemId: 30, title: '셋째', categoryId: 1, categoryName: '기획', required: true, checklist: [], sortOrder: 2 },
    { id: 1, actionItemId: 10, title: '첫째', categoryId: 1, categoryName: '기획', required: true, checklist: ['a'], sortOrder: 0 },
    { id: 2, actionItemId: 20, title: '둘째', categoryId: 2, categoryName: '행정', required: false, checklist: [], sortOrder: 1 },
  ],
};

describe('draftsFromSnapshot', () => {
  it('returns unplaced drafts in sort order with stable keys', () => {
    const drafts = draftsFromSnapshot(snapshot);
    expect(drafts.map((d) => d.title)).toEqual(['첫째', '둘째', '셋째']);
    expect(drafts.map((d) => d.key)).toEqual(['item:1', 'item:2', 'item:3']);
    expect(drafts.every((d) => d.dueDate === null)).toBe(true);
    expect(drafts[0].checklist).toEqual(['a']);
    expect(drafts[1].required).toBe(false);
  });
});

describe('dateWarning', () => {
  it('flags out-of-range, closure, weekend, in that priority', () => {
    expect(dateWarning('2026-05-30', period, closures)).toBe('OUT_OF_RANGE');
    expect(dateWarning('2026-06-03', period, closures)).toBe('CLOSURE');
    expect(dateWarning('2026-06-06', period, closures)).toBe('CLOSURE'); // 현충일 on a Saturday
    expect(dateWarning('2026-06-07', period, closures)).toBe('WEEKEND');
    expect(dateWarning('2026-06-09', period, closures)).toBeNull();
  });
});

describe('nearestBusinessDay / evenSpread', () => {
  it('snaps backward, not before the floor, else forward', () => {
    expect(nearestBusinessDay('2026-06-06', closures, '2026-06-01')).toBe('2026-06-05');
    expect(nearestBusinessDay('2026-06-03', closures, '2026-06-01')).toBe('2026-06-02');
    // floor is a holiday: 6/3 cannot go back past itself, so it moves forward to 6/4
    expect(nearestBusinessDay('2026-06-03', closures, '2026-06-03')).toBe('2026-06-04');
  });

  it('spreads N slots from start to end on business days', () => {
    const dates = evenSpread(3, period, closures);
    expect(dates[0]).toBe('2026-06-02');
    expect(dates[2]).toBe('2026-07-07');
    expect(dates[1]).toBe('2026-06-19'); // 6/19 (Fri); mid-point 6/19.5 -> 6/20 Sat -> back to Fri
    expect(evenSpread(1, period, closures)).toEqual(['2026-06-02']);
    expect(evenSpread(0, period, closures)).toEqual([]);
  });
});
