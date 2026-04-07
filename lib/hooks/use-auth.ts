/**
 * lib/hooks/use-auth.ts
 *
 * React hook exposing the current Firebase Auth user. Consumers use this to:
 *   - gate content behind sign-in (via <AuthGate>)
 *   - scope Firestore subscriptions to user.uid
 *   - render user profile chips in the header
 *
 * While loading === true, consumers should render nothing (or a skeleton)
 * because user === null is ambiguous (could mean "signed out" OR "still
 * resolving"). Only once loading === false is user definitive.
 */

'use client';

import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';

import {
  onAuthChange,
  signInWithGoogle,
  signOut,
} from '@/lib/firebase/auth';

export interface UseAuthState {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<User>;
  signOut: () => Promise<void>;
}

export function useAuth(): UseAuthState {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthChange((next) => {
      setUser(next);
      setLoading(false);
    });
  }, []);

  return {
    user,
    loading,
    signIn: signInWithGoogle,
    signOut,
  };
}
