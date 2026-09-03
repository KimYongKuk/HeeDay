'use client';

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useState, type ReactNode } from 'react';
import { TaskChip } from '@/components/calendar/TaskChip';
import type { CalendarTaskDto } from '@/lib/domain/dto';
import type { ISODate } from '@/lib/domain/types';
import { cn } from '@/lib/utils';
import { isISODate } from '@/lib/utils/dates';

export function CalendarDnd({
  children,
  onMove,
}: {
  children: ReactNode;
  onMove: (task: CalendarTaskDto, date: ISODate) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const [active, setActive] = useState<CalendarTaskDto | null>(null);

  const onDragStart = (e: DragStartEvent) =>
    setActive((e.active.data.current as CalendarTaskDto) ?? null);
  const onDragEnd = (e: DragEndEvent) => {
    setActive(null);
    const task = e.active.data.current as CalendarTaskDto | undefined;
    const date = e.over?.id;
    if (task && typeof date === 'string' && isISODate(date) && date !== task.dueDate)
      onMove(task, date);
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActive(null)}
    >
      {children}
      <DragOverlay dropAnimation={null}>
        {active ? (
          <div className="w-44 rounded-md shadow-[0_6px_18px_rgba(20,18,12,0.18)]">
            <TaskChip task={active} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

export function DraggableTask({ task, children }: { task: CalendarTaskDto; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `task-${task.id}`,
    data: task,
  });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn('min-w-0 touch-none', isDragging && 'opacity-30')}
    >
      {children}
    </div>
  );
}

export function DroppableDay({
  date,
  className,
  children,
}: {
  date: ISODate;
  className?: string;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: date });
  return (
    <div ref={setNodeRef} className={cn(className, isOver && 'ring-brand/40 ring-2 ring-inset')}>
      {children}
    </div>
  );
}
