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

export function usePendingReviews(): UsePendingReviewsState {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<UsePendingReviewsState>({
    reviews: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      setState({ reviews: [], loading: false, error: null });
      return;
    }

    const unsub = subscribeToPendingReviews(
      user.uid,
      (reviews) => setState({ reviews, loading: false, error: null }),
      (err) => setState((s) => ({ ...s, loading: false, error: err })),
    );
    return unsub;
  }, [user, authLoading]);

  return state;
}
