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

export function useUserRules(): UseUserRulesState {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<UseUserRulesState>({
    rules: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      setState({ rules: [], loading: false, error: null });
      return;
    }

    const unsub = subscribeToUserRules(
      user.uid,
      (rules) => setState({ rules, loading: false, error: null }),
      (err) => setState((s) => ({ ...s, loading: false, error: err })),
    );
    return unsub;
  }, [user, authLoading]);

  return state;
}
