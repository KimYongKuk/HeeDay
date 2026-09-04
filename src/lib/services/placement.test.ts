import { describe, expect, it } from 'vitest';
import type { TemplateSnapshot } from '@/lib/domain/types';
import { KR_HOLIDAYS_2026 } from './holidays';
import {
  baseKeyOf,
  buildClosureSet,
  buildWizardDrafts,
  dateWarning,
  draftTitle,
  draftsFromSnapshot,
  evenSpread,
  nearestBusinessDay,
  occurrenceKey,
} from './placement';

const closures = buildClosureSet(KR_HOLIDAYS_2026);
const period = { startDate: '2026-06-02', endDate: '2026-07-07' };

const snapshot: TemplateSnapshot = {
  templateId: 1,
  name: '웰다잉 프로그램',
  color: 'rose',
  snapshotAt: '',
  items: [
    {
      id: 3,
      actionItemId: 30,
      title: '셋째',
      categoryId: 1,
      categoryName: '기획',
      required: true,
      checklist: [],
      sortOrder: 2,
    },
    {
      id: 1,
      actionItemId: 10,
      title: '첫째',
      categoryId: 1,
      categoryName: '기획',
      required: true,
      checklist: ['a'],
      sortOrder: 0,
    },
    {
      id: 2,
      actionItemId: 20,
      title: '둘째',
      categoryId: 2,
      categoryName: '행정',
      required: false,
      checklist: [],
      sortOrder: 1,
    },
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

describe('occurrenceKey / baseKeyOf', () => {
  it('round-trips and leaves base keys alone', () => {
    expect(baseKeyOf(occurrenceKey('item:1', 'abc'))).toBe('item:1');
    expect(baseKeyOf('item:1')).toBe('item:1');
    expect(baseKeyOf('adhoc:x-y')).toBe('adhoc:x-y');
  });
});

describe('draftTitle', () => {
  it('appends the 회차 number only when there is more than one', () => {
    expect(draftTitle({ title: '수업 진행', session: null })).toBe('수업 진행');
    expect(draftTitle({ title: '수업 진행', session: 2 })).toBe('수업 진행 2회차');
  });
});

describe('buildWizardDrafts', () => {
  const base = { snapshot, removed: [], extras: [], occurrences: {}, placements: {} };

  it('leaves single-occurrence tasks unnumbered', () => {
    const drafts = buildWizardDrafts({ ...base, placements: { 'item:1': '2026-06-02' } });
    expect(drafts.map((d) => d.session)).toEqual([null, null, null]);
    expect(drafts.map((d) => draftTitle(d))).toEqual(['첫째', '둘째', '셋째']);
  });

  it('numbers 회차 by date and keeps them next to the base draft', () => {
    const drafts = buildWizardDrafts({
      ...base,
      occurrences: { 'item:1': ['item:1#a', 'item:1#b'] },
      placements: { 'item:1': '2026-06-20', 'item:1#a': '2026-06-05', 'item:1#b': '2026-06-30' },
    });
    // listed in 회차 order (by date), still grouped ahead of the next template item
    expect(drafts.map((d) => d.key)).toEqual([
      'item:1#a',
      'item:1',
      'item:1#b',
      'item:2',
      'item:3',
    ]);
    const byKey = new Map(drafts.map((d) => [d.key, d]));
    expect(byKey.get('item:1#a')!.session).toBe(1);
    expect(byKey.get('item:1')!.session).toBe(2);
    expect(byKey.get('item:1#b')!.session).toBe(3);
    expect(draftTitle(byKey.get('item:1')!)).toBe('첫째 2회차');
    // every 회차 keeps the base task's identity for the snapshot lookup
    expect(drafts.filter((d) => d.baseKey === 'item:1').every((d) => d.templateItemId === 1)).toBe(
      true,
    );
  });

  it('sorts unplaced 회차 last in creation order', () => {
    const drafts = buildWizardDrafts({
      ...base,
      occurrences: { 'item:2': ['item:2#a', 'item:2#b'] },
      placements: { 'item:2#b': '2026-06-10' },
    });
    const group = drafts.filter((d) => d.baseKey === 'item:2');
    expect(group.map((d) => [d.key, d.session])).toEqual([
      ['item:2#b', 1],
      ['item:2', 2],
      ['item:2#a', 3],
    ]);
  });

  it('drops excluded template items and expands hand-added extras', () => {
    const drafts = buildWizardDrafts({
      ...base,
      removed: ['item:2'],
      extras: [{ key: 'adhoc:x', title: '수업 진행', checklist: ['출석부'] }],
      occurrences: { 'adhoc:x': ['adhoc:x#1'] },
      placements: { 'adhoc:x': '2026-06-09', 'adhoc:x#1': '2026-06-16' },
    });
    expect(drafts.map((d) => draftTitle(d))).toEqual([
      '첫째',
      '셋째',
      '수업 진행 1회차',
      '수업 진행 2회차',
    ]);
    expect(drafts.at(-1)!.templateItemId).toBeNull();
    expect(drafts.at(-1)!.checklist).toEqual(['출석부']);
  });
});
