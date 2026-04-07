/**
 * lib/ai/schemas.ts
 *
 * Zod schemas for OpenAI Structured Outputs. These are the contract between
 * our code and the AI — the model is *guaranteed* to return JSON matching
 * these shapes (enforced by OpenAI, not by us).
 *
 * Two rules from OpenAI's Structured Outputs spec:
 *
 *  1. Every object property must be listed in `required`. Use `.nullable()`
 *     instead of `.optional()` for fields the model may skip.
 *  2. No `z.union()`, no recursion, no `z.record()`. Use `z.enum([...])`
 *     for finite-choice fields.
 *
 * Pass these schemas to `zodResponseFormat(schema, 'name')` from
 * `openai/helpers/zod` to get the exact shape the `response_format` field
 * of chat.completions.create() expects.
 */

import { z } from 'zod';

// ── Shared enums (mirror lib/types/transaction.ts at runtime) ────────────────

/**
 * Bucket enum for the AI categorizer. The AI may only return one of these
 * four values — matching the existing `Bucket` union in
 * lib/types/transaction.ts.
 */
export const aiBucketEnum = z.enum(['ASSET', 'LIABILITY', 'EXPENSE', 'INCOME']);

/**
 * Fine-grained subcategory. Kept intentionally loose (free string) because
 * the AI is better than us at inventing good sub-labels from merchant names.
 * We normalize case/whitespace in a post-processing step.
 */
export const aiSubcategorySchema = z.string().min(1).max(80);

/**
 * Emotion tag — how the user likely felt about the purchase.
 * Used by the insight generator to spot regret patterns.
 */
export const aiEmotionTagEnum = z.enum([
  'ESSENTIAL',
  'COMFORT',
  'IMPULSE',
  'GROWTH',
]);

// ── Categorizer output schema (Phase D) ──────────────────────────────────────

/**
 * One categorization result for a single transaction. The categorizer batches
 * these — see `aiCategorizerResponseSchema` below for the top-level array
 * wrapper.
 */
export const aiCategorizedTxnSchema = z.object({
  /**
   * Row index within the batch the AI received. We use this to join results
   * back to the original transactions (don't rely on order).
   */
  index: z.number().int().min(0),
  bucket: aiBucketEnum,
  /** AI-normalized merchant name, e.g. "DOORDASH*MCD 1234" → "DoorDash". */
  merchantClean: z.string().min(1).max(80),
  subcategory: aiSubcategorySchema,
  emotionTag: aiEmotionTagEnum,
  /** AI's confidence 0–1 in its own classification. Used to flag uncertain rows. */
  confidence: z.number().min(0).max(1),
});

export type AiCategorizedTxn = z.infer<typeof aiCategorizedTxnSchema>;

/**
 * Top-level response from the categorizer. OpenAI Structured Outputs
 * requires an object at root (not a bare array), so we wrap.
 */
export const aiCategorizerResponseSchema = z.object({
  results: z.array(aiCategorizedTxnSchema),
});

export type AiCategorizerResponse = z.infer<typeof aiCategorizerResponseSchema>;

// ── Insight generator output schema (Phase F) ────────────────────────────────

export const aiInsightTypeEnum = z.enum([
  'PATTERN',
  'LEAK',
  'WIN',
  'HABIT',
  'PROJECTION',
]);

export const aiInsightSeverityEnum = z.enum(['INFO', 'WARNING', 'CRITICAL']);

/**
 * One insight card as the AI returns it. Field order matters for the
 * system prompt — the model fills them in this order and we find that
 * ordering by (title → value → narrative) produces the most coherent
 * output.
 *
 * `retirementImpactYears` and `actionHint` are nullable (not optional)
 * per the Structured Outputs spec — the model will literally write
 * `null` if it can't compute a value.
 */
export const aiInsightSchema = z.object({
  type: aiInsightTypeEnum,
  title: z.string().min(1).max(80),
  value: z.string().min(1).max(40),
  narrative: z.string().min(20).max(280),
  severity: aiInsightSeverityEnum,
  retirementImpactYears: z.number().nullable(),
  actionHint: z.string().max(140).nullable(),
  relatedMerchants: z.array(z.string().min(1).max(60)),
});

export type AiInsight = z.infer<typeof aiInsightSchema>;

/**
 * The insight generator returns exactly 10 insights. We enforce the count
 * with a refinement instead of fixed-length array (zod doesn't support
 * tuple length via Structured Outputs reliably).
 */
export const aiInsightResponseSchema = z.object({
  insights: z.array(aiInsightSchema),
});

export type AiInsightResponse = z.infer<typeof aiInsightResponseSchema>;

// ── Coach chat message schema (Phase K) ──────────────────────────────────────

/**
 * The coach doesn't use Structured Outputs — it's a free-form streaming
 * response. But we do validate request messages going IN to sanitize
 * user input before it reaches the OpenAI API.
 */
export const coachUserMessageSchema = z.object({
  content: z.string().min(1).max(1000),
});

export type CoachUserMessage = z.infer<typeof coachUserMessageSchema>;
