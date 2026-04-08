/**
 * lib/firebase/transactions.ts
 *
 * Firestore CRUD wrapper for transactions. Validates with Zod, runs
 * classification, writes via the Web SDK, exposes onSnapshot subscriptions.
 *
 * Path: users/{userId}/transactions/{auto-id}
 *
 * Every function takes `userId` as its first argument. Callers get it from
 * useAuth().user?.uid on the client, or — for API routes that touch
 * Firestore — from a verified ID token (Phase D+). During Phase C all
 * writes happen client-side behind Firestore rules, so server-side auth
 * verification is deferred.
 */

import {
  Timestamp,
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { z } from 'zod';

import { db } from '@/lib/firebase/client';
import { classify } from '@/lib/classification/classifier';
import type { ClassifiedTransaction } from '@/lib/classification/pipeline';
import {
  Bucket,
  ClassifiedBy,
  Mood,
  type TransactionDoc,
} from '@/lib/types/transaction';

// ── Zod schema for the input the modal sends ────────────────────────────────

export const transactionInputSchema = z
  .object({
    amount: z.number().positive(),
    merchant: z.string().min(1).max(200),
    category: z.string().optional(),
    date: z.date(),
    bucketOverride: z
      .enum([Bucket.ASSET, Bucket.LIABILITY, Bucket.EXPENSE, Bucket.INCOME])
      .optional(),
    liabilityReason: z.string().optional(),
    mood: z.enum([Mood.HAPPY, Mood.NEUTRAL, Mood.REGRET]).optional(),
    note: z.string().max(500).optional(),
    investmentId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // Liability friction: if final bucket is LIABILITY, reason ≥ 10 chars is required.
    const finalBucket =
      data.bucketOverride ?? classify({ merchant: data.merchant, category: data.category }).bucket;
    if (finalBucket === Bucket.LIABILITY) {
      if (!data.liabilityReason || data.liabilityReason.trim().length < 10) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['liabilityReason'],
          message: 'A reason ≥ 10 characters is required for any LIABILITY.',
        });
      }
    }
  });

export type TransactionInput = z.infer<typeof transactionInputSchema>;

// ── In-memory shape with Firestore ID attached ──────────────────────────────

export interface TransactionWithId extends TransactionDoc {
  id: string;
}

// ── Writes ──────────────────────────────────────────────────────────────────

/**
 * Add a single transaction (manual-entry path). Runs classification, applies
 * user override if present, writes to users/{userId}/transactions.
 *
 * For batch imports from PDF, use addTransactionsBatch() (added in Task 6).
 */
export async function addTransaction(
  userId: string,
  input: TransactionInput,
): Promise<string> {
  const parsed = transactionInputSchema.parse(input);
  const result = classify({ merchant: parsed.merchant, category: parsed.category });

  const finalBucket = parsed.bucketOverride ?? result.bucket;
  const userOverridden = parsed.bucketOverride !== undefined;
  const finalClassifiedBy = userOverridden ? ClassifiedBy.USER : result.classifiedBy;

  const docPayload: Omit<TransactionDoc, 'createdAt'> & { createdAt: ReturnType<typeof serverTimestamp> } = {
    amount: parsed.amount,
    merchant: parsed.merchant,
    bucket: finalBucket,
    classifiedBy: finalClassifiedBy,
    confidence: userOverridden ? 1 : result.confidence,
    userOverridden,
    date: parsed.date,
    createdAt: serverTimestamp(),
  };
  if (parsed.category) docPayload.category = parsed.category;
  if (result.incomeType) docPayload.incomeType = result.incomeType;
  if (parsed.liabilityReason) docPayload.liabilityReason = parsed.liabilityReason.trim();
  if (parsed.mood) docPayload.mood = parsed.mood;
  if (parsed.note) docPayload.note = parsed.note;
  if (parsed.investmentId) docPayload.investmentId = parsed.investmentId;

  // Firestore needs Timestamp objects for date fields.
  const ref = await addDoc(collection(db, 'users', userId, 'transactions'), {
    ...docPayload,
    date: Timestamp.fromDate(parsed.date),
  });
  return ref.id;
}

/**
 * Query which of the provided dedupe hashes already exist in Firestore for
 * this user. Returns a Set of hashes that are present (i.e. duplicates).
 *
 * Firestore's `in` operator is capped at 10 values per query, so we chunk
 * the input into groups of 10 and run them in parallel. For a typical
 * 40-row statement that's 4 concurrent reads — negligible.
 */
