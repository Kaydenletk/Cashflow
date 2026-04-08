/**
 * lib/classification/pipeline.test.ts
 *
 * TDD for the classification pipeline. The pipeline orchestrates:
 *   1. Per-user merchant rules (highest precedence)
 *   2. Global merchant rules (via existing classify() tier 1 only)
 *   3. Park for HITL review (if nothing matched)
 *
 * Unknown merchants NEVER get an auto-assigned bucket during import —
 * they go into the pending_reviews queue with needsReview: true.
 */

import { describe, it, expect } from 'vitest';

import { runPipeline } from './pipeline';
import type { ParsedTransaction } from '@/lib/parsers/types';
import type { UserMerchantRule } from '@/lib/types/review';
import { Bucket, ClassifiedBy, SourceBank } from '@/lib/types/transaction';

// ─── Fixture builders ────────────────────────────────────────────────────────

function txn(
  overrides: Partial<ParsedTransaction> = {},
): ParsedTransaction {
  return {
    merchantRaw: 'SOME MERCHANT',
    amount: -10.0,
    date: new Date('2026-01-15'),
    section: 'other_subtractions',
    sourceLine: 0,
    ...overrides,
  };
}

function userRule(
  overrides: Partial<UserMerchantRule> = {},
): UserMerchantRule {
  return {
    pattern: 'some merchant',
    bucket: Bucket.EXPENSE,
    fromReview: true,
    sourceMerchantRaw: 'SOME MERCHANT',
    createdAt: new Date('2026-01-10'),
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('runPipeline — user rule precedence', () => {
  it('user rule beats global rule for the same merchant', async () => {
    // STARBUCKS is a known global merchant rule (EXPENSE → comfort).
    // User overrides it to LIABILITY via HITL decision.
    const parsed = [
      txn({
        merchantRaw: 'STARBUCKS STORE #12345 TAMPA FL',
        amount: -5.75,
        section: 'card_subtractions',
      }),
    ];
    const userRules: UserMerchantRule[] = [
      userRule({
        pattern: 'starbucks',
        bucket: Bucket.LIABILITY,
        subcategory: 'impulse_coffee',
        sourceMerchantRaw: 'STARBUCKS',
      }),
    ];

    const out = await runPipeline({
      parsed,
      userRules,
      sourceFile: 'test.pdf',
      sourceBank: SourceBank.BOA,
    });

    expect(out.classified).toHaveLength(1);
    expect(out.classified[0].bucket).toBe(Bucket.LIABILITY);
    expect(out.classified[0].classifiedBy).toBe(ClassifiedBy.USER_RULE);
    expect(out.classified[0].subcategory).toBe('impulse_coffee');
    expect(out.classified[0].needsReview).toBe(false);
    expect(out.autoCount).toBe(1);
    expect(out.reviewCount).toBe(0);
  });

  it('user-rule pattern match is case-insensitive and whitespace-tolerant', async () => {
    const parsed = [
      txn({ merchantRaw: 'NETFLIX.COM  SUBSCRIPTION' }),
    ];
    const userRules = [userRule({ pattern: 'netflix', bucket: Bucket.EXPENSE })];
    const out = await runPipeline({
      parsed,
      userRules,
      sourceFile: 'test.pdf',
      sourceBank: SourceBank.BOA,
    });
    expect(out.classified[0].classifiedBy).toBe(ClassifiedBy.USER_RULE);
  });
});

describe('runPipeline — global rule fallthrough', () => {
  it('known global merchant (no user rule) classifies via global rules', async () => {
    // ROBINHOOD is in MERCHANT_RULES as INCOME (dividend) or ASSET (funds).
    // Either way, it should NOT be parked as needsReview.
    const parsed = [
      txn({
        merchantRaw: 'ROBINHOOD DES:Funds ID:XXXXXXXXX INDN:TEST USER',
        amount: -100.0,
        section: 'other_subtractions',
      }),
    ];
    const out = await runPipeline({
      parsed,
      userRules: [],
      sourceFile: 'test.pdf',
      sourceBank: SourceBank.BOA,
    });

    expect(out.classified[0].needsReview).toBe(false);
    expect(out.classified[0].classifiedBy).toBe(ClassifiedBy.RULE);
    expect(out.reviewCount).toBe(0);
  });
});

describe('runPipeline — HITL parking for unknowns', () => {
  it('parks a single unknown merchant', async () => {
    const parsed = [
      txn({
        merchantRaw: 'WEIRD LOCAL STORE NOBODY HAS HEARD OF',
        amount: -42.5,
      }),
    ];
    const out = await runPipeline({
      parsed,
      userRules: [],
      sourceFile: 'test.pdf',
      sourceBank: SourceBank.BOA,
    });

    expect(out.classified[0].needsReview).toBe(true);
    expect(out.classified[0].classifiedBy).toBe(ClassifiedBy.NEEDS_REVIEW);
    expect(out.classified[0].pendingReviewKey).toBeDefined();
    expect(out.reviewCount).toBe(1);
    expect(out.autoCount).toBe(0);
  });

  it('groups multiple occurrences of the same unknown merchant', async () => {
    const parsed = [
      txn({
        merchantRaw: 'MYSTERY MERCHANT LLC',
        amount: -10.0,
        date: new Date('2026-01-05'),
      }),
      txn({
        merchantRaw: 'MYSTERY MERCHANT LLC',
        amount: -15.0,
        date: new Date('2026-01-12'),
      }),
      txn({
        merchantRaw: 'MYSTERY MERCHANT LLC',
        amount: -20.0,
        date: new Date('2026-01-20'),
      }),
    ];

    const out = await runPipeline({
      parsed,
      userRules: [],
      sourceFile: 'test.pdf',
      sourceBank: SourceBank.BOA,
    });

    expect(out.classified).toHaveLength(3);
    expect(out.reviewCount).toBe(3);
    // All 3 rows should share the same pendingReviewKey
    const keys = new Set(out.classified.map((t) => t.pendingReviewKey));
    expect(keys.size).toBe(1);

    // Unique unknown merchants map should have exactly one entry
    expect(out.uniqueUnknownMerchants.size).toBe(1);
    const [[, group]] = Array.from(out.uniqueUnknownMerchants.entries());
    expect(group.occurrences).toBe(3);
    expect(group.totalAmount).toBeCloseTo(-45.0, 2);
    expect(group.transactionIndices).toEqual([0, 1, 2]);
  });

  it('treats whitespace-variant unknowns as the same merchant group', async () => {
    const parsed = [
      txn({ merchantRaw: 'FOO  BAR  BAZ' }),
      txn({ merchantRaw: 'foo bar baz' }),
    ];
    const out = await runPipeline({
      parsed,
      userRules: [],
      sourceFile: 'test.pdf',
      sourceBank: SourceBank.BOA,
    });
    expect(out.uniqueUnknownMerchants.size).toBe(1);
  });
});

describe('runPipeline — dedupe hash', () => {
  it('attaches a deterministic dedupeHash to every classified transaction', async () => {
    const parsed = [
      txn({
        merchantRaw: 'STARBUCKS STORE #12345',
        amount: -5.75,
        date: new Date('2026-01-15'),
      }),
    ];
    const out = await runPipeline({
      parsed,
      userRules: [],
      sourceFile: 'test.pdf',
      sourceBank: SourceBank.BOA,
    });
    expect(out.classified[0].dedupeHash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('runPipeline — mixed input', () => {
  it('handles a mix of user-rule, global-rule, and unknown merchants', async () => {
    const parsed = [
      txn({ merchantRaw: 'STARBUCKS', amount: -5 }),
      txn({ merchantRaw: 'ROBINHOOD DES:Funds', amount: -100 }),
      txn({ merchantRaw: 'ALIEN SPACE STATION', amount: -42 }),
    ];
    const userRules = [
      userRule({ pattern: 'starbucks', bucket: Bucket.LIABILITY }),
    ];

    const out = await runPipeline({
      parsed,
      userRules,
      sourceFile: 'test.pdf',
      sourceBank: SourceBank.BOA,
    });

    expect(out.classified).toHaveLength(3);
    expect(out.classified[0].classifiedBy).toBe(ClassifiedBy.USER_RULE);
    expect(out.classified[1].classifiedBy).toBe(ClassifiedBy.RULE);
    expect(out.classified[2].classifiedBy).toBe(ClassifiedBy.NEEDS_REVIEW);
    expect(out.autoCount).toBe(2);
    expect(out.reviewCount).toBe(1);
  });
});
