'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  getCouncilByKey,
  lastWeekKey,
  markFollowedThru,
  saveCouncil,
  weekKey,
} from '@/lib/firebase/councils';
import type { WeeklyCouncilDoc } from '@/lib/types/transaction';

interface UseThisWeekCouncilState {
  thisWeek: WeeklyCouncilDoc | null;
  lastWeek: WeeklyCouncilDoc | null;
  loading: boolean;
  saveCommitment: (commitment: string) => Promise<void>;
  answerLastWeekFollowThru: (followed: boolean) => Promise<void>;
}

export function useThisWeekCouncil(): UseThisWeekCouncilState {
  const [thisWeek, setThisWeek] = useState<WeeklyCouncilDoc | null>(null);
  const [lastWeek, setLastWeek] = useState<WeeklyCouncilDoc | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [tw, lw] = await Promise.all([
      getCouncilByKey(weekKey()),
      getCouncilByKey(lastWeekKey()),
    ]);
    setThisWeek(tw);
    setLastWeek(lw);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveCommitment = useCallback(
    async (commitment: string) => {
      await saveCouncil(commitment);
      await refresh();
    },
    [refresh],
  );

  const answerLastWeekFollowThru = useCallback(
    async (followed: boolean) => {
      await markFollowedThru(lastWeekKey(), followed);
      await refresh();
    },
    [refresh],
  );

  return { thisWeek, lastWeek, loading, saveCommitment, answerLastWeekFollowThru };
}
