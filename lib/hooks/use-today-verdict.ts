'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  getTodayVerdict,
  saveVerdict,
} from '@/lib/firebase/verdicts';
import type { DailyVerdictDoc, Verdict } from '@/lib/types/transaction';

interface UseTodayVerdictState {
  verdict: DailyVerdictDoc | null;
  loading: boolean;
  refresh: () => Promise<void>;
  save: (input: { guess: keyof typeof Verdict; actual: keyof typeof Verdict }) => Promise<void>;
}

export function useTodayVerdict(): UseTodayVerdictState {
  const [verdict, setVerdict] = useState<DailyVerdictDoc | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const v = await getTodayVerdict();
      setVerdict(v);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const save: UseTodayVerdictState['save'] = useCallback(
    async (input) => {
      await saveVerdict(input);
      await refresh();
    },
    [refresh],
  );

  return { verdict, loading, refresh, save };
}
