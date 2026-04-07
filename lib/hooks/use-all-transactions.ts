/**
 * lib/hooks/use-all-transactions.ts
 *
 * Full-history variant of useTransactions(). Used by /curve only.
 * Kept separate so the common case (this-month) doesn't pay the cost of
 * carrying every record in the snapshot.
 *
 * Same auth-gating behavior as useTransactions — no subscription while
 * user is null or auth is resolving. Resubscribes on user change.
 */

'use client';

import { useEffect, useState } from 'react';

import {
  subscribeToTransactions,
  type TransactionWithId,
} from '@/lib/firebase/transactions';
import { useAuth } from '@/lib/hooks/use-auth';

interface UseAllTransactionsState {
  transactions: TransactionWithId[];
  loading: boolean;
  error: Error | null;
}

export function useAllTransactions(): UseAllTransactionsState {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<UseAllTransactionsState>({
    transactions: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      setState({ transactions: [], loading: false, error: null });
      return;
    }

    const unsub = subscribeToTransactions(
      user.uid,
      (all) => setState({ transactions: all, loading: false, error: null }),
      (err) => setState((s) => ({ ...s, loading: false, error: err })),
    );
    return unsub;
  }, [user, authLoading]);

  return state;
}
