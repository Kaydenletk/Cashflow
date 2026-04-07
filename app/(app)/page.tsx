/**
 * app/(app)/page.tsx — Compound dashboard (placeholder)
 *
 * Auth-gated by app/(app)/layout.tsx → AuthGate. Unauthenticated visitors
 * never see this page — they get the sign-in prompt instead.
 *
 * Phase C: placeholder that proves auth + route group boot correctly.
 * Phase H: replaced by the full bento dashboard (7 cells, ratios, curve).
 */

'use client';

import { useAuth } from '@/lib/hooks/use-auth';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const { user, signOut } = useAuth();

  // AuthGate guarantees user is non-null by the time this renders.
  const displayName = user?.displayName ?? user?.email ?? 'friend';

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-[#FAFAFA] flex items-center justify-center p-8">
      <div className="max-w-md text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-semibold tracking-tight">compound</h1>
          <p className="text-[#A3A3A3]">Welcome back, {displayName}.</p>
        </div>
        <p className="text-sm text-[#525252]">
          Phase C — upload flow arrives in Task 8. Bento dashboard in Phase H.
        </p>
        <Button variant="outline" size="sm" onClick={() => signOut()}>
          Sign out
        </Button>
      </div>
    </main>
  );
}
