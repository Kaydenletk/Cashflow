/**
 * components/landing/freedom-age.tsx
 *
 * Big number readout for the FIRE calculator. Springs smoothly between
 * slider-driven freedom ages instead of jumping instantly — this is
 * what sells the "game" feel of the landing page.
 *
 * Uses Framer Motion's useSpring + useTransform so the DOM only receives
 * text-node updates (no React re-renders per tick). `tabular-nums`
 * prevents digit-width jitter as the number animates.
 *
 * Renders an em-dash for Infinity (unreachable scenarios) and grays the
 * number so the user sees something is off without a hard error.
 */

'use client';

import { motion, useSpring, useTransform } from 'framer-motion';
import { useEffect } from 'react';

interface FreedomAgeProps {
  age: number;
}

export function FreedomAge({ age }: FreedomAgeProps) {
  // Start at 0 so the very first render appears to "count up" to the
  // default scenario (~51) on page load.
  const spring = useSpring(0, { stiffness: 120, damping: 20 });
  const rounded = useTransform(spring, (value) => Math.round(value).toString());

  useEffect(() => {
    if (Number.isFinite(age)) {
      spring.set(age);
    }
  }, [age, spring]);

  if (!Number.isFinite(age)) {
    return (
      <div className="text-7xl font-bold tabular-nums text-[#525252] leading-none">
        —
      </div>
    );
  }

  return (
    <motion.span className="text-7xl font-bold tabular-nums text-[#FAFAFA] leading-none">
      {rounded}
    </motion.span>
  );
}
