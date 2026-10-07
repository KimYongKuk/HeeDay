import type { AbsenceKind, ClosureKind, ColorKey, ProgramStatus, TaskStatus } from './enums';
import type { ChecklistItem, ISODate, TemplateSnapshot } from './types';

export interface CategoryDto {
  id: number;
  name: string;
  color: string;
  sortOrder: number;
  itemCount: number;
}

export interface ActionItemDto {
  id: number;
  name: string;
  categoryId: number;
  categoryName: string;
  categoryColor: string;
  description: string | null;
  defaultChecklist: string[];
  usageCount: number;
  updatedAt: string;
}

export interface ActionItemUsageDto {
  templateId: number;
  templateName: string;
  color: ColorKey;
}

export interface ActionItemDetailDto extends ActionItemDto {
  usedBy: ActionItemUsageDto[];
}

export interface TemplateListDto {
  id: number;
  name: string;
  color: ColorKey;
  description: string | null;
  defaultAssignee: string | null;
  itemCount: number;
  programCount: number;
  updatedAt: string;
}

export interface TemplateItemDto {
  id: number;
  actionItemId: number;
  actionItemName: string;
  categoryId: number;
  categoryName: string;
  categoryColor: string;
  defaultChecklist: string[];
  required: boolean;
  checklistOverride: string[] | null;
  sortOrder: number;
}

export interface TemplateDetailDto {
  id: number;
  name: string;
  color: ColorKey;
  description: string | null;
  defaultAssignee: string | null;
  programCount: number;
  updatedAt: string;
  items: TemplateItemDto[];
}

export interface TaskDto {
  id: number;
  programId: number;
  templateItemId: number | null;
  title: string;
  categoryId: number | null;
  categoryName: string | null;
  dueDate: ISODate;
  required: boolean;
  important: boolean;
  status: TaskStatus;
  /** Set when status becomes DONE, cleared when it leaves DONE. */
  doneAt: string | null;
  checklist: ChecklistItem[];
  notes: string | null;
}

/** Task joined with its program, for calendar views. */
export interface CalendarTaskDto extends TaskDto {
  programName: string;
  programColor: ColorKey;
  templateName: string;
}

export interface ProgramListDto {
  id: number;
  name: string;
  color: ColorKey;
  startDate: ISODate;
  endDate: ISODate;
  assignee: string | null;
  status: ProgramStatus;
  templateId: number | null;
  templateName: string;
  taskCount: number;
  doneCount: number;
  /** min/max due date across tasks (null when the program has no tasks) */
  firstTaskDate: ISODate | null;
  lastTaskDate: ISODate | null;
  createdAt: string;
}

export interface ProgramDetailDto extends ProgramListDto {
  templateSnapshot: TemplateSnapshot;
  tasks: TaskDto[];
}

export interface ApproveResultDto {
  programId: number;
  taskCount: number;
  reused: boolean;
}

export interface MemoDto {
  id: number;
  body: string;
  programId: number | null;
  /** present when the memo is tagged with a program */
  programName: string | null;
  programColor: ColorKey | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClosureDayDto {
  id: number;
  date: ISODate;
  name: string;
  kind: ClosureKind;
  source: string;
}

/** 담당자 부재 기간(휴가·출장). 시작일과 종료일을 포함하는 연속 구간. */
export interface AbsenceDto {
  id: number;
  startDate: ISODate;
  endDate: ISODate;
  kind: AbsenceKind;
  name: string;
}
