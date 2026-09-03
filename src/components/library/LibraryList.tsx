'use client';

import { Check, Minus, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { ActionItemDto, CategoryDto } from '@/lib/domain/dto';
import { cn } from '@/lib/utils';

export function LibraryList({
  items,
  categories,
  loading,
  selectedId,
  onSelect,
  onDelete,
  categoryId,
  onCategoryChange,
  onAddCategory,
  onRemoveCategory,
}: {
  items: ActionItemDto[];
  categories: CategoryDto[];
  loading: boolean;
  selectedId: number | null;
  onSelect: (id: number) => void;
  onDelete: (item: ActionItemDto) => void;
  categoryId: number | 'ALL';
  onCategoryChange: (c: number | 'ALL') => void;
  onAddCategory: (name: string) => void;
  onRemoveCategory: (id: number) => void;
}) {
  const [editTabs, setEditTabs] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');

  const groups = categories
    .map((c) => ({ category: c, items: items.filter((it) => it.categoryId === c.id) }))
    .filter((g) => g.items.length > 0);

  const submitNew = () => {
    const name = newName.trim();
    if (!name) return;
    onAddCategory(name);
    setNewName('');
    setAddOpen(false);
  };

  const chip = (active: boolean) =>
    cn(
      'flex h-7 items-center gap-1 rounded-full border px-[11px] text-[12.5px] font-medium transition-colors',
      active ? 'border-ink bg-ink text-white' : 'border-line bg-surface text-ink-soft hover:border-ink-ghost',
    );

  return (
    <div className="flex min-h-0 flex-col overflow-hidden border-r border-line bg-surface">
      <div className="flex flex-wrap items-center gap-1.5 px-4 py-3">
        <button type="button" onClick={() => onCategoryChange('ALL')} className={chip(categoryId === 'ALL')}>
          전체
        </button>
        {categories.map((c) => {
          const active = categoryId === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => (editTabs ? onRemoveCategory(c.id) : onCategoryChange(c.id))}
              title={editTabs ? (c.itemCount > 0 ? `항목 ${c.itemCount}개 포함 · 삭제 불가` : '분류 삭제') : undefined}
              className={cn(chip(active), editTabs && (c.itemCount > 0 ? 'opacity-50' : 'border-sun/40 text-sun hover:bg-danger-soft'))}
            >
              {c.name}
              {editTabs ? <X className="size-3" /> : null}
            </button>
          );
        })}
        <Popover open={addOpen} onOpenChange={setAddOpen}>
          <PopoverTrigger
            render={
              <button
                type="button"
                aria-label="분류 추가"
                className="flex size-7 items-center justify-center rounded-full border border-dashed border-ink-ghost text-ink-muted hover:border-ink hover:text-ink"
              />
            }
          >
            <Plus className="size-3.5" />
          </PopoverTrigger>
          <PopoverContent align="start" className="w-56 gap-2 p-2.5">
            <span className="text-xs font-medium text-ink-faint">새 분류</span>
            <div className="flex items-center gap-1.5">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitNew()}
                autoFocus
                maxLength={40}
                placeholder="예: 안전"
                className="h-8 min-w-0 flex-1 rounded-md border border-line bg-surface px-2 text-[13px] outline-none focus:border-ring"
              />
              <button
                type="button"
                onClick={submitNew}
                aria-label="추가"
                className="flex size-8 items-center justify-center rounded-md bg-brand text-white hover:bg-brand-deep"
              >
                <Check className="size-3.5" strokeWidth={2.5} />
              </button>
            </div>
          </PopoverContent>
        </Popover>
        <button
          type="button"
          onClick={() => setEditTabs((v) => !v)}
          aria-label={editTabs ? '분류 삭제 종료' : '분류 삭제'}
          aria-pressed={editTabs}
          className={cn(
            'flex size-7 items-center justify-center rounded-full border border-dashed text-ink-muted hover:border-ink hover:text-ink',
            editTabs ? 'border-ink bg-ink text-white hover:text-white' : 'border-ink-ghost',
          )}
        >
          <Minus className="size-3.5" />
        </button>
        {editTabs ? <span className="text-[11.5px] text-ink-faint">삭제할 분류를 선택하세요</span> : null}
      </div>

      <div className="grid h-[26px] grid-cols-[minmax(0,1fr)_76px_76px_36px] items-center px-4 text-[11px] font-medium text-ink-faint">
        <span>이름</span>
        <span className="text-right">체크리스트</span>
        <span className="text-right">사용 양식</span>
        <span />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <p className="px-4 py-6 text-[13px] text-ink-faint">불러오는 중</p>
        ) : groups.length === 0 ? (
          <p className="px-4 py-6 text-[13px] text-ink-faint">조건에 맞는 항목이 없습니다.</p>
        ) : (
          groups.map((g) => (
            <div key={g.category.id}>
              <div className="flex h-[30px] items-center border-y border-line bg-weekend px-4 text-[11px] font-semibold tracking-[0.04em] text-ink-faint">
                {g.category.name}
              </div>
              {g.items.map((it) => {
                const active = it.id === selectedId;
                return (
                  <div
                    key={it.id}
                    className={cn(
                      'group grid h-10 grid-cols-[minmax(0,1fr)_76px_76px_36px] items-center border-b border-hairline pl-4 text-[13.5px] transition-colors hover:bg-app',
                      active && 'bg-brand-soft hover:bg-brand-soft',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onSelect(it.id)}
                      className={cn('h-full truncate text-left', active && 'font-semibold')}
                    >
                      {it.name}
                    </button>
                    <button type="button" onClick={() => onSelect(it.id)} className="h-full text-right">
                      <span className={cn('text-xs text-ink-faint', active && 'text-brand-deep')}>
                        {it.defaultChecklist.length}
                      </span>
                    </button>
                    <button type="button" onClick={() => onSelect(it.id)} className="h-full text-right">
                      <span className={cn('text-xs text-ink-faint', active && 'text-brand-deep')}>{it.usageCount}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(it)}
                      aria-label="삭제"
                      title={it.usageCount > 0 ? `${it.usageCount}개 양식에서 사용 중` : '삭제'}
                      className={cn(
                        'mx-auto flex size-7 items-center justify-center rounded text-ink-ghost opacity-0 transition-opacity group-hover:opacity-100 hover:bg-danger-soft hover:text-sun',
                        it.usageCount > 0 && 'hover:bg-app hover:text-ink-faint',
                      )}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
