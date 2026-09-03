'use client';

import { GripVertical, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';

export function ChecklistEditor({
  value,
  onChange,
  title = '기본 체크리스트',
}: {
  value: string[];
  onChange: (next: string[]) => void;
  title?: string;
}) {
  const [focusIndex, setFocusIndex] = useState<number | null>(null);

  const update = (i: number, text: string) => onChange(value.map((v, idx) => (idx === i ? text : v)));
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));
  const add = () => {
    setFocusIndex(value.length);
    onChange([...value, '']);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface">
      <div className="flex h-[42px] items-center gap-2 border-b border-line px-3.5">
        <span className="text-[13.5px] font-semibold">{title}</span>
        <span className="text-xs text-ink-faint">{value.length}개</span>
        <div className="flex-1" />
        <button
          type="button"
          onClick={add}
          className="flex items-center gap-1 text-[12.5px] font-medium text-brand hover:text-brand-deep"
        >
          <Plus className="size-[13px]" strokeWidth={2} />
          줄 추가
        </button>
      </div>
      <div className="px-2 py-0.5">
        {value.length === 0 ? (
          <p className="px-2 py-3 text-[12.5px] text-ink-faint">등록된 체크리스트가 없습니다.</p>
        ) : (
          value.map((text, i) => (
            <div
              key={i}
              className="flex h-[38px] items-center gap-2 border-b border-hairline pr-1.5 pl-1.5 last:border-b-0"
            >
              <GripVertical className="size-3.5 text-ink-ghost" />
              <Input
                value={text}
                autoFocus={focusIndex === i}
                onFocus={() => focusIndex === i && setFocusIndex(null)}
                onChange={(e) => update(i, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    add();
                  }
                }}
                placeholder="예: 출석부 · 명찰"
                className="h-7 flex-1 border-transparent bg-transparent px-1.5 shadow-none focus-visible:border-line"
              />
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label="삭제"
                className="flex size-6 items-center justify-center rounded text-ink-ghost hover:bg-app hover:text-ink"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
