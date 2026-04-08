/**
 * components/landing/fire-calculator.tsx
 *
 * Stateful container that owns the scenario and composes all four display
 * components. Upstream props are none — this is a self-contained
 * interactive demo.
 *
 * Update flow per slider drag:
 *   1. Slider onValueChange → setScenario
 *   2. React 18 batches the update in one render
 *   3. useMemo(computeFire) recomputes (< 1ms)
 *   4. useMemo(projectCurve) regenerates chart data (~30-60 iterations)
 *   5. FreedomAge spring tweens to new value
 *   6. AssetCurveChart re-renders with Recharts 300ms animation
 *   7. FireNarrative fades to new copy via AnimatePresence
 *
 * No debouncing: the math is cheap and debouncing would feel sticky.
 *
 * Annual spending is locked at DEFAULT_ANNUAL_SPEND ($40k → $1M target)
 * for the MVP. A fifth slider is the obvious follow-up if users ask.
 */

'use client';

import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';

import { AssetCurveChart } from '@/components/landing/asset-curve-chart';
import { FireNarrative } from '@/components/landing/fire-narrative';
import { FreedomAge } from '@/components/landing/freedom-age';
import { SliderInput } from '@/components/landing/slider-input';
import {
  DEFAULT_ANNUAL_SPEND,
  computeFire,
  projectCurve,
  type FireInputs,
} from '@/lib/calculations/fire';
import {
  DEFAULT_SCENARIO,
  SCENARIO_BOUNDS,
  type Scenario,
} from '@/lib/scenarios/types';

function formatDollars(value: number): string {
  return `$${value.toLocaleString('en-US')}`;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(0)}%`;
}

function formatAge(value: number): string {
  return `${value} yrs`;
}

const CARD_CLASS =
  'rounded-2xl border border-[#262626] bg-[#0F0F0F] p-6 shadow-lg shadow-black/20';

export function FireCalculator() {
  const [scenario, setScenario] = useState<Scenario>(DEFAULT_SCENARIO);

  const inputs: FireInputs = useMemo(
    () => ({
      currentAge: scenario.currentAge,
      currentNetWorth: scenario.currentNetWorth,
      monthlyContribution: scenario.monthlyContribution,
      returnRate: scenario.returnRate,
      annualSpend: scenario.annualSpend ?? DEFAULT_ANNUAL_SPEND,
    }),
    [scenario],
  );

  const result = useMemo(() => computeFire(inputs), [inputs]);
  const curveData = useMemo(() => projectCurve(inputs), [inputs]);

  return (
    <div className="flex flex-col gap-6">
      {/* Top row: big number + chart side by side on desktop */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          className={`${CARD_CLASS} lg:col-span-4 flex flex-col justify-between gap-6`}
        >
          <div>
            <div className="text-xs uppercase tracking-wide text-[#A3A3A3]">
              Work becomes optional at
            </div>
            <div className="mt-3">
              <FreedomAge age={result.freedomAge} />
            </div>
          </div>
          <FireNarrative result={result} inputs={inputs} />
        </motion.div>

        <div className={`${CARD_CLASS} lg:col-span-8`}>
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-xs uppercase tracking-wide text-[#A3A3A3]">
              Your trajectory
            </span>
            <span className="text-xs text-[#525252]">
              Your number: ${(result.target / 1_000_000).toFixed(1)}M
            </span>
          </div>
          <AssetCurveChart
            data={curveData}
            freedomAge={result.freedomAge}
          />
        </div>
      </div>

      {/* Sliders row */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.5 }}
        className={CARD_CLASS}
      >
        <div className="mb-4 text-xs uppercase tracking-wide text-[#A3A3A3]">
          Adjust your scenario
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <SliderInput
            label="Current age"
            value={scenario.currentAge}
            onChange={(next) => setScenario((s) => ({ ...s, currentAge: next }))}
            min={SCENARIO_BOUNDS.currentAge.min}
            max={SCENARIO_BOUNDS.currentAge.max}
            format={formatAge}
          />
          <SliderInput
            label="Net worth today"
            value={scenario.currentNetWorth}
            onChange={(next) =>
              setScenario((s) => ({ ...s, currentNetWorth: next }))
            }
            min={SCENARIO_BOUNDS.currentNetWorth.min}
            max={SCENARIO_BOUNDS.currentNetWorth.max}
            step={1_000}
            format={formatDollars}
          />
          <SliderInput
            label="Monthly savings"
            value={scenario.monthlyContribution}
            onChange={(next) =>
              setScenario((s) => ({ ...s, monthlyContribution: next }))
            }
            min={SCENARIO_BOUNDS.monthlyContribution.min}
            max={SCENARIO_BOUNDS.monthlyContribution.max}
            step={50}
            format={formatDollars}
          />
          <SliderInput
            label="Annual return"
            value={scenario.returnRate}
            onChange={(next) => setScenario((s) => ({ ...s, returnRate: next }))}
            min={SCENARIO_BOUNDS.returnRate.min}
            max={SCENARIO_BOUNDS.returnRate.max}
            step={0.01}
            format={formatPercent}
          />
        </div>
      </motion.div>
    </div>
  );
}
