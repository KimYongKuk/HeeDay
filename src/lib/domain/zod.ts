import { z } from 'zod';
import { isISODate } from '@/lib/utils/dates';
import { ABSENCE_KINDS, CLOSURE_KINDS, COLOR_KEYS, PROGRAM_STATUSES } from './enums';

export const isoDateSchema = z
  .string()
  .refine(isISODate, { message: '날짜 형식은 YYYY-MM-DD 입니다.' });

export const colorSchema = z.enum(COLOR_KEYS);
export const closureKindSchema = z.enum(CLOSURE_KINDS);
export const absenceKindSchema = z.enum(ABSENCE_KINDS);
export const programStatusSchema = z.enum(PROGRAM_STATUSES);

const checklistText = z.string().trim().min(1).max(100);

export const categoryInputSchema = z.object({
  name: z.string().trim().min(1, '분류 이름을 입력하세요.').max(40),
});
export type CategoryInput = z.infer<typeof categoryInputSchema>;

export const actionItemInputSchema = z.object({
  name: z.string().trim().min(1, '이름을 입력하세요.').max(100),
  categoryId: z.number().int().positive('분류를 선택하세요.'),
  description: z.string().trim().max(1000).nullable().optional(),
  defaultChecklist: z.array(checklistText).max(50).default([]),
});
export type ActionItemInput = z.infer<typeof actionItemInputSchema>;

export const templateItemInputSchema = z.object({
  id: z.number().int().positive().optional(),
  actionItemId: z.number().int().positive(),
  required: z.boolean().default(true),
  checklistOverride: z.array(checklistText).max(50).nullable().optional(),
  sortOrder: z.number().int().min(0),
});
export type TemplateItemInput = z.infer<typeof templateItemInputSchema>;

export const templateInputSchema = z.object({
  name: z.string().trim().min(1, '양식 이름을 입력하세요.').max(100),
  color: colorSchema,
  description: z.string().trim().max(300).nullable().optional(),
  defaultAssignee: z.string().trim().max(60).nullable().optional(),
  items: z.array(templateItemInputSchema).max(200).default([]),
});
export type TemplateInput = z.infer<typeof templateInputSchema>;

export const programFormSchema = z
  .object({
    name: z.string().trim().min(1, '일정 이름을 입력하세요.').max(120),
    startDate: isoDateSchema,
    endDate: isoDateSchema,
    assignee: z.string().trim().max(60).nullable().optional(),
    color: colorSchema,
  })
  .refine((v) => v.startDate <= v.endDate, {
    message: '종료일은 시작일보다 빠를 수 없습니다.',
    path: ['endDate'],
  });
export type ProgramForm = z.infer<typeof programFormSchema>;

/** A task the user placed on a date in the wizard. */
export const placedTaskSchema = z.object({
  templateItemId: z.number().int().positive().nullable(),
  title: z.string().trim().min(1, '할 일 이름을 입력하세요.').max(120),
  dueDate: isoDateSchema,
  required: z.boolean().default(true),
  important: z.boolean().default(false),
  checklist: z.array(checklistText).max(50).default([]),
});
export type PlacedTaskInput = z.infer<typeof placedTaskSchema>;

export const programApproveSchema = z.object({
  idempotencyKey: z.string().uuid(),
  templateId: z.number().int().positive(),
  program: programFormSchema,
  tasks: z.array(placedTaskSchema).max(500),
});
export type ProgramApproveInput = z.infer<typeof programApproveSchema>;

export const programPatchSchema = z
  .object({
    name: z.string().trim().min(1, '일정 이름을 입력하세요.').max(120).optional(),
    startDate: isoDateSchema.optional(),
    endDate: isoDateSchema.optional(),
    assignee: z.string().trim().max(60).nullable().optional(),
    color: colorSchema.optional(),
    status: programStatusSchema.optional(),
  })
  .refine((v) => !v.startDate || !v.endDate || v.startDate <= v.endDate, {
    message: '종료일은 시작일보다 빠를 수 없습니다.',
    path: ['endDate'],
  });
export type ProgramPatchInput = z.infer<typeof programPatchSchema>;

const checklistItemSchema = z.object({ text: checklistText, checked: z.boolean() });

export const taskCreateSchema = z.object({
  programId: z.number().int().positive(),
  title: z.string().trim().min(1, '할 일 이름을 입력하세요.').max(120),
  dueDate: isoDateSchema,
  important: z.boolean().optional(),
  checklist: z.array(checklistText).max(50).optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});
export type TaskCreateInput = z.infer<typeof taskCreateSchema>;

export const taskPatchSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  dueDate: isoDateSchema.optional(),
  done: z.boolean().optional(),
  important: z.boolean().optional(),
  checklist: z.array(checklistItemSchema).max(50).optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});
export type TaskPatchInput = z.infer<typeof taskPatchSchema>;

const memoBody = z.string().trim().min(1, '메모 내용을 입력하세요.').max(2000);

export const memoCreateSchema = z.object({
  body: memoBody,
  programId: z.number().int().positive().nullable().optional(),
});
export type MemoCreateInput = z.infer<typeof memoCreateSchema>;

export const memoPatchSchema = z.object({
  body: memoBody.optional(),
  programId: z.number().int().positive().nullable().optional(),
});
export type MemoPatchInput = z.infer<typeof memoPatchSchema>;

export const closureInputSchema = z.object({
  date: isoDateSchema,
  name: z.string().trim().min(1, '이름을 입력하세요.').max(60),
  kind: closureKindSchema.default('CENTER'),
});
export type ClosureInput = z.infer<typeof closureInputSchema>;

/** 부재는 최대 90일까지. 연 단위 오입력을 막는다. */
export const ABSENCE_MAX_DAYS = 90;

export const absenceInputSchema = z
  .object({
    startDate: isoDateSchema,
    endDate: isoDateSchema,
    kind: absenceKindSchema,
    name: z.string().trim().min(1, '이름을 입력하세요.').max(60),
  })
  .refine((v) => v.endDate >= v.startDate, {
    message: '종료일은 시작일과 같거나 뒤여야 합니다.',
    path: ['endDate'],
  })
  .refine((v) => daySpan(v.startDate, v.endDate) <= ABSENCE_MAX_DAYS, {
    message: `부재 기간은 ${ABSENCE_MAX_DAYS}일을 넘을 수 없습니다.`,
    path: ['endDate'],
  });
export type AbsenceInput = z.infer<typeof absenceInputSchema>;

function daySpan(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}
