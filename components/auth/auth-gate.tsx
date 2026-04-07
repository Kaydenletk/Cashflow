/**
 * components/auth/auth-gate.tsx
 *
 * Wraps children and only renders them when a user is authenticated.
 * Placed at app/(app)/layout.tsx so every route under the (app) group
 * is protected without per-page boilerplate.
 *
 * Three render states:
 *   1. loading  → minimal skeleton (avoid content flash)
 *   2. no user  → <SignInPrompt> with Google button
 *   3. user     → children (the real app)
 *
 * A tiny skeleton (not a spinner) is used during loading to keep the
 * premium, calm feel consistent with the dark minimal design philosophy.
 */

'use client';

import type { ReactNode } from 'react';

import { useAuth } from '@/lib/hooks/use-auth';
import { GoogleSignInButton } from '@/components/auth/google-sign-in-button';

interface AuthGateProps {
  children: ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        className="min-h-screen bg-[#0A0A0A] flex items-center justify-center"
        aria-busy="true"
      >
        <div className="h-8 w-32 rounded-md bg-[#141414] animate-pulse" />
      </div>
    );
  }

  if (!user) {
    return <SignInPrompt />;
  }

  return <>{children}</>;
}

function SignInPrompt() {
  return (
    <main className="min-h-screen bg-[#0A0A0A] text-[#FAFAFA] flex items-center justify-center p-8">
      <div className="max-w-sm w-full text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-semibold tracking-tight">compound</h1>
          <p className="text-sm text-[#A3A3A3]">
            Financial time machine for your money.
          </p>
        </div>
        <GoogleSignInButton />
        <p className="text-xs text-[#525252]">
          Sign in to upload statements and see how today&apos;s habits shape
          your retirement date.
        </p>
      </div>
    </main>
  );
}
