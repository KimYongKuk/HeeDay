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
} from '@dnd-kit/core';
import { CopyPlus, GripVertical, Plus, RotateCcw, Wand2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { DateField } from '@/components/common/DateField';
import { useClosures } from '@/lib/api/queries';
import { PALETTE } from '@/lib/domain/colors';
import { WEEKDAY_LABEL } from '@/lib/domain/labels';
import type { DateWarning, ISODate, TaskDraft } from '@/lib/domain/types';
import { addMonthsISO, monthGrid } from '@/lib/services/calendarLayout';
import {
  buildClosureSet,
  buildWizardDrafts,
  dateWarning,
  draftTitle,
  draftsFromSnapshot,
  evenSpread,
} from '@/lib/services/placement';
import { useWizardStore } from '@/stores/wizardStore';
import { cn } from '@/lib/utils';
import {
  addDaysISO,
  compareISO,
  formatMonthDayKo,
  formatShort,
  isISODate,
  weekdayISO,
} from '@/lib/utils/dates';

const WARNING_LABEL: Record<DateWarning, string> = {
  WEEKEND: '주말',
  CLOSURE: '휴관일',
  OUT_OF_RANGE: '기간 외',
};

/** dnd ids: a list row can spawn a new 회차, a calendar chip only moves. */
const ROW = 'row:';
const CHIP = 'chip:';

export interface PlacementSummary {
  total: number;
  placed: number;
  unplaced: number;
}

interface DraftGroup {
  baseKey: string;
  drafts: TaskDraft[];
}

/** Groups drafts by base task, ordered by each group's earliest date (undated groups last). */
function groupDrafts(drafts: TaskDraft[]): DraftGroup[] {
  const groups: DraftGroup[] = [];
  const byKey = new Map<string, DraftGroup>();
  for (const d of drafts) {
    let g = byKey.get(d.baseKey);
    if (!g) {
      g = { baseKey: d.baseKey, drafts: [] };
      byKey.set(d.baseKey, g);
      groups.push(g);
    }
    g.drafts.push(d);
  }
  const firstDate = (g: DraftGroup): ISODate | null =>
    g.drafts.reduce<ISODate | null>(
      (min, d) => (d.dueDate && (min === null || d.dueDate < min) ? d.dueDate : min),
      null,
    );
  return groups
    .map((g, i) => ({ g, i, date: firstDate(g) }))
    .sort((a, b) => {
      if (a.date === null && b.date === null) return a.i - b.i;
      if (a.date === null) return 1;
      if (b.date === null) return -1;
      return compareISO(a.date, b.date) || a.i - b.i;
    })
    .map((x) => x.g);
}

export function StepPlace({ onSummary }: { onSummary: (s: PlacementSummary) => void }) {
  const s = useWizardStore();
  const startDate = s.form.startDate as ISODate;
  const endDate = s.form.endDate as ISODate;
  const period = { startDate, endDate };
  const { data: closureRows = [] } = useClosures({
    from: addDaysISO(startDate, -31),
    to: addDaysISO(endDate, 31),
  });
  const closures = useMemo(() => buildClosureSet(closureRows), [closureRows]);
  const closureNames = useMemo(
    () => new Map(closureRows.map((c) => [c.date, c.name])),
    [closureRows],
  );

  const drafts: TaskDraft[] = useMemo(
    () =>
      s.snapshot
        ? buildWizardDrafts({
            snapshot: s.snapshot,
            removed: s.removed,
            extras: s.extras,
            occurrences: s.occurrences,
            placements: s.placements,
          })
        : [],
    [s.snapshot, s.removed, s.extras, s.occurrences, s.placements],
  );

  const placed = drafts.filter((d) => d.dueDate !== null).length;
  useEffect(() => {
    onSummary({ total: drafts.length, placed, unplaced: drafts.length - placed });
  }, [drafts.length, placed, onSummary]);

  const groups = useMemo(() => groupDrafts(drafts), [drafts]);

  const removedItems = useMemo(
    () =>
      s.snapshot ? draftsFromSnapshot(s.snapshot).filter((d) => s.removed.includes(d.key)) : [],
    [s.snapshot, s.removed],
  );

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const [active, setActive] = useState<TaskDraft | null>(null);
  const [addsSession, setAddsSession] = useState(false);

  const draftFor = (id: string): TaskDraft | null => {
    const key = id.startsWith(ROW) ? id.slice(ROW.length) : id.slice(CHIP.length);
    return drafts.find((d) => d.key === key) ?? null;
  };

  const onDragStart = (id: string) => {
    const d = draftFor(id);
    setActive(d);
    // Dragging an already-dated task out of the list adds another 회차 instead of moving it.
    setAddsSession(id.startsWith(ROW) && d?.dueDate != null);
  };

  const onDragEnd = (e: DragEndEvent) => {
    const id = String(e.active.id);
    const d = draftFor(id);
    const date = e.over?.id;
    setActive(null);
    setAddsSession(false);
    if (!d || typeof date !== 'string' || !isISODate(date)) return;
    if (id.startsWith(ROW) && d.dueDate !== null) {
      s.addOccurrence(d.key, date);
      toast.success(`${d.title} 회차를 추가했습니다.`);
      return;
    }
    s.place(d.key, date);
  };

  const spreadUnplaced = () => {
    const unplaced = drafts.filter((d) => d.dueDate === null);
    if (unplaced.length === 0) return toast.error('배치할 항목이 없습니다.');
    const dates = evenSpread(unplaced.length, period, closures);
    s.placeMany(Object.fromEntries(unplaced.map((d, i) => [d.key, dates[i]])));
    toast.success(
      `${unplaced.length}개 항목을 기간에 균등 배치했습니다. 날짜는 개별 수정할 수 있습니다.`,
    );
  };

  const addExtra = () =>
    s.addExtra({ key: `adhoc:${crypto.randomUUID()}`, title: '', checklist: [] });

  const addSession = (d: TaskDraft) => {
    if (d.title.trim() === '') return toast.error('할 일 이름을 먼저 입력하세요.');
    s.addOccurrence(d.key);
    toast.success(`${d.title} 회차를 추가했습니다. 날짜를 지정하세요.`);
  };

  // months covering the period (cap at 6 to keep the layout sane)
  const months = useMemo(() => {
    const out: ISODate[] = [];
    let cur = `${startDate.slice(0, 7)}-01`;
    while (compareISO(cur, endDate) <= 0 && out.length < 6) {
      out.push(cur);
      cur = addMonthsISO(cur, 1);
    }
    return out;
  }, [startDate, endDate]);

  const byDate = useMemo(() => {
    const map = new Map<ISODate, TaskDraft[]>();
    for (const d of drafts) {
      if (!d.dueDate) continue;
      const list = map.get(d.dueDate) ?? [];
      list.push(d);
      map.set(d.dueDate, list);
    }
    for (const list of map.values()) list.sort((a, b) => (a.session ?? 0) - (b.session ?? 0));
    return map;
  }, [drafts]);

  const color = PALETTE[s.form.color];

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(e) => onDragStart(String(e.active.id))}
      onDragEnd={onDragEnd}
      onDragCancel={() => {
        setActive(null);
        setAddsSession(false);
      }}
    >
      <div className="grid grid-cols-1 gap-6 px-4 pt-6 pb-8 md:px-7 lg:grid-cols-[440px_minmax(0,1fr)]">
        {/* task list */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[14px] font-semibold">할 일 배치</span>
            <span className="text-ink-faint text-xs">
              {placed} / {drafts.length} 배치
            </span>
            <div className="flex-1" />
            <button
              type="button"
              onClick={spreadUnplaced}
              className="border-line bg-surface text-ink-soft hover:border-ink-ghost flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium"
            >
              <Wand2 className="size-3.5" /> 남은 항목 균등 배치
            </button>
          </div>
          <p className="text-ink-faint -mt-1 text-xs leading-relaxed">
            각 할 일의 날짜를 선택하거나 오른쪽 달력으로 끌어다 놓습니다. 이미 날짜가 있는 할 일을
            다시 끌어다 놓으면 회차가 추가됩니다. 필요 없는 항목은 제외할 수 있습니다.
          </p>

          <div className="border-line bg-surface overflow-hidden rounded-xl border">
            {groups.map((g) => (
              <div key={g.baseKey} className="border-hairline border-b last:border-b-0">
                {g.drafts.map((d) => {
                  const isExtra = d.templateItemId === null;
                  const isBase = d.key === d.baseKey;
                  const warn = d.dueDate ? dateWarning(d.dueDate, period, closures) : null;
                  return (
                    <DraggableRow key={d.key} draft={d}>
                      <div
                        className={cn(
                          'grid grid-cols-[18px_minmax(0,1fr)_108px_28px_28px] items-center gap-2 px-2 py-2 sm:grid-cols-[18px_minmax(0,1fr)_128px_28px_28px] sm:gap-2.5',
                          !isBase && 'border-hairline border-t',
                          d.dueDate === null && 'bg-warn-soft/40',
                        )}
                      >
                        <span className="text-ink-ghost flex cursor-grab touch-none items-center justify-center active:cursor-grabbing">
                          <GripVertical className="size-3.5" />
                        </span>
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <div className="flex min-w-0 items-center gap-1.5">
                            {d.session !== null ? (
                              <span
                                className="shrink-0 rounded px-1.5 py-px text-[10.5px] font-semibold"
                                style={{ background: color.bg, color: color.text }}
                              >
                                {d.session}회차
                              </span>
                            ) : null}
                            {isExtra && isBase ? (
                              <input
                                value={d.title}
                                onChange={(e) => s.updateExtra(d.key, { title: e.target.value })}
                                placeholder="할 일 이름"
                                maxLength={100}
                                autoFocus={d.title === ''}
                                className="border-line bg-surface focus:border-ring h-7 min-w-0 flex-1 rounded-md border px-2 text-[13px] outline-none"
                              />
                            ) : (
                              <span className="truncate text-[13.5px] font-medium">{d.title}</span>
                            )}
                            {!d.required && d.session === null ? (
                              <span className="text-ink-faint shrink-0 text-[10.5px]">선택</span>
                            ) : null}
                          </div>
                          <div className="text-ink-faint flex items-center gap-1.5 text-[11px]">
                            {d.categoryName ? (
                              <span>{d.categoryName}</span>
                            ) : (
                              <span>직접 추가</span>
                            )}
                            {d.checklist.length > 0 ? (
                              <span>· 체크리스트 {d.checklist.length}</span>
                            ) : null}
                            {warn ? (
                              <span
                                className={cn(
                                  'rounded px-1.5 py-px text-[10.5px] font-semibold',
                                  warn === 'OUT_OF_RANGE'
                                    ? 'bg-danger-soft text-sun'
                                    : 'bg-warn-soft text-warn',
                                )}
                              >
                                {WARNING_LABEL[warn]}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <DateField
                          value={d.dueDate ?? ''}
                          onChange={(date) => s.place(d.key, date)}
                          placeholder="날짜 선택"
                          size="sm"
                          format="short"
                          defaultMonth={startDate}
                          className={cn('w-full', d.dueDate === null && 'border-warn/50')}
                        />
                        <button
                          type="button"
                          onClick={() => addSession(d)}
                          aria-label="회차 추가"
                          title="이 할 일의 회차를 하나 더 추가합니다"
                          className="text-ink-ghost hover:bg-app hover:text-brand flex size-7 items-center justify-center rounded"
                        >
                          <CopyPlus className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            !isBase
                              ? s.removeOccurrence(d.key)
                              : isExtra
                                ? s.removeExtra(d.key)
                                : s.remove(d.key)
                          }
                          aria-label={isBase ? '제외' : '회차 삭제'}
                          className="text-ink-ghost hover:bg-app hover:text-ink flex size-7 items-center justify-center rounded"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    </DraggableRow>
                  );
                })}
              </div>
            ))}
            {drafts.length === 0 ? (
              <p className="text-ink-faint px-3 py-4 text-[12.5px]">배치할 할 일이 없습니다.</p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={addExtra}
            className="text-brand hover:bg-brand-soft/50 flex h-8 items-center gap-1.5 self-start rounded-md px-1.5 text-[12px] font-medium"
          >
            <Plus className="size-3.5" strokeWidth={2} /> 할 일 추가
          </button>

          {removedItems.length > 0 ? (
            <div className="border-line text-ink-faint rounded-lg border border-dashed px-3 py-2.5 text-xs">
              <div className="mb-1.5 flex items-center gap-2">
                <span className="font-medium">제외한 항목 {removedItems.length}개</span>
                <button
                  type="button"
                  onClick={s.restoreAll}
                  className="text-brand ml-auto flex items-center gap-1 hover:underline"
                >
                  <RotateCcw className="size-3" /> 모두 되돌리기
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {removedItems.map((d) => (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => s.restore(d.key)}
                    className="border-line bg-surface hover:border-ink-ghost rounded-md border px-2 py-0.5"
                  >
                    {d.title}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* period calendar */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-sm" style={{ background: color.solid }} />
            <span className="text-[14px] font-semibold">{s.form.name || s.snapshot?.name}</span>
            <span className="text-ink-faint text-xs">
              {formatMonthDayKo(startDate)} – {formatMonthDayKo(endDate)}
            </span>
          </div>
          {months.map((m) => (
            <MiniMonth
              key={m}
              monthStart={m}
              period={period}
              closureNames={closureNames}
              byDate={byDate}
              color={color}
            />
          ))}
        </div>
      </div>
      <DragOverlay dropAnimation={null}>
        {active ? (
          <div
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium shadow-lg"
            style={{ background: color.bg, color: color.text }}
          >
            {draftTitle(active) || '할 일'}
            {addsSession ? <span className="text-[10.5px] opacity-70">회차 추가</span> : null}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function DraggableRow({ draft, children }: { draft: TaskDraft; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${ROW}${draft.key}`,
  });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn('touch-none', isDragging && 'opacity-40')}
    >
      {children}
    </div>
  );
}

function MiniMonth({
  monthStart,
  period,
  closureNames,
  byDate,
  color,
}: {
  monthStart: ISODate;
  period: { startDate: ISODate; endDate: ISODate };
  closureNames: Map<ISODate, string>;
  byDate: Map<ISODate, TaskDraft[]>;
  color: { solid: string; bg: string; text: string; border: string };
}) {
  const weeks = monthGrid(monthStart);
  const [y, m] = monthStart.split('-').map(Number);
  return (
    <div className="border-line bg-surface overflow-hidden rounded-xl border">
      <div className="border-line flex h-9 items-center border-b px-3 text-[13px] font-semibold">
        {y}년 {m}월
      </div>
      <div className="border-line text-ink-faint grid grid-cols-7 border-b text-[11px] font-medium">
        {['월', '화', '수', '목', '금', '토', '일'].map((w, i) => (
          <div key={w} className={cn('px-2 py-1', i === 5 && 'text-sat', i === 6 && 'text-sun')}>
            {w}
          </div>
        ))}
      </div>
      {weeks.map((week) => (
        <div key={week[0]} className="border-hairline grid grid-cols-7 border-b last:border-b-0">
          {week.map((date) => (
            <MiniDay
              key={date}
              date={date}
              inMonth={date.slice(0, 7) === monthStart.slice(0, 7)}
              inPeriod={
                compareISO(date, period.startDate) >= 0 && compareISO(date, period.endDate) <= 0
              }
              closure={closureNames.get(date)}
              tasks={byDate.get(date) ?? []}
              color={color}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function MiniDay({
  date,
  inMonth,
  inPeriod,
  closure,
  tasks,
  color,
}: {
  date: ISODate;
  inMonth: boolean;
  inPeriod: boolean;
  closure?: string;
  tasks: TaskDraft[];
  color: { solid: string; bg: string; text: string; border: string };
}) {
  const { setNodeRef, isOver } = useDroppable({ id: date, disabled: !inMonth });
  const w = weekdayISO(date);
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'border-hairline flex min-h-[64px] flex-col gap-0.5 border-r p-1 last:border-r-0',
        !inMonth && 'bg-app/60',
        inMonth && !inPeriod && 'bg-weekend',
        closure && inMonth && 'bg-holiday',
        isOver && 'ring-brand/50 ring-2 ring-inset',
      )}
    >
      <div className="flex items-center gap-1 text-[10.5px]">
        <span
          className={cn(
            'font-medium',
            !inMonth
              ? 'text-ink-ghost'
              : closure || w === 0
                ? 'text-sun'
                : w === 6
                  ? 'text-sat'
                  : inPeriod
                    ? 'text-ink'
                    : 'text-ink-faint',
          )}
        >
          {Number(date.slice(8, 10))}
        </span>
        {closure && inMonth ? <span className="text-sun/80 truncate">{closure}</span> : null}
      </div>
      {inMonth
        ? tasks.map((t) => <MiniChip key={t.key} draft={t} date={date} color={color} />)
        : null}
    </div>
  );
}

/** A placed draft on the mini calendar. Dragging moves it; the wizard list adds 회차 instead. */
function MiniChip({
  draft,
  date,
  color,
}: {
  draft: TaskDraft;
  date: ISODate;
  color: { solid: string; bg: string; text: string; border: string };
}) {
  const unplace = useWizardStore((s) => s.unplace);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${CHIP}${draft.key}`,
  });
  const w = weekdayISO(date);
  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      type="button"
      onClick={() => unplace(draft.key)}
      title={`${draftTitle(draft)} · ${formatShort(date)} (${WEEKDAY_LABEL[w]}) · 끌어서 날짜 변경, 클릭하면 배치 해제`}
      className={cn(
        'cursor-grab touch-none truncate rounded px-1 py-px text-left text-[10.5px] font-medium hover:opacity-70 active:cursor-grabbing',
        isDragging && 'opacity-40',
      )}
      style={{ background: color.bg, color: color.text }}
    >
      {draftTitle(draft) || '할 일'}
    </button>
  );
}
