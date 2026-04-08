/**
 * components/landing/landing-header.tsx
 *
 * Top bar for the public landing page. Renders "compound" wordmark on
 * the left and an auth-aware CTA on the right:
 *
 *   - loading      → skeleton pill (prevents CTA flashing)
 *   - signed out   → "Continue with Google" → /sign-in
 *   - signed in    → "Welcome, {name} · Go to your dashboard" → /dashboard
 *
 * No auto-redirect: even signed-in users can replay the calculator here.
 * This is a deliberate UX choice — the landing page is the "game" and we
 * don't want to take it away once someone has signed up.
 */

'use client';

import Link from 'next/link';

import { useAuth } from '@/lib/hooks/use-auth';

export function LandingHeader() {
  const { user, loading } = useAuth();

  return (
    <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
      <Link
        href="/"
        className="text-lg font-semibold tracking-tight text-[#FAFAFA] transition-opacity hover:opacity-80"
      >
        compound
      </Link>

      <div className="flex items-center gap-3 text-sm">
        {loading && (
          <div className="h-8 w-40 animate-pulse rounded-lg bg-[#141414]" />
        )}

        {!loading && !user && (
          <Link
            href="/sign-in"
            className="inline-flex h-8 items-center rounded-lg border border-[#262626] bg-[#0F0F0F] px-3 text-sm font-medium text-[#FAFAFA] transition-colors hover:bg-[#141414]"
          >
            Continue with Google →
          </Link>
        )}

        {!loading && user && (
          <>
            <span className="hidden text-xs text-[#A3A3A3] sm:inline">
              Welcome, {user.displayName?.split(' ')[0] ?? 'friend'}
            </span>
            <Link
              href="/dashboard"
              className="inline-flex h-8 items-center rounded-lg bg-[#10B981] px-3 text-sm font-medium text-[#0A0A0A] transition-colors hover:bg-[#10B981]/90"
            >
              Go to your dashboard →
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
