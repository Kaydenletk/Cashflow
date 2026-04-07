/**
 * components/auth/google-sign-in-button.tsx
 *
 * Branded Google sign-in button. Wraps shadcn <Button> + inline Google "G" SVG
 * so we don't take a dependency on an icon package for a single glyph.
 *
 * Behavior: calls useAuth().signIn() on click. Errors (user closed popup,
 * network failure) bubble up to a local error state shown below the button.
 */

'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/hooks/use-auth';

interface GoogleSignInButtonProps {
  /** Optional className forwarded to the <Button>. */
  className?: string;
}

export function GoogleSignInButton({ className }: GoogleSignInButtonProps) {
  const { signIn } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setError(null);
    setPending(true);
    try {
      await signIn();
      // onAuthChange will fire and useAuth updates; no redirect needed here.
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Sign-in failed. Please try again.';
      setError(message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Button
        variant="outline"
        size="lg"
        onClick={handleClick}
        disabled={pending}
        className={className}
      >
        <GoogleGlyph />
        <span>{pending ? 'Signing in…' : 'Continue with Google'}</span>
      </Button>
      {error ? (
        <p className="text-xs text-[#EF4444]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg
      viewBox="0 0 18 18"
      width="16"
      height="16"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.13 4.13 0 0 1-1.8 2.71v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.61z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.19l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.71a5.41 5.41 0 0 1 0-3.42V4.96H.96a9 9 0 0 0 0 8.08l3.01-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}
