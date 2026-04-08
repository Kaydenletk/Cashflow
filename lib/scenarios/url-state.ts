/**
 * lib/scenarios/url-state.ts
 *
 * Scenario <-> URLSearchParams encode/decode layer. This is the surface
 * that makes shared links work: every slider position gets serialized
 * into the URL, and anyone who opens the URL sees the same calculator
 * state.
 *
 * Design decisions (from Phase E plan):
 *
 * 1. SHORT KEYS. Shared URLs need to fit in a tweet/iMessage/Discord
 *    (~120 chars). `a=30&w=50000&s=1500&r=7&n=plan-a` is ~30 chars +
 *    name. Long keys like `currentAge=30` would blow that budget.
 *
 * 2. READABLE, NOT OPAQUE. No base64 encoding — a URL with `?a=30`
 *    self-evidently looks like a safe link; an opaque blob looks like
 *    tracking. Organic growth depends on users trusting share links.
 *
 * 3. TOLERANT PARSE. Never throws. Missing or malformed params
 *    silently fall back to defaults at merge time. Out-of-range values
 *    are clamped to SCENARIO_BOUNDS, never rejected. This is the
 *    Postel's law approach — appropriate for a share-link surface.
 *
 * 4. LOSSLESS ROUND-TRIP. returnRate encoded as integer percent
 *    (`r=7` for 7%, decoded via `parseInt / 100`). The slider step
 *    was changed 0.005 → 0.01 so the round-trip stays clean.
 *
 * Key map:
 *   a  = currentAge         (integer, 18-65)
 *   w  = currentNetWorth    (integer dollars, 0-1,000,000)
 *   s  = monthlyContribution (integer dollars, 0-5,000)
 *   r  = returnRate × 100    (integer percent, 0-12)
 *   sp = annualSpend         (integer dollars, 0-500,000) — optional
 *   n  = scenario name       (URL-encoded) — optional
 */

import { SCENARIO_BOUNDS, type Scenario } from './types';

interface ParsedScenarioState {
  scenario: Partial<Scenario>;
  name?: string;
}

/**
 * Clamp a number to [min, max]. Returns undefined if the input is not
 * a finite number.
 */
function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/**
 * Parse a single integer param or return undefined. Handles NaN, non-string,
 * and missing values uniformly.
 */
function parseIntParam(
  params: URLSearchParams,
  key: string,
): number | undefined {
  const raw = params.get(key);
  if (raw == null) return undefined;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return undefined;
  return parsed;
}

/**
 * Encode a Scenario into URLSearchParams using the short-key schema.
 * Includes only keys whose values differ from the implicit defaults —
 * this keeps share URLs compact when the user only changed one slider.
 * (Future improvement; for Phase E we always write all four + optional
 * annualSpend + optional name so URLs are self-contained.)
 */
export function toSearchParams(
  scenario: Scenario,
  name?: string,
): URLSearchParams {
  const params = new URLSearchParams();
  params.set('a', String(Math.round(scenario.currentAge)));
  params.set('w', String(Math.round(scenario.currentNetWorth)));
  params.set('s', String(Math.round(scenario.monthlyContribution)));
  params.set('r', String(Math.round(scenario.returnRate * 100)));
  if (scenario.annualSpend != null) {
    params.set('sp', String(Math.round(scenario.annualSpend)));
  }
  if (name != null && name.trim().length > 0) {
    params.set('n', name);
  }
  return params;
}

/**
 * Parse URLSearchParams into a Partial<Scenario> + optional name.
 *
 * Guarantees:
 *   - Never throws, even on garbage input
 *   - Missing keys → omitted from result (caller merges with defaults)
 *   - Malformed keys (non-numeric, NaN) → omitted
 *   - Out-of-range values → clamped to SCENARIO_BOUNDS
 *
 * Callers should merge the returned partial over DEFAULT_SCENARIO:
 *   const merged = { ...DEFAULT_SCENARIO, ...parseScenarioFromParams(params).scenario };
 */
export function parseScenarioFromParams(
  params: URLSearchParams,
): ParsedScenarioState {
  const scenario: Partial<Scenario> = {};

  const ageRaw = parseIntParam(params, 'a');
  if (ageRaw !== undefined) {
    scenario.currentAge = clamp(
      ageRaw,
      SCENARIO_BOUNDS.currentAge.min,
      SCENARIO_BOUNDS.currentAge.max,
    );
  }

  const nwRaw = parseIntParam(params, 'w');
  if (nwRaw !== undefined) {
    scenario.currentNetWorth = clamp(
      nwRaw,
      SCENARIO_BOUNDS.currentNetWorth.min,
      SCENARIO_BOUNDS.currentNetWorth.max,
    );
  }

  const saveRaw = parseIntParam(params, 's');
  if (saveRaw !== undefined) {
    scenario.monthlyContribution = clamp(
      saveRaw,
      SCENARIO_BOUNDS.monthlyContribution.min,
      SCENARIO_BOUNDS.monthlyContribution.max,
    );
  }

  const rateRaw = parseIntParam(params, 'r');
  if (rateRaw !== undefined) {
    // Incoming is integer percent (0..12). Convert back to decimal.
    const asDecimal = rateRaw / 100;
    scenario.returnRate = clamp(
      asDecimal,
      SCENARIO_BOUNDS.returnRate.min,
      SCENARIO_BOUNDS.returnRate.max,
    );
  }

  const spendRaw = parseIntParam(params, 'sp');
  if (spendRaw !== undefined) {
    scenario.annualSpend = clamp(
      spendRaw,
      SCENARIO_BOUNDS.annualSpend.min,
      SCENARIO_BOUNDS.annualSpend.max,
    );
  }

  const nameRaw = params.get('n');
  const name = nameRaw != null && nameRaw.trim().length > 0 ? nameRaw : undefined;

  return { scenario, name };
}

/**
 * Convenience: produces the full merged scenario (defaults overlaid
 * with whatever the URL provided). Use this when you want to go
 * directly from URLSearchParams to a usable Scenario.
 */
export function scenarioFromParams(
  params: URLSearchParams,
  defaults: Scenario,
): { scenario: Scenario; name?: string } {
  const { scenario: partial, name } = parseScenarioFromParams(params);
  return {
    scenario: { ...defaults, ...partial },
    name,
  };
}
