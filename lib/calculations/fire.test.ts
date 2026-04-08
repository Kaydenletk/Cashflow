/**
 * lib/calculations/fire.test.ts
 *
 * Coverage targets (from Phase D plan section 2):
 *   1. fireTarget returns 25× annual spend
 *   2. Already-FIRE returns 0 years
 *   3. Canonical 30yo scenario lands in a sane window (50..52)
 *   4. Zero contribution, positive pv, positive r → finite years
 *   5. Zero return rate → linear fallback
 *   6. Unreachable scenario → Infinity
 *   7. projectCurve is monotonic for positive r + positive pmt
 *   8. projectCurve starts at currentAge and ends at or past freedomAge
 */

import { describe, it, expect } from 'vitest';

import {
  AVERAGE_FREEDOM_AGE,
  computeFire,
  fireTarget,
  projectCurve,
  yearsToFire,
  type FireInputs,
} from './fire';

const canonical: FireInputs = {
  currentAge: 30,
  currentNetWorth: 50_000,
  monthlyContribution: 1_500,
  annualSpend: 40_000,
  returnRate: 0.07,
};

describe('fireTarget', () => {
  it('returns 25× annual spend', () => {
    expect(fireTarget(40_000)).toBe(1_000_000);
  });

  it('returns 0 for non-positive spend', () => {
    expect(fireTarget(0)).toBe(0);
    expect(fireTarget(-1)).toBe(0);
  });
});

describe('yearsToFire', () => {
  it('returns 0 when already at or above target', () => {
    const result = yearsToFire({ ...canonical, currentNetWorth: 1_500_000 });
    expect(result).toBe(0);
  });

  it('lands in 50..52 for the canonical 30yo scenario', () => {
    // Closed-form check: pv=50k, pmt=18k/yr, target=1M, r=0.07
    //   t = ln((1M·0.07 + 18k) / (50k·0.07 + 18k)) / ln(1.07)
    //     = ln(88k/21.5k) / ln(1.07) ≈ 20.83
    // freedomAge = 30 + 20.83 ≈ 50.83
    const result = computeFire(canonical);
    expect(result.freedomAge).toBeGreaterThanOrEqual(50);
    expect(result.freedomAge).toBeLessThanOrEqual(52);
  });

  it('zero contribution with positive pv + positive return is still finite', () => {
    const result = yearsToFire({
      ...canonical,
      currentNetWorth: 100_000,
      monthlyContribution: 0,
    });
    // Pure compounding: t = ln(target/pv) / ln(1+r) = ln(10) / ln(1.07) ≈ 34
    expect(Number.isFinite(result)).toBe(true);
    expect(result).toBeGreaterThan(30);
    expect(result).toBeLessThan(40);
  });

  it('falls back to linear math when return rate is zero', () => {
    const result = yearsToFire({
      ...canonical,
      returnRate: 0,
    });
    // (1_000_000 - 50_000) / 18_000 ≈ 52.77
    expect(result).toBeCloseTo(52.777, 2);
  });

  it('returns Infinity when pv=0, pmt=0', () => {
    const result = yearsToFire({
      ...canonical,
      currentNetWorth: 0,
      monthlyContribution: 0,
    });
    expect(result).toBe(Infinity);
  });

  it('returns Infinity when log-domain denominator is non-positive', () => {
    // Large negative pv and no contribution → denominator <= 0
    const result = yearsToFire({
      ...canonical,
      currentNetWorth: -500_000,
      monthlyContribution: 0,
    });
    expect(result).toBe(Infinity);
  });
});

describe('computeFire derived fields', () => {
  it('computes yearsVsAverage relative to AVERAGE_FREEDOM_AGE', () => {
    const result = computeFire(canonical);
    // freedomAge ≈ 50.83, average = 65 → ~14.17 years earlier
    expect(result.yearsVsAverage).toBeGreaterThan(13);
    expect(result.yearsVsAverage).toBeLessThan(15);
    expect(AVERAGE_FREEDOM_AGE).toBe(65);
  });

  it('flags alreadyFire when net worth meets the target', () => {
    const result = computeFire({
      ...canonical,
      currentNetWorth: 1_000_000,
    });
    expect(result.alreadyFire).toBe(true);
    expect(result.yearsToFire).toBe(0);
    expect(result.freedomAge).toBe(30);
  });

  it('returns Infinity freedomAge for unreachable scenarios', () => {
    const result = computeFire({
      ...canonical,
      currentNetWorth: 0,
      monthlyContribution: 0,
    });
    expect(result.freedomAge).toBe(Infinity);
    expect(result.yearsVsAverage).toBe(-Infinity);
  });
});

describe('projectCurve', () => {
  it('first point is currentAge, net worth monotonic for positive r + pmt', () => {
    const points = projectCurve(canonical);
    expect(points[0].age).toBe(canonical.currentAge);
    expect(points[0].netWorth).toBe(canonical.currentNetWorth);

    for (let i = 1; i < points.length; i++) {
      expect(points[i].netWorth).toBeGreaterThan(points[i - 1].netWorth);
    }
  });

  it('extends at least to freedomAge for reachable scenarios', () => {
    const result = computeFire(canonical);
    const points = projectCurve(canonical);
    const lastAge = points[points.length - 1].age;
    expect(lastAge).toBeGreaterThanOrEqual(Math.floor(result.freedomAge));
  });

  it('clamps to currentAge + 60 ceiling for unreachable scenarios', () => {
    const unreachable: FireInputs = {
      ...canonical,
      currentNetWorth: 0,
      monthlyContribution: 0,
    };
    const points = projectCurve(unreachable);
    const lastAge = points[points.length - 1].age;
    // Unreachable → horizon falls through to ceiling of currentAge + 60
    expect(lastAge).toBe(canonical.currentAge + 60);
    // Without any growth or contribution, net worth stays at 0
    expect(points[points.length - 1].netWorth).toBe(0);
  });

  it('respects explicit untilAge option', () => {
    const points = projectCurve(canonical, { untilAge: 45 });
    expect(points[points.length - 1].age).toBe(45);
    expect(points.length).toBe(16); // ages 30..45 inclusive
  });
});
