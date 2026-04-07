/**
 * lib/firebase/councils.ts
 *
 * One WeeklyCouncilDoc per ISO week. Doc ID = "YYYY-Www" e.g. "2026-W14".
 *
 * Path: users/{PERSONAL_USER_ID}/councils/{YYYY-Www}
 */

import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

import { db } from '@/lib/firebase/client';
import { PERSONAL_USER_ID } from '@/lib/config';
import type { WeeklyCouncilDoc } from '@/lib/types/transaction';

/**
 * ISO 8601 week number for `date`. Returns "YYYY-Www".
 * Algorithm: copy → set to Thursday of the same ISO week → diff from Jan 4.
 */
export function weekKey(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7; // Sunday = 7 instead of 0
  d.setUTCDate(d.getUTCDate() + 4 - dayNum); // Thursday of the ISO week
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

/** Subtract 1 from the ISO week of `date` and return its key. */
export function lastWeekKey(date: Date = new Date()): string {
  const seven = new Date(date);
  seven.setDate(seven.getDate() - 7);
  return weekKey(seven);
}

export async function getCouncilByKey(key: string): Promise<WeeklyCouncilDoc | null> {
  const snap = await getDoc(doc(db, 'users', PERSONAL_USER_ID, 'councils', key));
  if (!snap.exists()) return null;
  const raw = snap.data();
  return {
    weekStart: raw.weekStart,
    commitment: raw.commitment,
    followedThru: raw.followedThru,
    createdAt: raw.createdAt?.toDate?.() ?? new Date(),
  };
}

export async function saveCouncil(commitment: string): Promise<void> {
  const key = weekKey();
  await setDoc(
    doc(db, 'users', PERSONAL_USER_ID, 'councils', key),
    {
      weekStart: key,
      commitment,
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function markFollowedThru(key: string, followed: boolean): Promise<void> {
  await updateDoc(doc(db, 'users', PERSONAL_USER_ID, 'councils', key), {
    followedThru: followed,
  });
}
