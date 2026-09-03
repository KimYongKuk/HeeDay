'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { tagStyle } from '@/lib/domain/colors';
import { cn } from '@/lib/utils';
import type { DraftItem } from './types';

export const ROW_GRID =
  'grid-cols-[18px_minmax(0,1fr)_auto_24px] md:grid-cols-[18px_32px_minmax(0,1fr)_120px_64px_24px]';

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
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.key });
  const checklistCount = (item.checklistOverride ?? item.defaultChecklist).length;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'border-hairline bg-surface grid min-h-[46px] items-center gap-2.5 border-b py-1.5 pr-2 pl-1.5 last:border-b-0',
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
        className="text-ink-ghost hover:text-ink flex cursor-grab touch-none items-center justify-center active:cursor-grabbing"
      >
        <GripVertical className="size-3.5" />
      </button>
      <span className="text-ink-faint hidden text-right text-xs md:block">{index + 1}</span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-ink-faint text-xs md:hidden">{index + 1}</span>
          <span className="truncate text-[13.5px] font-medium">{item.actionItemName}</span>
          <span
            className="shrink-0 rounded px-1.5 py-px text-[10.5px] font-semibold"
            style={tagStyle(item.categoryColor)}
          >
            {item.categoryName}
          </span>
        </div>
        {checklistCount > 0 ? (
          <span className="text-ink-faint text-[11px] md:hidden">체크리스트 {checklistCount}</span>
        ) : null}
      </div>
      <span className="text-ink-faint hidden text-xs md:block">
        {checklistCount > 0 ? `체크리스트 ${checklistCount}` : ''}
      </span>
      <div className="flex items-center gap-1.5">
        <span className="text-ink-faint text-[11px] md:hidden">필수</span>
        <Switch
          size="sm"
          checked={item.required}
          onCheckedChange={(c) => onChange({ required: c })}
        />
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label="양식에서 제거"
        className="text-ink-ghost hover:bg-app hover:text-ink flex size-6 items-center justify-center rounded"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

export function TemplateRowHeader() {
  return (
    <div
      className={cn(
        'text-ink-faint hidden gap-2.5 px-2 pl-1.5 text-[11px] font-medium md:grid',
        ROW_GRID,
      )}
    >
      <span />
      <span className="text-right">순서</span>
      <span>할 일</span>
      <span>체크리스트</span>
      <span>필수</span>
      <span />
    </div>
  );
}
