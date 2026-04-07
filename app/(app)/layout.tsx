/**
 * app/(app)/layout.tsx
 *
 * Shared shell for all 4 in-app routes: TwoNumbersBar (top) + content + BottomNav.
 * <DailyVerdictGate /> is wired in Task 20 — left out of this commit so the
 * layout is buildable in isolation.
 */

import type { ReactNode } from 'react';

import { TwoNumbersBar } from '@/components/two-numbers-bar';
import { BottomNav } from '@/components/bottom-nav';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <TwoNumbersBar />
      <main className="flex-1 overflow-y-auto pb-20">{children}</main>
      <BottomNav />
    </div>
  );
}
