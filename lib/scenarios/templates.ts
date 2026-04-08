/**
 * lib/scenarios/templates.ts
 *
 * Life event scenario templates. These are the "one more what-if" loop
 * that Phase E research identifies as the core retention mechanic for
 * finance scenario apps (FIcalc, ProjectionLab, cFIREsim). Users don't
 * return because of notifications or streaks — they return because life
 * hands them new questions. Each template is a question they might be
 * carrying around in their head.
 *
 * Three templates for Phase E MVP (plan agent's scope-cut recommendation):
 *   1. change-jobs   — new salary + 401k match
 *   2. move-cities   — cheaper rent (affects both savings and spend)
 *   3. cut-subs      — subscription cuts (same dual effect, smaller)
 *
 * Deferred (Phase F material per plan agent):
 *   - have-a-kid    — requires one-time events math
 *   - market-crash  — requires temporal return rate changes
 *   - sabbatical    — requires income stream modeling
 *   - 4-day-week    — requires income scale beyond contribution
 *
 * Each template is a pure function: apply(baseline, inputs) → new
 * Scenario. No side effects, fully testable, easy to compose.
 *
 * Voice constraint (locked): all template copy must stay in QUESTION
 * voice ("What if I..."), never identity voice ("You're the kind of
 * person who..."). The former invites play; the latter is MBTI-style
 * archetyping that this cohort has fatigue with.
 */

import { SCENARIO_BOUNDS, type Scenario } from './types';

export type TemplateId = 'change-jobs' | 'move-cities' | 'cut-subs';

export interface TemplateField {
  /** Key used in the inputs record passed to apply(). */
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  /** Formatter for the SliderInput value readout. */
  format: (value: number) => string;
}

export interface Template {
  id: TemplateId;
  /** Short card label: "Change jobs" */
  label: string;
  /** Question-voiced headline: "What if I change jobs?" */
  question: string;
  /** One-line explainer shown under the question. */
  description: string;
  fields: TemplateField[];
  /**
   * Pure transform: given a baseline scenario and the user's template
   * input values, return a new scenario with the template's effects
   * applied. Clamped to SCENARIO_BOUNDS. Never mutates baseline.
   */
  apply: (baseline: Scenario, inputs: Record<string, number>) => Scenario;
}

// ─── Helpers ──────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function formatDollars(value: number): string {
  return `$${value.toLocaleString('en-US')}`;
}

// ─── Templates ────────────────────────────────────────────────────────

/**
 * Change jobs: new salary + new employer 401(k) match.
 *
 * Assumption: the user saves roughly the same FRACTION of new income
 * as they did of old income. If baseline was $1500/mo savings out of
 * ~$5000/mo net income, the savings rate is ~30%, so a $500/mo raise
 * adds ~$150/mo to contributions — not the full $500. This is more
 * realistic than "all raises become savings" (which is the happy-path
 * FIRE fantasy that users rightfully distrust).
 *
 * Employer match is modeled as a direct add to monthlyContribution
 * because it's genuinely new money the user is saving (it never hits
 * their take-home).
 */
const changeJobs: Template = {
  id: 'change-jobs',
  label: 'Change jobs',
  question: 'What if I change jobs?',
  description:
    'New salary + employer 401(k) match. Part of the raise becomes savings (based on your current rate).',
  fields: [
    {
      key: 'salaryIncreaseMonthly',
      label: 'Monthly salary increase',
      min: 0,
      max: 5_000,
      step: 100,
      defaultValue: 500,
      format: formatDollars,
    },
    {
      key: 'employerMatchMonthly',
      label: 'New employer match (monthly)',
      min: 0,
      max: 1_000,
      step: 50,
      defaultValue: 200,
      format: formatDollars,
    },
  ],
  apply: (baseline, inputs) => {
    const salaryIncrease = inputs.salaryIncreaseMonthly ?? 0;
    const employerMatch = inputs.employerMatchMonthly ?? 0;

    // Estimate current savings rate: contribution / (contribution + assumed_take_home)
    // Use a floor of $3000 so we don't divide by near-zero for low-
    // contribution scenarios.
    const assumedTakeHome = 3000;
    const currentSavingsRate =
      baseline.monthlyContribution /
      Math.max(
        baseline.monthlyContribution + assumedTakeHome,
        assumedTakeHome,
      );

    const salarySaved = salaryIncrease * currentSavingsRate;
    const newMonthlyContribution =
      baseline.monthlyContribution + salarySaved + employerMatch;

    return {
      ...baseline,
      monthlyContribution: clamp(
        newMonthlyContribution,
        SCENARIO_BOUNDS.monthlyContribution.min,
        SCENARIO_BOUNDS.monthlyContribution.max,
      ),
    };
  },
};

