'use client';

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { LibraryPicker } from '@/components/templates/LibraryPicker';
import { TemplateItemRow, TemplateRowHeader } from '@/components/templates/TemplateItemRow';
import type { ActionItemDto } from '@/lib/domain/dto';
import type { DraftItem } from './types';

export function TemplateItemList({
  items,
  usedActionItemIds,
  onReorder,
  onChangeItem,
  onRemoveItem,
  onAdd,
}: {
  items: DraftItem[];
  usedActionItemIds: Set<number>;
  onReorder: (keys: string[]) => void;
  onChangeItem: (key: string, patch: Partial<DraftItem>) => void;
  onRemoveItem: (key: string) => void;
  onAdd: (item: ActionItemDto) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const keys = items.map((it) => it.key);

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = keys.indexOf(String(active.id));
    const to = keys.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    onReorder(arrayMove(keys, from, to));
  };

  return (
    <section className="flex flex-col gap-2">
      <TemplateRowHeader />
      <div className="border-line bg-surface overflow-hidden rounded-[10px] border">
        {items.length === 0 ? (
          <p className="text-ink-faint px-3 py-4 text-[12.5px]">
            등록된 할 일이 없습니다. 할 일 목록에서 추가하세요.
          </p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={keys} strategy={verticalListSortingStrategy}>
              {items.map((it, index) => (
                <TemplateItemRow
                  key={it.key}
                  index={index}
                  item={it}
                  onChange={(patch) => onChangeItem(it.key, patch)}
                  onRemove={() => onRemoveItem(it.key)}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>
      <LibraryPicker usedActionItemIds={usedActionItemIds} onPick={onAdd} />
    </section>
  );
}
