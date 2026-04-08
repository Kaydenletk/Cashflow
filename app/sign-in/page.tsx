/**
 * app/sign-in/page.tsx
 *
 * Public sign-in page. Reuses <SignInPrompt> so branding + copy stay in
 * one place. Watches useAuth — once the user is authenticated, this page
 * redirects to /dashboard. Without this, a successful Google sign-in
 * would leave the user staring at the sign-in screen because this route
 * is outside the (app) route group and has no <AuthGate>.
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { SignInPrompt } from '@/components/auth/sign-in-prompt';
import { useAuth } from '@/lib/hooks/use-auth';

export default function SignInPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  return <SignInPrompt />;
}
