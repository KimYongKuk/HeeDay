import { z } from 'zod';
import { isISODate } from '@/lib/utils/dates';
import { CLOSURE_KINDS, COLOR_KEYS, PROGRAM_STATUSES } from './enums';

export const isoDateSchema = z
  .string()
  .refine(isISODate, { message: '날짜 형식은 YYYY-MM-DD 입니다.' });

export const colorSchema = z.enum(COLOR_KEYS);
export const closureKindSchema = z.enum(CLOSURE_KINDS);
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

export const programPatchSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  assignee: z.string().trim().max(60).nullable().optional(),
  color: colorSchema.optional(),
  status: programStatusSchema.optional(),
});

const checklistItemSchema = z.object({ text: checklistText, checked: z.boolean() });

export const taskCreateSchema = z.object({
  programId: z.number().int().positive(),
  title: z.string().trim().min(1, '할 일 이름을 입력하세요.').max(120),
  dueDate: isoDateSchema,
  checklist: z.array(checklistText).max(50).optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});
export type TaskCreateInput = z.infer<typeof taskCreateSchema>;

export const taskPatchSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  dueDate: isoDateSchema.optional(),
  done: z.boolean().optional(),
  checklist: z.array(checklistItemSchema).max(50).optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});
export type TaskPatchInput = z.infer<typeof taskPatchSchema>;

export const closureInputSchema = z.object({
  date: isoDateSchema,
  name: z.string().trim().min(1, '이름을 입력하세요.').max(60),
  kind: closureKindSchema.default('CENTER'),
});
export type ClosureInput = z.infer<typeof closureInputSchema>;
