'use client';

import { Plus, Search } from 'lucide-react';
import Link from 'next/link';
import { openCommandPalette } from '@/components/shell/CommandPalette';
import { Logo } from '@/components/shell/Logo';

export function TopBar() {
  return (
    <header className="border-line bg-app flex h-14 shrink-0 items-center gap-3 border-b px-3 md:gap-4 md:px-5 print:hidden">
      <Link href="/calendar" className="flex items-center md:w-[196px]">
        <Logo />
      </Link>
      <span className="text-ink-muted hidden text-[13px] sm:inline">달성군남부노인복지관</span>
      <div className="flex-1" />
      <button
        type="button"
        onClick={openCommandPalette}
        aria-label="검색 또는 명령"
        className="border-line bg-surface text-ink-faint hover:border-ink-ghost flex h-[34px] items-center gap-2 rounded-lg border px-2.5 text-[13px] md:w-60 md:px-3"
      >
        <Search className="size-[15px]" />
        <span className="hidden flex-1 text-left md:inline">검색 또는 명령</span>
        <kbd className="bg-app text-ink-faint hidden rounded px-1.5 py-0.5 font-sans text-[11px] md:inline">
          Ctrl K
        </kbd>
      </button>
      <Link
        href="/programs/new"
        className="bg-ink hover:bg-ink-soft hidden h-[34px] items-center gap-1.5 rounded-lg pr-3.5 pl-2.5 text-[13.5px] font-medium text-white md:flex"
      >
        <Plus className="size-[15px]" strokeWidth={2} />
        <span>일정 등록</span>
      </Link>
    </header>
  );
}
