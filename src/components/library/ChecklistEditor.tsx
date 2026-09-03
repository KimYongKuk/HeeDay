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

  const update = (i: number, text: string) =>
    onChange(value.map((v, idx) => (idx === i ? text : v)));
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));
  const add = () => {
    setFocusIndex(value.length);
    onChange([...value, '']);
  };

  return (
    <div className="border-line bg-surface overflow-hidden rounded-xl border">
      <div className="border-line flex h-[42px] items-center gap-2 border-b px-3.5">
        <span className="text-[13.5px] font-semibold">{title}</span>
        <span className="text-ink-faint text-xs">{value.length}개</span>
        <div className="flex-1" />
        <button
          type="button"
          onClick={add}
          className="text-brand hover:text-brand-deep flex items-center gap-1 text-[12.5px] font-medium"
        >
          <Plus className="size-[13px]" strokeWidth={2} />줄 추가
        </button>
      </div>
      <div className="px-2 py-0.5">
        {value.length === 0 ? (
          <p className="text-ink-faint px-2 py-3 text-[12.5px]">등록된 체크리스트가 없습니다.</p>
        ) : (
          value.map((text, i) => (
            <div
              key={i}
              className="border-hairline flex h-[38px] items-center gap-2 border-b pr-1.5 pl-1.5 last:border-b-0"
            >
              <GripVertical className="text-ink-ghost size-3.5" />
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
                className="focus-visible:border-line h-7 flex-1 border-transparent bg-transparent px-1.5 shadow-none"
              />
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label="삭제"
                className="text-ink-ghost hover:bg-app hover:text-ink flex size-6 items-center justify-center rounded"
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