export async function findExistingDedupeHashes(
  userId: string,
  hashes: string[],
): Promise<Set<string>> {
  if (hashes.length === 0) return new Set();

  const existing = new Set<string>();
  const chunks: string[][] = [];
  for (let i = 0; i < hashes.length; i += 10) {
    chunks.push(hashes.slice(i, i + 10));
  }

  const col = collection(db, 'users', userId, 'transactions');
  await Promise.all(
    chunks.map(async (chunk) => {
      const q = query(col, where('dedupeHash', 'in', chunk));
      const snap = await getDocs(q);
      snap.forEach((d) => {
        const h = d.data().dedupeHash as string | undefined;
        if (h) existing.add(h);
      });
    }),
  );
  return existing;
}

/**
 * Batch-write classified transactions from a PDF import. Dedupes against
 * existing hashes first, then writes survivors via writeBatch in chunks of
 * 500 (Firestore's per-batch write limit).
 *
 * Returns the number of new transactions written and the number of
 * duplicates skipped, so the upload UI can show "Imported N transactions
 * (M duplicates skipped)" in its success toast.
 */
export async function addTransactionsBatch(
  userId: string,
  classified: ClassifiedTransaction[],
): Promise<{ written: number; skipped: number }> {
  if (classified.length === 0) return { written: 0, skipped: 0 };

  const hashes = classified.map((t) => t.dedupeHash);
  const existing = await findExistingDedupeHashes(userId, hashes);

  const survivors = classified.filter((t) => !existing.has(t.dedupeHash));
  if (survivors.length === 0) {
    return { written: 0, skipped: classified.length };
  }

  const col = collection(db, 'users', userId, 'transactions');

  // Firestore writeBatch allows up to 500 operations per batch.
  const BATCH_SIZE = 500;
  for (let i = 0; i < survivors.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    for (const tx of survivors.slice(i, i + BATCH_SIZE)) {
      const ref = doc(col);
      const payload: Record<string, unknown> = {
        amount: tx.amount,
        merchant: tx.merchant,
        bucket: tx.bucket,
        classifiedBy: tx.classifiedBy,
        confidence: tx.confidence,
        userOverridden: false,
        date: Timestamp.fromDate(tx.date),
        createdAt: serverTimestamp(),
        dedupeHash: tx.dedupeHash,
        sourceFile: tx.sourceFile,
        sourceBank: tx.sourceBank,
        needsReview: tx.needsReview,
      };
      if (tx.matchedRule) payload.matchedRule = tx.matchedRule;
      if (tx.subcategory) payload.subcategory = tx.subcategory;
      if (tx.pendingReviewKey) payload.pendingReviewKey = tx.pendingReviewKey;
      batch.set(ref, payload);
    }
    await batch.commit();
  }

  return { written: survivors.length, skipped: classified.length - survivors.length };
}

/**
 * Update only the bucket of an existing transaction (used by the edit-bucket
 * action on a TransactionRow — out of scope this slice but the function is
 * kept tiny so a future task can wire it up without changing the data layer).
 */
export async function updateTransactionBucket(
  userId: string,
  id: string,
  bucket: Bucket,
): Promise<void> {
  await updateDoc(doc(db, 'users', userId, 'transactions', id), {
    bucket,
    classifiedBy: ClassifiedBy.USER,
    userOverridden: true,
  });
}

// ── Subscriptions ───────────────────────────────────────────────────────────

/**
 * Subscribe to ALL transactions for a given user, ordered by date desc.
 * Consumers (hooks) filter to current month / today / week as needed.
 *
 * IMPORTANT: callers must pass a valid userId. If the user is not yet
 * authenticated, DO NOT call this — gate the subscription in the hook.
 */
export function subscribeToTransactions(
  userId: string,
  onChange: (txns: TransactionWithId[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'users', userId, 'transactions'),
    orderBy('date', 'desc'),
  );
  return onSnapshot(
    q,
    (snap) => {
      const txns: TransactionWithId[] = snap.docs.map((d) => {
        const raw = d.data();
        return {
          id: d.id,
          amount: raw.amount,
          merchant: raw.merchant,
          category: raw.category,
          bucket: raw.bucket,
          incomeType: raw.incomeType,
          classifiedBy: raw.classifiedBy,
          confidence: raw.confidence,
          userOverridden: raw.userOverridden,
          liabilityReason: raw.liabilityReason,
          mood: raw.mood,
          note: raw.note,
          // Convert Firestore Timestamp → Date
          date: raw.date?.toDate?.() ?? new Date(raw.date),
          createdAt: raw.createdAt?.toDate?.() ?? new Date(),
          investmentId: raw.investmentId,
        } as TransactionWithId;
      });
      onChange(txns);
    },
    (err) => onError?.(err),
  );
}
