/**
 * lib/calculations/fire.ts
 *
 * Pure FIRE (Financial Independence, Retire Early) math for the public
 * landing calculator. No React, no Firestore — just
 *   (FireInputs) => FireResult + CurvePoint[]
 *
 * The headline insight powering the landing page is that "freedom age"
 * (the age at which work becomes optional) is a closed-form function of
 * current age, current net worth, monthly contribution, return rate, and
 * annual spending. Given a slider-driven UI, we want this math to:
 *
 *   - Run in << 1ms per frame (no loops proportional to years-to-freedom)
 *   - Return finite or Infinity cleanly (never NaN, never throw)
 *   - Match the "25× annual spending" FIRE convention
 *   - Degrade gracefully on edge cases (zero return, already FIRE,
 *     unreachable at this pace)
 *
 * The closed-form derivation:
 *
 *   Future value of a lump sum + annuity, compounded annually:
 *     FV = PV(1+r)^t + PMT · ((1+r)^t - 1) / r
 *
 *   Set FV = target and solve for t:
 *     target · r + pmt = (pv · r + pmt) · (1+r)^t
 *     (1+r)^t = (target · r + pmt) / (pv · r + pmt)
 *     t = ln((target · r + pmt) / (pv · r + pmt)) / ln(1+r)
 *
 * We use annualized contribution (monthly × 12) and annual compounding.
 * Error vs true monthly compounding is < 0.2 years at realistic rates —
 * an acceptable simplification for a slider-driven UI where the user is
 * exploring scenarios, not filing tax returns.
 */

/** Default annual real return (S&P 500 historical after inflation). */
export const DEFAULT_RETURN_RATE = 0.07;

/**
 * Population benchmark for the "earlier/later than the default American path"
 * narrative. 65 is the age at which most Americans stop working for a paycheck
 * (a loose composite of Social Security full retirement age + labor force
 * participation data). We do not call this "retirement" in user-facing copy —
 * that word is contaminated for the 29-33yo target cohort per Phase E research.
 */
export const AVERAGE_FREEDOM_AGE = 65;

/** Default annual spending used to derive the 25× FIRE target ($1M). */
export const DEFAULT_ANNUAL_SPEND = 40_000;

export interface FireInputs {
  /** Current age in years, typically 18..80. */
  currentAge: number;
  /** Net worth today. May be negative or zero. */
  currentNetWorth: number;
  /** Monthly savings contribution in dollars. Must be >= 0. */
  monthlyContribution: number;
  /** Annual spending the freedom seeker wants to support. Drives the 25× target. */
  annualSpend: number;
  /** Annual real return rate as a decimal (e.g. 0.07 for 7%). */
  returnRate: number;
}

export interface FireResult {
  /** 25 × annualSpend — the classic FIRE target. */
  target: number;
  /** Years from currentAge until net worth reaches `target`. 0 if already FIRE, Infinity if unreachable. */
  yearsToFire: number;
  /** currentAge + yearsToFire, or Infinity if unreachable. The age at which work becomes optional. */
  freedomAge: number;
  /** True when current net worth already meets or exceeds the target. */
  alreadyFire: boolean;
  /** Positive = freedom earlier than AVERAGE_FREEDOM_AGE. Negative = later. */
  yearsVsAverage: number;
}

export interface CurvePoint {
  age: number;
  netWorth: number;
}

/**
 * The 25× rule: target net worth = 25 × annual spending. Derives from the
 * 4% safe withdrawal rate (Trinity study). Returns 0 if spend is 0 or
 * negative — caller will handle this as "already FIRE".
 */
export function fireTarget(annualSpend: number): number {
  if (annualSpend <= 0) return 0;
  return annualSpend * 25;
}

/**
 * Closed-form years-to-FIRE. See module docstring for derivation.
 *
 * Edge cases (in priority order):
 *   - Already FIRE (pv >= target): 0
 *   - Target <= 0: 0 (you need nothing, you're there)
 *   - r = 0 with positive contribution: linear fallback (target - pv) / annualContribution
 *   - r = 0 with zero contribution: Infinity
 *   - Log-domain numerator or denominator <= 0: Infinity (unreachable without compounding)
 */
