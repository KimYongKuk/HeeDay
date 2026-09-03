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

  const activeId = (() => {
    const m = /^\/templates\/(\d+)/.exec(pathname);
    return m ? Number(m[1]) : null;
  })();

  const createNew = async () => {
    try {
      const { id } = await create.mutateAsync({ name: '새 양식', color: 'rose', items: [] });
      router.push(`/templates/${id}`);
    } catch {
      toast.error('양식을 만들지 못했습니다.');
    }
  };

  return (
    <aside className="flex w-[232px] shrink-0 flex-col gap-0.5 border-r border-line px-2.5 py-4">
      <div className="flex items-center px-1.5 pb-2.5">
        <span className="text-xs font-semibold text-ink-faint">
          {isLoading ? '양식' : `양식 ${templates.length}개`}
        </span>
        <div className="flex-1" />
        <button
          type="button"
          onClick={createNew}
          disabled={create.isPending}
          className="flex items-center gap-1 text-xs font-semibold text-brand hover:text-brand-deep disabled:opacity-50"
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
              'flex h-10 items-center gap-2.5 rounded-lg px-3 text-[13.5px] text-ink-soft transition-colors hover:bg-surface/70',
              active && 'bg-surface font-semibold text-ink shadow-[0_1px_2px_rgba(20,18,12,0.06)]',
            )}
          >
            <span className="size-2 shrink-0 rounded-full" style={{ background: PALETTE[t.color].solid }} />
            <span className="truncate">{t.name}</span>
            <span className="ml-auto text-[11.5px] font-normal text-ink-faint">{t.itemCount}</span>
          </Link>
        );
      })}
    </aside>
  );
}
