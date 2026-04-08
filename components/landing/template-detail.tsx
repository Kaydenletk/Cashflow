/**
 * components/landing/template-detail.tsx
 *
 * Focused editor that opens when a user clicks a life event template
 * card. Shows the template's question, 1-2 template-specific sliders,
 * and a live delta comparison against the baseline scenario:
 *
 *   Baseline: freedom at 51
 *   With this change: freedom at 48 (+3 years earlier)
 *
 * "Save as new scenario" wires to the Task 2 storage layer, so users
 * can stash a template result and keep it next to their other plans.
 *
 * Per Phase E research, the one feature that makes this feel magical
 * is comparing vs the CURRENTLY LOADED baseline (not DEFAULT_SCENARIO)
 * — if the user already has "Plan A" loaded, the template shows the
 * delta from Plan A, not from the generic default.
 */

'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';

import { SliderInput } from '@/components/landing/slider-input';
import { track } from '@/lib/analytics/track';
import {
  DEFAULT_ANNUAL_SPEND,
  computeFire,
} from '@/lib/calculations/fire';
import { saveScenario } from '@/lib/scenarios/storage';
import type { Scenario } from '@/lib/scenarios/types';
import {
  defaultTemplateInputs,
  type Template,
} from '@/lib/scenarios/templates';

interface TemplateDetailProps {
  template: Template | null;
  baseline: Scenario;
  onClose: () => void;
  /** Called after a successful save so the parent refreshes the drawer. */
  onSaved?: () => void;
}

function formatFreedomAge(age: number): string {
  if (!Number.isFinite(age)) return '—';
  return `freedom at ${Math.round(age)}`;
}

function formatDelta(baselineAge: number, newAge: number): string {
  if (!Number.isFinite(baselineAge) || !Number.isFinite(newAge)) {
    return 'Not reachable yet';
  }
  const diff = baselineAge - newAge;
  if (Math.abs(diff) < 0.1) return 'same date';
  if (diff > 0) return `${diff.toFixed(1)} years earlier`;
  return `${Math.abs(diff).toFixed(1)} years later`;
}

export function TemplateDetail({
  template,
  baseline,
  onClose,
  onSaved,
}: TemplateDetailProps) {
  return (
    <AnimatePresence>
      {template != null && (
        <DetailBody
          template={template}
          baseline={baseline}
          onClose={onClose}
          onSaved={onSaved}
        />
      )}
    </AnimatePresence>
  );
}

interface DetailBodyProps {
  template: Template;
  baseline: Scenario;
  onClose: () => void;
  onSaved?: () => void;
}

function DetailBody({ template, baseline, onClose, onSaved }: DetailBodyProps) {
  const [inputs, setInputs] = useState<Record<string, number>>(() =>
    defaultTemplateInputs(template),
  );

  // Baseline freedom age — recomputed for the current baseline scenario.
  const baselineResult = useMemo(
    () =>
      computeFire({
        ...baseline,
        annualSpend: baseline.annualSpend ?? DEFAULT_ANNUAL_SPEND,
      }),
    [baseline],
  );

  // Transformed scenario + its freedom age.
  const transformed = useMemo(
    () => template.apply(baseline, inputs),
    [template, baseline, inputs],
  );
  const transformedResult = useMemo(
    () =>
      computeFire({
        ...transformed,
        annualSpend: transformed.annualSpend ?? DEFAULT_ANNUAL_SPEND,
      }),
    [transformed],
  );

  const deltaText = formatDelta(
    baselineResult.freedomAge,
    transformedResult.freedomAge,
  );
  const deltaColor =
    Number.isFinite(baselineResult.freedomAge) &&
    Number.isFinite(transformedResult.freedomAge) &&
    transformedResult.freedomAge < baselineResult.freedomAge
      ? '#10B981'
      : '#A3A3A3';

  function handleSave() {
    const snapshot = Number.isFinite(transformedResult.freedomAge)
      ? transformedResult.freedomAge
      : -1;
    const record = saveScenario(transformed, template.label, snapshot);
    if (record != null) {
      track('landing_scenario_saved', { name: record.name });
      onSaved?.();
    }
    onClose();
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
      />

      {/* Centered card overlay */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[#262626] bg-[#0F0F0F] p-6 shadow-2xl"
      >
        <header className="mb-5">
          <div className="text-xs uppercase tracking-wide text-[#A3A3A3]">
            {template.label}
          </div>
          <h3 className="mt-2 text-xl font-semibold text-[#FAFAFA]">
            {template.question}
          </h3>
          <p className="mt-2 text-xs text-[#A3A3A3] leading-relaxed">
            {template.description}
          </p>
        </header>

        {/* Sliders */}
        <div className="flex flex-col gap-5">
          {template.fields.map((field) => (
            <SliderInput
              key={field.key}
              label={field.label}
              value={inputs[field.key] ?? field.defaultValue}
              onChange={(next) =>
                setInputs((prev) => ({ ...prev, [field.key]: next }))
              }
              min={field.min}
              max={field.max}
              step={field.step}
              format={field.format}
            />
          ))}
        </div>

        {/* Delta display */}
        <div className="mt-6 rounded-xl border border-[#262626] bg-[#0A0A0A] p-4">
          <div className="flex items-baseline justify-between text-xs text-[#A3A3A3]">
            <span>Baseline</span>
            <span className="font-medium text-[#FAFAFA]">
              {formatFreedomAge(baselineResult.freedomAge)}
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between text-xs text-[#A3A3A3]">
            <span>With this change</span>
            <span
              className="font-medium tabular-nums"
              style={{ color: deltaColor }}
            >
              {formatFreedomAge(transformedResult.freedomAge)}
              <span className="ml-2 text-[10px]">({deltaText})</span>
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 items-center rounded-full px-3 text-xs font-medium text-[#A3A3A3] transition-colors hover:text-[#FAFAFA]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex h-8 items-center rounded-full bg-[#10B981] px-3 text-xs font-medium text-[#0A0A0A] transition-colors hover:bg-[#10B981]/90"
          >
            Save as new scenario
          </button>
        </div>
      </motion.div>
    </>
  );
}
