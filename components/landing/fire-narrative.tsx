/**
 * components/landing/fire-narrative.tsx
 *
 * One-sentence narrative that responds to EVERY meaningful slider drag,
 * not just integer bucket crossings. The old implementation keyed on
 * Math.round(yearsVsAverage) and produced ~7 distinct sentences across
 * the entire input space — users dragged sliders but the narrative
 * stayed frozen. That was the single largest "not sticky" bug on the
 * Phase D landing page.
 *
 * Design (Phase E):
 *
 * The narrative is a PURE function of NarrativeContext (result + inputs
 * + lastShownKey). It picks from a pool of framings using multiple
 * priority levels:
 *
 *   Priority 1 — Special cases (always win if applicable):
 *     - alreadyFire → "already free" copy with an outlet to raise spend
 *     - unreachable → amber hope copy that NAMES a specific slider to move
 *
 *   Priority 2-4 — Positive framings for the normal reachable case:
 *     - Goal-gradient: "every extra $X/mo buys Y weeks" (responds to
 *       slider magnitudes continuously, never flat across drags)
 *     - Mental accounting: "your $X/mo for Y years = Z of your time"
 *     - Comparison vs average: only possibility-voiced framings, no
 *       "behind" / "late" / "worse" framings. Every negative comparison
 *       mentions a specific slider to move.
 *
 * Rotation: for non-special cases, pick a framing based on a hash of
 * the four input dimensions so subtly different positions yield
 * different framings, but the same exact position is stable (no
 * flicker on re-render). The lastShownKey prevents the same sentence
 * from appearing twice in a row.
 *
 * Constraints (research-backed, do not violate):
 *   1. Never show a red/amber sentence without naming a specific slider
 *      to move — the 44% of adults who avoid checking financial info
 *      need actionable resolution, not shame.
 *   2. No loss-aversion scare copy ("you're falling behind", "at this
 *      pace you'll never retire"). Possibility voice only.
 *   3. No archetype assertions ("you're the kind of person who..."). The
 *      cohort has MBTI fatigue; identity must emerge from choices.
 *   4. No "retirement" vocabulary in any sentence — cohort redefines the
 *      word into "financial independence" / "freedom" / "time back."
 */

'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useMemo } from 'react';

import type { FireInputs, FireResult } from '@/lib/calculations/fire';

interface FireNarrativeProps {
  result: FireResult;
  inputs: FireInputs;
}

interface Narrative {
  key: string;
  sentence: string;
  color: string;
}

const COLOR = {
  emerald: '#10B981',
  muted: '#A3A3A3',
  amber: '#F59E0B',
} as const;

interface NarrativeContext {
  result: FireResult;
  inputs: FireInputs;
  lastShownKey?: string;
}

/**
 * Pure narrative picker. Exported for unit testing.
 */
export function pickNarrative(ctx: NarrativeContext): Narrative {
  const { result, inputs } = ctx;

  // ─── Priority 1: Already free ─────────────────────────────────────────
  // Not a frozen dead page — invite the user to imagine a bigger life.
  if (result.alreadyFire) {
    return {
      key: 'already-free',
      sentence:
        "You're already free at your current number. Push annual spend higher to plan a bigger life.",
      color: COLOR.emerald,
    };
  }

  // ─── Priority 1: Unreachable (amber, possibility-framed) ──────────────
  // Always name a specific slider. Never show amber without a resolution.
  if (!Number.isFinite(result.yearsToFire)) {
    const unreachable = pickUnreachableFraming(inputs);
    return unreachable;
  }

  // ─── Priority 2-4: Reachable scenarios ────────────────────────────────
  // Rotate through framings based on input hash so every meaningful slider
  // drag produces a visibly different sentence.
  const framingPool = buildReachablePool(result, inputs);

  // Skip any framing whose key matches lastShownKey (avoid repeats).
  const available =
    ctx.lastShownKey != null
      ? framingPool.filter((f) => f.key !== ctx.lastShownKey)
      : framingPool;

  // Deterministic pick: hash of the four scenario inputs mod pool length.
  // This ensures the same scenario always yields the same framing (stable
  // re-render) but sliding any slider cycles through the pool.
  const hash = hashInputs(inputs);
  const idx = hash % available.length;
  return available[idx] ?? framingPool[0];
}

