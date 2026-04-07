/**
 * lib/firebase/investments.ts
 *
 * Firestore CRUD for investments + auto-create the linked ASSET transaction
 * when adding a new investment (per spec §6.2 Screen 3 + §3 of CLAUDE_CODE_PLAN.md).
 *
 * Both writes happen in a single Firestore writeBatch so the investment doc
 * and its linked transaction never get out of sync.
 *
 * Path: users/{PERSONAL_USER_ID}/investments/{auto-id}
 */

import {
  Timestamp,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { z } from 'zod';

import { db } from '@/lib/firebase/client';
import { PERSONAL_USER_ID } from '@/lib/config';
import {
  Bucket,
  ClassifiedBy,
  type InvestmentDoc,
} from '@/lib/types/transaction';

// ── Zod schema for AddInvestmentModal input ─────────────────────────────────

export const investmentInputSchema = z.object({
  ticker: z
    .string()
    .min(1)
    .max(10)
    .regex(/^[A-Z0-9.]+$/, 'Ticker must be uppercase letters / digits / dots'),
  shares: z.number().positive(),
  avgCost: z.number().positive(),
  currentPrice: z.number().positive(),
  notes: z.string().max(500).optional(),
});

export type InvestmentInput = z.infer<typeof investmentInputSchema>;

export interface InvestmentWithId extends InvestmentDoc {
  id: string;
}

// ── Writes ──────────────────────────────────────────────────────────────────

/**
 * Add an investment. ALSO creates a linked ASSET transaction in the same
 * writeBatch so the two never drift apart.
 *
 * Returns { investmentId, transactionId }.
 */
export async function addInvestment(input: InvestmentInput): Promise<{
  investmentId: string;
  transactionId: string;
}> {
  const parsed = investmentInputSchema.parse(input);

  const investmentsCol = collection(db, 'users', PERSONAL_USER_ID, 'investments');
  const transactionsCol = collection(db, 'users', PERSONAL_USER_ID, 'transactions');

  const investmentRef = doc(investmentsCol);
  const transactionRef = doc(transactionsCol);

  const batch = writeBatch(db);

  batch.set(investmentRef, {
    ticker: parsed.ticker,
    shares: parsed.shares,
    avgCost: parsed.avgCost,
    currentPrice: parsed.currentPrice,
    lastUpdated: serverTimestamp(),
    ...(parsed.notes ? { notes: parsed.notes } : {}),
  });

  const today = new Date();
  batch.set(transactionRef, {
    amount: parsed.shares * parsed.avgCost,
    merchant: parsed.ticker,
    bucket: Bucket.ASSET,
    classifiedBy: ClassifiedBy.USER,
    confidence: 1,
    userOverridden: false,
    investmentId: investmentRef.id,
    date: Timestamp.fromDate(today),
    createdAt: serverTimestamp(),
  });

  await batch.commit();
  return { investmentId: investmentRef.id, transactionId: transactionRef.id };
}

/**
 * Update the manual current price for a single holding.
 * Sets `lastUpdated: serverTimestamp()`.
 */
export async function updateInvestmentPrice(id: string, currentPrice: number): Promise<void> {
  if (currentPrice <= 0) throw new Error('currentPrice must be > 0');
  const ref = doc(db, 'users', PERSONAL_USER_ID, 'investments', id);
  const batch = writeBatch(db);
  batch.update(ref, { currentPrice, lastUpdated: serverTimestamp() });
  await batch.commit();
}

/**
 * Batched price update for many holdings at once (used by UpdatePricesModal).
 * One writeBatch — atomic from the user's perspective.
 */
export async function updateInvestmentPrices(
  updates: Array<{ id: string; currentPrice: number }>,
): Promise<void> {
  if (updates.length === 0) return;
  const batch = writeBatch(db);
  for (const u of updates) {
    if (u.currentPrice <= 0) throw new Error(`currentPrice must be > 0 (id ${u.id})`);
    const ref = doc(db, 'users', PERSONAL_USER_ID, 'investments', u.id);
    batch.update(ref, { currentPrice: u.currentPrice, lastUpdated: serverTimestamp() });
  }
  await batch.commit();
}

// ── Subscriptions ───────────────────────────────────────────────────────────

export function subscribeToInvestments(
  onChange: (holdings: InvestmentWithId[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'users', PERSONAL_USER_ID, 'investments'),
    orderBy('ticker', 'asc'),
  );
  return onSnapshot(
    q,
    (snap) => {
      const holdings: InvestmentWithId[] = snap.docs.map((d) => {
        const raw = d.data();
        return {
          id: d.id,
          ticker: raw.ticker,
          shares: raw.shares,
          avgCost: raw.avgCost,
          currentPrice: raw.currentPrice,
          lastUpdated: raw.lastUpdated?.toDate?.() ?? new Date(),
          notes: raw.notes,
        };
      });
      onChange(holdings);
    },
    (err) => onError?.(err),
  );
}
