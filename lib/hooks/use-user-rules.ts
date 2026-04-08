/**
 * lib/hooks/use-user-rules.ts
 *
 * React hook that exposes the current user's per-user merchant rules.
 *
 * Consumers:
 *   - Classification pipeline (indirectly, via the upload flow) — loads
 *     the rules once, passes them to runPipeline()
 *   - A future rules-management page — renders the list, supports delete
 *
 * Auth-gated: returns an empty list while the user is null or auth is
 * still resolving. Re-subscribes on user change.
 */

'use client';

import { useEffect, useState } from 'react';

import {
  subscribeToUserRules,
  type UserMerchantRuleWithId,
} from '@/lib/firebase/user-rules';
import { useAuth } from '@/lib/hooks/use-auth';

interface UseUserRulesState {
  rules: UserMerchantRuleWithId[];
  loading: boolean;
  error: Error | null;
}

const SIGNED_OUT: UseUserRulesState = { rules: [], loading: false, error: null };
const LOADING: UseUserRulesState = { rules: [], loading: true, error: null };

export function useUserRules(): UseUserRulesState {
  const { user, loading: authLoading } = useAuth();
  // Only holds the *authenticated* subscription result. The signed-out
  // and loading states are derived below so the effect never needs to
  // call setState to reset them (avoids react-hooks/set-state-in-effect).
  const [subscriptionState, setSubscriptionState] = useState<UseUserRulesState>(LOADING);

  useEffect(() => {
    if (!user) return;

    const unsub = subscribeToUserRules(
      user.uid,
      (rules) => setSubscriptionState({ rules, loading: false, error: null }),
      (err) => setSubscriptionState((s) => ({ ...s, loading: false, error: err })),
    );
    return unsub;
  }, [user]);

  if (authLoading) return LOADING;
  if (!user) return SIGNED_OUT;
  return subscriptionState;
}
