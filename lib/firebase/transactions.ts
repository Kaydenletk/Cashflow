/**
 * lib/firebase/transactions.ts
 *
 * Firestore CRUD wrapper for transactions. Validates with Zod, runs
 * classification, writes via the Web SDK, exposes onSnapshot subscriptions.
 *
 * Path: users/{PERSONAL_USER_ID}/transactions/{auto-id}
 */

import {
  Timestamp,
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { z } from 'zod';

import { db } from '@/lib/firebase/client';
import { PERSONAL_USER_ID } from '@/lib/config';
import { classify } from '@/lib/classification/classifier';
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
 * Add a transaction. Runs classification, applies user override if present,
 * writes to users/{PERSONAL_USER_ID}/transactions.
 */
export async function addTransaction(input: TransactionInput): Promise<string> {
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
  const ref = await addDoc(collection(db, 'users', PERSONAL_USER_ID, 'transactions'), {
    ...docPayload,
    date: Timestamp.fromDate(parsed.date),
  });
  return ref.id;
}

/**
 * Update only the bucket of an existing transaction (used by the edit-bucket
 * action on a TransactionRow — out of scope this slice but the function is
 * kept tiny so a future task can wire it up without changing the data layer).
 */
export async function updateTransactionBucket(id: string, bucket: Bucket): Promise<void> {
  await updateDoc(doc(db, 'users', PERSONAL_USER_ID, 'transactions', id), {
    bucket,
    classifiedBy: ClassifiedBy.USER,
    userOverridden: true,
  });
}

// ── Subscriptions ───────────────────────────────────────────────────────────

/**
 * Subscribe to ALL transactions for the personal user, ordered by date desc.
 * Consumers (hooks) filter to current month / today / week as needed.
 */
export function subscribeToTransactions(
  onChange: (txns: TransactionWithId[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'users', PERSONAL_USER_ID, 'transactions'),
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
