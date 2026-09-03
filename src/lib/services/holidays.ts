import type { ClosureKind } from '@/lib/domain/enums';
import type { ISODate } from '@/lib/domain/types';

export interface HolidaySeed {
  date: ISODate;
  name: string;
  kind: ClosureKind;
}

/**
 * 2026년 대한민국 공휴일 (관공서의 공휴일에 관한 규정 기준).
 * 배포 전 인사혁신처 고시로 재확인할 것. 대체공휴일 규칙:
 *  - 3·1절, 광복절, 개천절, 한글날, 어린이날, 부처님오신날, 성탄절: 토·일과 겹치면 다음 평일
 *  - 설·추석 연휴: 일요일 또는 다른 공휴일과 겹치면 다음 평일 (토요일은 해당 없음)
 *  - 신정, 현충일, 선거일: 대체공휴일 없음
 */
export const KR_HOLIDAYS_2026: HolidaySeed[] = [
  { date: '2026-01-01', name: '신정', kind: 'PUBLIC_HOLIDAY' },
  { date: '2026-02-16', name: '설날 연휴', kind: 'PUBLIC_HOLIDAY' },
  { date: '2026-02-17', name: '설날', kind: 'PUBLIC_HOLIDAY' },
  { date: '2026-02-18', name: '설날 연휴', kind: 'PUBLIC_HOLIDAY' },
  { date: '2026-03-01', name: '삼일절', kind: 'PUBLIC_HOLIDAY' },
  { date: '2026-03-02', name: '대체공휴일(삼일절)', kind: 'SUBSTITUTE' },
  { date: '2026-05-05', name: '어린이날', kind: 'PUBLIC_HOLIDAY' },
  { date: '2026-05-24', name: '부처님오신날', kind: 'PUBLIC_HOLIDAY' },
  { date: '2026-05-25', name: '대체공휴일(부처님오신날)', kind: 'SUBSTITUTE' },
  { date: '2026-06-03', name: '지방선거', kind: 'PUBLIC_HOLIDAY' },
  { date: '2026-06-06', name: '현충일', kind: 'PUBLIC_HOLIDAY' },
  { date: '2026-08-15', name: '광복절', kind: 'PUBLIC_HOLIDAY' },
  { date: '2026-08-17', name: '대체공휴일(광복절)', kind: 'SUBSTITUTE' },
  { date: '2026-09-24', name: '추석 연휴', kind: 'PUBLIC_HOLIDAY' },
  { date: '2026-09-25', name: '추석', kind: 'PUBLIC_HOLIDAY' },
  { date: '2026-09-26', name: '추석 연휴', kind: 'PUBLIC_HOLIDAY' },
  { date: '2026-10-03', name: '개천절', kind: 'PUBLIC_HOLIDAY' },
  { date: '2026-10-05', name: '대체공휴일(개천절)', kind: 'SUBSTITUTE' },
  { date: '2026-10-09', name: '한글날', kind: 'PUBLIC_HOLIDAY' },
  { date: '2026-12-25', name: '성탄절', kind: 'PUBLIC_HOLIDAY' },
];

/**
 * 2027년 이후는 음력 계산이 필요하므로 시드에 넣지 않는다.
 * 휴관일 화면에서 직원이 추가하거나, 추후 공공데이터포털 API 가져오기로 채운다 (closure_days.source = 'api').
 */
export const KR_HOLIDAY_SEED: HolidaySeed[] = [...KR_HOLIDAYS_2026];