export function yearsToFire(inputs: FireInputs): number {
  const { currentNetWorth: pv, monthlyContribution, annualSpend, returnRate: r } = inputs;
  const target = fireTarget(annualSpend);

  // Already there (or nothing to save for).
  if (target <= 0) return 0;
  if (pv >= target) return 0;

  const pmt = monthlyContribution * 12;

  // Zero-return linear fallback. Without compounding, the only way to
  // reach the target is to save the gap dollar by dollar.
  if (r === 0) {
    if (pmt <= 0) return Infinity;
    return (target - pv) / pmt;
  }

  // The log-domain ratio: (target · r + pmt) / (pv · r + pmt).
  // If the denominator is <= 0 (e.g. large negative pv, zero pmt),
  // the logarithm is undefined — the trajectory never crosses the target.
  const numerator = target * r + pmt;
  const denominator = pv * r + pmt;

  if (numerator <= 0 || denominator <= 0) return Infinity;

  const ratio = numerator / denominator;
  // Ratio < 1 means pv is already growing past target — caught by the
  // `pv >= target` early return above, but defensive here too.
  if (ratio <= 1) return 0;

  const years = Math.log(ratio) / Math.log(1 + r);

  // Defensive: Math.log can return NaN on weird inputs. Treat as unreachable.
  if (!Number.isFinite(years)) return Infinity;

  return years;
}

/**
 * Thin wrapper that packages yearsToFire into a FireResult with
 * derived fields (freedomAge, alreadyFire, yearsVsAverage).
 */
export function computeFire(inputs: FireInputs): FireResult {
  const target = fireTarget(inputs.annualSpend);
  const years = yearsToFire(inputs);
  const alreadyFire = inputs.currentNetWorth >= target && target > 0;
  const freedomAge = Number.isFinite(years)
    ? inputs.currentAge + years
    : Infinity;
  const yearsVsAverage = Number.isFinite(freedomAge)
    ? AVERAGE_FREEDOM_AGE - freedomAge
    : -Infinity;

  return {
    target,
    yearsToFire: years,
    freedomAge,
    alreadyFire,
    yearsVsAverage,
  };
}

interface ProjectCurveOptions {
  /** Hard ceiling age for the curve. Defaults to currentAge + 60. */
  untilAge?: number;
  /** Override default horizon (currentAge + horizonYears). */
  horizonYears?: number;
}

/**
 * Year-by-year net-worth projection from currentAge.
 *
 * Starts at currentNetWorth, compounds annually, adds annualContribution
 * at the end of each year. Returns {age, netWorth} tuples.
 *
 * Horizon selection:
 *   1. Honor explicit untilAge if given.
 *   2. Otherwise use min(currentAge + horizonYears, currentAge + 60).
 *   3. Otherwise aim for min(currentAge + 40, freedomAge + 5). The
 *      "+5" tail makes the chart feel like life continues past FIRE.
 *   4. Unreachable scenarios (freedomAge = Infinity) clamp to
 *      currentAge + 60 so the chart always has a bounded x-axis.
 */
export function projectCurve(
  inputs: FireInputs,
  options: ProjectCurveOptions = {},
): CurvePoint[] {
  const { currentAge, currentNetWorth, monthlyContribution, returnRate: r } = inputs;
  const annualContribution = monthlyContribution * 12;

  // Compute a sensible horizon.
  const ceiling = currentAge + 60;
  let endAge: number;

  if (typeof options.untilAge === 'number') {
    endAge = Math.min(options.untilAge, ceiling);
  } else if (typeof options.horizonYears === 'number') {
    endAge = Math.min(currentAge + options.horizonYears, ceiling);
  } else {
    const result = computeFire(inputs);
    if (Number.isFinite(result.freedomAge)) {
      endAge = Math.min(
        Math.max(currentAge + 40, result.freedomAge + 5),
        ceiling,
      );
    } else {
      endAge = ceiling;
    }
  }

  // Round to integer years so the chart x-axis stays discrete.
  endAge = Math.floor(endAge);
  if (endAge < currentAge) endAge = currentAge;

  const points: CurvePoint[] = [];
  let netWorth = currentNetWorth;
  points.push({ age: currentAge, netWorth });

  for (let age = currentAge + 1; age <= endAge; age++) {
    // End-of-year compounding: grow prior balance, then add this year's
    // contributions. Mirrors the closed-form FV formula used above.
    netWorth = netWorth * (1 + r) + annualContribution;
    points.push({ age, netWorth });
  }

  return points;
}
