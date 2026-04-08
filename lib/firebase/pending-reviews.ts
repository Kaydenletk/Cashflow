/**
 * lib/firebase/pending-reviews.ts
 *
 * Firestore CRUD for the HITL pending-review queue.
 *
 * Path: users/{userId}/pending_reviews/{merchantKey}
 *
 * The doc ID is the merchantKey — a stable sha256 hash of the normalized
 * merchant string (see lib/firebase/dedupe.ts > hashMerchantKey). Using
 * the hash as the ID means re-imports of the same PDF don't create
 * duplicate review rows: Firestore's `setDoc(..., { merge: true })`
 * semantics just update the occurrenceCount / pendingTransactionIds in place.
 *
 * Lifecycle:
 *   1. Classification pipeline writes a PendingReviewItem for each unique
 *      unknown merchant during commit
 *   2. Dashboard banner counts pending_reviews > 0 and offers "Review"
 *   3. CategoryPickerModal saves user decisions:
 *      - creates UserMerchantRule docs
 *      - updates linked transactions (bucket + needsReview: false)
 *      - deletes the resolved PendingReviewItem
 */

import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  serverTimestamp,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';

import { db } from '@/lib/firebase/client';
import type { PendingReviewItem } from '@/lib/types/review';

// ─── Writes ──────────────────────────────────────────────────────────────────

/**
 * Create or merge a pending review item. When a PDF is re-imported, the
 * same merchantKey doc is written again with `{ merge: true }` — existing
 * fields update, the createdAt stays as-is (serverTimestamp only applies
 * to the FIRST write because of the merge semantics of setDoc).
 *
 * Caller is responsible for passing the full shape; this function does
 * NOT compute it from transactions.
 */
export async function upsertPendingReview(
  userId: string,
  item: Omit<PendingReviewItem, 'createdAt'>,
): Promise<void> {
  const ref = doc(
    db,
    'users',
    userId,
    'pending_reviews',
    item.merchantKey,
  );
  await setDoc(
    ref,
    {
      ...item,
      firstSeen: Timestamp.fromDate(item.firstSeen),
      lastSeen: Timestamp.fromDate(item.lastSeen),
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );
}

/**
 * Batch-upsert multiple pending reviews during a single commit. Preferred
 * over a loop of individual writes because it's atomic across the whole set.
 */
export async function upsertPendingReviewsBatch(
  userId: string,
  items: Array<Omit<PendingReviewItem, 'createdAt'>>,
): Promise<void> {
  if (items.length === 0) return;
  const batch = writeBatch(db);
  for (const item of items) {
    const ref = doc(
      db,
      'users',
      userId,
      'pending_reviews',
      item.merchantKey,
    );
    batch.set(
      ref,
      {
        ...item,
        firstSeen: Timestamp.fromDate(item.firstSeen),
        lastSeen: Timestamp.fromDate(item.lastSeen),
        createdAt: serverTimestamp(),
      },
      { merge: true },
    );
  }
  await batch.commit();
}

/**
 * Delete a resolved pending review once the user has decided its category
 * and the linked transactions have been updated.
 */
export async function deletePendingReview(
  userId: string,
  merchantKey: string,
): Promise<void> {
  await deleteDoc(
    doc(db, 'users', userId, 'pending_reviews', merchantKey),
  );
}

// ─── Subscriptions ───────────────────────────────────────────────────────────

/**
 * Subscribe to all pending review items for the given user, ordered by
 * createdAt descending. Used by the dashboard banner + the review modal.
 */
export function subscribeToPendingReviews(
  userId: string,
  onChange: (items: PendingReviewItem[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'users', userId, 'pending_reviews'),
    orderBy('createdAt', 'desc'),
  );
  return onSnapshot(
    q,
    (snap) => {
      const items: PendingReviewItem[] = snap.docs.map((d) => {
        const raw = d.data();
        return {
          merchantKey: raw.merchantKey ?? d.id,
          merchantRaw: raw.merchantRaw,
          occurrenceCount: raw.occurrenceCount,
          firstSeen:
            raw.firstSeen instanceof Timestamp
              ? raw.firstSeen.toDate()
              : new Date(raw.firstSeen),
          lastSeen:
            raw.lastSeen instanceof Timestamp
              ? raw.lastSeen.toDate()
              : new Date(raw.lastSeen),
          pendingTransactionIds: raw.pendingTransactionIds ?? [],
          totalAmount: raw.totalAmount,
          createdAt:
            raw.createdAt instanceof Timestamp
              ? raw.createdAt.toDate()
              : (raw.createdAt ?? new Date()),
        } satisfies PendingReviewItem;
      });
      onChange(items);
    },
    (err) => onError?.(err),
  );
}
