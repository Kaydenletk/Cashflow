/**
 * components/two-numbers-bar.tsx
 *
 * Mechanism 1 — sticky top bar showing ONLY this month's Asset% and Liability%.
 * Hard rule: NO dollar totals. NO net worth. NO third number.
 */

'use client';

import { useTransactions } from '@/lib/hooks/use-transactions';
import { assetRatio, liabilityRatio } from '@/lib/calculations/ratios';

export function TwoNumbersBar() {
  const { transactions, loading } = useTransactions();

  const asset = loading ? 0 : Math.round(assetRatio(transactions) * 100);
  const liability = loading ? 0 : Math.round(liabilityRatio(transactions) * 100);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-background px-6 py-4">
      <div className="flex flex-col items-start">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">Asset</span>
        <span className="text-2xl font-semibold tabular-nums text-green-700">{asset}%</span>
      </div>
      <div className="flex flex-col items-end">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">Liability</span>
        <span className="text-2xl font-semibold tabular-nums text-red-700">{liability}%</span>
      </div>
    </header>
  );
}
