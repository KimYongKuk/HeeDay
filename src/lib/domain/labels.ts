import type { ClosureKind } from './enums';

export const CLOSURE_KIND_LABEL: Record<ClosureKind, string> = {
  PUBLIC_HOLIDAY: '공휴일',
  SUBSTITUTE: '대체공휴일',
  CENTER: '복지관 휴관',
};

export const WEEKDAY_LABEL = ['일', '월', '화', '수', '목', '금', '토'] as const;
