/**
 * lib/firebase/user-rules.ts
 *
 * Firestore CRUD for per-user merchant rules.
 *
 * Path: users/{userId}/merchant_rules/{ruleId}
 *
 * These rules are the HITL counterpart to the global merchant rules in
 * `lib/classification/merchant-rules.ts`. When the user tags an unknown
 * merchant via the category picker modal, the resulting decision is
 * written here as a UserMerchantRule and auto-applied on subsequent
 * imports via the classification pipeline (Task 6).
 *
 * Match semantics: substring match on `merchantRaw.toLowerCase()`,
 * first-hit-wins. User rules take precedence over global rules because
 * the pipeline consults them first.
 *
 * All writes go through the Firebase Web SDK and are gated by the
 * `request.auth.uid == userId` rule in firestore.rules — no admin SDK.
 */

import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';

import { db } from '@/lib/firebase/client';
import type { UserMerchantRule } from '@/lib/types/review';

// ─── In-memory shape with Firestore ID attached ──────────────────────────────

export interface UserMerchantRuleWithId extends UserMerchantRule {
  id: string;
}

// ─── Writes ──────────────────────────────────────────────────────────────────

/**
 * Create a new per-user merchant rule. Used by the HITL review save action
 * (single rule) and by a future manual rules-management page (also single
 * rule). Pattern is lowercased before write.
 */
export async function createUserRule(
  userId: string,
  rule: Omit<UserMerchantRule, 'createdAt'>,
): Promise<string> {
  const ref = await addDoc(
    collection(db, 'users', userId, 'merchant_rules'),
    {
      ...rule,
      pattern: rule.pattern.toLowerCase(),
      createdAt: serverTimestamp(),
    },
  );
  return ref.id;
}

/**
 * Batch-write multiple user rules. Used when the HITL modal saves all
 * decisions at once. Firestore writeBatch handles atomicity across the
 * writes; up to 500 operations per batch (we're nowhere near that).
 */
export async function createUserRulesBatch(
  userId: string,
  rules: Array<Omit<UserMerchantRule, 'createdAt'>>,
): Promise<void> {
  if (rules.length === 0) return;
  const batch = writeBatch(db);
  const col = collection(db, 'users', userId, 'merchant_rules');
  for (const rule of rules) {
    const ref = doc(col);
    batch.set(ref, {
      ...rule,
      pattern: rule.pattern.toLowerCase(),
      createdAt: serverTimestamp(),
    });
  }
  await batch.commit();
}

/**
 * Delete a user rule by ID. No cascade — transactions that were previously
 * classified by this rule keep their bucket assignment.
 */
export async function deleteUserRule(
  userId: string,
  ruleId: string,
): Promise<void> {
  await deleteDoc(doc(db, 'users', userId, 'merchant_rules', ruleId));
}

// ─── Subscriptions ───────────────────────────────────────────────────────────

/**
 * Subscribe to all user rules for the given user, ordered by creation time
 * (newest first). The classification pipeline iterates over this list on
 * every import so an ordered-by-recency list gives the user a sensible
 * "most-recent-rule wins" behavior if two rules accidentally overlap.
 */
export function subscribeToUserRules(
  userId: string,
  onChange: (rules: UserMerchantRuleWithId[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'users', userId, 'merchant_rules'),
    orderBy('createdAt', 'desc'),
  );
  return onSnapshot(
    q,
    (snap) => {
      const rules: UserMerchantRuleWithId[] = snap.docs.map((d) => {
        const raw = d.data();
        return {
          id: d.id,
          pattern: raw.pattern,
          bucket: raw.bucket,
          subcategory: raw.subcategory,
          emotionTag: raw.emotionTag,
          fromReview: raw.fromReview,
          sourceMerchantRaw: raw.sourceMerchantRaw,
          createdAt:
            raw.createdAt instanceof Timestamp
              ? raw.createdAt.toDate()
              : (raw.createdAt ?? new Date()),
        } satisfies UserMerchantRuleWithId;
      });
      onChange(rules);
    },
    (err) => onError?.(err),
  );
}
