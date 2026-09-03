import type { ReactNode } from 'react';
import { TemplateList } from '@/components/templates/TemplateList';

export default function TemplatesLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1">
      <TemplateList />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
