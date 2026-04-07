/**
 * lib/calculations/ratios.ts
 *
 * Pure functions for Two Numbers bar + MonthNetCard.
 * No React, no Firestore — just (TransactionDoc[]) => number.
 *
 * Mindset rule: Two Numbers shows percentages only, never raw dollars.
 */

import type { TransactionDoc } from '@/lib/types/transaction';
import { Bucket } from '@/lib/types/transaction';

/**
 * Asset ratio = sum(ASSET amounts) / sum(all positive-direction amounts).
 * Returns 0 when there are no transactions (avoid divide-by-zero).
 *
 * "All positive-direction" = ASSET + INCOME + EXPENSE + LIABILITY (i.e., everything).
 * This is intentional: the ratio answers "what % of my money flow this period
 * is going toward asset-building?" not "what % of net worth is in assets."
 */
export function assetRatio(txns: TransactionDoc[]): number {
  const total = txns.reduce((sum, t) => sum + t.amount, 0);
  if (total === 0) return 0;
  const assetTotal = txns
    .filter((t) => t.bucket === Bucket.ASSET)
    .reduce((sum, t) => sum + t.amount, 0);
  return assetTotal / total;
}

/**
 * Liability ratio = sum(LIABILITY amounts) / sum(all amounts).
 */
export function liabilityRatio(txns: TransactionDoc[]): number {
  const total = txns.reduce((sum, t) => sum + t.amount, 0);
  if (total === 0) return 0;
  const liabilityTotal = txns
    .filter((t) => t.bucket === Bucket.LIABILITY)
    .reduce((sum, t) => sum + t.amount, 0);
  return liabilityTotal / total;
}

/**
 * Monthly net = INCOME + ASSET inflow − EXPENSE − LIABILITY.
 * Signed dollars. Positive = "richer", negative = "poorer", 0 = "flat".
 */
export function monthlyNet(txns: TransactionDoc[]): number {
  return txns.reduce((net, t) => {
    if (t.bucket === Bucket.INCOME || t.bucket === Bucket.ASSET) return net + t.amount;
    return net - t.amount;
  }, 0);
}

export type Direction = 'richer' | 'flat' | 'poorer';

export function direction(net: number): Direction {
  if (net > 0) return 'richer';
  if (net < 0) return 'poorer';
  return 'flat';
}

/**
 * Filter helper: transactions whose date falls in the same month as `ref`.
 * Used by useTransactions() and consumers.
 */
export function inSameMonth(date: Date, ref: Date): boolean {
  return (
    date.getFullYear() === ref.getFullYear() && date.getMonth() === ref.getMonth()
  );
}

/**
 * Filter helper: transactions whose date falls on the same calendar day as `ref`.
 */
export function inSameDay(date: Date, ref: Date): boolean {
  return (
    date.getFullYear() === ref.getFullYear() &&
    date.getMonth() === ref.getMonth() &&
    date.getDate() === ref.getDate()
  );
}
