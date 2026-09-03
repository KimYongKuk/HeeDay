import type { TemplateDetailDto } from '@/lib/domain/dto';
import type { ColorKey } from '@/lib/domain/enums';
import type { TemplateInput } from '@/lib/domain/zod';

export interface DraftItem {
  key: string;
  id?: number;
  actionItemId: number;
  actionItemName: string;
  categoryId: number;
  categoryName: string;
  categoryColor: string;
  defaultChecklist: string[];
  required: boolean;
  checklistOverride: string[] | null;
}

export interface TemplateDraft {
  name: string;
  color: ColorKey;
  description: string;
  defaultAssignee: string;
  items: DraftItem[];
}

export function draftFromDto(dto: TemplateDetailDto): TemplateDraft {
  return {
    name: dto.name,
    color: dto.color,
    description: dto.description ?? '',
    defaultAssignee: dto.defaultAssignee ?? '',
    items: dto.items.map((it) => ({
      key: `id:${it.id}`,
      id: it.id,
      actionItemId: it.actionItemId,
      actionItemName: it.actionItemName,
      categoryId: it.categoryId,
      categoryName: it.categoryName,
      categoryColor: it.categoryColor,
      defaultChecklist: it.defaultChecklist,
      required: it.required,
      checklistOverride: it.checklistOverride,
    })),
  };
}

export function draftToInput(draft: TemplateDraft): TemplateInput {
  return {
    name: draft.name.trim(),
    color: draft.color,
    description: draft.description.trim() === '' ? null : draft.description.trim(),
    defaultAssignee: draft.defaultAssignee.trim() === '' ? null : draft.defaultAssignee.trim(),
    items: draft.items.map((it, index) => ({
      id: it.id,
      actionItemId: it.actionItemId,
      required: it.required,
      checklistOverride: it.checklistOverride,
      sortOrder: index,
    })),
  };
}
