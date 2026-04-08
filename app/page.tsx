/**
 * app/page.tsx — Public landing page (stub)
 *
 * Phase D Task 1: this stub proves the route compiles alongside the moved
 * `/dashboard` route and removes the old duplicate-route hazard of
 * app/(app)/page.tsx. The real interactive FIRE calculator lands in
 * Tasks 2–6.
 *
 * This route is intentionally OUTSIDE the (app) route group so it is NOT
 * wrapped in <AuthGate>. Logged-in users will eventually see the same
 * page with an auth-aware header CTA; auto-redirecting to /dashboard
 * would take the "game" away from returning visitors.
 */

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#0A0A0A] text-[#FAFAFA] flex items-center justify-center p-8">
      <div className="max-w-sm text-center space-y-4">
        <h1 className="text-4xl font-semibold tracking-tight">compound</h1>
        <p className="text-sm text-[#A3A3A3]">
          Public landing dashboard arrives in Phase D tasks 2–6.
        </p>
        <p className="text-xs text-[#525252]">
          Signed in already? Visit{' '}
          <a href="/dashboard" className="text-[#10B981] hover:underline">
            /dashboard
          </a>
          .
        </p>
      </div>
    </main>
  );
}
