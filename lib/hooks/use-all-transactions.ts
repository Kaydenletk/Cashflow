/**
 * lib/hooks/use-all-transactions.ts
 *
 * Full-history variant of useTransactions(). Used by /curve only.
 * Kept separate so the common case (this-month) doesn't pay the cost of
 * carrying every record in the snapshot.
 */

'use client';

import { useEffect, useState } from 'react';

import {
  subscribeToTransactions,
  type TransactionWithId,
} from '@/lib/firebase/transactions';

interface UseAllTransactionsState {
  transactions: TransactionWithId[];
  loading: boolean;
  error: Error | null;
}

export function useAllTransactions(): UseAllTransactionsState {
  const [state, setState] = useState<UseAllTransactionsState>({
    transactions: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    const unsub = subscribeToTransactions(
      (all) => setState({ transactions: all, loading: false, error: null }),
      (err) => setState((s) => ({ ...s, loading: false, error: err })),
    );
    return unsub;
  }, []);

  return state;
}
