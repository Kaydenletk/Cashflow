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
  /** Matched a per-user merchant rule saved from an HITL review decision. */
  USER_RULE: 'USER_RULE',
  /** Parked — awaiting user categorization in the review queue. */
  NEEDS_REVIEW: 'NEEDS_REVIEW',
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

// ── Compound MVP (CSV import) enums ───────────────────────────────────────────

export const SourceBank = {
  CHASE: 'CHASE',
  BOA: 'BOA',
  WELLS_FARGO: 'WELLS_FARGO',
  OTHER: 'OTHER',
} as const;
export type SourceBank = (typeof SourceBank)[keyof typeof SourceBank];

export const EmotionTag = {
  ESSENTIAL: 'ESSENTIAL',
  COMFORT: 'COMFORT',
  IMPULSE: 'IMPULSE',
  GROWTH: 'GROWTH',
} as const;
export type EmotionTag = (typeof EmotionTag)[keyof typeof EmotionTag];

export const InsightType = {
  PATTERN: 'PATTERN',
  LEAK: 'LEAK',
  WIN: 'WIN',
  HABIT: 'HABIT',
  PROJECTION: 'PROJECTION',
} as const;
export type InsightType = (typeof InsightType)[keyof typeof InsightType];

export const InsightSeverity = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  CRITICAL: 'CRITICAL',
} as const;
export type InsightSeverity = (typeof InsightSeverity)[keyof typeof InsightSeverity];

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

  // ── Compound MVP (CSV import) fields ─────────────────────────────────────
  //
  // Populated by the CSV import pipeline. Manual-entry transactions (legacy)
  // leave these undefined. A transaction is "CSV-sourced" iff sourceFile is set.

  /** AI-normalized merchant (e.g. "DOORDASH*MCD" → "DoorDash"). */
  merchantClean?: string;
  /** Fine-grained sub-category (e.g. "food_delivery", "etf_purchase", "rent"). */
  subcategory?: string;
  /** Emotional framing: essential need vs comfort vs impulse vs growth. */
  emotionTag?: EmotionTag;
  /** Original CSV filename, for traceability during dogfood. */
  sourceFile?: string;
  /** Which bank's CSV format this row came from. */
  sourceBank?: SourceBank;
  /** Content-hash of (date + amount + merchant) for idempotent re-imports. */
  dedupeHash?: string;
  /**
   * True when the transaction is parked waiting for the user to categorize
   * its merchant via the HITL review modal. While true, `bucket` is a
   * placeholder (EXPENSE) and the dashboard should filter the row out.
   * Once the user decides, this is set to false, bucket is updated, and
   * classifiedBy flips to USER_RULE.
   */
  needsReview?: boolean;
  /**
   * Links the transaction to its `PendingReviewItem` doc in
   * `users/{uid}/pending_reviews/{merchantKey}`. Cleared (via deleteField)
   * once the review is resolved.
   */
  pendingReviewKey?: string;
}

export interface InsightDoc {
  /** Generation timestamp. */
  generatedAt: Date;
  type: InsightType;
  /** Short headline, e.g. "Every Friday night is 2.3× normal". */
  title: string;
  /** Concrete number or merchant name, e.g. "$87 avg". */
  value: string;
  /** Full emotional sentence — the "narrative" coach voice. */
  narrative: string;
  severity: InsightSeverity;
  /** How many years of early retirement this pattern costs (or gains). null if N/A. */
  retirementImpactYears?: number;
  /** Optional next-step suggestion, e.g. "Try capping Friday delivery at $30". */
  actionHint?: string;
  /** Merchants this insight references, for cross-linking. */
  relatedMerchants: string[];
}

export interface ProfileDoc {
  /** User-provided current age (one of the few manual inputs). */
  currentAge: number;
  /** Starting net worth at beginning of imported CSV window. User-editable. */
  startingNetWorth: number;
  /** Derived: cumulative delta over imported period + startingNetWorth. */
  currentNetWorth: number;
  /** Derived: annualized from INCOME bucket transactions over the import window. */
  annualIncomeEstimate: number;
  /** Derived: annualized from EXPENSE + LIABILITY bucket transactions. */
  annualSpendEstimate: number;
  /** Derived: (income - spend) / income. */
  savingsRatePercent: number;
  /** 25 × annualSpendEstimate. The FIRE number. */
  fireTarget: number;
  /** Age at which FIRE target is reached given current pace. */
  fireAgeProjection: number;
  /** When the last CSV import completed. */
  lastCsvImport?: Date;
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
