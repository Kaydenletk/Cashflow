/**
 * components/landing/landing-cta.tsx
 *
 * Bottom "convert the visitor" card. Two variants depending on auth:
 *
 *   - Signed out: headline pushes from estimate → YOUR real numbers,
 *     primary action is <GoogleSignInButton>, secondary is /upload
 *     (which will force sign-in via <AuthGate> — graceful).
 *   - Signed in: primary action links to /dashboard, secondary to
 *     /upload for a new statement. Copy acknowledges they already
 *     have an account.
 *
 * Loading state renders a neutral skeleton to avoid flashing the wrong
 * CTA while Firebase auth resolves.
 */

'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

import { GoogleSignInButton } from '@/components/auth/google-sign-in-button';
import { useAuth } from '@/lib/hooks/use-auth';

export function LandingCta() {
  const { user, loading } = useAuth();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.5 }}
      className="rounded-2xl border border-[#262626] bg-[#0F0F0F] p-8 text-center shadow-lg shadow-black/20"
    >
      {loading && (
        <div className="flex flex-col items-center gap-4">
          <div className="h-6 w-64 animate-pulse rounded bg-[#141414]" />
          <div className="h-10 w-48 animate-pulse rounded bg-[#141414]" />
        </div>
      )}

      {!loading && !user && (
        <div className="flex flex-col items-center gap-4">
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-[#FAFAFA]">
              This is an estimate. Want to see{' '}
              <span className="text-[#10B981]">YOUR</span> real numbers?
            </h3>
            <p className="text-sm text-[#A3A3A3]">
              Upload a bank statement. We&apos;ll map every dollar to your
              retirement date.
            </p>
          </div>
          <GoogleSignInButton />
          <Link
            href="/upload"
            className="text-xs text-[#A3A3A3] underline-offset-4 transition hover:text-[#FAFAFA] hover:underline"
          >
            Or upload a statement →
          </Link>
        </div>
      )}

      {!loading && user && (
        <div className="flex flex-col items-center gap-4">
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-[#FAFAFA]">
              Ready to see YOUR real numbers?
            </h3>
            <p className="text-sm text-[#A3A3A3]">
              Your dashboard has your real ratios. Upload a new statement to
              refresh them.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href="/dashboard"
              className="inline-flex h-10 items-center justify-center rounded-lg bg-[#10B981] px-4 text-sm font-medium text-[#0A0A0A] transition-colors hover:bg-[#10B981]/90"
            >
              Go to your dashboard
            </Link>
            <Link
              href="/upload"
              className="inline-flex h-10 items-center justify-center rounded-lg border border-[#262626] bg-[#0A0A0A] px-4 text-sm font-medium text-[#FAFAFA] transition-colors hover:bg-[#141414]"
            >
              Upload a new statement
            </Link>
          </div>
        </div>
      )}
    </motion.div>
  );
}
