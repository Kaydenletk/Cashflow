/**
 * classifier.ts — 3-tier classification orchestrator
 *
 * Precedence:
 *   1. Merchant rule  (confidence 0.95)
 *   2. Category rule  (confidence 0.75)
 *   3. Fallback       (confidence 0.30) — returns EXPENSE as safe default
 *
 * Phase 4 note: The fallback tier (tier 3) will be replaced by an AI call
 * (Claude Haiku) once Phase 4 is implemented. The `classifiedBy: 'CATEGORY'`
 * label on the fallback is intentionally a placeholder — look for
 * `matchedRule: 'fallback-default'` to identify records that need AI review.
 * TODO(phase-4): swap fallback block for AI classification call.
 */

import { Bucket, ClassifiedBy, IncomeType } from "@/lib/types/transaction";
import { MERCHANT_RULES } from "./merchant-rules";
import { CATEGORY_RULES } from "./category-rules";

export interface ClassificationResult {
  bucket: Bucket;
  incomeType?: IncomeType;
  classifiedBy: ClassifiedBy;
  confidence: number;
  matchedRule?: string;
}

/**
 * Classify a transaction based on its merchant string and optional category.
 *
 * @param input.merchant  - The merchant/payee name as it appears on the statement.
 * @param input.category  - Optional category string (bank-provided or user-supplied).
 * @returns               - A ClassificationResult with bucket, confidence, and metadata.
 */
export function classify(input: {
  merchant: string;
  category?: string;
}): ClassificationResult {
  const merchantLower = input.merchant.toLowerCase();

  // ── Tier 1: Merchant rules ─────────────────────────────────────────────
  for (const rule of MERCHANT_RULES) {
    if (merchantLower.includes(rule.pattern)) {
      return {
        bucket: rule.bucket,
        incomeType: rule.incomeType,
        classifiedBy: ClassifiedBy.RULE,
        confidence: rule.confidence,
        matchedRule: rule.label,
      };
    }
  }

  // ── Tier 2: Category rules ─────────────────────────────────────────────
  if (input.category) {
    const categoryLower = input.category.toLowerCase();
    for (const rule of CATEGORY_RULES) {
      if (categoryLower.includes(rule.pattern)) {
        return {
          bucket: rule.bucket,
          incomeType: rule.incomeType,
          classifiedBy: ClassifiedBy.CATEGORY,
          confidence: rule.confidence,
          matchedRule: rule.label,
        };
      }
    }
  }

  // ── Tier 3: Fallback default ──────────────────────────────────────────
  // Safe default: EXPENSE.  Better to over-flag spending than to miss it.
  // Phase 4 will replace this with an AI call to Claude Haiku.
  // TODO(phase-4): replace with AI classification
  return {
    bucket: Bucket.EXPENSE,
    classifiedBy: ClassifiedBy.CATEGORY,
    confidence: 0.3,
    matchedRule: "fallback-default",
  };
}
