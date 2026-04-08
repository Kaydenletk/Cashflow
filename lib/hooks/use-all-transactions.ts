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

const SIGNED_OUT: UseAllTransactionsState = { transactions: [], loading: false, error: null };
const LOADING: UseAllTransactionsState = { transactions: [], loading: true, error: null };

export function useAllTransactions(): UseAllTransactionsState {
  const { user, loading: authLoading } = useAuth();
  // See useUserRules for the rationale behind this derivation pattern —
  // keeps the effect from calling setState for the signed-out reset.
  const [subscriptionState, setSubscriptionState] =
    useState<UseAllTransactionsState>(LOADING);

  useEffect(() => {
    if (!user) return;

    const unsub = subscribeToTransactions(
      user.uid,
      (all) => setSubscriptionState({ transactions: all, loading: false, error: null }),
      (err) => setSubscriptionState((s) => ({ ...s, loading: false, error: err })),
    );
    return unsub;
  }, [user]);

  if (authLoading) return LOADING;
  if (!user) return SIGNED_OUT;
  return subscriptionState;
}
