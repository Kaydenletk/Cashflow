/**
 * lib/firebase/verdicts.ts
 *
 * One DailyVerdictDoc per day. Doc ID is the local ISO date string
 * (YYYY-MM-DD), which gives us free uniqueness — Firestore can't have two
 * docs with the same ID in the same collection.
 *
 * Path: users/{PERSONAL_USER_ID}/verdicts/{YYYY-MM-DD}
 */

import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';

import { db } from '@/lib/firebase/client';
import { PERSONAL_USER_ID } from '@/lib/config';
import { Verdict, type DailyVerdictDoc } from '@/lib/types/transaction';

/** Local ISO date string for the user's machine, NOT UTC. */
export function todayKey(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function getTodayVerdict(): Promise<DailyVerdictDoc | null> {
  const key = todayKey();
  const snap = await getDoc(doc(db, 'users', PERSONAL_USER_ID, 'verdicts', key));
  if (!snap.exists()) return null;
  const raw = snap.data();
  return {
    date: raw.date,
    guess: raw.guess,
    actual: raw.actual,
    perceptionGap: raw.perceptionGap,
    createdAt: raw.createdAt?.toDate?.() ?? new Date(),
  };
}

export async function saveVerdict(input: {
  guess: keyof typeof Verdict;
  actual: keyof typeof Verdict;
}): Promise<void> {
  const key = todayKey();
  const perceptionGap = input.guess !== input.actual;
  // Read existing doc first so we don't bump createdAt on a re-save.
  const ref = doc(db, 'users', PERSONAL_USER_ID, 'verdicts', key);
  const existing = await getDoc(ref);
  await setDoc(
    ref,
    {
      date: key,
      guess: input.guess,
      actual: input.actual,
      perceptionGap,
      ...(existing.exists() ? {} : { createdAt: serverTimestamp() }),
    },
    { merge: true },
  );
}
