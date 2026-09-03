'use client';

import { Plus, Search } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { openCommandPalette } from '@/components/shell/CommandPalette';

export function TopBar() {
  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-line bg-app px-5 print:hidden">
      <Link href="/calendar" className="flex w-[196px] items-center">
        <Image
          src="/logo-wide.png"
          alt="달성군남부노인복지관"
          width={1860}
          height={296}
          priority
          className="h-[30px] w-auto"
        />
      </Link>
      <span className="text-[13px] font-semibold tracking-[-0.01em] text-ink-muted">HeeDay</span>
      <div className="flex-1" />
      <button
        type="button"
        onClick={openCommandPalette}
        className="flex h-[34px] w-60 items-center gap-2 rounded-lg border border-line bg-surface px-3 text-[13px] text-ink-faint hover:border-ink-ghost"
      >
        <Search className="size-[15px]" />
        <span className="flex-1 text-left">검색 또는 명령</span>
        <kbd className="rounded bg-app px-1.5 py-0.5 font-sans text-[11px] text-ink-faint">Ctrl K</kbd>
      </button>
      <Link
        href="/programs/new"
        className="flex h-[34px] items-center gap-1.5 rounded-lg bg-ink pr-3.5 pl-2.5 text-[13.5px] font-medium text-white hover:bg-ink-soft"
      >
        <Plus className="size-[15px]" strokeWidth={2} />
        <span>일정 등록</span>
      </Link>
    </header>
  );
}
