/**
 * app/page.tsx — Public landing page (Phase D/E)
 *
 * Anyone visiting compound.app/ lands here on a dark, premium,
 * interactive FIRE calculator. Four sliders move the freedom date in
 * real time; an asset curve animates; a narrative sentence swaps based
 * on earlier/later than the default American path. The whole thing is
 * the "game" that pulls visitors in before the sign-in ask.
 *
 * This route lives OUTSIDE the (app) route group so it is NOT wrapped in
 * <AuthGate>. Logged-in users see the same layout with an auth-aware
 * header and CTA — no auto-redirect so the game stays replayable.
 *
 * Authed dashboard placeholder lives at /dashboard (moved in Task 1).
 * Real dashboard UI arrives in Phase H.
 *
 * `use client` because motion.h1/motion.p run here and the composed
 * children all use client-only hooks (useAuth, useState, framer-motion).
 */

'use client';

import { motion } from 'framer-motion';
import { Suspense } from 'react';

import { FireCalculator } from '@/components/landing/fire-calculator';
import { LandingCta } from '@/components/landing/landing-cta';
import { LandingHeader } from '@/components/landing/landing-header';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#0A0A0A] text-[#FAFAFA]">
      <LandingHeader />

      <div className="mx-auto w-full max-w-5xl px-4 pb-20 sm:px-6 lg:px-8">
        {/* Hero headline */}
        <div className="pt-6 pb-10 text-center lg:pt-12 lg:pb-14">
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-3xl font-bold tracking-tight text-[#FAFAFA] sm:text-4xl lg:text-5xl"
          >
            The day work becomes optional.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="mx-auto mt-4 max-w-xl text-sm text-[#A3A3A3] sm:text-base"
          >
            Move the inputs. Watch your freedom date move.
          </motion.p>
        </div>

        {/* Interactive calculator — Suspense boundary because
            FireCalculator uses useSearchParams() which Next 16
            requires to live inside Suspense for static rendering
            compat. Fallback is a same-height placeholder to avoid
            layout shift. */}
        <Suspense
          fallback={
            <div className="h-[560px] animate-pulse rounded-2xl border border-[#262626] bg-[#0F0F0F]" />
          }
        >
          <FireCalculator />
        </Suspense>

        {/* Bottom conversion card */}
        <div className="mt-10">
          <LandingCta />
        </div>
      </div>
    </main>
  );
}
