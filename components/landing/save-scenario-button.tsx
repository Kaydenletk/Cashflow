/**
 * components/landing/save-scenario-button.tsx
 *
 * Small inline pill button that lets users name + save the current
 * scenario to localStorage. Clicking opens an inline name input
 * (no modal overhead). Submit → save → fire analytics → close input.
 *
 * This is the explicit "I care enough to name this" surface on top of
 * the silent auto-save in FireCalculator. IKEA effect: named = owned.
 */

'use client';

import { useState } from 'react';

import { track } from '@/lib/analytics/track';
import { saveScenario } from '@/lib/scenarios/storage';
import type { Scenario } from '@/lib/scenarios/types';

interface SaveScenarioButtonProps {
  scenario: Scenario;
  freedomAge: number;
  /** Called after a successful save so the parent can refresh the drawer list. */
  onSaved?: () => void;
}

export function SaveScenarioButton({
  scenario,
  freedomAge,
  onSaved,
}: SaveScenarioButtonProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const record = saveScenario(scenario, name, freedomAge);
    if (record != null) {
      track('landing_scenario_saved', { name: record.name });
      onSaved?.();
    }
    setName('');
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-8 items-center rounded-full border border-[#262626] bg-[#141414] px-3 text-xs font-medium text-[#A3A3A3] transition-colors hover:bg-[#1a1a1a] hover:text-[#FAFAFA]"
      >
        Save this scenario
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name this plan…"
        autoFocus
        maxLength={40}
        className="h-8 rounded-full border border-[#262626] bg-[#0A0A0A] px-3 text-xs text-[#FAFAFA] outline-none focus:border-[#10B981]"
      />
      <button
        type="submit"
        className="inline-flex h-8 items-center rounded-full bg-[#10B981] px-3 text-xs font-medium text-[#0A0A0A] transition-colors hover:bg-[#10B981]/90"
      >
        Save
      </button>
      <button
        type="button"
        onClick={() => {
          setName('');
          setOpen(false);
        }}
        className="text-xs text-[#525252] hover:text-[#A3A3A3]"
      >
        Cancel
      </button>
    </form>
  );
}
