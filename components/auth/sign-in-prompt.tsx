/**
 * components/auth/sign-in-prompt.tsx
 *
 * Shared sign-in landing UI. Used by both:
 *   - /sign-in (public route) — direct navigation
 *   - <AuthGate> (inside (app) layout) — fallback when user is null
 *
 * Single source of truth so branding + copy changes in one place apply
 * to both entry points.
 */

import { GoogleSignInButton } from '@/components/auth/google-sign-in-button';

export function SignInPrompt() {
  return (
    <main className="min-h-screen bg-[#0A0A0A] text-[#FAFAFA] flex items-center justify-center p-8">
      <div className="max-w-sm w-full text-center space-y-8">
        <div className="space-y-3">
          <h1 className="text-5xl font-bold tracking-tight">compound</h1>
          <p className="text-base text-[#A3A3A3]">
            See how today&apos;s spending shapes tomorrow&apos;s freedom.
          </p>
        </div>
        <GoogleSignInButton />
        <p className="text-xs text-[#A3A3A3]/70 leading-relaxed">
          Your data stays private. Upload a bank statement to see your
          ratios, asset curve, and retirement projection.
        </p>
      </div>
    </main>
  );
}
