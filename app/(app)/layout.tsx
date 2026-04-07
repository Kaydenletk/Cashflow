/**
 * app/(app)/layout.tsx
 *
 * Layout for the authenticated route group. Every child route under (app)
 * is wrapped in <AuthGate>, so unauthenticated visitors see the sign-in
 * prompt automatically — no per-page boilerplate.
 *
 * The parenthesized (app) folder is a Next.js route group: it organizes
 * files without affecting URLs. So app/(app)/page.tsx still serves at "/".
 */

import type { ReactNode } from 'react';

import { AuthGate } from '@/components/auth/auth-gate';

export default function AppLayout({ children }: { children: ReactNode }) {
  return <AuthGate>{children}</AuthGate>;
}
