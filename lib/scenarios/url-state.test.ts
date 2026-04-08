/**
 * lib/scenarios/url-state.test.ts
 *
 * Tests for the share-URL encode/decode layer. Since every shared
 * link on compound.app/ flows through these functions, the test
 * contracts are deliberately strict:
 *
 *   1. Round-trip: encode then decode returns the original scenario
 *      (within precision tolerance for returnRate)
 *   2. Clamping: out-of-range values snap to SCENARIO_BOUNDS
 *   3. Tolerance: garbage input never throws, returns empty object
 *   4. Missing: absent params fall back to defaults at merge time
 *   5. Name: URL-encoded names round-trip correctly
 */

import { describe, it, expect } from 'vitest';

import { DEFAULT_SCENARIO, type Scenario } from './types';
import {
  parseScenarioFromParams,
  scenarioFromParams,
  toSearchParams,
} from './url-state';

describe('toSearchParams + parseScenarioFromParams round-trip', () => {
  it('round-trips the canonical scenario losslessly', () => {
    const scenario: Scenario = {
      currentAge: 30,
      currentNetWorth: 50_000,
      monthlyContribution: 1_500,
      returnRate: 0.07,
    };
    const params = toSearchParams(scenario);
    const parsed = parseScenarioFromParams(params);
    expect(parsed.scenario).toEqual(scenario);
  });

  it('round-trips with a name', () => {
    const scenario: Scenario = {
      currentAge: 35,
      currentNetWorth: 100_000,
      monthlyContribution: 2_000,
      returnRate: 0.08,
    };
    const params = toSearchParams(scenario, 'Plan A');
    const parsed = parseScenarioFromParams(params);
    expect(parsed.scenario).toEqual(scenario);
    expect(parsed.name).toBe('Plan A');
  });

  it('round-trips with annualSpend override', () => {
    const scenario: Scenario = {
      currentAge: 30,
      currentNetWorth: 50_000,
      monthlyContribution: 1_500,
      returnRate: 0.07,
      annualSpend: 60_000,
    };
    const params = toSearchParams(scenario);
    const parsed = parseScenarioFromParams(params);
    expect(parsed.scenario).toEqual(scenario);
  });

  it('produces short, tweet-friendly URL strings', () => {
    const scenario: Scenario = {
      currentAge: 30,
      currentNetWorth: 50_000,
      monthlyContribution: 1_500,
      returnRate: 0.07,
    };
    const params = toSearchParams(scenario, 'plan-a');
    // Full param string should be well under a tweet's 120-char share budget.
    expect(params.toString().length).toBeLessThan(60);
  });
});

describe('parseScenarioFromParams — clamping', () => {
  it('clamps currentAge above max to 65', () => {
    const params = new URLSearchParams('a=9999');
    const parsed = parseScenarioFromParams(params);
    expect(parsed.scenario.currentAge).toBe(65);
  });

  it('clamps currentAge below min to 18', () => {
    const params = new URLSearchParams('a=1');
    const parsed = parseScenarioFromParams(params);
    expect(parsed.scenario.currentAge).toBe(18);
  });

  it('clamps huge net worth to 1,000,000', () => {
    const params = new URLSearchParams('w=999999999');
    const parsed = parseScenarioFromParams(params);
    expect(parsed.scenario.currentNetWorth).toBe(1_000_000);
  });

  it('clamps negative net worth to 0', () => {
    const params = new URLSearchParams('w=-500');
    const parsed = parseScenarioFromParams(params);
    expect(parsed.scenario.currentNetWorth).toBe(0);
  });

  it('clamps monthly savings above 5000 to 5000', () => {
    const params = new URLSearchParams('s=99999');
    const parsed = parseScenarioFromParams(params);
    expect(parsed.scenario.monthlyContribution).toBe(5_000);
  });

  it('clamps return rate above 12% to 0.12', () => {
    const params = new URLSearchParams('r=99');
    const parsed = parseScenarioFromParams(params);
    expect(parsed.scenario.returnRate).toBe(0.12);
  });
});

describe('parseScenarioFromParams — tolerant parsing', () => {
  it('does not throw on garbage input', () => {
    const params = new URLSearchParams('a=foo&w=null&s=&r=abc');
    expect(() => parseScenarioFromParams(params)).not.toThrow();
    const parsed = parseScenarioFromParams(params);
    expect(parsed.scenario).toEqual({});
  });

  it('returns empty object when no params present', () => {
    const params = new URLSearchParams('');
    const parsed = parseScenarioFromParams(params);
    expect(parsed.scenario).toEqual({});
    expect(parsed.name).toBeUndefined();
  });

  it('parses only the valid keys when mixed with garbage', () => {
    const params = new URLSearchParams('a=30&w=foo&s=1500&r=notanumber');
    const parsed = parseScenarioFromParams(params);
    expect(parsed.scenario.currentAge).toBe(30);
    expect(parsed.scenario.monthlyContribution).toBe(1_500);
    expect(parsed.scenario.currentNetWorth).toBeUndefined();
    expect(parsed.scenario.returnRate).toBeUndefined();
  });

  it('treats empty name string as absent', () => {
    const params = new URLSearchParams('a=30&n=');
    const parsed = parseScenarioFromParams(params);
    expect(parsed.name).toBeUndefined();
  });

  it('treats whitespace-only name as absent', () => {
    const params = new URLSearchParams('a=30&n=%20%20');
    const parsed = parseScenarioFromParams(params);
    expect(parsed.name).toBeUndefined();
  });
});

describe('scenarioFromParams — default merging', () => {
  it('merges partial params over defaults', () => {
    const params = new URLSearchParams('s=2500');
    const { scenario } = scenarioFromParams(params, DEFAULT_SCENARIO);
    expect(scenario.currentAge).toBe(DEFAULT_SCENARIO.currentAge);
    expect(scenario.currentNetWorth).toBe(DEFAULT_SCENARIO.currentNetWorth);
    expect(scenario.monthlyContribution).toBe(2_500);
    expect(scenario.returnRate).toBe(DEFAULT_SCENARIO.returnRate);
  });

  it('empty params gives back exact defaults', () => {
    const params = new URLSearchParams('');
    const { scenario } = scenarioFromParams(params, DEFAULT_SCENARIO);
    expect(scenario).toEqual(DEFAULT_SCENARIO);
  });

  it('preserves name from params', () => {
    const params = new URLSearchParams('a=30&n=My+Plan');
    const { name } = scenarioFromParams(params, DEFAULT_SCENARIO);
    expect(name).toBe('My Plan');
  });
});

describe('parseScenarioFromParams — URL-encoded names', () => {
  it('decodes URL-encoded scenario names', () => {
    const params = new URLSearchParams('n=The%20Denver%20Move');
    const parsed = parseScenarioFromParams(params);
    expect(parsed.name).toBe('The Denver Move');
  });

  it('handles + as space (application/x-www-form-urlencoded)', () => {
    const params = new URLSearchParams('n=Plan+A');
    const parsed = parseScenarioFromParams(params);
    expect(parsed.name).toBe('Plan A');
  });
});
