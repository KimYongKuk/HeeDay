import { describe, expect, it } from 'vitest';
import {
  addMonthsISO,
  assignLanes,
  chipCapacity,
  endOfMonthISO,
  monthGrid,
  startOfWeekISO,
  weekSegment,
} from './calendarLayout';

describe('month grid', () => {
  it('starts weeks on Monday', () => {
    expect(startOfWeekISO('2026-06-10')).toBe('2026-06-08');
    expect(startOfWeekISO('2026-06-07')).toBe('2026-06-01'); // Sunday belongs to the week starting Monday 6/1
    expect(startOfWeekISO('2026-06-01')).toBe('2026-06-01');
  });

  it('builds June 2026 as 5 rows from 6/1 to 7/5', () => {
    const weeks = monthGrid('2026-06-10');
    expect(weeks).toHaveLength(5);
    expect(weeks[0][0]).toBe('2026-06-01');
    expect(weeks[4][6]).toBe('2026-07-05');
  });

  it('builds a 6-row month when needed (August 2026 starts on Saturday)', () => {
    const weeks = monthGrid('2026-08-15');
    expect(weeks).toHaveLength(6);
    expect(weeks[0][0]).toBe('2026-07-27');
  });

  it('computes month ends and month arithmetic', () => {
    expect(endOfMonthISO('2026-02-10')).toBe('2026-02-28');
    expect(endOfMonthISO('2028-02-10')).toBe('2028-02-29');
    expect(addMonthsISO('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonthsISO('2026-12-15', 1)).toBe('2027-01-15');
    expect(addMonthsISO('2026-03-15', -3)).toBe('2025-12-15');
  });
});

describe('assignLanes', () => {
  it('keeps a program on one lane across the grid and reuses freed lanes', () => {
    const lanes = assignLanes([
      { id: 1, from: '2026-06-01', to: '2026-07-14' }, // 웰다잉
      { id: 2, from: '2026-05-13', to: '2026-07-01' }, // 스마트폰
      { id: 3, from: '2026-06-12', to: '2026-07-31' }, // 노인일자리
      { id: 4, from: '2026-07-02', to: '2026-07-20' }, // starts after 스마트폰 ended -> lane 0 reused
    ]);
    expect(lanes.get(2)).toBe(0);
    expect(lanes.get(1)).toBe(1);
    expect(lanes.get(3)).toBe(2);
    expect(lanes.get(4)).toBe(0);
  });
});

describe('weekSegment', () => {
  const week = ['2026-06-01', '2026-06-02', '2026-06-03', '2026-06-04', '2026-06-05', '2026-06-06', '2026-06-07'];

  it('clips a span that starts mid-week and continues', () => {
    expect(weekSegment({ from: '2026-06-02', to: '2026-07-07' }, week)).toEqual({
      colStart: 1,
      colEnd: 6,
      roundedLeft: true,
      roundedRight: false,
    });
  });

  it('clips a span that covers the whole week', () => {
    expect(weekSegment({ from: '2026-05-13', to: '2026-06-24' }, week)).toEqual({
      colStart: 0,
      colEnd: 6,
      roundedLeft: false,
      roundedRight: false,
    });
  });

  it('returns null when there is no overlap', () => {
    expect(weekSegment({ from: '2026-06-12', to: '2026-06-30' }, week)).toBeNull();
  });

  it('marks a span ending inside the week', () => {
    expect(weekSegment({ from: '2026-05-01', to: '2026-06-03' }, week)).toMatchObject({ colEnd: 2, roundedRight: true });
  });
});

describe('chipCapacity', () => {
  it('fits 3 chips in a 150px row and never returns less than 1', () => {
    expect(chipCapacity(150)).toBe(3);
    expect(chipCapacity(60)).toBe(1);
  });
});
