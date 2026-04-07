/**
 * app/sign-in/page.tsx
 *
 * Public sign-in page. Mirrors the <SignInPrompt> rendered by <AuthGate>
 * so that direct navigation to /sign-in behaves identically to hitting a
 * protected route while signed out.
 *
 * This route is intentionally OUTSIDE the (app) route group so it is NOT
 * wrapped in <AuthGate>.
 */

import { GoogleSignInButton } from '@/components/auth/google-sign-in-button';

export default function SignInPage() {
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
