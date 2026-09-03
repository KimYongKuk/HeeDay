'use client';

import { CalendarDays, CalendarOff, LayoutTemplate, ListChecks, Plus } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const ITEMS = [
  { href: '/calendar', label: '캘린더', icon: CalendarDays },
  { href: '/library', label: '할 일', icon: ListChecks },
  { href: '/programs/new', label: '등록', icon: Plus, primary: true },
  { href: '/templates', label: '양식', icon: LayoutTemplate },
  { href: '/closures', label: '휴관일', icon: CalendarOff },
] as const;

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="border-line bg-surface/95 fixed inset-x-0 bottom-0 z-40 grid h-14 grid-cols-5 border-t backdrop-blur md:hidden print:hidden">
      {ITEMS.map((it) => {
        const active =
          pathname === it.href ||
          pathname.startsWith(`${it.href}/`) ||
          (it.href === '/calendar' && /^\/programs\/\d+/.test(pathname));
        const Icon = it.icon;
        if ('primary' in it && it.primary) {
          return (
            <Link
              key={it.href}
              href={it.href}
              className="text-ink-muted flex flex-col items-center justify-center gap-0.5 text-[10.5px] font-medium"
            >
              <span className="bg-ink flex size-8 items-center justify-center rounded-full text-white">
                <Icon className="size-4" strokeWidth={2.2} />
              </span>
            </Link>
          );
        }
        return (
          <Link
            key={it.href}
            href={it.href}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 text-[10.5px] font-medium',
              active ? 'text-brand' : 'text-ink-muted',
            )}
          >
            <Icon className="size-5" strokeWidth={active ? 2.2 : 1.8} />
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
