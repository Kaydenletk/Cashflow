/**
 * lib/types/transaction.ts
 *
 * Canonical type definitions for Cashflow — replaces the Prisma-generated enums.
 *
 * Uses TS const objects + union types (NOT `enum`) so values:
 *   - tree-shake cleanly
 *   - serialize as plain strings to Firestore
 *   - are usable at runtime without TypeScript compilation artifacts
 *
 * Amount storage: plain `number` with 2 decimal precision (dollars), e.g. 19.99.
 * Date storage: `Date` in TS; serialized to Firestore Timestamp at write time.
 */

// ── Enums ─────────────────────────────────────────────────────────────────────

export const Bucket = {
  ASSET: 'ASSET',
  LIABILITY: 'LIABILITY',
  EXPENSE: 'EXPENSE',
  INCOME: 'INCOME',
} as const;
export type Bucket = (typeof Bucket)[keyof typeof Bucket];

export const IncomeType = {
  ACTIVE: 'ACTIVE',
  PASSIVE: 'PASSIVE',
} as const;
export type IncomeType = (typeof IncomeType)[keyof typeof IncomeType];

export const ClassifiedBy = {
  RULE: 'RULE',
  CATEGORY: 'CATEGORY',
  AI: 'AI',
  USER: 'USER',
} as const;
export type ClassifiedBy = (typeof ClassifiedBy)[keyof typeof ClassifiedBy];

export const Mood = {
  HAPPY: 'HAPPY',
  NEUTRAL: 'NEUTRAL',
  REGRET: 'REGRET',
} as const;
export type Mood = (typeof Mood)[keyof typeof Mood];

export const Verdict = {
  RICHER: 'RICHER',
  SAME: 'SAME',
  POORER: 'POORER',
} as const;
export type Verdict = (typeof Verdict)[keyof typeof Verdict];

// ── Firestore document interfaces ─────────────────────────────────────────────
//
// Firestore path layout:
//   users/{uid}                    ← UserDoc
//     transactions/{txId}          ← TransactionDoc  (auto-ID)
//     investments/{invId}          ← InvestmentDoc   (auto-ID)
//     verdicts/{YYYY-MM-DD}        ← DailyVerdictDoc (date string enforces uniqueness)
//     councils/{YYYY-Www}          ← WeeklyCouncilDoc (ISO week string, e.g. "2026-W14")
//
// userId is NOT stored on sub-collection docs — it's already encoded in the path.

export interface UserDoc {
  email: string;
  createdAt: Date;
}

export interface TransactionDoc {
  /** Amount in dollars with 2 decimal precision, e.g. 19.99 */
  amount: number;
  merchant: string;
  category?: string;
  bucket: Bucket;
  incomeType?: IncomeType;
  classifiedBy: ClassifiedBy;
  /** 0–1 float representing classification confidence */
  confidence: number;
  userOverridden: boolean;
  /** Required when bucket === LIABILITY — user must type a reason */
  liabilityReason?: string;
  mood?: Mood;
  note?: string;
  /** User-supplied transaction date; serialized to Firestore Timestamp at write time */
  date: Date;
  /** Set by serverTimestamp() at write time */
  createdAt: Date;
  /** Doc ID of the linked Investment sub-collection doc, if any */
  investmentId?: string;
}

export interface InvestmentDoc {
  ticker: string;
  /** Number of shares, up to 4 decimal places */
  shares: number;
  /** Average cost per share in dollars */
  avgCost: number;
  /** Current price per share in dollars (manually updated) */
  currentPrice: number;
  lastUpdated: Date;
  notes?: string;
}

export interface DailyVerdictDoc {
  /** ISO date string matching the document ID, e.g. "2026-04-07" */
  date: string;
  guess: Verdict;
  actual: Verdict;
  /** True when guess !== actual */
  perceptionGap: boolean;
  createdAt: Date;
}

export interface WeeklyCouncilDoc {
  /** ISO week string matching the document ID, e.g. "2026-W14" */
  weekStart: string;
  commitment: string;
  /** Null until user answers the follow-up the next week */
  followedThru?: boolean;
  createdAt: Date;
}
