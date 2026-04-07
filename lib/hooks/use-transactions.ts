/**
 * lib/hooks/use-transactions.ts
 *
 * React hook wrapper around subscribeToTransactions().
 * Returns the CURRENT MONTH only — Asset Curve uses use-all-transactions.ts.
 *
 * Gates the Firestore subscription on useAuth() — if the user is null
 * (signed out or still loading), returns an empty list without calling
 * Firestore. When the user changes (sign in/out, account switch), the
 * effect resubscribes automatically because user.uid is in deps.
 */

'use client';

import { useEffect, useState } from 'react';

import {
  subscribeToTransactions,
  type TransactionWithId,
} from '@/lib/firebase/transactions';
import { inSameMonth } from '@/lib/calculations/ratios';
import { useAuth } from '@/lib/hooks/use-auth';

interface UseTransactionsState {
  transactions: TransactionWithId[];
  loading: boolean;
  error: Error | null;
}

export function useTransactions(): UseTransactionsState {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<UseTransactionsState>({
    transactions: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (authLoading) {
      // Still resolving auth; keep loading: true.
      return;
    }

    if (!user) {
      // Signed out — no subscription, empty result.
      setState({ transactions: [], loading: false, error: null });
      return;
    }

    const now = new Date();
    const unsub = subscribeToTransactions(
      user.uid,
      (all) => {
        const thisMonth = all.filter((t) => inSameMonth(t.date, now));
        setState({ transactions: thisMonth, loading: false, error: null });
      },
      (err) => setState((s) => ({ ...s, loading: false, error: err })),
    );
    return unsub;
  }, [user, authLoading]);

  return state;
}
