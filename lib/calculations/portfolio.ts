/**
 * lib/calculations/portfolio.ts
 *
 * Pure helpers for the Portfolio screen (/portfolio).
 * Pricing data is manual — no real-time feeds. The user updates prices via
 * <UpdatePricesModal /> which writes to Firestore.
 */

import type { InvestmentDoc } from '@/lib/types/transaction';

export interface PortfolioRow extends InvestmentDoc {
  id: string; // Firestore doc ID
  currentValue: number;
  costBasis: number;
  unrealizedPL: number;
  unrealizedPLPercent: number;
  allocationPercent: number;
}

export function totalPortfolioValue(holdings: InvestmentDoc[]): number {
  return holdings.reduce((sum, h) => sum + h.shares * h.currentPrice, 0);
}

export function totalCostBasis(holdings: InvestmentDoc[]): number {
  return holdings.reduce((sum, h) => sum + h.shares * h.avgCost, 0);
}

export function totalUnrealizedPL(holdings: InvestmentDoc[]): {
  dollars: number;
  percent: number;
} {
  const value = totalPortfolioValue(holdings);
  const cost = totalCostBasis(holdings);
  const dollars = value - cost;
  const percent = cost === 0 ? 0 : (dollars / cost) * 100;
  return { dollars, percent };
}

/**
 * Build per-row enriched portfolio data ready for <HoldingsList />.
 * Assumes the holdings array carries each doc's Firestore ID alongside the data
 * (the data hook is responsible for attaching the ID).
 */
export function enrichHoldings(
  holdings: Array<InvestmentDoc & { id: string }>,
): PortfolioRow[] {
  const total = totalPortfolioValue(holdings);
  return holdings.map((h) => {
    const currentValue = h.shares * h.currentPrice;
    const costBasis = h.shares * h.avgCost;
    const unrealizedPL = currentValue - costBasis;
    const unrealizedPLPercent = costBasis === 0 ? 0 : (unrealizedPL / costBasis) * 100;
    const allocationPercent = total === 0 ? 0 : (currentValue / total) * 100;
    return {
      ...h,
      currentValue,
      costBasis,
      unrealizedPL,
      unrealizedPLPercent,
      allocationPercent,
    };
  });
}
