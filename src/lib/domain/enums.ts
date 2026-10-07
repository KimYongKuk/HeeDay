export const COLOR_KEYS = ['rose', 'amber', 'green', 'blue', 'violet', 'teal'] as const;
export type ColorKey = (typeof COLOR_KEYS)[number];

export const PROGRAM_STATUSES = ['ACTIVE', 'ARCHIVED'] as const;
export type ProgramStatus = (typeof PROGRAM_STATUSES)[number];

/** 대기 · 진행 중 · 완료 */
export const TASK_STATUSES = ['TODO', 'DOING', 'DONE'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const CLOSURE_KINDS = ['PUBLIC_HOLIDAY', 'SUBSTITUTE', 'CENTER'] as const;
export type ClosureKind = (typeof CLOSURE_KINDS)[number];

/** 담당자 부재 종류. 휴관(기관)과 달리 사람이 자리를 비우는 날이다. */
export const ABSENCE_KINDS = ['LEAVE', 'TRIP', 'OTHER'] as const;
export type AbsenceKind = (typeof ABSENCE_KINDS)[number];