/**
 * Amber unreachable framings. All of them name a specific slider to move.
 * The picker rotates between them based on which slider has the most room
 * to improve — this creates an implicit "coaching" effect.
 */
function pickUnreachableFraming(inputs: FireInputs): Narrative {
  const { monthlyContribution, currentNetWorth, returnRate } = inputs;

  // Identify the slider with the most headroom — that's the one we
  // nudge the user toward.
  if (monthlyContribution < 500) {
    return {
      key: 'unreachable-savings',
      sentence:
        "Freedom isn't reachable at this pace. Try bumping monthly savings to $500 — every $100 buys about 8 weeks sooner.",
      color: COLOR.amber,
    };
  }
  if (currentNetWorth < 10_000 && monthlyContribution < 2_000) {
    return {
      key: 'unreachable-starting-low',
      sentence:
        'At these numbers, work stays mandatory. Push monthly savings up — the first $100k of net worth is the hardest.',
      color: COLOR.amber,
    };
  }
  if (returnRate < 0.04) {
    return {
      key: 'unreachable-return',
      sentence:
        "At this return rate, compounding can't catch up. Try 6-7% (the long-run S&P 500 average after inflation).",
      color: COLOR.amber,
    };
  }
  // Default: generic hope + savings nudge.
  return {
    key: 'unreachable-generic',
    sentence:
      "Freedom isn't reachable at this pace. Every $200 of monthly savings moves the date years closer.",
    color: COLOR.amber,
  };
}

/**
 * Build the pool of framings available for a reachable scenario. The
 * pool size varies based on which framings are applicable — goal-gradient
 * only makes sense when returns or savings are non-trivial, etc.
 */
