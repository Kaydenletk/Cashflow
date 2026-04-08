/**
 * lib/types/review.ts
 *
 * Types for the human-in-the-loop (HITL) merchant categorization flow.
 *
 * Flow:
 *   1. PDF import → classifier.ts classifies known merchants via global rules
 *   2. Unknown merchants → ClassifiedTransaction with needsReview: true
 *   3. Pipeline groups them by merchantKey → writes PendingReviewItem docs
 *      to users/{uid}/pending_reviews/{merchantKey}
 *   4. Dashboard banner counts pending reviews → opens CategoryPickerModal
 *   5. User picks a bucket + optional subcategory for each unique merchant
 *   6. Save button: batch-writes UserMerchantRule docs, deletes the
 *      pending_reviews entries, updates linked transactions
 *   7. Next import: the user rules auto-classify those merchants
 */

import type { Bucket, EmotionTag } from './transaction';

/**
 * An unknown merchant awaiting user categorization.
 *
 * Firestore path: users/{uid}/pending_reviews/{merchantKey}
 *
 * The doc ID IS the merchantKey (a stable hash of the normalized merchant
 * string) — re-importing a PDF doesn't spawn duplicate review rows for the
 * same merchant; Firestore's merge semantics just update the counts.
 */
export interface PendingReviewItem {
  /**
   * Stable hash of `merchantRaw.toLowerCase().replace(/\s+/g, ' ').trim()
   * .slice(0, 120)`. Also the Firestore doc ID.
   */
  merchantKey: string;
  /** The exact merchantRaw the first time we saw it (for display). */
  merchantRaw: string;
  /** How many transactions are currently blocked on this review decision. */
  occurrenceCount: number;
  /** Earliest and latest dates across the pending transactions. */
  firstSeen: Date;
  lastSeen: Date;
  /**
   * Transaction doc IDs currently in the NEEDS_REVIEW state waiting on
   * this merchant. Used by the save action to batch-update them.
   */
  pendingTransactionIds: string[];
  /**
   * Sum of signed amounts across pending transactions. Helps the user
   * understand "how much money this merchant affects" at a glance.
   */
  totalAmount: number;
  /** Set by serverTimestamp() at write time. */
  createdAt: Date;
}

/**
 * A user-authored merchant rule, created via the HITL review modal
 * (or, later, via a manual rules-management page).
 *
 * Firestore path: users/{uid}/merchant_rules/{ruleId}
 *
 * Matching semantics mirror the global `MerchantRule` in
 * `lib/classification/merchant-rules.ts`: lowercase substring match
 * against `merchantRaw.toLowerCase()`. Confidence is fixed at 0.95
 * when applied (same as a global merchant rule hit).
 */
export interface UserMerchantRule {
  /** Lowercase substring to match against merchant (same as global rules). */
  pattern: string;
  bucket: Bucket;
  /** Optional fine-grained label the user picks during review. */
  subcategory?: string;
  /** Optional emotional framing. */
  emotionTag?: EmotionTag;
  /** True if authored through the HITL modal (vs. manual rule management). */
  fromReview: boolean;
  /** Snapshot of the raw merchant that spawned the rule — for UI labels. */
  sourceMerchantRaw: string;
  /** Set by serverTimestamp() at write time. */
  createdAt: Date;
}