/**
 * Move cities: cheaper monthly rent.
 *
 * Rent reduction has a DUAL effect on freedom date:
 *   1. Savings rate goes up by the full rent delta (the money that
 *      was going to rent now goes to investments).
 *   2. Annual spending goes DOWN by the same amount, which means the
 *      25× FIRE target shrinks too.
 *
 * This dual impact is what makes COL moves so disproportionately
 * powerful in FIRE math — it's one of the most leveraged single
 * decisions a high-earner can make, and it surprises users who only
 * think about income growth.
 */
const moveCities: Template = {
  id: 'move-cities',
  label: 'Move cities',
  question: 'What if I moved to a cheaper city?',
  description:
    'Lower rent cuts your spending AND boosts your savings — both sides of the FIRE equation get pushed.',
  fields: [
    {
      key: 'rentSavingsMonthly',
      label: 'Monthly rent savings',
      min: 0,
      max: 3_000,
      step: 50,
      defaultValue: 800,
      format: formatDollars,
    },
  ],
  apply: (baseline, inputs) => {
    const rentDelta = inputs.rentSavingsMonthly ?? 0;
    const annualRentDelta = rentDelta * 12;

    const baselineSpend = baseline.annualSpend ?? 40_000;
    const newAnnualSpend = Math.max(0, baselineSpend - annualRentDelta);

    return {
      ...baseline,
      monthlyContribution: clamp(
        baseline.monthlyContribution + rentDelta,
        SCENARIO_BOUNDS.monthlyContribution.min,
        SCENARIO_BOUNDS.monthlyContribution.max,
      ),
      annualSpend: clamp(
        newAnnualSpend,
        SCENARIO_BOUNDS.annualSpend.min,
        SCENARIO_BOUNDS.annualSpend.max,
      ),
    };
  },
};

/**
 * Cut subscriptions: the Mint-orphan market's dominant decision.
 *
 * Mechanically identical to move-cities (dual effect: savings up + spend
 * down), just smaller magnitude. The separate template exists because
 * the MENTAL MODEL is different — cutting subs is a behavior change
 * users make in under 10 minutes, not a life move. Framing it as a
 * distinct "what if" lowers the activation energy to try it.
 */
const cutSubs: Template = {
  id: 'cut-subs',
  label: 'Cut subscriptions',
  question: 'What if I cut my subscriptions?',
  description:
    'Every $100/month of subs saved shows up on BOTH sides — less spend, more savings. Small moves, big leverage.',
  fields: [
    {
      key: 'subsCutMonthly',
      label: 'Monthly subscriptions cut',
      min: 0,
      max: 500,
      step: 10,
      defaultValue: 150,
      format: formatDollars,
    },
  ],
  apply: (baseline, inputs) => {
    const subsDelta = inputs.subsCutMonthly ?? 0;
    const annualSubsDelta = subsDelta * 12;

    const baselineSpend = baseline.annualSpend ?? 40_000;
    const newAnnualSpend = Math.max(0, baselineSpend - annualSubsDelta);

    return {
      ...baseline,
      monthlyContribution: clamp(
        baseline.monthlyContribution + subsDelta,
        SCENARIO_BOUNDS.monthlyContribution.min,
        SCENARIO_BOUNDS.monthlyContribution.max,
      ),
      annualSpend: clamp(
        newAnnualSpend,
        SCENARIO_BOUNDS.annualSpend.min,
        SCENARIO_BOUNDS.annualSpend.max,
      ),
    };
  },
};

export const TEMPLATES: readonly Template[] = [
  changeJobs,
  moveCities,
  cutSubs,
];

export function getTemplate(id: TemplateId): Template | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

/**
 * Build the default inputs record for a template (first-mount state
 * for the template-detail editor).
 */
export function defaultTemplateInputs(
  template: Template,
): Record<string, number> {
  const inputs: Record<string, number> = {};
  for (const field of template.fields) {
    inputs[field.key] = field.defaultValue;
  }
  return inputs;
}
