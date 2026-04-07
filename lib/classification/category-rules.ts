import { Bucket, IncomeType } from "@/lib/types/transaction";

export interface CategoryRule {
  /** Lowercase substring to match against the category string (case-insensitive). */
  pattern: string;
  bucket: Bucket;
  /** Only populated when bucket === INCOME. */
  incomeType?: IncomeType;
  /** Human-readable label used as matchedRule in ClassificationResult. */
  label: string;
  /** Confidence for category-rule matches is always 0.75 (medium). */
  confidence: 0.75;
}

/**
 * Ordered category rules — first match wins.
 * Used as the fallback layer when no merchant rule matches.
 * ~15–20 entries covering the most common bank-provided categories.
 */
export const CATEGORY_RULES: CategoryRule[] = [
  // ─── INCOME ──────────────────────────────────────────────────────────────
  {
    pattern: "salary",
    bucket: Bucket.INCOME,
    incomeType: IncomeType.ACTIVE,
    label: "category-salary",
    confidence: 0.75,
  },
  {
    pattern: "wages",
    bucket: Bucket.INCOME,
    incomeType: IncomeType.ACTIVE,
    label: "category-wages",
    confidence: 0.75,
  },
  {
    pattern: "paycheck",
    bucket: Bucket.INCOME,
    incomeType: IncomeType.ACTIVE,
    label: "category-paycheck",
    confidence: 0.75,
  },
  {
    pattern: "dividends",
    bucket: Bucket.INCOME,
    incomeType: IncomeType.PASSIVE,
    label: "category-dividends",
    confidence: 0.75,
  },
  {
    pattern: "interest",
    bucket: Bucket.INCOME,
    incomeType: IncomeType.PASSIVE,
    label: "category-interest",
    confidence: 0.75,
  },
  {
    pattern: "rental",
    bucket: Bucket.INCOME,
    incomeType: IncomeType.PASSIVE,
    label: "category-rental-income",
    confidence: 0.75,
  },

  // ─── ASSET ────────────────────────────────────────────────────────────────
  {
    pattern: "investments",
    bucket: Bucket.ASSET,
    label: "category-investments",
    confidence: 0.75,
  },
  {
    pattern: "brokerage",
    bucket: Bucket.ASSET,
    label: "category-brokerage",
    confidence: 0.75,
  },
  {
    pattern: "savings transfer",
    bucket: Bucket.ASSET,
    label: "category-savings-transfer",
    confidence: 0.75,
  },

  // ─── LIABILITY ────────────────────────────────────────────────────────────
  {
    pattern: "loan payment",
    bucket: Bucket.LIABILITY,
    label: "category-loan-payment",
    confidence: 0.75,
  },
  {
    pattern: "credit card payment",
    bucket: Bucket.LIABILITY,
    label: "category-credit-card-payment",
    confidence: 0.75,
  },
  {
    pattern: "rent",
    bucket: Bucket.LIABILITY,
    label: "category-rent",
    confidence: 0.75,
  },
  {
    pattern: "mortgage",
    bucket: Bucket.LIABILITY,
    label: "category-mortgage",
    confidence: 0.75,
  },

  // ─── EXPENSE ──────────────────────────────────────────────────────────────
  {
    pattern: "groceries",
    bucket: Bucket.EXPENSE,
    label: "category-groceries",
    confidence: 0.75,
  },
  {
    pattern: "gas",
    bucket: Bucket.EXPENSE,
    label: "category-gas",
    confidence: 0.75,
  },
  {
    pattern: "restaurants",
    bucket: Bucket.EXPENSE,
    label: "category-restaurants",
    confidence: 0.75,
  },
  {
    pattern: "dining",
    bucket: Bucket.EXPENSE,
    label: "category-dining",
    confidence: 0.75,
  },
  {
    pattern: "utilities",
    bucket: Bucket.EXPENSE,
    label: "category-utilities",
    confidence: 0.75,
  },
  {
    pattern: "subscriptions",
    bucket: Bucket.EXPENSE,
    label: "category-subscriptions",
    confidence: 0.75,
  },
  {
    pattern: "entertainment",
    bucket: Bucket.EXPENSE,
    label: "category-entertainment",
    confidence: 0.75,
  },
  {
    pattern: "shopping",
    bucket: Bucket.EXPENSE,
    label: "category-shopping",
    confidence: 0.75,
  },
  {
    pattern: "travel",
    bucket: Bucket.EXPENSE,
    label: "category-travel",
    confidence: 0.75,
  },
  {
    pattern: "healthcare",
    bucket: Bucket.EXPENSE,
    label: "category-healthcare",
    confidence: 0.75,
  },
  {
    pattern: "health",
    bucket: Bucket.EXPENSE,
    label: "category-health",
    confidence: 0.75,
  },
  {
    pattern: "fitness",
    bucket: Bucket.EXPENSE,
    label: "category-fitness",
    confidence: 0.75,
  },
] as const satisfies CategoryRule[];
