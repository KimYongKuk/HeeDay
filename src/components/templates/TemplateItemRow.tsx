'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { tagStyle } from '@/lib/domain/colors';
import { cn } from '@/lib/utils';
import type { DraftItem } from './types';

export const ROW_GRID = 'grid-cols-[18px_32px_minmax(0,1fr)_120px_64px_24px]';

export function TemplateItemRow({
  index,
  item,
  onChange,
  onRemove,
}: {
  index: number;
  item: DraftItem;
  onChange: (patch: Partial<DraftItem>) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: item.key,
  });
  const checklistCount = (item.checklistOverride ?? item.defaultChecklist).length;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'grid h-[46px] items-center gap-2.5 border-b border-hairline bg-surface pr-2 pl-1.5 last:border-b-0',
        ROW_GRID,
        isDragging && 'relative z-10 shadow-md',
      )}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label="순서 변경"
        className="flex cursor-grab items-center justify-center text-ink-ghost hover:text-ink active:cursor-grabbing"
      >
        <GripVertical className="size-3.5" />
      </button>
      <span className="text-right text-xs text-ink-faint">{index + 1}</span>
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate text-[13.5px] font-medium">{item.actionItemName}</span>
        <span className="shrink-0 rounded px-1.5 py-px text-[10.5px] font-semibold" style={tagStyle(item.categoryColor)}>
          {item.categoryName}
        </span>
      </div>
      <span className="text-xs text-ink-faint">{checklistCount > 0 ? `체크리스트 ${checklistCount}` : ''}</span>
      <div className="flex items-center">
        <Switch size="sm" checked={item.required} onCheckedChange={(c) => onChange({ required: c })} />
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label="양식에서 제거"
        className="flex size-6 items-center justify-center rounded text-ink-ghost hover:bg-app hover:text-ink"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

export function TemplateRowHeader() {
  return (
    <div className={cn('grid gap-2.5 px-2 pl-1.5 text-[11px] font-medium text-ink-faint', ROW_GRID)}>
      <span />
      <span className="text-right">순서</span>
      <span>할 일</span>
      <span>체크리스트</span>
      <span>필수</span>
      <span />
    </div>
  );
}
