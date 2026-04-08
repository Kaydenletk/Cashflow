/**
 * lib/scenarios/types.ts
 *
 * Shared scenario type for the landing page calculator. Extracted from
 * fire-calculator.tsx so url-state, storage, templates, and tests can
 * all reference a single source of truth.
 *
 * This is distinct from FireInputs (in lib/calculations/fire.ts) — the
 * calculator holds four sliders' worth of state plus an optional
 * annualSpend override; FireInputs is the fully-materialized shape the
 * math functions expect. FireCalculator transforms Scenario → FireInputs
 * via a useMemo that fills annualSpend with DEFAULT_ANNUAL_SPEND when
 * Scenario.annualSpend is undefined.
 *
 * Phase E:
 *   - Phase D had currentAge, currentNetWorth, monthlyContribution,
 *     returnRate. annualSpend was hard-locked.
 *   - Phase E Task 3.1 adds Scenario.annualSpend as optional so life
 *     event templates can transform it ("move cities" reduces both
 *     savings and spend).
 *   - Scenario stays flat and JSON-serializable so URL and localStorage
 *     round-trips are trivial.
 */

export interface Scenario {
  currentAge: number;
  currentNetWorth: number;
  monthlyContribution: number;
  returnRate: number;
  /**
   * Optional — if undefined, FireCalculator uses DEFAULT_ANNUAL_SPEND
   * ($40k → $1M target). Exposed only via life event templates; the
   * default 4-slider view keeps this hidden.
   */
  annualSpend?: number;
}

/**
 * Hard bounds on every scenario field. Used by:
 *   - Slider min/max props in FireCalculator
 *   - URL param clamping in lib/scenarios/url-state.ts (defensive
 *     against abuse + malformed shared links)
 *   - Template apply() functions that want to snap to valid ranges
 */
export const SCENARIO_BOUNDS = {
  currentAge: { min: 18, max: 65 },
  currentNetWorth: { min: 0, max: 1_000_000 },
  monthlyContribution: { min: 0, max: 5_000 },
  returnRate: { min: 0, max: 0.12 },
  annualSpend: { min: 0, max: 500_000 },
} as const;

export const DEFAULT_SCENARIO: Scenario = {
  currentAge: 30,
  currentNetWorth: 50_000,
  monthlyContribution: 1_500,
  returnRate: 0.07,
};
