'use client';

import { Plus, Search } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/common/PageHeader';
import { LibraryDetail } from '@/components/library/LibraryDetail';
import { LibraryList } from '@/components/library/LibraryList';
import { Button } from '@/components/ui/button';
import { ApiClientError } from '@/lib/api/client';
import {
  useActionItems,
  useCategories,
  useCreateCategory,
  useDeleteActionItem,
  useDeleteCategory,
} from '@/lib/api/queries';
import type { ActionItemDto } from '@/lib/domain/dto';

export type LibrarySelection = number | 'new' | null;

export function LibraryScreen() {
  const { data: items = [], isLoading } = useActionItems();
  const { data: categories = [] } = useCategories();
  const initialId = useSearchParams().get('id');
  const [selected, setSelected] = useState<LibrarySelection>(() =>
    initialId && /^\d+$/.test(initialId) ? Number(initialId) : null,
  );
  const [categoryId, setCategoryId] = useState<number | 'ALL'>('ALL');
  const [search, setSearch] = useState('');

  const removeItem = useDeleteActionItem();
  const createCategory = useCreateCategory();
  const removeCategory = useDeleteCategory();

  const filtered = useMemo(() => {
    const q = search.trim();
    return items.filter(
      (it) => (categoryId === 'ALL' || it.categoryId === categoryId) && (q === '' || it.name.includes(q)),
    );
  }, [items, categoryId, search]);

  const onDeleteItem = async (item: ActionItemDto) => {
    if (item.usageCount > 0) {
      toast.error(`'${item.name}'은(는) ${item.usageCount}개 양식에서 사용 중이라 삭제할 수 없습니다.`);
      return;
    }
    if (!window.confirm(`'${item.name}' 항목을 삭제하시겠습니까?`)) return;
    try {
      await removeItem.mutateAsync(item.id);
      if (selected === item.id) setSelected(null);
      toast.success('삭제했습니다.');
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : '삭제에 실패했습니다.');
    }
  };

  const onAddCategory = async (name: string) => {
    try {
      const { id } = await createCategory.mutateAsync(name);
      setCategoryId(id);
      toast.success(`'${name}' 분류를 추가했습니다.`);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : '분류 추가에 실패했습니다.');
    }
  };

  const onRemoveCategory = async (id: number) => {
    const c = categories.find((x) => x.id === id);
    if (!c) return;
    if (c.itemCount > 0) {
      toast.error(`'${c.name}' 분류에 할 일 항목 ${c.itemCount}개가 있어 삭제할 수 없습니다.`);
      return;
    }
    if (!window.confirm(`'${c.name}' 분류를 삭제하시겠습니까?`)) return;
    try {
      await removeCategory.mutateAsync(id);
      if (categoryId === id) setCategoryId('ALL');
      toast.success('분류를 삭제했습니다.');
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : '분류 삭제에 실패했습니다.');
    }
  };

  return (
    <>
      <PageHeader title="할 일 목록" subtitle={`총 ${items.length}개`}>
        <label className="flex h-[30px] w-[200px] items-center gap-2 rounded-md border border-line bg-surface px-2.5 text-[12.5px] text-ink-faint focus-within:border-ink-ghost">
          <Search className="size-3.5" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="항목 검색"
            className="w-full bg-transparent text-ink outline-none placeholder:text-ink-faint"
          />
        </label>
        <Button size="sm" onClick={() => setSelected('new')} className="h-[30px] font-semibold">
          <Plus data-icon="inline-start" strokeWidth={2} />
          항목 추가
        </Button>
      </PageHeader>

      <div className="grid min-h-0 flex-1 grid-cols-[560px_minmax(0,1fr)] border-t border-line">
        <LibraryList
          items={filtered}
          categories={categories}
          loading={isLoading}
          selectedId={typeof selected === 'number' ? selected : null}
          onSelect={setSelected}
          onDelete={onDeleteItem}
          categoryId={categoryId}
          onCategoryChange={setCategoryId}
          onAddCategory={onAddCategory}
          onRemoveCategory={onRemoveCategory}
        />
        <div className="flex min-h-0 flex-col overflow-y-auto">
          {selected === null ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-1 p-10 text-center">
              <p className="text-[15px] font-semibold">항목을 선택하세요</p>
              <p className="text-[13px] text-ink-faint">왼쪽 목록에서 항목을 선택하면 상세 정보를 편집할 수 있습니다.</p>
            </div>
          ) : (
            <LibraryDetail
              key={selected}
              id={selected}
              categories={categories}
              defaultCategoryId={categoryId === 'ALL' ? (categories[0]?.id ?? null) : categoryId}
              onCreated={(id) => setSelected(id)}
              onDeleted={() => setSelected(null)}
            />
          )}
        </div>
      </div>
    </>
  );
}
