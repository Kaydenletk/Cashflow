/**
 * lib/classification/pipeline.ts
 *
 * The classification pipeline that turns parsed PDF rows into
 * classified transactions ready for Firestore, with HITL parking for
 * unknown merchants.
 *
 * Precedence (first-hit-wins):
 *
 *   1. Per-user merchant rule (from users/{uid}/merchant_rules)
 *      → classifiedBy: USER_RULE, confidence: 0.95
 *
 *   2. Global merchant rule (from lib/classification/merchant-rules.ts,
 *      accessed via the existing classify() function's tier 1)
 *      → classifiedBy: RULE, confidence: 0.95
 *
 *   3. NOTHING matched → park for HITL review
 *      → needsReview: true, classifiedBy: NEEDS_REVIEW, bucket: EXPENSE
 *        (placeholder — dashboard filters it out until user decides)
 *
 * Crucially, the pipeline does NOT let the global classifier's tier-3
 * fallback (which returns EXPENSE with confidence 0.30) through to
 * Firestore. That tier is repurposed here as a "no high-confidence rule
 * matched" signal and flipped to NEEDS_REVIEW instead.
 */

import { classify } from './classifier';
import { hashMerchantKey, hashTransaction } from '@/lib/firebase/dedupe';
import type { ParsedTransaction } from '@/lib/parsers/types';
import type { UserMerchantRule } from '@/lib/types/review';
import {
  Bucket,
  ClassifiedBy,
  type SourceBank,
} from '@/lib/types/transaction';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PipelineInput {
  parsed: ParsedTransaction[];
  userRules: UserMerchantRule[];
  sourceFile: string;
  sourceBank: SourceBank;
}

/**
 * A transaction after classification. This shape has everything needed
 * to write a TransactionDoc to Firestore (the caller maps fields into
 * the Firestore doc and adds server timestamps).
 */
export interface ClassifiedTransaction {
  // Fields required by TransactionDoc
  merchant: string;              // merchantRaw
  amount: number;                // signed
  date: Date;
  bucket: Bucket;
  classifiedBy: ClassifiedBy;
  confidence: number;
  matchedRule?: string;
  subcategory?: string;
  needsReview: boolean;
  pendingReviewKey?: string;
  dedupeHash: string;
  // Provenance
  section: string;
  sourceLine: number;
  sourceFile: string;
  sourceBank: SourceBank;
}

export interface UnknownMerchantGroup {
  merchantKey: string;
  merchantRaw: string;
  occurrences: number;
  totalAmount: number;
  /**
   * Indices into PipelineOutput.classified[] for the transactions that
   * belong to this group. Used by the HITL save action to update
   * exactly the right rows.
   */
  transactionIndices: number[];
  firstSeen: Date;
  lastSeen: Date;
}

export interface PipelineOutput {
  classified: ClassifiedTransaction[];
  autoCount: number;
  reviewCount: number;
  /** merchantKey → group details */
  uniqueUnknownMerchants: Map<string, UnknownMerchantGroup>;
}

// ─── Implementation ──────────────────────────────────────────────────────────

/**
 * Try to find a per-user rule that matches the given merchant string.
 * Returns the first rule whose (lowercased) pattern is a substring of
 * (lowercased, whitespace-normalized) merchantRaw.
 */
function findUserRule(
  merchantRaw: string,
  userRules: UserMerchantRule[],
): UserMerchantRule | null {
  const normalized = merchantRaw.toLowerCase().replace(/\s+/g, ' ').trim();
  for (const rule of userRules) {
    if (normalized.includes(rule.pattern.toLowerCase())) {
      return rule;
    }
  }
  return null;
}

export async function runPipeline(
  input: PipelineInput,
): Promise<PipelineOutput> {
  const { parsed, userRules, sourceFile, sourceBank } = input;
  const classified: ClassifiedTransaction[] = [];
  const unknownGroups = new Map<string, UnknownMerchantGroup>();

  for (let i = 0; i < parsed.length; i++) {
    const row = parsed[i];
    const dedupeHash = await hashTransaction(row.date, row.amount, row.merchantRaw);

    // Tier 1: per-user rule
    const userMatch = findUserRule(row.merchantRaw, userRules);
    if (userMatch) {
      classified.push({
        merchant: row.merchantRaw,
        amount: row.amount,
        date: row.date,
        bucket: userMatch.bucket,
        classifiedBy: ClassifiedBy.USER_RULE,
        confidence: 0.95,
        matchedRule: `user:${userMatch.pattern}`,
        subcategory: userMatch.subcategory,
        needsReview: false,
        dedupeHash,
        section: row.section,
        sourceLine: row.sourceLine,
        sourceFile,
        sourceBank,
      });
      continue;
    }

    // Tier 2: global merchant rule (via existing classifier)
    const globalResult = classify({ merchant: row.merchantRaw });
    if (
      globalResult.classifiedBy === ClassifiedBy.RULE &&
      globalResult.matchedRule !== 'fallback-default'
    ) {
      classified.push({
        merchant: row.merchantRaw,
        amount: row.amount,
        date: row.date,
        bucket: globalResult.bucket,
        classifiedBy: ClassifiedBy.RULE,
        confidence: globalResult.confidence,
        matchedRule: globalResult.matchedRule,
        needsReview: false,
        dedupeHash,
        section: row.section,
        sourceLine: row.sourceLine,
        sourceFile,
        sourceBank,
      });
      continue;
    }

    // Tier 3: park for HITL review
    const merchantKey = await hashMerchantKey(row.merchantRaw);

    classified.push({
      merchant: row.merchantRaw,
      amount: row.amount,
      date: row.date,
      bucket: Bucket.EXPENSE, // placeholder — dashboard filters on needsReview
      classifiedBy: ClassifiedBy.NEEDS_REVIEW,
      confidence: 0,
      needsReview: true,
      pendingReviewKey: merchantKey,
      dedupeHash,
      section: row.section,
      sourceLine: row.sourceLine,
      sourceFile,
      sourceBank,
    });

    // Aggregate into the group map
    const existing = unknownGroups.get(merchantKey);
    if (existing) {
      existing.occurrences += 1;
      existing.totalAmount += row.amount;
      existing.transactionIndices.push(classified.length - 1);
      if (row.date < existing.firstSeen) existing.firstSeen = row.date;
      if (row.date > existing.lastSeen) existing.lastSeen = row.date;
    } else {
      unknownGroups.set(merchantKey, {
        merchantKey,
        merchantRaw: row.merchantRaw,
        occurrences: 1,
        totalAmount: row.amount,
        transactionIndices: [classified.length - 1],
        firstSeen: row.date,
        lastSeen: row.date,
      });
    }
  }

  const reviewCount = classified.filter((t) => t.needsReview).length;
  const autoCount = classified.length - reviewCount;

  return {
    classified,
    autoCount,
    reviewCount,
    uniqueUnknownMerchants: unknownGroups,
  };
}
