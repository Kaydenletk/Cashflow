/**
 * lib/scenarios/templates.test.ts
 *
 * Pure-function tests for the three life event templates. Each apply()
 * is a deterministic transform, so these tests are simple: feed a
 * baseline + inputs, verify the resulting scenario has the expected
 * monthlyContribution and annualSpend deltas.
 */

import { describe, it, expect } from 'vitest';

import {
  TEMPLATES,
  defaultTemplateInputs,
  getTemplate,
  type Template,
} from './templates';
import { DEFAULT_SCENARIO, type Scenario } from './types';

describe('TEMPLATES', () => {
  it('exports exactly 3 templates for Phase E MVP', () => {
    expect(TEMPLATES.length).toBe(3);
  });

  it('includes change-jobs, move-cities, cut-subs', () => {
    const ids = TEMPLATES.map((t) => t.id);
    expect(ids).toContain('change-jobs');
    expect(ids).toContain('move-cities');
    expect(ids).toContain('cut-subs');
  });

  it('every template has question-voiced copy (not identity-voiced)', () => {
    for (const t of TEMPLATES) {
      // Locked constraint: all template copy in "What if..." voice.
      expect(t.question).toMatch(/^what if/i);
      // Never start with "You're the kind of" or similar identity voice.
      expect(t.question.toLowerCase()).not.toMatch(/^you('re| are)/);
      expect(t.description.toLowerCase()).not.toMatch(/you're the kind/);
    }
  });
});

describe('getTemplate', () => {
  it('returns the matching template by id', () => {
    const t = getTemplate('change-jobs');
    expect(t?.id).toBe('change-jobs');
  });

  it('returns undefined for unknown ids', () => {
    // @ts-expect-error — intentional bad input
    expect(getTemplate('nonexistent')).toBeUndefined();
  });
});

describe('defaultTemplateInputs', () => {
  it('builds a record with every field key set to its default', () => {
    const t = getTemplate('change-jobs')!;
    const inputs = defaultTemplateInputs(t);
    expect(inputs.salaryIncreaseMonthly).toBe(500);
    expect(inputs.employerMatchMonthly).toBe(200);
  });
});

describe('change-jobs apply()', () => {
  const template = getTemplate('change-jobs')!;

  it('adds employer match directly to monthlyContribution', () => {
    const result = template.apply(DEFAULT_SCENARIO, {
      salaryIncreaseMonthly: 0,
      employerMatchMonthly: 200,
    });
    // Baseline 1500 + 200 match + (0 salary × savings rate) = 1700
    expect(result.monthlyContribution).toBe(1_700);
  });

  it('saves a fraction of salary increase (not the full amount)', () => {
    const result = template.apply(DEFAULT_SCENARIO, {
      salaryIncreaseMonthly: 1_000,
      employerMatchMonthly: 0,
    });
    // Savings rate = 1500 / (1500 + 3000) = 33.3%
    // Extra saved = 1000 × 0.333 = ~333
    // New contribution = 1500 + 333 = ~1833
    expect(result.monthlyContribution).toBeGreaterThan(1_500);
    expect(result.monthlyContribution).toBeLessThan(2_000);
  });

  it('does not modify annualSpend', () => {
    const baseline: Scenario = { ...DEFAULT_SCENARIO, annualSpend: 50_000 };
    const result = template.apply(baseline, {
      salaryIncreaseMonthly: 1_000,
      employerMatchMonthly: 200,
    });
    expect(result.annualSpend).toBe(50_000);
  });

  it('clamps to SCENARIO_BOUNDS when inputs would overflow', () => {
    const result = template.apply(DEFAULT_SCENARIO, {
      salaryIncreaseMonthly: 99_999,
      employerMatchMonthly: 99_999,
    });
    expect(result.monthlyContribution).toBeLessThanOrEqual(5_000);
  });
});

describe('move-cities apply()', () => {
  const template = getTemplate('move-cities')!;

  it('reduces annualSpend by rentDelta × 12', () => {
    const result = template.apply(DEFAULT_SCENARIO, {
      rentSavingsMonthly: 500,
    });
    // Default annualSpend is 40000 via DEFAULT_ANNUAL_SPEND fallback;
    // but the baseline scenario's annualSpend is undefined, so apply
    // uses 40000 and subtracts 500*12 = 6000.
    expect(result.annualSpend).toBe(34_000);
  });

  it('increases monthlyContribution by rentDelta', () => {
    const result = template.apply(DEFAULT_SCENARIO, {
      rentSavingsMonthly: 500,
    });
    expect(result.monthlyContribution).toBe(2_000);
  });

  it('applies dual effect (both savings AND spend change)', () => {
    const result = template.apply(DEFAULT_SCENARIO, {
      rentSavingsMonthly: 800,
    });
    expect(result.monthlyContribution).toBe(2_300);
    expect(result.annualSpend).toBe(40_000 - 9_600);
  });

  it('respects explicit annualSpend baseline', () => {
    const baseline: Scenario = { ...DEFAULT_SCENARIO, annualSpend: 60_000 };
    const result = template.apply(baseline, { rentSavingsMonthly: 500 });
    expect(result.annualSpend).toBe(54_000);
  });

  it('does not push annualSpend below 0', () => {
    const baseline: Scenario = { ...DEFAULT_SCENARIO, annualSpend: 5_000 };
    const result = template.apply(baseline, { rentSavingsMonthly: 3_000 });
    expect(result.annualSpend).toBeGreaterThanOrEqual(0);
  });
});

describe('cut-subs apply()', () => {
  const template = getTemplate('cut-subs')!;

  it('applies dual effect identical to move-cities but smaller', () => {
    const result = template.apply(DEFAULT_SCENARIO, { subsCutMonthly: 100 });
    expect(result.monthlyContribution).toBe(1_600);
    expect(result.annualSpend).toBe(40_000 - 1_200);
  });

  it('handles zero cut gracefully', () => {
    const result = template.apply(DEFAULT_SCENARIO, { subsCutMonthly: 0 });
    expect(result.monthlyContribution).toBe(DEFAULT_SCENARIO.monthlyContribution);
    expect(result.annualSpend).toBe(40_000);
  });
});

describe('purity (no mutation)', () => {
  it('does not mutate the baseline scenario', () => {
    for (const template of TEMPLATES) {
      const baseline: Scenario = { ...DEFAULT_SCENARIO };
      const snapshot = { ...baseline };
      const inputs = defaultTemplateInputs(template as Template);
      template.apply(baseline, inputs);
      expect(baseline).toEqual(snapshot);
    }
  });
});
