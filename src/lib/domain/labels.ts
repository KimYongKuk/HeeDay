import type { AbsenceKind, ClosureKind, TaskStatus } from './enums';

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  TODO: '대기',
  DOING: '진행 중',
  DONE: '완료',
};

export const CLOSURE_KIND_LABEL: Record<ClosureKind, string> = {
  PUBLIC_HOLIDAY: '공휴일',
  SUBSTITUTE: '대체공휴일',
  CENTER: '복지관 휴관',
};

export const ABSENCE_KIND_LABEL: Record<AbsenceKind, string> = {
  LEAVE: '휴가',
  TRIP: '출장',
  OTHER: '기타 부재',
};

export const WEEKDAY_LABEL = ['일', '월', '화', '수', '목', '금', '토'] as const;
