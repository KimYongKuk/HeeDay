import type { ReactNode } from 'react';
import { CommandPalette } from '@/components/shell/CommandPalette';
import { QueryProvider } from '@/components/shell/QueryProvider';
import { SideNav } from '@/components/shell/SideNav';
import { TopBar } from '@/components/shell/TopBar';
import { Toaster } from '@/components/ui/sonner';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <div className="flex h-dvh flex-col bg-app text-ink print:h-auto print:bg-white">
        <TopBar />
        <div className="flex min-h-0 flex-1 print:block">
          <SideNav />
          <main className="flex min-w-0 flex-1 flex-col print:block">{children}</main>
        </div>
      </div>
      <CommandPalette />
      <Toaster position="bottom-right" />
    </QueryProvider>
  );
}
