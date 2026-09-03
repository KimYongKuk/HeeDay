'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useActionItems } from '@/lib/api/queries';
import { tagStyle } from '@/lib/domain/colors';
import type { ActionItemDto } from '@/lib/domain/dto';
import { cn } from '@/lib/utils';

export function LibraryPicker({
  usedActionItemIds,
  onPick,
}: {
  usedActionItemIds: Set<number>;
  onPick: (item: ActionItemDto) => void;
}) {
  const [open, setOpen] = useState(false);
  const { data: items = [] } = useActionItems();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="mt-1 flex h-[34px] w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-ink-ghost/70 text-[12.5px] font-medium text-brand hover:border-brand hover:bg-brand-soft/40"
          />
        }
      >
        <Plus className="size-[13px]" strokeWidth={2} />
        할 일 목록에서 추가
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0">
        <Command>
          <CommandInput placeholder="할 일 검색" />
          <CommandList className="max-h-72">
            <CommandEmpty>일치하는 할 일이 없습니다.</CommandEmpty>
            <CommandGroup>
              {items.map((it) => {
                const used = usedActionItemIds.has(it.id);
                return (
                  <CommandItem
                    key={it.id}
                    value={`${it.name} ${it.categoryName}`}
                    onSelect={() => {
                      onPick(it);
                      setOpen(false);
                    }}
                    className={cn('gap-2', used && 'opacity-50')}
                  >
                    <span className="truncate">{it.name}</span>
                    <span className="ml-auto rounded px-1.5 py-px text-[10.5px] font-semibold" style={tagStyle(it.categoryColor)}>
                      {it.categoryName}
                    </span>
                    {used ? <span className="text-[11px] text-ink-faint">추가됨</span> : null}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
