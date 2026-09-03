'use client';

import {
  CalendarDays,
  CalendarOff,
  CalendarRange,
  Columns3,
  LayoutTemplate,
  ListChecks,
  Plus,
  Printer,
  SlidersHorizontal,
  Sun,
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import { useActionItems, usePrograms, useTemplates } from '@/lib/api/queries';
import { PALETTE, tagStyle } from '@/lib/domain/colors';
import { todayInSeoul } from '@/lib/utils/dates';

export const PALETTE_EVENT = 'heeday:palette';

export function openCommandPalette() {
  window.dispatchEvent(new CustomEvent(PALETTE_EVENT));
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  // Fetch only while open: this component lives in the layout and would otherwise warm the
  // query cache before page content hydrates, producing server/client HTML mismatches.
  const { data: programs = [] } = usePrograms({ status: 'ACTIVE' }, open);
  const { data: templates = [] } = useTemplates(open);
  const { data: actionItems = [] } = useActionItems(undefined, open);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    const onEvent = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener(PALETTE_EVENT, onEvent);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(PALETTE_EVENT, onEvent);
    };
  }, []);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const onCalendar = pathname.startsWith('/calendar');

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="명령"
      description="이동 또는 작업 검색"
      className="sm:max-w-[560px]"
    >
      <Command className="rounded-xl">
        <CommandInput placeholder="화면, 프로그램, 양식, 할 일 검색" />
        <CommandList className="max-h-[420px]">
          <CommandEmpty>일치하는 항목이 없습니다.</CommandEmpty>

          <CommandGroup heading="작업">
            <CommandItem onSelect={() => go('/programs/new')}>
              <Plus /> 일정 등록
            </CommandItem>
            <CommandItem onSelect={() => go(`/calendar?date=${todayInSeoul()}`)}>
              <Sun /> 오늘로 이동
            </CommandItem>
            {onCalendar ? (
              <CommandItem
                onSelect={() => {
                  setOpen(false);
                  setTimeout(() => window.print(), 150);
                }}
              >
                <Printer /> 월간 캘린더 인쇄
              </CommandItem>
            ) : null}
          </CommandGroup>

          <CommandSeparator />
          <CommandGroup heading="화면">
            <CommandItem onSelect={() => go('/calendar')}>
              <CalendarDays /> 캘린더 · 월<CommandShortcut>G M</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => go('/calendar?view=week')}>
              <Columns3 /> 캘린더 · 주
            </CommandItem>
            <CommandItem onSelect={() => go('/calendar?view=timeline')}>
              <CalendarRange /> 캘린더 · 타임라인
            </CommandItem>
            <CommandItem onSelect={() => go('/library')}>
              <ListChecks /> 할 일 목록
            </CommandItem>
            <CommandItem onSelect={() => go('/templates')}>
              <LayoutTemplate /> 프로그램 양식
            </CommandItem>
            <CommandItem onSelect={() => go('/closures')}>
              <CalendarOff /> 휴관일
            </CommandItem>
            <CommandItem onSelect={() => go('/settings')}>
              <SlidersHorizontal /> 설정
            </CommandItem>
          </CommandGroup>

          {programs.length > 0 ? (
            <>
              <CommandSeparator />
              <CommandGroup heading="진행 중인 일정">
                {programs.map((p) => (
                  <CommandItem
                    key={p.id}
                    value={`일정 ${p.name} ${p.templateName}`}
                    onSelect={() => go(`/programs/${p.id}`)}
                  >
                    <span
                      className="size-2 rounded-full"
                      style={{ background: PALETTE[p.color].solid }}
                    />
                    {p.name}
                    <span className="text-ink-faint ml-auto text-xs">
                      {p.startDate.slice(5).replace('-', '/')} –{' '}
                      {p.endDate.slice(5).replace('-', '/')}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          ) : null}

          {templates.length > 0 ? (
            <>
              <CommandSeparator />
              <CommandGroup heading="프로그램 양식">
                {templates.map((t) => (
                  <CommandItem
                    key={t.id}
                    value={`양식 ${t.name}`}
                    onSelect={() => go(`/templates/${t.id}`)}
                  >
                    <span
                      className="size-2 rounded-full"
                      style={{ background: PALETTE[t.color].solid }}
                    />
                    {t.name}
                    <span className="text-ink-faint ml-auto text-xs">할 일 {t.itemCount}개</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          ) : null}

          {actionItems.length > 0 ? (
            <>
              <CommandSeparator />
              <CommandGroup heading="할 일 항목">
                {actionItems.map((a) => (
                  <CommandItem
                    key={a.id}
                    value={`할 일 ${a.name} ${a.categoryName}`}
                    onSelect={() => go(`/library?id=${a.id}`)}
                  >
                    {a.name}
                    <span
                      className="ml-auto rounded px-1.5 py-px text-[10.5px] font-semibold"
                      style={tagStyle(a.categoryColor)}
                    >
                      {a.categoryName}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          ) : null}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
