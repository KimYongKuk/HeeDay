import type { ReactNode } from 'react';
import { AssistantWidget } from '@/components/assistant/AssistantWidget';
import { CommandPalette } from '@/components/shell/CommandPalette';
import { MobileNav } from '@/components/shell/MobileNav';
import { QueryProvider } from '@/components/shell/QueryProvider';
import { SideNav } from '@/components/shell/SideNav';
import { TopBar } from '@/components/shell/TopBar';
import { Toaster } from '@/components/ui/sonner';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <div className="bg-app text-ink flex h-dvh flex-col print:h-auto print:bg-white">
        <TopBar />
        <div className="flex min-h-0 flex-1 print:block">
          <SideNav />
          <main className="flex min-w-0 flex-1 flex-col pb-14 md:pb-0 print:block print:pb-0">
            {children}
          </main>
        </div>
      </div>
      <MobileNav />
      <CommandPalette />
      <AssistantWidget />
      {/* bottom-center: the bottom-right corner belongs to the AI 도우미 button */}
      <Toaster position="bottom-center" />
    </QueryProvider>
  );
}
