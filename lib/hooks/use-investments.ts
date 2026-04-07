'use client';

import { useEffect, useState } from 'react';
import {
  subscribeToInvestments,
  type InvestmentWithId,
} from '@/lib/firebase/investments';

interface UseInvestmentsState {
  investments: InvestmentWithId[];
  loading: boolean;
  error: Error | null;
}

export function useInvestments(): UseInvestmentsState {
  const [state, setState] = useState<UseInvestmentsState>({
    investments: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    const unsub = subscribeToInvestments(
      (holdings) => setState({ investments: holdings, loading: false, error: null }),
      (err) => setState((s) => ({ ...s, loading: false, error: err })),
    );
    return unsub;
  }, []);

  return state;
}