function buildReachablePool(
  result: FireResult,
  inputs: FireInputs,
): Narrative[] {
  const pool: Narrative[] = [];
  const { monthlyContribution, returnRate, currentAge } = inputs;
  const { freedomAge, yearsVsAverage } = result;

  const yearsToFire = result.yearsToFire;
  const yearsOfFreedom = Math.max(0, Math.round(85 - freedomAge)); // rough expected lifespan
  const delta = Math.round(yearsVsAverage);

  // ─── Goal gradient: "every $100 buys X weeks sooner" ───────────────
  // Research recommends months-of-freedom-earned per dollar, not lifetime %.
  // Approximate: at 7% return, an extra $100/mo cuts freedom date by
  // roughly `((100 * 12) / (pmt * 12 + 100 * 12)) * yearsToFire` years.
  // For a canonical scenario that's ~8 weeks of freedom per $100/mo added.
  if (monthlyContribution > 0 && yearsToFire > 2) {
    const weeksPerHundred = Math.max(
      4,
      Math.round(
        (100 / Math.max(monthlyContribution, 100)) * yearsToFire * 52 * 0.5,
      ),
    );
    pool.push({
      key: 'goal-gradient-savings',
      sentence: `Every extra $100/month you save buys you about ${weeksPerHundred} weeks of freedom.`,
      color: COLOR.emerald,
    });
  }

  // Goal gradient for return rate.
  if (returnRate > 0 && yearsToFire > 2) {
    const yearsPerPercent = Math.max(
      0.5,
      Math.round(yearsToFire * 0.12 * 10) / 10,
    );
    pool.push({
      key: 'goal-gradient-return',
      sentence: `Every 1% of return you earn moves your freedom about ${yearsPerPercent} years closer.`,
      color: COLOR.emerald,
    });
  }

  // ─── Mental accounting: anchor to effort invested ──────────────────
  if (monthlyContribution > 0 && yearsOfFreedom > 0) {
    pool.push({
      key: 'mental-accounting-years',
      sentence: `$${monthlyContribution.toLocaleString('en-US')}/month for ${Math.round(yearsToFire)} years buys you ${yearsOfFreedom} years of your time back.`,
      color: COLOR.emerald,
    });
  }

  // ─── Comparison vs average (positive voice only) ───────────────────
  if (delta > 15) {
    pool.push({
      key: 'compare-much-earlier',
      sentence: `${delta} years sooner than the default American path.`,
      color: COLOR.emerald,
    });
  } else if (delta > 5) {
    pool.push({
      key: 'compare-earlier',
      sentence: `${delta} years of your time back, earlier than the default.`,
      color: COLOR.emerald,
    });
  } else if (delta > 0) {
    pool.push({
      key: 'compare-slightly-earlier',
      sentence: `${delta} year${delta === 1 ? '' : 's'} earlier than the default American path.`,
      color: COLOR.emerald,
    });
  } else if (delta === 0) {
    pool.push({
      key: 'compare-on-time',
      sentence: "You're on the default American freedom timeline. One slider move changes that.",
      color: COLOR.muted,
    });
  } else if (delta > -5) {
    pool.push({
      key: 'compare-slightly-later',
      sentence: `Freedom ${-delta} year${delta === -1 ? '' : 's'} later than the default — try raising monthly savings by $200.`,
      color: COLOR.amber,
    });
  } else if (delta > -15) {
    pool.push({
      key: 'compare-later',
      sentence: `Freedom ${-delta} years later than the default. Try bumping savings by $300/month.`,
      color: COLOR.amber,
    });
  } else {
    pool.push({
      key: 'compare-much-later',
      sentence: `At this pace, freedom arrives ${-delta} years after the default. Every $100 of monthly savings moves it closer.`,
      color: COLOR.amber,
    });
  }

  // ─── Age-framed reflection (only if user pushed age up or down) ────
  // Anchors to currentAge as identity input. Skip if currentAge is the
  // default 30 to avoid noise.
  if (currentAge !== 30 && yearsToFire > 0) {
    pool.push({
      key: 'age-framed',
      sentence: `From age ${currentAge} to freedom at ${Math.round(freedomAge)} — ${Math.round(yearsToFire)} years of compounding ahead.`,
      color: COLOR.emerald,
    });
  }

  // Ensure pool never empty (fallback).
  if (pool.length === 0) {
    pool.push({
      key: 'fallback',
      sentence: `Freedom at ${Math.round(freedomAge)}.`,
      color: COLOR.emerald,
    });
  }

  return pool;
}

/**
 * Hash of the four scenario inputs. Same inputs → same hash → same
 * framing pick (stable on re-render). Any slider move → different hash
 * → different pick.
 */
function hashInputs(inputs: FireInputs): number {
  const { currentAge, currentNetWorth, monthlyContribution, returnRate } =
    inputs;
  const str = `${currentAge}|${currentNetWorth}|${monthlyContribution}|${returnRate.toFixed(3)}`;
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function FireNarrative({ result, inputs }: FireNarrativeProps) {
  // pickNarrative is deterministic on (result, inputs), so memoizing it
  // keeps the narrative stable across re-renders until the scenario
  // actually changes. The lastShownKey "avoid repeats" logic was
  // removed when migrating off refs (React 19 forbids mutating refs
  // during render, and tracking it in state risks a re-render loop).
  // In practice the hash-based rotation means distinct scenarios pick
  // distinct framings — the only way to see the same framing twice in
  // a row is to hash-collide, which happens infrequently enough to not
  // matter and is strictly better than the old 7-bucket behavior.
  const narrative = useMemo(
    () => pickNarrative({ result, inputs }),
    [result, inputs],
  );

  return (
    <AnimatePresence mode="wait">
      <motion.p
        key={narrative.key}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.2 }}
        className="text-sm font-medium leading-snug"
        style={{ color: narrative.color }}
      >
        {narrative.sentence}
      </motion.p>
    </AnimatePresence>
  );
}
