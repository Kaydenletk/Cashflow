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

const SIGNED_OUT: UseTransactionsState = { transactions: [], loading: false, error: null };
const LOADING: UseTransactionsState = { transactions: [], loading: true, error: null };

export function useTransactions(): UseTransactionsState {
  const { user, loading: authLoading } = useAuth();
  // Only holds the authenticated subscription result. Signed-out and
  // loading states are derived below so the effect never calls setState
  // synchronously (avoids react-hooks/set-state-in-effect).
  const [subscriptionState, setSubscriptionState] =
    useState<UseTransactionsState>(LOADING);

  useEffect(() => {
    if (!user) return;

    const now = new Date();
    const unsub = subscribeToTransactions(
      user.uid,
      (all) => {
        const thisMonth = all.filter((t) => inSameMonth(t.date, now));
        setSubscriptionState({ transactions: thisMonth, loading: false, error: null });
      },
      (err) => setSubscriptionState((s) => ({ ...s, loading: false, error: err })),
    );
    return unsub;
  }, [user]);

  if (authLoading) return LOADING;
  if (!user) return SIGNED_OUT;
  return subscriptionState;
}
