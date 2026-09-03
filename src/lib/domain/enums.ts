export const COLOR_KEYS = ['rose', 'amber', 'green', 'blue', 'violet', 'teal'] as const;
export type ColorKey = (typeof COLOR_KEYS)[number];

export const PROGRAM_STATUSES = ['ACTIVE', 'ARCHIVED'] as const;
export type ProgramStatus = (typeof PROGRAM_STATUSES)[number];

export const CLOSURE_KINDS = ['PUBLIC_HOLIDAY', 'SUBSTITUTE', 'CENTER'] as const;
export type ClosureKind = (typeof CLOSURE_KINDS)[number];
