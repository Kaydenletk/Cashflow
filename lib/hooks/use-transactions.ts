/**
 * lib/hooks/use-transactions.ts
 *
 * React hook wrapper around subscribeToTransactions().
 * Returns the CURRENT MONTH only — Asset Curve uses use-all-transactions.ts.
 */

'use client';

import { useEffect, useState } from 'react';

import {
  subscribeToTransactions,
  type TransactionWithId,
} from '@/lib/firebase/transactions';
import { inSameMonth } from '@/lib/calculations/ratios';

interface UseTransactionsState {
  transactions: TransactionWithId[];
  loading: boolean;
  error: Error | null;
}

export function useTransactions(): UseTransactionsState {
  const [state, setState] = useState<UseTransactionsState>({
    transactions: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    const now = new Date();
    const unsub = subscribeToTransactions(
      (all) => {
        const thisMonth = all.filter((t) => inSameMonth(t.date, now));
        setState({ transactions: thisMonth, loading: false, error: null });
      },
      (err) => setState((s) => ({ ...s, loading: false, error: err })),
    );
    return unsub;
  }, []);

  return state;
}
