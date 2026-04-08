/**
 * components/landing/fire-narrative.tsx
 *
 * One-sentence narrative that swaps based on how the user's retirement
 * age compares to the population average (AVERAGE_RETIREMENT_AGE = 65).
 *
 * The sentence is keyed on its own content so <AnimatePresence> tracks
 * the transition — different strings mean different keys, which means
 * the old <motion.p> exits while the new one enters. Keying on the
 * number alone would miss cases where the bucket changes but the
 * integer happens to match.
 */

'use client';

import { AnimatePresence, motion } from 'framer-motion';

import type { FireResult } from '@/lib/calculations/fire';

interface FireNarrativeProps {
  result: FireResult;
}

interface Narrative {
  sentence: string;
  color: string;
}

function pickNarrative(result: FireResult): Narrative {
  if (result.alreadyFire) {
    return {
      sentence: "You're already there. Every day from now is bonus.",
      color: '#10B981',
    };
  }
  if (!Number.isFinite(result.yearsToFire)) {
    return {
      sentence: 'Unreachable at this pace. Nudge the sliders.',
      color: '#F59E0B',
    };
  }

  const delta = Math.round(result.yearsVsAverage);

  if (delta > 15) {
    return {
      sentence: `${delta} years earlier than the average American retirement.`,
      color: '#10B981',
    };
  }
  if (delta > 5) {
    return {
      sentence: `On track to retire ${delta} years earlier than average.`,
      color: '#10B981',
    };
  }
  if (delta > 0) {
    return {
      sentence: `${delta} year${delta === 1 ? '' : 's'} earlier than normal.`,
      color: '#10B981',
    };
  }
  if (delta === 0) {
    return {
      sentence: 'Right on the average retirement timeline.',
      color: '#A3A3A3',
    };
  }
  if (delta > -5) {
    return {
      sentence: `${-delta} year${delta === -1 ? '' : 's'} later than average.`,
      color: '#F59E0B',
    };
  }
  return {
    sentence: `At this pace, retirement comes ${-delta} years later than normal.`,
    color: '#F59E0B',
  };
}

export function FireNarrative({ result }: FireNarrativeProps) {
  const narrative = pickNarrative(result);

  return (
    <AnimatePresence mode="wait">
      <motion.p
        key={narrative.sentence}
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
