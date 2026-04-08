/**
 * components/landing/share-scenario-button.tsx
 *
 * Copies the current page URL to clipboard and shows a small "Link
 * copied" toast. The URL contains the full scenario state thanks to
 * the Task 2.2 URL sync, so sharing this link is literally sharing
 * the scenario.
 *
 * Per Phase E research, the share-by-URL loop is Compound's organic
 * growth mechanic — every shared link becomes a landing page for a
 * new user. We track share events so Phase F analytics can measure
 * loop activation.
 */

'use client';

import { useState } from 'react';

import { track } from '@/lib/analytics/track';

export function ShareScenarioButton() {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    if (typeof window === 'undefined') return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      track('landing_scenario_shared');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API blocked (e.g. non-HTTPS context, permissions
      // denied). Silently fail — users can still copy from the address
      // bar.
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex h-8 items-center rounded-full border border-[#262626] bg-[#141414] px-3 text-xs font-medium text-[#A3A3A3] transition-colors hover:bg-[#1a1a1a] hover:text-[#FAFAFA]"
    >
      {copied ? '✓ Link copied' : 'Share'}
    </button>
  );
}
