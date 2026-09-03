'use client';

import {
  CalendarDays,
  CalendarOff,
  LayoutTemplate,
  ListChecks,
  SlidersHorizontal,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const ITEMS = [
  { href: '/calendar', label: '캘린더', icon: CalendarDays },
  { href: '/library', label: '할 일 목록', icon: ListChecks },
  { href: '/templates', label: '프로그램 양식', icon: LayoutTemplate },
  { href: '/closures', label: '휴관일', icon: CalendarOff },
] as const;

function NavItem({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: typeof CalendarDays;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'text-ink-soft hover:bg-surface/70 flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13.5px] transition-colors',
        active && 'bg-surface text-ink font-medium shadow-[0_1px_2px_rgba(20,18,12,0.06)]',
      )}
    >
      <Icon className="size-[17px]" strokeWidth={1.7} />
      <span>{label}</span>
    </Link>
  );
}

export function SideNav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href ||
    pathname.startsWith(`${href}/`) ||
    (href === '/calendar' && pathname.startsWith('/programs'));

  return (
    <nav className="border-line hidden w-[216px] shrink-0 flex-col gap-0.5 border-r px-3 py-4 md:flex print:hidden">
      {ITEMS.map((item) => (
        <NavItem key={item.href} {...item} active={isActive(item.href)} />
      ))}
      <div className="flex-1" />
      <NavItem
        href="/settings"
        label="설정"
        icon={SlidersHorizontal}
        active={isActive('/settings')}
      />
    </nav>
  );
}
