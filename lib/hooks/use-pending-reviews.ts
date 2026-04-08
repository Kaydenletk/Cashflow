/**
 * lib/hooks/use-pending-reviews.ts
 *
 * React hook that exposes the current user's pending review queue.
 *
 * Consumers:
 *   - Dashboard banner: "N merchants need your review" — shown when
 *     `reviews.length > 0`
 *   - CategoryPickerModal: iterates over the full list, one row per
 *     unique unknown merchant
 *
 * Auth-gated: returns an empty list while the user is null or auth is
 * still resolving. Re-subscribes on user change.
 */

'use client';

import { useEffect, useState } from 'react';

import {
  subscribeToPendingReviews,
} from '@/lib/firebase/pending-reviews';
import type { PendingReviewItem } from '@/lib/types/review';
import { useAuth } from '@/lib/hooks/use-auth';

interface UsePendingReviewsState {
  reviews: PendingReviewItem[];
  loading: boolean;
  error: Error | null;
}

const SIGNED_OUT: UsePendingReviewsState = { reviews: [], loading: false, error: null };
const LOADING: UsePendingReviewsState = { reviews: [], loading: true, error: null };

export function usePendingReviews(): UsePendingReviewsState {
  const { user, loading: authLoading } = useAuth();
  // See useUserRules for the rationale behind this derivation pattern —
  // keeps the effect from calling setState for the signed-out reset.
  const [subscriptionState, setSubscriptionState] =
    useState<UsePendingReviewsState>(LOADING);

  useEffect(() => {
    if (!user) return;

    const unsub = subscribeToPendingReviews(
      user.uid,
      (reviews) => setSubscriptionState({ reviews, loading: false, error: null }),
      (err) => setSubscriptionState((s) => ({ ...s, loading: false, error: err })),
    );
    return unsub;
  }, [user]);

  if (authLoading) return LOADING;
  if (!user) return SIGNED_OUT;
  return subscriptionState;
}
