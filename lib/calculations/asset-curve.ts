/**
 * lib/calculations/asset-curve.ts
 *
 * Pure helpers for the Asset Curve screen (/curve).
 * Builds a cumulative-total time series and a forward projection.
 */

import type { TransactionDoc } from '@/lib/types/transaction';
import { Bucket } from '@/lib/types/transaction';

export interface CurvePoint {
  /** ISO date string YYYY-MM-DD */
  date: string;
  /** Cumulative ASSET dollars added by end of this date */
  total: number;
}

/**
 * Roll up ASSET-bucket transactions into a daily cumulative total, sorted by date.
 *
 * - Only ASSET transactions are included. The curve is NOT net worth — it's
 *   "money you've directed toward asset-building over time."
 * - Days with no ASSET activity do NOT get a row. The chart's line connector
 *   handles the visual gap. (Adding empty days is unnecessary fuel.)
 */
export function cumulativeAssetByDate(txns: TransactionDoc[]): CurvePoint[] {
  const assetTxns = txns
    .filter((t) => t.bucket === Bucket.ASSET)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  // Group by date string, then accumulate.
  const byDate = new Map<string, number>();
  for (const t of assetTxns) {
    const key = toIsoDate(t.date);
    byDate.set(key, (byDate.get(key) ?? 0) + t.amount);
  }

  let running = 0;
  const points: CurvePoint[] = [];
  for (const [date, dailyTotal] of byDate) {
    running += dailyTotal;
    points.push({ date, total: running });
  }
  return points;
}

/**
 * Linear projection forward by `years`.
 *
 * Strategy: average the per-day asset growth over the existing curve, then
 * extrapolate. For < 5 data points, returns NaN to signal "not enough data" —
 * the consuming component should render the empty-state copy instead.
 */
export function projectForward(curve: CurvePoint[], years: number): number {
  if (curve.length < 5) return NaN;
  const first = curve[0];
  const last = curve[curve.length - 1];
  const totalDays = (Date.parse(last.date) - Date.parse(first.date)) / 86_400_000;
  if (totalDays <= 0) return NaN;
  const dailyRate = (last.total - first.total) / totalDays;
  return last.total + dailyRate * 365 * years;
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
