'use client';

import { Plus } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useCreateTemplate, useTemplates } from '@/lib/api/queries';
import { PALETTE } from '@/lib/domain/colors';
import { cn } from '@/lib/utils';

export function TemplateList() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: templates = [], isLoading } = useTemplates();
  const create = useCreateTemplate();

  const match = /^\/templates\/(\d+)/.exec(pathname);
  const activeId = match ? Number(match[1]) : null;

  const createNew = async () => {
    try {
      const { id } = await create.mutateAsync({ name: '새 양식', color: 'rose', items: [] });
      router.push(`/templates/${id}`);
    } catch {
      toast.error('양식을 만들지 못했습니다.');
    }
  };

  return (
    <aside
      className={cn(
        'md:border-line flex w-full shrink-0 flex-col gap-0.5 px-2.5 py-4 md:w-[232px] md:border-r',
        activeId !== null && 'hidden md:flex',
      )}
    >
      <div className="flex items-center px-1.5 pb-2.5">
        <span className="text-ink-faint text-xs font-semibold">
          {isLoading ? '양식' : `양식 ${templates.length}개`}
        </span>
        <div className="flex-1" />
        <button
          type="button"
          onClick={createNew}
          disabled={create.isPending}
          className="text-brand hover:text-brand-deep flex items-center gap-1 text-xs font-semibold disabled:opacity-50"
        >
          <Plus className="size-[13px]" strokeWidth={2} />새 양식
        </button>
      </div>
      {templates.map((t) => {
        const active = t.id === activeId;
        return (
          <Link
            key={t.id}
            href={`/templates/${t.id}`}
            className={cn(
              'text-ink-soft hover:bg-surface/70 flex h-11 items-center gap-2.5 rounded-lg px-3 text-[13.5px] transition-colors md:h-10',
              active && 'bg-surface text-ink font-semibold shadow-[0_1px_2px_rgba(20,18,12,0.06)]',
            )}
          >
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ background: PALETTE[t.color].solid }}
            />
            <span className="truncate">{t.name}</span>
            <span className="text-ink-faint ml-auto text-[11.5px] font-normal">
              할 일 {t.itemCount}
            </span>
          </Link>
        );
      })}
    </aside>
  );
}
