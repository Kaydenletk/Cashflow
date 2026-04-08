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
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  serverTimestamp,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';

import { db } from '@/lib/firebase/client';
import { ClassifiedBy, type Bucket } from '@/lib/types/transaction';
import type { PendingReviewItem, UserMerchantRule } from '@/lib/types/review';

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

/**
 * Describes a single HITL decision the user made in the category picker
 * modal: the merchant they're categorizing, the bucket they chose, and
 * whether they want to save a rule so future imports auto-classify it.
 */
export interface ResolveDecision {
  merchantKey: string;
  /** First-seen raw merchant text, used for subjectMerchantRaw on the rule. */
  merchantRaw: string;
  bucket: Bucket;
  subcategory?: string;
  /** If true, persist a UserMerchantRule for future imports. */
  saveAsRule: boolean;
  /**
   * The substring pattern the rule should match. Usually a truncated,
   * lowercased version of merchantRaw (e.g. the first word or two).
   * Ignored when saveAsRule === false.
   */
  rulePattern?: string;
}

/**
 * Resolve a batch of HITL review decisions atomically.
 *
 * For each decision:
 *   1. Query all transactions with matching `pendingReviewKey`
 *   2. Batch-update them: set bucket, needsReview=false,
 *      classifiedBy=USER_RULE, subcategory, clear pendingReviewKey
 *   3. Delete the matching `pending_reviews/{merchantKey}` doc
 *   4. Optionally create a `merchant_rules/*` doc (if saveAsRule)
 *
 * Firestore writeBatch allows up to 500 ops per batch. A typical review
 * session has a handful of decisions affecting at most a few dozen rows,
 * so one batch is plenty. If the set ever grows beyond 500 we'll chunk.
 */
export async function resolvePendingReviewsBatch(
  userId: string,
  decisions: ResolveDecision[],
): Promise<{ transactionsUpdated: number; rulesCreated: number }> {
  if (decisions.length === 0) {
    return { transactionsUpdated: 0, rulesCreated: 0 };
  }

  // 1. Gather all affected transactions, one query per decision.
  const txnCol = collection(db, 'users', userId, 'transactions');
  const affectedPerDecision = await Promise.all(
    decisions.map(async (d) => {
      const q = query(txnCol, where('pendingReviewKey', '==', d.merchantKey));
      const snap = await getDocs(q);
      return { decision: d, txnIds: snap.docs.map((doc) => doc.id) };
    }),
  );

  // 2. Assemble a single writeBatch.
  const batch = writeBatch(db);
  let transactionsUpdated = 0;
  let rulesCreated = 0;

  for (const { decision, txnIds } of affectedPerDecision) {
    // Update each affected transaction.
    for (const id of txnIds) {
      const ref = doc(db, 'users', userId, 'transactions', id);
      batch.update(ref, {
        bucket: decision.bucket,
        classifiedBy: ClassifiedBy.USER_RULE,
        needsReview: false,
        ...(decision.subcategory
          ? { subcategory: decision.subcategory }
          : {}),
        userOverridden: true,
        confidence: 0.95,
      });
      transactionsUpdated++;
    }

    // Delete the pending_reviews doc.
    const reviewRef = doc(
      db,
      'users',
      userId,
      'pending_reviews',
      decision.merchantKey,
    );
    batch.delete(reviewRef);

    // Optionally write a new user rule.
    if (decision.saveAsRule && decision.rulePattern) {
      const rulePayload: Omit<UserMerchantRule, 'createdAt'> & {
        createdAt: ReturnType<typeof serverTimestamp>;
      } = {
        pattern: decision.rulePattern.toLowerCase(),
        bucket: decision.bucket,
        ...(decision.subcategory
          ? { subcategory: decision.subcategory }
          : {}),
        fromReview: true,
        sourceMerchantRaw: decision.merchantRaw,
        createdAt: serverTimestamp(),
      };
      const ruleRef = doc(
        collection(db, 'users', userId, 'merchant_rules'),
      );
      batch.set(ruleRef, rulePayload);
      rulesCreated++;
    }
  }

  await batch.commit();
  return { transactionsUpdated, rulesCreated };
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
