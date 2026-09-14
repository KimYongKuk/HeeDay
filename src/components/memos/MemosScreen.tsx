'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { MemoComposer, MemoList } from '@/components/memos/MemoList';
import { useMemos, usePrograms } from '@/lib/api/queries';
import { PALETTE } from '@/lib/domain/colors';
import { cn } from '@/lib/utils';

const ALL = 'all';
const NONE = 'none';

/** Full-page memo list; the mobile tab and the desktop "전체 보기" link land here. */
export function MemosScreen() {
  const { data: memos = [], isLoading } = useMemos();
  const { data: programs = [] } = usePrograms({ status: 'ACTIVE' });
  const [filter, setFilter] = useState<string>(ALL);

  const tagged = new Map<number, { name: string; color: keyof typeof PALETTE; count: number }>();
  for (const m of memos) {
    if (m.programId === null || !m.programName || !m.programColor) continue;
    const cur = tagged.get(m.programId);
    if (cur) cur.count += 1;
    else tagged.set(m.programId, { name: m.programName, color: m.programColor, count: 1 });
  }
  const untagged = memos.filter((m) => m.programId === null).length;
  const shown =
    filter === ALL
      ? memos
      : filter === NONE
        ? memos.filter((m) => m.programId === null)
        : memos.filter((m) => m.programId === Number(filter));

  const chip = (value: string, label: string, count: number, color?: string) => (
    <button
      key={value}
      type="button"
      onClick={() => setFilter(value)}
      className={cn(
        'flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-[12px] font-medium',
        filter === value
          ? 'border-ink bg-ink text-white'
          : 'border-line bg-surface text-ink-soft hover:border-ink-ghost',
      )}
    >
      {color ? <span className="size-2 rounded-full" style={{ background: color }} /> : null}
      {label}
      <span className={cn('text-[11px]', filter === value ? 'opacity-70' : 'text-ink-faint')}>
        {count}
      </span>
    </button>
  );

  return (
    <>
      <PageHeader title="메모" subtitle="못한 일, 해야 할 일을 적어 두는 곳. 프로그램별로 묶어 볼 수 있습니다." />
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-8 md:px-5">
        <div className="mx-auto flex w-full max-w-[720px] flex-col gap-4">
          <MemoComposer programs={programs} />
          <div className="flex flex-wrap gap-1.5">
            {chip(ALL, '전체', memos.length)}
            {untagged > 0 ? chip(NONE, '프로그램 없음', untagged) : null}
            {[...tagged.entries()].map(([id, t]) =>
              chip(String(id), t.name, t.count, PALETTE[t.color].solid),
            )}
          </div>
          {isLoading ? (
            <p className="text-ink-faint text-[13px]">불러오는 중</p>
          ) : (
            <MemoList
              memos={shown}
              programs={programs}
              emptyText="메모가 없습니다. 위에서 첫 메모를 추가하세요."
            />
          )}
        </div>
      </div>
    </>
  );
}
