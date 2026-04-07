# Phase 3 UI (No-Auth Personal Mode) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build all 5 product screens (Today, Curve, Portfolio, Council + Daily Verdict modal) end-to-end against Firestore using a hardcoded `PERSONAL_USER_ID`, deferring auth until a later slice.

**Architecture:** Single-user constant in `lib/config.ts`. Direct Firebase Web SDK calls from client components — no API routes, no Admin SDK. Pure calculation modules in `lib/calculations/` for all mindset math. Real-time updates via `onSnapshot`. Dev-mode `firestore.rules` allows access to `users/personal/**` only, with a bold warning that they must be tightened before deploy.

**Tech Stack:** Next.js 14 App Router · TypeScript · React 19 · Tailwind v4 · shadcn/ui (base-nova style, lucide icons) · Firebase Web SDK 12 · Recharts · Zod

**Spec:** [docs/superpowers/specs/2026-04-07-phase-3-ui-no-auth-design.md](../specs/2026-04-07-phase-3-ui-no-auth-design.md)

---

## Project rules (non-negotiable, from `CLAUDE_CODE_PLAN.md`)

1. **Skip tests for non-classifier code.** Only the existing `lib/classification/classifier.test.ts` is maintained. Do NOT write Vitest tests for any new file in this plan.
2. **Ask before adding any dependency.** `shadcn add` writes JSX into the repo and may pull `class-variance-authority` etc. — those are already in `package.json`, so no new deps expected. If `shadcn add` reports a new package, STOP and surface to the user.
3. **No mock data outside `seeds/`.** Empty states use real prose, never placeholder data.
4. **Commit after every task.** Use `feat:` / `fix:` / `chore:` / `docs:` prefixes following existing convention `<type>(phase-3): <description>`.
5. **One focal element per screen.** Don't add "while we're at it" widgets.

## Mindset enforcement (DO NOT soften these — they ARE the product)

1. Two Numbers bar shows ONLY Asset% and Liability% — never raw dollar totals.
2. Liability friction: typing a 10+ char reason is REQUIRED before save enables. No "skip" option.
3. Daily Verdict modal cannot be dismissed (no X, no escape, no backdrop close). Three buttons or nothing.
4. Weekly Council follow-through is gated: new commitment cannot be entered until last week's follow-through is answered.
5. Asset Curve has nothing else on its screen besides the curve and projection caption.

## Execution order (topological)

Each phase leaves the app in a buildable, runnable state. Stop and verify after each task.

| Phase | Tasks | Outcome |
|---|---|---|
| A — Foundations | 1–4 | Constants, dev rules, pure calculation modules |
| B — Data layer | 5–9 | Firebase modules + React hooks |
| C — Primitives | 10 | shadcn components installed |
| D — Shell | 11–13 | Shared layout + nav + sticky bar |
| E — Today | 14–18 | First usable screen ✨ |
| F — Daily Verdict | 19–20 | 9pm gate works |
| G — Asset Curve | 21–22 | Mechanism 4 lit |
| H — Portfolio | 23–26 | Holdings + price update |
| I — Council | 27–28 | Mechanism 5 lit |
| J — Final pass | 29 | Lint, typecheck, smoke test |

---

# Phase A — Foundations

## Task 1: Single-user constant + BACKLOG + dev firestore rules

**Files:**
- Create: `lib/config.ts`
- Create: `BACKLOG.md`
- Modify: `firestore.rules` (full rewrite)

- [ ] **Step 1: Create `lib/config.ts`**

```ts
/**
 * lib/config.ts
 *
 * Phase 3 single-user constant. The whole app runs against this hardcoded
 * user ID until Phase 2 (Auth) lands. When that happens, every Firestore
 * helper that imports PERSONAL_USER_ID will be migrated to read the real
 * `auth.currentUser.uid` instead — see the spec §10 migration path.
 */

export const PERSONAL_USER_ID = 'personal' as const;
```

- [ ] **Step 2: Create `BACKLOG.md` at repo root**

```markdown
# BACKLOG

Deferred features and ideas. When the urge to add scope appears, write it here and move on.

## Deferred from Phase 3 (2026-04-07)

- **CSV import** — paste CSV from bank statements, parse, classify in batch, preview before commit. Out of scope for Phase 3 (would have added file upload UI, papaparse dependency, column mapping, dedupe logic). Revisit after MVP is in daily use.

## Deferred from Phase 3 — possibly worth revisiting after dogfooding

- **"Add to portfolio?" toggle inside the Add Transaction modal** for ASSET + investment-merchant transactions. Spec §2 chose to keep investment creation on `/portfolio` only. If the dual-flow proves annoying, revisit.
- **Edit / delete transactions** — Phase 3 is add-only. If a typo bug shows up while journaling, revisit.
```

- [ ] **Step 3: Replace `firestore.rules` with dev-mode rules**

```
rules_version = '2';

// ─────────────────────────────────────────────────────────────────────────────
// DEV-ONLY RULES — Phase 3 (no auth)
//
// The app currently runs against a hardcoded PERSONAL_USER_ID = 'personal'.
// These rules allow open read/write access to users/personal/** ONLY.
// Everything else stays locked.
//
// ⚠️  MUST be tightened before any deploy: replace with
//     `allow read, write: if request.auth != null && request.auth.uid == userId;`
//     once Firebase Auth is wired in Phase 2.
//
// See docs/superpowers/specs/2026-04-07-phase-3-ui-no-auth-design.md §4.3
// ─────────────────────────────────────────────────────────────────────────────

service cloud.firestore {
  match /databases/{database}/documents {
    match /users/personal/{document=**} {
      allow read, write: if true;
    }
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

- [ ] **Step 4: Verify**

Run: `npm run typecheck`
Expected: passes (no TS changes — only one new file with one constant).

- [ ] **Step 5: Commit**

```bash
git add lib/config.ts BACKLOG.md firestore.rules
git commit -m "feat(phase-3): single-user constant + BACKLOG + dev firestore rules"
```

---

## Task 2: `lib/calculations/ratios.ts`

**Files:**
- Create: `lib/calculations/ratios.ts`

- [ ] **Step 1: Create the file**

```ts
/**
 * lib/calculations/ratios.ts
 *
 * Pure functions for Two Numbers bar + MonthNetCard.
 * No React, no Firestore — just (TransactionDoc[]) => number.
 *
 * Mindset rule: Two Numbers shows percentages only, never raw dollars.
 */

import type { TransactionDoc } from '@/lib/types/transaction';
import { Bucket } from '@/lib/types/transaction';

/**
 * Asset ratio = sum(ASSET amounts) / sum(all positive-direction amounts).
 * Returns 0 when there are no transactions (avoid divide-by-zero).
 *
 * "All positive-direction" = ASSET + INCOME + EXPENSE + LIABILITY (i.e., everything).
 * This is intentional: the ratio answers "what % of my money flow this period
 * is going toward asset-building?" not "what % of net worth is in assets."
 */
export function assetRatio(txns: TransactionDoc[]): number {
  const total = txns.reduce((sum, t) => sum + t.amount, 0);
  if (total === 0) return 0;
  const assetTotal = txns
    .filter((t) => t.bucket === Bucket.ASSET)
    .reduce((sum, t) => sum + t.amount, 0);
  return assetTotal / total;
}

/**
 * Liability ratio = sum(LIABILITY amounts) / sum(all amounts).
 */
export function liabilityRatio(txns: TransactionDoc[]): number {
  const total = txns.reduce((sum, t) => sum + t.amount, 0);
  if (total === 0) return 0;
  const liabilityTotal = txns
    .filter((t) => t.bucket === Bucket.LIABILITY)
    .reduce((sum, t) => sum + t.amount, 0);
  return liabilityTotal / total;
}

/**
 * Monthly net = INCOME + ASSET inflow − EXPENSE − LIABILITY.
 * Signed dollars. Positive = "richer", negative = "poorer", 0 = "flat".
 */
export function monthlyNet(txns: TransactionDoc[]): number {
  return txns.reduce((net, t) => {
    if (t.bucket === Bucket.INCOME || t.bucket === Bucket.ASSET) return net + t.amount;
    return net - t.amount;
  }, 0);
}

export type Direction = 'richer' | 'flat' | 'poorer';

export function direction(net: number): Direction {
  if (net > 0) return 'richer';
  if (net < 0) return 'poorer';
  return 'flat';
}

/**
 * Filter helper: transactions whose date falls in the same month as `ref`.
 * Used by useTransactions() and consumers.
 */
export function inSameMonth(date: Date, ref: Date): boolean {
  return (
    date.getFullYear() === ref.getFullYear() && date.getMonth() === ref.getMonth()
  );
}

/**
 * Filter helper: transactions whose date falls on the same calendar day as `ref`.
 */
export function inSameDay(date: Date, ref: Date): boolean {
  return (
    date.getFullYear() === ref.getFullYear() &&
    date.getMonth() === ref.getMonth() &&
    date.getDate() === ref.getDate()
  );
}
```

- [ ] **Step 2: Verify**

Run: `npm run typecheck`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add lib/calculations/ratios.ts
git commit -m "feat(phase-3): pure ratio + net + date helpers"
```

---

## Task 3: `lib/calculations/asset-curve.ts`

**Files:**
- Create: `lib/calculations/asset-curve.ts`

- [ ] **Step 1: Create the file**

```ts
/**
 * lib/calculations/asset-curve.ts
 *
 * Pure helpers for the Asset Curve screen (/curve).
 * Builds a cumulative-total time series and a forward projection.
 */

import type { TransactionDoc } from '@/lib/types/transaction';
import { Bucket } from '@/lib/types/transaction';

export interface CurvePoint {
  /** ISO date string YYYY-MM-DD */
  date: string;
  /** Cumulative ASSET dollars added by end of this date */
  total: number;
}

/**
 * Roll up ASSET-bucket transactions into a daily cumulative total, sorted by date.
 *
 * - Only ASSET transactions are included. The curve is NOT net worth — it's
 *   "money you've directed toward asset-building over time."
 * - Days with no ASSET activity do NOT get a row. The chart's line connector
 *   handles the visual gap. (Adding empty days is unnecessary fuel.)
 */
export function cumulativeAssetByDate(txns: TransactionDoc[]): CurvePoint[] {
  const assetTxns = txns
    .filter((t) => t.bucket === Bucket.ASSET)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  // Group by date string, then accumulate.
  const byDate = new Map<string, number>();
  for (const t of assetTxns) {
    const key = toIsoDate(t.date);
    byDate.set(key, (byDate.get(key) ?? 0) + t.amount);
  }

  let running = 0;
  const points: CurvePoint[] = [];
  for (const [date, dailyTotal] of byDate) {
    running += dailyTotal;
    points.push({ date, total: running });
  }
  return points;
}

/**
 * Linear projection forward by `years`.
 *
 * Strategy: average the per-day asset growth over the existing curve, then
 * extrapolate. For < 5 data points, returns NaN to signal "not enough data" —
 * the consuming component should render the empty-state copy instead.
 */
export function projectForward(curve: CurvePoint[], years: number): number {
  if (curve.length < 5) return NaN;
  const first = curve[0];
  const last = curve[curve.length - 1];
  const totalDays = (Date.parse(last.date) - Date.parse(first.date)) / 86_400_000;
  if (totalDays <= 0) return NaN;
  const dailyRate = (last.total - first.total) / totalDays;
  return last.total + dailyRate * 365 * years;
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
```

- [ ] **Step 2: Verify**

Run: `npm run typecheck`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add lib/calculations/asset-curve.ts
git commit -m "feat(phase-3): cumulative asset curve + projection helpers"
```

---

## Task 4: `lib/calculations/portfolio.ts` + delete empty `lib/portfolio/`

**Files:**
- Create: `lib/calculations/portfolio.ts`
- Delete: `lib/portfolio/` (empty stub from scaffold)

- [ ] **Step 1: Inspect `lib/portfolio/` to confirm it's empty**

```bash
ls -la lib/portfolio/
```
Expected: only a `.gitkeep` or empty.

- [ ] **Step 2: Delete `lib/portfolio/`**

```bash
git rm -rf lib/portfolio/
```

- [ ] **Step 3: Create `lib/calculations/portfolio.ts`**

```ts
/**
 * lib/calculations/portfolio.ts
 *
 * Pure helpers for the Portfolio screen (/portfolio).
 * Pricing data is manual — no real-time feeds. The user updates prices via
 * <UpdatePricesModal /> which writes to Firestore.
 */

import type { InvestmentDoc } from '@/lib/types/transaction';

export interface PortfolioRow extends InvestmentDoc {
  id: string; // Firestore doc ID
  currentValue: number;
  costBasis: number;
  unrealizedPL: number;
  unrealizedPLPercent: number;
  allocationPercent: number;
}

export function totalPortfolioValue(holdings: InvestmentDoc[]): number {
  return holdings.reduce((sum, h) => sum + h.shares * h.currentPrice, 0);
}

export function totalCostBasis(holdings: InvestmentDoc[]): number {
  return holdings.reduce((sum, h) => sum + h.shares * h.avgCost, 0);
}

export function totalUnrealizedPL(holdings: InvestmentDoc[]): {
  dollars: number;
  percent: number;
} {
  const value = totalPortfolioValue(holdings);
  const cost = totalCostBasis(holdings);
  const dollars = value - cost;
  const percent = cost === 0 ? 0 : (dollars / cost) * 100;
  return { dollars, percent };
}

/**
 * Build per-row enriched portfolio data ready for <HoldingsList />.
 * Assumes the holdings array carries each doc's Firestore ID alongside the data
 * (the data hook is responsible for attaching the ID).
 */
export function enrichHoldings(
  holdings: Array<InvestmentDoc & { id: string }>,
): PortfolioRow[] {
  const total = totalPortfolioValue(holdings);
  return holdings.map((h) => {
    const currentValue = h.shares * h.currentPrice;
    const costBasis = h.shares * h.avgCost;
    const unrealizedPL = currentValue - costBasis;
    const unrealizedPLPercent = costBasis === 0 ? 0 : (unrealizedPL / costBasis) * 100;
    const allocationPercent = total === 0 ? 0 : (currentValue / total) * 100;
    return {
      ...h,
      currentValue,
      costBasis,
      unrealizedPL,
      unrealizedPLPercent,
      allocationPercent,
    };
  });
}
```

- [ ] **Step 4: Verify**

Run: `npm run typecheck`
Expected: passes.

- [ ] **Step 5: Commit**

```bash
git add lib/calculations/portfolio.ts
git commit -m "feat(phase-3): portfolio P/L + allocation helpers; drop empty lib/portfolio stub"
```

---

# Phase B — Data layer

## Task 5: `lib/firebase/transactions.ts` + `lib/hooks/use-transactions.ts`

**Files:**
- Create: `lib/firebase/transactions.ts`
- Create: `lib/hooks/use-transactions.ts`

- [ ] **Step 1: Create `lib/firebase/transactions.ts`**

```ts
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
```

- [ ] **Step 2: Create `lib/hooks/use-transactions.ts`**

```ts
/**
 * lib/hooks/use-transactions.ts
 *
 * React hook wrapper around subscribeToTransactions().
 * Returns the CURRENT MONTH only — Asset Curve uses use-all-transactions.ts.
 */

'use client';

import { useEffect, useState } from 'react';

import {
  subscribeToTransactions,
  type TransactionWithId,
} from '@/lib/firebase/transactions';
import { inSameMonth } from '@/lib/calculations/ratios';

interface UseTransactionsState {
  transactions: TransactionWithId[];
  loading: boolean;
  error: Error | null;
}

export function useTransactions(): UseTransactionsState {
  const [state, setState] = useState<UseTransactionsState>({
    transactions: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    const now = new Date();
    const unsub = subscribeToTransactions(
      (all) => {
        const thisMonth = all.filter((t) => inSameMonth(t.date, now));
        setState({ transactions: thisMonth, loading: false, error: null });
      },
      (err) => setState((s) => ({ ...s, loading: false, error: err })),
    );
    return unsub;
  }, []);

  return state;
}
```

- [ ] **Step 3: Verify**

Run: `npm run typecheck`
Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add lib/firebase/transactions.ts lib/hooks/use-transactions.ts
git commit -m "feat(phase-3): transactions Firebase module + this-month hook"
```

---

## Task 6: `lib/hooks/use-all-transactions.ts`

**Files:**
- Create: `lib/hooks/use-all-transactions.ts`

- [ ] **Step 1: Create the file**

```ts
/**
 * lib/hooks/use-all-transactions.ts
 *
 * Full-history variant of useTransactions(). Used by /curve only.
 * Kept separate so the common case (this-month) doesn't pay the cost of
 * carrying every record in the snapshot.
 */

'use client';

import { useEffect, useState } from 'react';

import {
  subscribeToTransactions,
  type TransactionWithId,
} from '@/lib/firebase/transactions';

interface UseAllTransactionsState {
  transactions: TransactionWithId[];
  loading: boolean;
  error: Error | null;
}

export function useAllTransactions(): UseAllTransactionsState {
  const [state, setState] = useState<UseAllTransactionsState>({
    transactions: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    const unsub = subscribeToTransactions(
      (all) => setState({ transactions: all, loading: false, error: null }),
      (err) => setState((s) => ({ ...s, loading: false, error: err })),
    );
    return unsub;
  }, []);

  return state;
}
```

- [ ] **Step 2: Verify**

Run: `npm run typecheck`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add lib/hooks/use-all-transactions.ts
git commit -m "feat(phase-3): full-history transactions hook for /curve"
```

---

## Task 7: `lib/firebase/investments.ts` + `lib/hooks/use-investments.ts`

**Files:**
- Create: `lib/firebase/investments.ts`
- Create: `lib/hooks/use-investments.ts`

- [ ] **Step 1: Create `lib/firebase/investments.ts`**

```ts
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
```

- [ ] **Step 2: Create `lib/hooks/use-investments.ts`**

```ts
'use client';

import { useEffect, useState } from 'react';
import {
  subscribeToInvestments,
  type InvestmentWithId,
} from '@/lib/firebase/investments';

interface UseInvestmentsState {
  investments: InvestmentWithId[];
  loading: boolean;
  error: Error | null;
}

export function useInvestments(): UseInvestmentsState {
  const [state, setState] = useState<UseInvestmentsState>({
    investments: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    const unsub = subscribeToInvestments(
      (holdings) => setState({ investments: holdings, loading: false, error: null }),
      (err) => setState((s) => ({ ...s, loading: false, error: err })),
    );
    return unsub;
  }, []);

  return state;
}
```

- [ ] **Step 3: Verify**

Run: `npm run typecheck`
Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add lib/firebase/investments.ts lib/hooks/use-investments.ts
git commit -m "feat(phase-3): investments Firebase module + hook (atomic linked-tx writes)"
```

---

## Task 8: `lib/firebase/verdicts.ts` + `lib/hooks/use-today-verdict.ts`

**Files:**
- Create: `lib/firebase/verdicts.ts`
- Create: `lib/hooks/use-today-verdict.ts`

- [ ] **Step 1: Create `lib/firebase/verdicts.ts`**

```ts
/**
 * lib/firebase/verdicts.ts
 *
 * One DailyVerdictDoc per day. Doc ID is the local ISO date string
 * (YYYY-MM-DD), which gives us free uniqueness — Firestore can't have two
 * docs with the same ID in the same collection.
 *
 * Path: users/{PERSONAL_USER_ID}/verdicts/{YYYY-MM-DD}
 */

import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';

import { db } from '@/lib/firebase/client';
import { PERSONAL_USER_ID } from '@/lib/config';
import { Verdict, type DailyVerdictDoc } from '@/lib/types/transaction';

/** Local ISO date string for the user's machine, NOT UTC. */
export function todayKey(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function getTodayVerdict(): Promise<DailyVerdictDoc | null> {
  const key = todayKey();
  const snap = await getDoc(doc(db, 'users', PERSONAL_USER_ID, 'verdicts', key));
  if (!snap.exists()) return null;
  const raw = snap.data();
  return {
    date: raw.date,
    guess: raw.guess,
    actual: raw.actual,
    perceptionGap: raw.perceptionGap,
    createdAt: raw.createdAt?.toDate?.() ?? new Date(),
  };
}

export async function saveVerdict(input: {
  guess: keyof typeof Verdict;
  actual: keyof typeof Verdict;
}): Promise<void> {
  const key = todayKey();
  const perceptionGap = input.guess !== input.actual;
  // Read existing doc first so we don't bump createdAt on a re-save.
  const ref = doc(db, 'users', PERSONAL_USER_ID, 'verdicts', key);
  const existing = await getDoc(ref);
  await setDoc(
    ref,
    {
      date: key,
      guess: input.guess,
      actual: input.actual,
      perceptionGap,
      ...(existing.exists() ? {} : { createdAt: serverTimestamp() }),
    },
    { merge: true },
  );
}
```

- [ ] **Step 2: Create `lib/hooks/use-today-verdict.ts`**

```ts
'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  getTodayVerdict,
  saveVerdict,
} from '@/lib/firebase/verdicts';
import type { DailyVerdictDoc, Verdict } from '@/lib/types/transaction';

interface UseTodayVerdictState {
  verdict: DailyVerdictDoc | null;
  loading: boolean;
  refresh: () => Promise<void>;
  save: (input: { guess: keyof typeof Verdict; actual: keyof typeof Verdict }) => Promise<void>;
}

export function useTodayVerdict(): UseTodayVerdictState {
  const [verdict, setVerdict] = useState<DailyVerdictDoc | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const v = await getTodayVerdict();
    setVerdict(v);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const save: UseTodayVerdictState['save'] = useCallback(
    async (input) => {
      await saveVerdict(input);
      await refresh();
    },
    [refresh],
  );

  return { verdict, loading, refresh, save };
}
```

- [ ] **Step 3: Verify**

Run: `npm run typecheck`
Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add lib/firebase/verdicts.ts lib/hooks/use-today-verdict.ts
git commit -m "feat(phase-3): daily verdict module + hook (date-as-doc-id)"
```

---

## Task 9: `lib/firebase/councils.ts` + `lib/hooks/use-this-week-council.ts`

**Files:**
- Create: `lib/firebase/councils.ts`
- Create: `lib/hooks/use-this-week-council.ts`

- [ ] **Step 1: Create `lib/firebase/councils.ts`**

```ts
/**
 * lib/firebase/councils.ts
 *
 * One WeeklyCouncilDoc per ISO week. Doc ID = "YYYY-Www" e.g. "2026-W14".
 *
 * Path: users/{PERSONAL_USER_ID}/councils/{YYYY-Www}
 */

import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

import { db } from '@/lib/firebase/client';
import { PERSONAL_USER_ID } from '@/lib/config';
import type { WeeklyCouncilDoc } from '@/lib/types/transaction';

/**
 * ISO 8601 week number for `date`. Returns "YYYY-Www".
 * Algorithm: copy → set to Thursday of the same ISO week → diff from Jan 4.
 */
export function weekKey(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7; // Sunday = 7 instead of 0
  d.setUTCDate(d.getUTCDate() + 4 - dayNum); // Thursday of the ISO week
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

/** Subtract 1 from the ISO week of `date` and return its key. */
export function lastWeekKey(date: Date = new Date()): string {
  const seven = new Date(date);
  seven.setDate(seven.getDate() - 7);
  return weekKey(seven);
}

export async function getCouncilByKey(key: string): Promise<WeeklyCouncilDoc | null> {
  const snap = await getDoc(doc(db, 'users', PERSONAL_USER_ID, 'councils', key));
  if (!snap.exists()) return null;
  const raw = snap.data();
  return {
    weekStart: raw.weekStart,
    commitment: raw.commitment,
    followedThru: raw.followedThru,
    createdAt: raw.createdAt?.toDate?.() ?? new Date(),
  };
}

export async function saveCouncil(commitment: string): Promise<void> {
  const key = weekKey();
  await setDoc(
    doc(db, 'users', PERSONAL_USER_ID, 'councils', key),
    {
      weekStart: key,
      commitment,
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function markFollowedThru(key: string, followed: boolean): Promise<void> {
  await updateDoc(doc(db, 'users', PERSONAL_USER_ID, 'councils', key), {
    followedThru: followed,
  });
}
```

- [ ] **Step 2: Create `lib/hooks/use-this-week-council.ts`**

```ts
'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  getCouncilByKey,
  lastWeekKey,
  markFollowedThru,
  saveCouncil,
  weekKey,
} from '@/lib/firebase/councils';
import type { WeeklyCouncilDoc } from '@/lib/types/transaction';

interface UseThisWeekCouncilState {
  thisWeek: WeeklyCouncilDoc | null;
  lastWeek: WeeklyCouncilDoc | null;
  loading: boolean;
  saveCommitment: (commitment: string) => Promise<void>;
  answerLastWeekFollowThru: (followed: boolean) => Promise<void>;
}

export function useThisWeekCouncil(): UseThisWeekCouncilState {
  const [thisWeek, setThisWeek] = useState<WeeklyCouncilDoc | null>(null);
  const [lastWeek, setLastWeek] = useState<WeeklyCouncilDoc | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [tw, lw] = await Promise.all([
      getCouncilByKey(weekKey()),
      getCouncilByKey(lastWeekKey()),
    ]);
    setThisWeek(tw);
    setLastWeek(lw);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveCommitment = useCallback(
    async (commitment: string) => {
      await saveCouncil(commitment);
      await refresh();
    },
    [refresh],
  );

  const answerLastWeekFollowThru = useCallback(
    async (followed: boolean) => {
      await markFollowedThru(lastWeekKey(), followed);
      await refresh();
    },
    [refresh],
  );

  return { thisWeek, lastWeek, loading, saveCommitment, answerLastWeekFollowThru };
}
```

- [ ] **Step 3: Verify**

Run: `npm run typecheck`
Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add lib/firebase/councils.ts lib/hooks/use-this-week-council.ts
git commit -m "feat(phase-3): weekly council module + hook (ISO week-as-doc-id)"
```

---

# Phase C — Primitives

## Task 10: Install shadcn primitives

**Files:**
- Create (via CLI): `components/ui/button.tsx`, `dialog.tsx`, `input.tsx`, `label.tsx`, `textarea.tsx`, `badge.tsx`, `card.tsx`, `tabs.tsx`, `separator.tsx`

- [ ] **Step 1: Run shadcn add**

```bash
npx shadcn@latest add button dialog input label textarea badge card tabs separator
```

Expected: components added under `components/ui/`. CLI may print "auto-installing dependency: ..." — if it lists ANY new npm package not already in `package.json`, STOP and surface to the user. Existing deps (`@base-ui/react`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`) should cover everything.

- [ ] **Step 2: Verify**

```bash
ls components/ui/
npm run typecheck
```
Expected: 9 component files; typecheck passes.

- [ ] **Step 3: Commit**

```bash
git add components/ui/ package.json package-lock.json
git commit -m "chore(phase-3): add shadcn primitives (button, dialog, input, label, textarea, badge, card, tabs, separator)"
```

---

# Phase D — Shell

## Task 11: `components/bucket-badge.tsx`

**Files:**
- Create: `components/bucket-badge.tsx`

- [ ] **Step 1: Create the file**

```tsx
/**
 * components/bucket-badge.tsx
 *
 * Small colored badge that shows a transaction bucket plus optional confidence.
 * Used by TransactionRow, AddTransactionModal preview, and override buttons.
 *
 * Color mapping (matches the spec §6.3):
 *   ASSET     → green
 *   LIABILITY → red
 *   EXPENSE   → yellow
 *   INCOME    → blue
 */

import { Badge } from '@/components/ui/badge';
import { Bucket } from '@/lib/types/transaction';
import { cn } from '@/lib/utils';

const COLOR: Record<Bucket, string> = {
  ASSET: 'bg-green-100 text-green-800 border-green-300',
  LIABILITY: 'bg-red-100 text-red-800 border-red-300',
  EXPENSE: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  INCOME: 'bg-blue-100 text-blue-800 border-blue-300',
};

interface Props {
  bucket: Bucket;
  /** Optional 0–1 confidence — when present, renders a faint suffix like "· 95%" */
  confidence?: number;
  className?: string;
}

export function BucketBadge({ bucket, confidence, className }: Props) {
  return (
    <Badge variant="outline" className={cn(COLOR[bucket], 'font-medium', className)}>
      {bucket}
      {confidence !== undefined && (
        <span className="ml-1 opacity-60">· {Math.round(confidence * 100)}%</span>
      )}
    </Badge>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npm run typecheck`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add components/bucket-badge.tsx
git commit -m "feat(phase-3): BucketBadge component"
```

---

## Task 12: `components/two-numbers-bar.tsx`

**Files:**
- Create: `components/two-numbers-bar.tsx`

- [ ] **Step 1: Create the file**

```tsx
/**
 * components/two-numbers-bar.tsx
 *
 * Mechanism 1 — sticky top bar showing ONLY this month's Asset% and Liability%.
 * Hard rule: NO dollar totals. NO net worth. NO third number.
 */

'use client';

import { useTransactions } from '@/lib/hooks/use-transactions';
import { assetRatio, liabilityRatio } from '@/lib/calculations/ratios';

export function TwoNumbersBar() {
  const { transactions, loading } = useTransactions();

  const asset = loading ? 0 : Math.round(assetRatio(transactions) * 100);
  const liability = loading ? 0 : Math.round(liabilityRatio(transactions) * 100);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-background px-6 py-4">
      <div className="flex flex-col items-start">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">Asset</span>
        <span className="text-2xl font-semibold tabular-nums text-green-700">{asset}%</span>
      </div>
      <div className="flex flex-col items-end">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">Liability</span>
        <span className="text-2xl font-semibold tabular-nums text-red-700">{liability}%</span>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npm run typecheck`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add components/two-numbers-bar.tsx
git commit -m "feat(phase-3): TwoNumbersBar (Mechanism 1)"
```

---

## Task 13: `components/bottom-nav.tsx` + `app/(app)/layout.tsx` + `app/page.tsx` redirect

**Files:**
- Create: `components/bottom-nav.tsx`
- Create: `app/(app)/layout.tsx`
- Modify: `app/page.tsx` (replace placeholder with redirect)

- [ ] **Step 1: Create `components/bottom-nav.tsx`**

```tsx
/**
 * components/bottom-nav.tsx
 *
 * Mobile-first bottom tab bar. Same on desktop — no responsive switch.
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar, PieChart, TrendingUp, Users } from 'lucide-react';

import { cn } from '@/lib/utils';

const TABS = [
  { href: '/today', label: 'Today', icon: Calendar },
  { href: '/curve', label: 'Curve', icon: TrendingUp },
  { href: '/portfolio', label: 'Portfolio', icon: PieChart },
  { href: '/council', label: 'Council', icon: Users },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 z-30 grid grid-cols-4 border-t bg-background">
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex flex-col items-center justify-center gap-1 py-3 text-xs',
              active
                ? 'border-t-2 border-foreground text-foreground'
                : 'border-t-2 border-transparent text-muted-foreground',
            )}
          >
            <Icon className={cn('h-5 w-5', active && 'fill-foreground/10')} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 2: Create `app/(app)/layout.tsx`**

```tsx
/**
 * app/(app)/layout.tsx
 *
 * Shared shell for all 4 in-app routes: TwoNumbersBar (top) + content + BottomNav.
 * <DailyVerdictGate /> is wired in Task 20 — left out of this commit so the
 * layout is buildable in isolation.
 */

import type { ReactNode } from 'react';

import { TwoNumbersBar } from '@/components/two-numbers-bar';
import { BottomNav } from '@/components/bottom-nav';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <TwoNumbersBar />
      <main className="flex-1 overflow-y-auto pb-20">{children}</main>
      <BottomNav />
    </div>
  );
}
```

- [ ] **Step 3: Replace `app/page.tsx` with a redirect**

```tsx
import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/today');
}
```

- [ ] **Step 4: Verify**

Run: `npm run typecheck && npm run dev`
Open `http://localhost:3000/` — should redirect to `/today` and show the TwoNumbersBar (with 0% / 0% since no data) plus BottomNav. The page body will be empty for now (no `today/page.tsx` yet) — Next.js will show a 404 for `/today`. That's expected; Task 18 fills it in. Verify the redirect works and `/today` 404 page is the only error.

Stop the dev server (`Ctrl-C`).

- [ ] **Step 5: Commit**

```bash
git add components/bottom-nav.tsx app/\(app\)/layout.tsx app/page.tsx
git commit -m "feat(phase-3): app shell — TwoNumbersBar + BottomNav + redirect to /today"
```

---

# Phase E — Today screen

## Task 14: `components/transaction-row.tsx` + `components/today-timeline.tsx`

**Files:**
- Create: `components/transaction-row.tsx`
- Create: `components/today-timeline.tsx`

- [ ] **Step 1: Create `components/transaction-row.tsx`**

```tsx
/**
 * components/transaction-row.tsx
 *
 * One row in the Today timeline. Merchant + amount + colored bucket badge +
 * optional mood emoji. Read-only this slice.
 */

import { BucketBadge } from '@/components/bucket-badge';
import type { TransactionWithId } from '@/lib/firebase/transactions';
import { Mood } from '@/lib/types/transaction';

const MOOD_EMOJI: Record<Mood, string> = {
  HAPPY: '😊',
  NEUTRAL: '😐',
  REGRET: '😞',
};

export function TransactionRow({ txn }: { txn: TransactionWithId }) {
  return (
    <li className="flex items-center justify-between gap-3 border-b py-3 last:border-b-0">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{txn.merchant}</span>
          {txn.mood && <span aria-hidden>{MOOD_EMOJI[txn.mood]}</span>}
        </div>
        {txn.note && <div className="truncate text-xs text-muted-foreground">{txn.note}</div>}
      </div>
      <div className="flex items-center gap-3">
        <span className="font-semibold tabular-nums">${txn.amount.toFixed(2)}</span>
        <BucketBadge bucket={txn.bucket} />
      </div>
    </li>
  );
}
```

- [ ] **Step 2: Create `components/today-timeline.tsx`**

```tsx
/**
 * components/today-timeline.tsx
 *
 * List of transactions logged today (local time). Empty state per spec.
 */

'use client';

import { TransactionRow } from '@/components/transaction-row';
import { useTransactions } from '@/lib/hooks/use-transactions';
import { inSameDay } from '@/lib/calculations/ratios';

export function TodayTimeline() {
  const { transactions, loading } = useTransactions();
  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const today = new Date();
  const todays = transactions
    .filter((t) => inSameDay(t.date, today))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  if (todays.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        Nothing logged today. Tap + to add.
      </p>
    );
  }

  return (
    <ul className="divide-y">
      {todays.map((t) => (
        <TransactionRow key={t.id} txn={t} />
      ))}
    </ul>
  );
}
```

- [ ] **Step 3: Verify**

Run: `npm run typecheck`
Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add components/transaction-row.tsx components/today-timeline.tsx
git commit -m "feat(phase-3): TransactionRow + TodayTimeline"
```

---

## Task 15: `components/month-net-card.tsx`

**Files:**
- Create: `components/month-net-card.tsx`

- [ ] **Step 1: Create the file**

```tsx
/**
 * components/month-net-card.tsx
 *
 * Big monthly direction card. ONE signed dollar number + ONE word.
 * Per spec §8: this is the only place dollars appear on the Today screen.
 */

'use client';

import { ArrowDown, ArrowRight, ArrowUp } from 'lucide-react';

import { useTransactions } from '@/lib/hooks/use-transactions';
import { direction, monthlyNet } from '@/lib/calculations/ratios';
import { cn } from '@/lib/utils';

export function MonthNetCard() {
  const { transactions, loading } = useTransactions();
  const net = monthlyNet(transactions);
  const dir = direction(net);

  const Icon = dir === 'richer' ? ArrowUp : dir === 'poorer' ? ArrowDown : ArrowRight;
  const color =
    dir === 'richer' ? 'text-green-700' : dir === 'poorer' ? 'text-red-700' : 'text-muted-foreground';

  return (
    <section className="border-b px-6 py-8 text-center">
      <div className={cn('flex items-center justify-center gap-2 text-3xl font-bold tabular-nums', color)}>
        <Icon className="h-7 w-7" />
        {loading ? '—' : `${net >= 0 ? '+' : '−'}$${Math.abs(net).toFixed(0)}`}
      </div>
      <p className={cn('mt-1 text-sm', color)}>{dir} this month</p>
    </section>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npm run typecheck`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add components/month-net-card.tsx
git commit -m "feat(phase-3): MonthNetCard (one signed number, one word)"
```

---

## Task 16: `components/add-transaction-modal.tsx`

**Files:**
- Create: `components/add-transaction-modal.tsx`

This is the most logic-heavy component. Take it in pieces.

- [ ] **Step 1: Create the file**

```tsx
/**
 * components/add-transaction-modal.tsx
 *
 * The Add Transaction modal. Implements:
 *   - amount, merchant, date inputs
 *   - live classification preview (debounced merchant)
 *   - 4 colored override buttons
 *   - LIABILITY FRICTION: 10+ char reason required to enable Save
 *   - mood emoji selector
 *   - optional note
 *
 * On save: addTransaction() → close modal. The onSnapshot subscription in
 * useTransactions() takes care of UI refresh (no manual cache invalidation).
 */

'use client';

import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { BucketBadge } from '@/components/bucket-badge';
import { addTransaction } from '@/lib/firebase/transactions';
import { classify } from '@/lib/classification/classifier';
import { Bucket, Mood } from '@/lib/types/transaction';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MIN_LIABILITY_REASON = 10;

const BUCKET_BUTTON_STYLE: Record<Bucket, string> = {
  ASSET: 'bg-green-100 text-green-800 hover:bg-green-200 border-green-300',
  LIABILITY: 'bg-red-100 text-red-800 hover:bg-red-200 border-red-300',
  EXPENSE: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-300',
  INCOME: 'bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-300',
};

const MOOD_EMOJI: Record<Mood, string> = {
  HAPPY: '😊',
  NEUTRAL: '😐',
  REGRET: '😞',
};

export function AddTransactionModal({ open, onOpenChange }: Props) {
  const [amount, setAmount] = useState<string>('');
  const [merchant, setMerchant] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [bucketOverride, setBucketOverride] = useState<Bucket | null>(null);
  const [liabilityReason, setLiabilityReason] = useState('');
  const [mood, setMood] = useState<Mood | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setAmount('');
      setMerchant('');
      setDate(new Date().toISOString().slice(0, 10));
      setBucketOverride(null);
      setLiabilityReason('');
      setMood(null);
      setNote('');
      setError(null);
    }
  }, [open]);

  // Live classification preview (no debounce — classifier is local + cheap)
  const preview = useMemo(() => {
    if (!merchant.trim()) return null;
    return classify({ merchant });
  }, [merchant]);

  const finalBucket: Bucket | null = bucketOverride ?? preview?.bucket ?? null;
  const isLiability = finalBucket === Bucket.LIABILITY;
  const reasonValid = !isLiability || liabilityReason.trim().length >= MIN_LIABILITY_REASON;
  const canSave =
    !submitting &&
    !!amount &&
    Number(amount) > 0 &&
    merchant.trim().length > 0 &&
    !!finalBucket &&
    reasonValid;

  async function handleSave() {
    if (!canSave) return;
    setSubmitting(true);
    setError(null);
    try {
      await addTransaction({
        amount: Number(amount),
        merchant: merchant.trim(),
        date: new Date(`${date}T12:00:00`),
        bucketOverride: bucketOverride ?? undefined,
        liabilityReason: isLiability ? liabilityReason.trim() : undefined,
        mood: mood ?? undefined,
        note: note.trim() || undefined,
      });
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add transaction</DialogTitle>
          <DialogDescription>
            Be honest with future-you. Override the auto-classification if it's wrong.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Amount */}
          <div>
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          {/* Merchant */}
          <div>
            <Label htmlFor="merchant">Merchant</Label>
            <Input
              id="merchant"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              placeholder="Vanguard, Starbucks, Publix…"
            />
            {preview && !bucketOverride && (
              <div className="mt-2">
                <BucketBadge bucket={preview.bucket} confidence={preview.confidence} />
                <span className="ml-2 text-xs text-muted-foreground">auto-classified</span>
              </div>
            )}
          </div>

          {/* Date */}
          <div>
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Override buttons */}
          <div>
            <Label>Override</Label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {(Object.keys(BUCKET_BUTTON_STYLE) as Bucket[]).map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBucketOverride(bucketOverride === b ? null : b)}
                  className={cn(
                    'rounded-md border px-3 py-2 text-sm font-medium transition',
                    BUCKET_BUTTON_STYLE[b],
                    bucketOverride === b && 'ring-2 ring-foreground/40',
                  )}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          {/* Liability friction */}
          {isLiability && (
            <div>
              <Label htmlFor="liability-reason">
                Why are you spending this?{' '}
                <span className="font-normal text-muted-foreground">
                  ({liabilityReason.trim().length}/{MIN_LIABILITY_REASON} chars)
                </span>
              </Label>
              <Textarea
                id="liability-reason"
                value={liabilityReason}
                onChange={(e) => setLiabilityReason(e.target.value)}
                placeholder="Be honest with future-you."
                rows={3}
              />
            </div>
          )}

          {/* Mood */}
          <div>
            <Label>Mood (optional)</Label>
            <div className="mt-1 flex gap-2">
              {(Object.keys(MOOD_EMOJI) as Mood[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMood(mood === m ? null : m)}
                  className={cn(
                    'rounded-md border px-4 py-2 text-2xl transition',
                    mood === m && 'ring-2 ring-foreground/40',
                  )}
                  aria-label={m}
                >
                  {MOOD_EMOJI[m]}
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div>
            <Label htmlFor="note">Note (optional)</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder=""
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {submitting ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npm run typecheck`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add components/add-transaction-modal.tsx
git commit -m "feat(phase-3): AddTransactionModal with liability friction (Mechanism 3)"
```

---

## Task 17: `components/add-transaction-fab.tsx`

**Files:**
- Create: `components/add-transaction-fab.tsx`

- [ ] **Step 1: Create the file**

```tsx
/**
 * components/add-transaction-fab.tsx
 *
 * Fixed bottom-right floating action button. Owns the open/close state for
 * <AddTransactionModal />. Lives on /today only this slice.
 */

'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { AddTransactionModal } from '@/components/add-transaction-modal';

export function AddTransactionFab() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="icon"
        className="fixed bottom-24 right-6 h-14 w-14 rounded-full shadow-lg"
        aria-label="Add transaction"
      >
        <Plus className="h-6 w-6" />
      </Button>
      <AddTransactionModal open={open} onOpenChange={setOpen} />
    </>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npm run typecheck`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add components/add-transaction-fab.tsx
git commit -m "feat(phase-3): AddTransactionFab"
```

---

## Task 18: `app/(app)/today/page.tsx` — first usable screen ✨

**Files:**
- Create: `app/(app)/today/page.tsx`

- [ ] **Step 1: Create the file**

```tsx
/**
 * app/(app)/today/page.tsx
 *
 * Today homepage. Stitches together MonthNetCard + TodayTimeline + AddTransactionFab.
 * The TwoNumbersBar lives in the parent (app) layout.
 */

import { MonthNetCard } from '@/components/month-net-card';
import { TodayTimeline } from '@/components/today-timeline';
import { AddTransactionFab } from '@/components/add-transaction-fab';

export default function TodayPage() {
  return (
    <div className="mx-auto max-w-md">
      <MonthNetCard />
      <section className="px-6 py-6">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Today
        </h2>
        <TodayTimeline />
      </section>
      <AddTransactionFab />
    </div>
  );
}
```

- [ ] **Step 2: Smoke test the full Today flow**

```bash
npm run dev
```

Open `http://localhost:3000/`. Verify:
1. Redirects to `/today`
2. TwoNumbersBar shows at the top (0% / 0% if Firestore is empty)
3. MonthNetCard shows `—` or `+$0` with "flat this month"
4. Timeline shows the empty state: "Nothing logged today. Tap + to add."
5. BottomNav shows at the bottom with Today tab highlighted
6. FAB visible bottom-right
7. Click FAB → modal opens
8. Type merchant "Starbucks" → should auto-classify EXPENSE with ~95% confidence
9. Type amount 6.75 → click an override button (try ASSET) → badge changes; click LIABILITY → reason field appears, save button stays disabled
10. Type a 10+ char reason → save button enables
11. Click Cancel → modal closes
12. Re-open → fields reset to empty
13. Add a real transaction (amount 200, merchant "Vanguard") → click Save → modal closes → row appears in timeline
14. TwoNumbersBar updates: Asset% jumps from 0 to 100%

Stop the dev server.

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/today/page.tsx
git commit -m "feat(phase-3): /today page — first usable screen"
```

---

# Phase F — Daily Verdict gate

## Task 19: `components/daily-verdict-modal.tsx`

**Files:**
- Create: `components/daily-verdict-modal.tsx`

- [ ] **Step 1: Create the file**

```tsx
/**
 * components/daily-verdict-modal.tsx
 *
 * Mechanism 2 — 9pm gate. CANNOT be dismissed without answering.
 * Three buttons → write DailyVerdictDoc → reveal real number → close.
 */

'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTransactions } from '@/lib/hooks/use-transactions';
import { useTodayVerdict } from '@/lib/hooks/use-today-verdict';
import { direction, inSameDay, monthlyNet } from '@/lib/calculations/ratios';
import { Verdict } from '@/lib/types/transaction';

interface Props {
  open: boolean;
}

export function DailyVerdictModal({ open }: Props) {
  const { transactions } = useTransactions();
  const { save } = useTodayVerdict();
  const [revealed, setRevealed] = useState<{ guess: keyof typeof Verdict; actual: keyof typeof Verdict } | null>(null);

  const today = new Date();
  const todayTxns = transactions.filter((t) => inSameDay(t.date, today));
  const todayNet = monthlyNet(todayTxns);
  const actualDirection = direction(todayNet);
  const actualVerdict: keyof typeof Verdict =
    actualDirection === 'richer' ? 'RICHER' : actualDirection === 'poorer' ? 'POORER' : 'SAME';

  async function handleGuess(guess: keyof typeof Verdict) {
    await save({ guess, actual: actualVerdict });
    setRevealed({ guess, actual: actualVerdict });
  }

  function handleDismiss() {
    setRevealed(null);
    // Open prop is controlled by the gate; the gate closes once verdict exists.
  }

  // Mechanism 2: non-dismissable. We pass a NO-OP onOpenChange so any attempt
  // by the underlying base-ui Dialog to close (Escape, backdrop click, etc.)
  // is ignored — the parent `open` prop never changes in response to user
  // dismiss gestures. The only way this dialog closes is when DailyVerdictGate
  // unmounts it after today's verdict is saved.
  //
  // Do NOT add onPointerDownOutside / onEscapeKeyDown / onInteractOutside
  // handlers: those are Radix-idiom props and are silently ignored by
  // base-ui's DialogContent, which would leave the modal dismissable.
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Were you richer or poorer today?</DialogTitle>
          <DialogDescription>
            Trust your gut. We'll show you the real answer after.
          </DialogDescription>
        </DialogHeader>

        {!revealed ? (
          <div className="grid grid-cols-3 gap-3 py-4">
            <button
              className="flex flex-col items-center gap-2 rounded-md border bg-green-100 py-6 text-green-800 hover:bg-green-200"
              onClick={() => handleGuess('RICHER')}
            >
              <span className="text-3xl" aria-hidden>🟢</span>
              Richer
            </button>
            <button
              className="flex flex-col items-center gap-2 rounded-md border bg-yellow-100 py-6 text-yellow-800 hover:bg-yellow-200"
              onClick={() => handleGuess('SAME')}
            >
              <span className="text-3xl" aria-hidden>🟡</span>
              Same
            </button>
            <button
              className="flex flex-col items-center gap-2 rounded-md border bg-red-100 py-6 text-red-800 hover:bg-red-200"
              onClick={() => handleGuess('POORER')}
            >
              <span className="text-3xl" aria-hidden>🔴</span>
              Poorer
            </button>
          </div>
        ) : (
          <div className="py-4 text-center">
            <p className="text-sm text-muted-foreground">You guessed</p>
            <p className="text-2xl font-semibold">{revealed.guess}</p>
            <p className="mt-4 text-sm text-muted-foreground">Truth</p>
            <p className="text-2xl font-semibold">{revealed.actual}</p>
            {revealed.guess !== revealed.actual && (
              <p className="mt-3 text-sm text-amber-700">Perception gap noted.</p>
            )}
            <Button onClick={handleDismiss} className="mt-6 w-full">
              Got it
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npm run typecheck`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add components/daily-verdict-modal.tsx
git commit -m "feat(phase-3): DailyVerdictModal (Mechanism 2, non-dismissable)"
```

---

## Task 20: `components/daily-verdict-gate.tsx` + wire into `(app)/layout.tsx`

**Files:**
- Create: `components/daily-verdict-gate.tsx`
- Modify: `app/(app)/layout.tsx` (add gate)

- [ ] **Step 1: Create `components/daily-verdict-gate.tsx`**

```tsx
/**
 * components/daily-verdict-gate.tsx
 *
 * Decides whether to mount the DailyVerdictModal.
 * Trigger: local time >= 21:00 AND no verdict for today yet.
 *
 * Re-evaluates every 60s so the gate fires automatically if the user keeps
 * the tab open across the 9pm boundary.
 */

'use client';

import { useEffect, useState } from 'react';
import { DailyVerdictModal } from '@/components/daily-verdict-modal';
import { useTodayVerdict } from '@/lib/hooks/use-today-verdict';

const TRIGGER_HOUR = 21;

function pastTriggerHour(now: Date = new Date()): boolean {
  return now.getHours() >= TRIGGER_HOUR;
}

export function DailyVerdictGate() {
  const { verdict, loading } = useTodayVerdict();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  if (loading || verdict) return null;
  if (!pastTriggerHour()) return null;

  // tick is read just to keep ESLint happy about the dependency
  void tick;

  return <DailyVerdictModal open={true} />;
}
```

- [ ] **Step 2: Modify `app/(app)/layout.tsx` to mount the gate**

Add import and component:

```tsx
import type { ReactNode } from 'react';

import { TwoNumbersBar } from '@/components/two-numbers-bar';
import { BottomNav } from '@/components/bottom-nav';
import { DailyVerdictGate } from '@/components/daily-verdict-gate';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <TwoNumbersBar />
      <main className="flex-1 overflow-y-auto pb-20">{children}</main>
      <BottomNav />
      <DailyVerdictGate />
    </div>
  );
}
```

- [ ] **Step 3: Smoke test**

```bash
npm run dev
```

Open `/today`. If your local time is past 21:00, the verdict modal should appear immediately on top of the page. Click one of the three buttons → reveal screen → "Got it" → modal closes and does NOT reappear (because today's verdict is now saved).

If your local time is BEFORE 21:00, temporarily change `TRIGGER_HOUR` to your current hour − 1 in `daily-verdict-gate.tsx`, verify the modal fires, then revert to `21`. Don't commit the temporary change.

Verify also:
- Pressing Escape does NOT close the modal
- Clicking outside the modal does NOT close it
- The modal blocks all interaction with the page underneath

Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add components/daily-verdict-gate.tsx app/\(app\)/layout.tsx
git commit -m "feat(phase-3): DailyVerdictGate wired into shell layout"
```

---

# Phase G — Asset Curve

## Task 21: `components/asset-curve-chart.tsx` + `components/projection-caption.tsx`

**Files:**
- Create: `components/asset-curve-chart.tsx`
- Create: `components/projection-caption.tsx`

- [ ] **Step 1: Create `components/projection-caption.tsx`**

```tsx
/**
 * components/projection-caption.tsx
 *
 * Single-line projection sentence under the asset curve. Per spec §6.2,
 * this is the ONLY thing on the screen besides the chart itself.
 */

interface Props {
  projection: number; // dollars at +N years; NaN if not enough data
  years: number;
}

export function ProjectionCaption({ projection, years }: Props) {
  if (Number.isNaN(projection)) return null;
  const formatted = projection.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
  return (
    <p className="px-6 pt-4 text-center text-sm text-muted-foreground">
      If you keep this pace, in {years} years: <span className="font-semibold text-foreground">{formatted}</span>
    </p>
  );
}
```

- [ ] **Step 2: Create `components/asset-curve-chart.tsx`**

```tsx
/**
 * components/asset-curve-chart.tsx
 *
 * Mechanism 4 — single Recharts <LineChart /> showing cumulative ASSET dollars
 * over time. Nothing else on the screen.
 */

'use client';

import { Line, LineChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';

import { useAllTransactions } from '@/lib/hooks/use-all-transactions';
import { cumulativeAssetByDate, projectForward } from '@/lib/calculations/asset-curve';
import { ProjectionCaption } from '@/components/projection-caption';

const PROJECTION_YEARS = 10;

export function AssetCurveChart() {
  const { transactions, loading } = useAllTransactions();
  if (loading) return <p className="p-6 text-sm text-muted-foreground">Loading…</p>;

  const curve = cumulativeAssetByDate(transactions);

  if (curve.length < 5) {
    return (
      <p className="p-12 text-center text-sm text-muted-foreground">
        Add at least 5 ASSET transactions to see your curve.
      </p>
    );
  }

  const projection = projectForward(curve, PROJECTION_YEARS);

  return (
    <div className="px-2">
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={curve}>
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v}`} />
            <Line
              type="monotone"
              dataKey="total"
              stroke="hsl(142 76% 36%)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <ProjectionCaption projection={projection} years={PROJECTION_YEARS} />
    </div>
  );
}
```

- [ ] **Step 3: Verify**

Run: `npm run typecheck`
Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add components/asset-curve-chart.tsx components/projection-caption.tsx
git commit -m "feat(phase-3): AssetCurveChart + ProjectionCaption (Mechanism 4)"
```

---

## Task 22: `app/(app)/curve/page.tsx`

**Files:**
- Create: `app/(app)/curve/page.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { AssetCurveChart } from '@/components/asset-curve-chart';

export default function CurvePage() {
  return (
    <div className="mx-auto max-w-md">
      <h1 className="px-6 pt-6 text-lg font-semibold">Asset Curve</h1>
      <AssetCurveChart />
    </div>
  );
}
```

- [ ] **Step 2: Smoke test**

```bash
npm run dev
```

Navigate to `/curve` via the bottom nav. Should show:
- Empty state if you have < 5 ASSET transactions ("Add at least 5…")
- Otherwise the chart + projection

To force the chart, add 5 ASSET transactions via /today (Vanguard 100, Robinhood 50, Fidelity 200, Schwab 75, Coinbase 30).

Stop the dev server.

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/curve/page.tsx
git commit -m "feat(phase-3): /curve page"
```

---

# Phase H — Portfolio

## Task 23: `components/portfolio-summary.tsx` + `components/holdings-list.tsx`

**Files:**
- Create: `components/portfolio-summary.tsx`
- Create: `components/holdings-list.tsx`

- [ ] **Step 1: Create `components/portfolio-summary.tsx`**

```tsx
/**
 * components/portfolio-summary.tsx
 *
 * Total value + total P/L card at the top of /portfolio.
 */

'use client';

import { useInvestments } from '@/lib/hooks/use-investments';
import { totalPortfolioValue, totalUnrealizedPL } from '@/lib/calculations/portfolio';
import { cn } from '@/lib/utils';

export function PortfolioSummary() {
  const { investments, loading } = useInvestments();
  if (loading) return null;

  const total = totalPortfolioValue(investments);
  const pl = totalUnrealizedPL(investments);
  const isUp = pl.dollars >= 0;

  return (
    <section className="border-b px-6 py-6">
      <div className="text-sm uppercase tracking-wide text-muted-foreground">Total</div>
      <div className="text-3xl font-bold tabular-nums">${total.toFixed(2)}</div>
      <div className={cn('mt-2 text-sm tabular-nums', isUp ? 'text-green-700' : 'text-red-700')}>
        P/L: {isUp ? '+' : '−'}${Math.abs(pl.dollars).toFixed(2)} ({pl.percent.toFixed(1)}%)
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Create `components/holdings-list.tsx`**

```tsx
/**
 * components/holdings-list.tsx
 *
 * Rows of holdings with allocation bars.
 */

'use client';

import { useInvestments } from '@/lib/hooks/use-investments';
import { enrichHoldings } from '@/lib/calculations/portfolio';
import { cn } from '@/lib/utils';

export function HoldingsList() {
  const { investments, loading } = useInvestments();
  if (loading) return <p className="p-6 text-sm text-muted-foreground">Loading…</p>;

  if (investments.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        No investments yet. Tap + to add your first holding.
      </p>
    );
  }

  const rows = enrichHoldings(investments);

  return (
    <ul className="divide-y">
      {rows.map((r) => {
        const isUp = r.unrealizedPL >= 0;
        return (
          <li key={r.id} className="px-6 py-4">
            <div className="flex items-center justify-between gap-3">
              <span className="font-semibold">{r.ticker}</span>
              <span className="tabular-nums">${r.currentValue.toFixed(0)}</span>
              <span className={cn('tabular-nums text-sm', isUp ? 'text-green-700' : 'text-red-700')}>
                {isUp ? '+' : '−'}${Math.abs(r.unrealizedPL).toFixed(0)}
              </span>
              <span className="w-12 text-right text-xs text-muted-foreground tabular-nums">
                {r.allocationPercent.toFixed(0)}%
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full rounded bg-muted">
              <div
                className="h-1.5 rounded bg-foreground"
                style={{ width: `${r.allocationPercent}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 3: Verify**

Run: `npm run typecheck`
Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add components/portfolio-summary.tsx components/holdings-list.tsx
git commit -m "feat(phase-3): PortfolioSummary + HoldingsList"
```

---

## Task 24: `components/add-investment-modal.tsx`

**Files:**
- Create: `components/add-investment-modal.tsx`

- [ ] **Step 1: Create the file**

```tsx
/**
 * components/add-investment-modal.tsx
 *
 * Add a new investment. Calls addInvestment() which atomically creates BOTH
 * the InvestmentDoc and a linked ASSET TransactionDoc in one writeBatch.
 */

'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { addInvestment } from '@/lib/firebase/investments';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddInvestmentModal({ open, onOpenChange }: Props) {
  const [ticker, setTicker] = useState('');
  const [shares, setShares] = useState('');
  const [avgCost, setAvgCost] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setTicker('');
      setShares('');
      setAvgCost('');
      setCurrentPrice('');
      setNotes('');
      setError(null);
    }
  }, [open]);

  const canSave =
    !submitting &&
    /^[A-Z0-9.]{1,10}$/.test(ticker) &&
    Number(shares) > 0 &&
    Number(avgCost) > 0 &&
    Number(currentPrice) > 0;

  async function handleSave() {
    if (!canSave) return;
    setSubmitting(true);
    setError(null);
    try {
      await addInvestment({
        ticker,
        shares: Number(shares),
        avgCost: Number(avgCost),
        currentPrice: Number(currentPrice),
        notes: notes.trim() || undefined,
      });
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add investment</DialogTitle>
          <DialogDescription>
            This creates a linked ASSET transaction automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="ticker">Ticker</Label>
            <Input
              id="ticker"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              placeholder="VOO"
              maxLength={10}
            />
          </div>
          <div>
            <Label htmlFor="shares">Shares</Label>
            <Input
              id="shares"
              type="number"
              step="0.0001"
              min="0"
              value={shares}
              onChange={(e) => setShares(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="avg-cost">Average cost / share</Label>
            <Input
              id="avg-cost"
              type="number"
              step="0.01"
              min="0"
              value={avgCost}
              onChange={(e) => setAvgCost(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="current-price">Current price / share</Label>
            <Input
              id="current-price"
              type="number"
              step="0.01"
              min="0"
              value={currentPrice}
              onChange={(e) => setCurrentPrice(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {submitting ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npm run typecheck`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add components/add-investment-modal.tsx
git commit -m "feat(phase-3): AddInvestmentModal (atomic linked-tx)"
```

---

## Task 25: `components/update-prices-modal.tsx`

**Files:**
- Create: `components/update-prices-modal.tsx`

- [ ] **Step 1: Create the file**

```tsx
/**
 * components/update-prices-modal.tsx
 *
 * List every holding with the current price pre-filled. User edits whichever
 * ones they want, then Save runs one writeBatch via updateInvestmentPrices().
 */

'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useInvestments } from '@/lib/hooks/use-investments';
import { updateInvestmentPrices } from '@/lib/firebase/investments';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UpdatePricesModal({ open, onOpenChange }: Props) {
  const { investments } = useInvestments();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDrafts(
        Object.fromEntries(investments.map((i) => [i.id, String(i.currentPrice)])),
      );
      setError(null);
    }
  }, [open, investments]);

  async function handleSave() {
    setSubmitting(true);
    setError(null);
    try {
      const updates = Object.entries(drafts)
        .map(([id, val]) => ({ id, currentPrice: Number(val) }))
        .filter((u) => u.currentPrice > 0);
      await updateInvestmentPrices(updates);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Update prices</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {investments.map((i) => (
            <div key={i.id} className="flex items-center justify-between gap-3">
              <Label htmlFor={`price-${i.id}`} className="w-16 font-semibold">
                {i.ticker}
              </Label>
              <Input
                id={`price-${i.id}`}
                type="number"
                step="0.01"
                min="0"
                value={drafts[i.id] ?? ''}
                onChange={(e) => setDrafts({ ...drafts, [i.id]: e.target.value })}
              />
            </div>
          ))}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={submitting}>
            {submitting ? 'Saving…' : 'Save all'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npm run typecheck`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add components/update-prices-modal.tsx
git commit -m "feat(phase-3): UpdatePricesModal (batched price update)"
```

---

## Task 26: `app/(app)/portfolio/page.tsx`

**Files:**
- Create: `app/(app)/portfolio/page.tsx`

- [ ] **Step 1: Create the file**

```tsx
/**
 * app/(app)/portfolio/page.tsx
 *
 * Stitches PortfolioSummary + HoldingsList + Add/Update buttons.
 */

'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { PortfolioSummary } from '@/components/portfolio-summary';
import { HoldingsList } from '@/components/holdings-list';
import { AddInvestmentModal } from '@/components/add-investment-modal';
import { UpdatePricesModal } from '@/components/update-prices-modal';

export default function PortfolioPage() {
  const [addOpen, setAddOpen] = useState(false);
  const [pricesOpen, setPricesOpen] = useState(false);

  return (
    <div className="mx-auto max-w-md">
      <PortfolioSummary />
      <HoldingsList />
      <div className="mt-4 flex flex-col gap-3 px-6 pb-8">
        <Button variant="outline" onClick={() => setPricesOpen(true)}>
          Update prices
        </Button>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add investment
        </Button>
      </div>
      <AddInvestmentModal open={addOpen} onOpenChange={setAddOpen} />
      <UpdatePricesModal open={pricesOpen} onOpenChange={setPricesOpen} />
    </div>
  );
}
```

- [ ] **Step 2: Smoke test**

```bash
npm run dev
```

Navigate to `/portfolio`. Should show empty state ("No investments yet"). Click "Add investment", fill in (VOO / 10 / 380 / 410 / "Vanguard S&P 500"), Save. Holdings list should show VOO with +$300 P/L (8%) and one row at 100% allocation. Total card at top should show $4,100 / +$300 (8%).

Switch to /today — the linked ASSET transaction (merchant: VOO, amount: 3800) should appear in today's timeline and TwoNumbersBar Asset% should bump up.

Click "Update prices" → modal lists VOO with current 410 → change to 420 → Save → P/L updates to +$400.

Stop the dev server.

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/portfolio/page.tsx
git commit -m "feat(phase-3): /portfolio page"
```

---

# Phase I — Council

## Task 27: `components/weekly-council-card.tsx` + `components/council-followup-card.tsx`

**Files:**
- Create: `components/weekly-council-card.tsx`
- Create: `components/council-followup-card.tsx`

- [ ] **Step 1: Create `components/council-followup-card.tsx`**

```tsx
/**
 * components/council-followup-card.tsx
 *
 * Shown at the top of /council when last week's commitment exists and
 * followedThru is unanswered. Mechanism 5 enforcement: gates this week's
 * new commitment until the user answers Yes/No.
 */

'use client';

import { Button } from '@/components/ui/button';
import type { WeeklyCouncilDoc } from '@/lib/types/transaction';

interface Props {
  lastWeek: WeeklyCouncilDoc;
  onAnswer: (followed: boolean) => Promise<void>;
}

export function CouncilFollowupCard({ lastWeek, onAnswer }: Props) {
  return (
    <section className="mx-6 mt-6 rounded-md border border-amber-300 bg-amber-50 p-4">
      <p className="text-sm text-amber-900">Last week you said:</p>
      <p className="mt-1 font-medium text-amber-900">"{lastWeek.commitment}"</p>
      <p className="mt-3 text-sm text-amber-900">Did you do it?</p>
      <div className="mt-3 flex gap-2">
        <Button onClick={() => void onAnswer(true)} variant="outline">
          Yes
        </Button>
        <Button onClick={() => void onAnswer(false)} variant="outline">
          No
        </Button>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Create `components/weekly-council-card.tsx`**

```tsx
/**
 * components/weekly-council-card.tsx
 *
 * The main weekly council card. Shows:
 *   - week range
 *   - net direction this week
 *   - 3 biggest decisions (by absolute amount)
 *   - commitment textarea + Commit button
 */

'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useTransactions } from '@/lib/hooks/use-transactions';
import { direction, monthlyNet } from '@/lib/calculations/ratios';
import { BucketBadge } from '@/components/bucket-badge';
import type { TransactionWithId } from '@/lib/firebase/transactions';

interface Props {
  initialCommitment: string;
  onSave: (commitment: string) => Promise<void>;
}

function startOfThisWeek(now: Date = new Date()): Date {
  const d = new Date(now);
  const day = d.getDay() || 7; // Sunday = 7
  d.setDate(d.getDate() - (day - 1)); // back to Monday
  d.setHours(0, 0, 0, 0);
  return d;
}

function inThisWeek(date: Date, weekStart: Date): boolean {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  return date >= weekStart && date < weekEnd;
}

export function WeeklyCouncilCard({ initialCommitment, onSave }: Props) {
  const { transactions } = useTransactions();
  const [commitment, setCommitment] = useState(initialCommitment);
  const [submitting, setSubmitting] = useState(false);

  const weekStart = startOfThisWeek();
  const weekTxns: TransactionWithId[] = transactions.filter((t) => inThisWeek(t.date, weekStart));
  const net = monthlyNet(weekTxns); // re-uses signed-aggregation logic
  const dir = direction(net);
  const top3 = [...weekTxns].sort((a, b) => b.amount - a.amount).slice(0, 3);

  const fmtDate = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  async function handleSave() {
    if (!commitment.trim()) return;
    setSubmitting(true);
    try {
      await onSave(commitment.trim());
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mx-6 mt-6 rounded-md border p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        Week of {fmtDate(weekStart)} — {fmtDate(weekEnd)}
      </p>
      <p className={`mt-1 text-sm font-semibold ${dir === 'richer' ? 'text-green-700' : dir === 'poorer' ? 'text-red-700' : ''}`}>
        Net: {net >= 0 ? '+' : '−'}${Math.abs(net).toFixed(0)} ({dir})
      </p>

      <h3 className="mt-4 text-sm font-medium">3 biggest decisions this week</h3>
      {top3.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          No transactions logged this week. Add some on the Today screen.
        </p>
      ) : (
        <ul className="mt-2 space-y-2">
          {top3.map((t) => (
            <li key={t.id} className="flex items-center justify-between text-sm">
              <span className="truncate">{t.merchant}</span>
              <div className="flex items-center gap-2">
                <span className="tabular-nums">${t.amount.toFixed(0)}</span>
                <BucketBadge bucket={t.bucket} />
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6">
        <label htmlFor="commitment" className="text-sm font-medium">
          What will you do differently?
        </label>
        <Textarea
          id="commitment"
          value={commitment}
          onChange={(e) => setCommitment(e.target.value)}
          rows={3}
          className="mt-2"
        />
        <Button
          onClick={handleSave}
          disabled={submitting || !commitment.trim()}
          className="mt-3 w-full"
        >
          {submitting ? 'Saving…' : 'Commit'}
        </Button>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Verify**

Run: `npm run typecheck`
Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add components/council-followup-card.tsx components/weekly-council-card.tsx
git commit -m "feat(phase-3): WeeklyCouncilCard + CouncilFollowupCard (Mechanism 5)"
```

---

## Task 28: `app/(app)/council/page.tsx`

**Files:**
- Create: `app/(app)/council/page.tsx`

- [ ] **Step 1: Create the file**

```tsx
/**
 * app/(app)/council/page.tsx
 *
 * Mechanism 5 enforcement: if last week's followedThru is unanswered, the
 * follow-up card BLOCKS the new council card from rendering until it's answered.
 */

'use client';

import { CouncilFollowupCard } from '@/components/council-followup-card';
import { WeeklyCouncilCard } from '@/components/weekly-council-card';
import { useThisWeekCouncil } from '@/lib/hooks/use-this-week-council';

export default function CouncilPage() {
  const { thisWeek, lastWeek, loading, saveCommitment, answerLastWeekFollowThru } =
    useThisWeekCouncil();

  if (loading) return <p className="p-6 text-sm text-muted-foreground">Loading…</p>;

  // Mechanism 5 gate: last week exists, has a commitment, but follow-through is unanswered.
  const showFollowup = lastWeek && lastWeek.followedThru === undefined;

  return (
    <div className="mx-auto max-w-md pb-8">
      {showFollowup ? (
        <CouncilFollowupCard lastWeek={lastWeek} onAnswer={answerLastWeekFollowThru} />
      ) : (
        <WeeklyCouncilCard
          initialCommitment={thisWeek?.commitment ?? ''}
          onSave={saveCommitment}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Smoke test**

```bash
npm run dev
```

Navigate to `/council`. Should show the WeeklyCouncilCard for this week (no last-week follow-up since it's the first week of usage). If you have transactions logged for this ISO week, the top-3 list shows. Type a commitment ("Skip Starbucks all next week"), click Commit, verify it saves and re-appears on reload.

Stop the dev server.

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/council/page.tsx
git commit -m "feat(phase-3): /council page (Mechanism 5 follow-through gate)"
```

---

# Phase J — Final pass

## Task 29: Lint, typecheck, full smoke test, final commit

- [ ] **Step 1: Lint**

```bash
npm run lint
```
Expected: no errors. Fix any that surface.

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```
Expected: passes.

- [ ] **Step 3: Existing classifier tests still pass**

```bash
npm test
```
Expected: 36 classifier tests pass. If anything fails, investigate — Phase 3 should not have touched the classifier.

- [ ] **Step 4: Full smoke test**

```bash
npm run dev
```

Walk through every screen end-to-end:

1. `/` → redirects to `/today`
2. `/today` — TwoNumbersBar shows percentages, MonthNetCard shows direction, today's timeline visible
3. Add a transaction via FAB:
   - Type "Starbucks" → preview shows EXPENSE
   - Type 6.75 amount
   - Click LIABILITY override → reason field appears, save disabled
   - Type "buying coffee instead of brewing" (33 chars) → save enables
   - Click 😞 mood
   - Save → modal closes, row appears in timeline
4. `/curve` — if you have ≥ 5 ASSET transactions, chart renders; otherwise empty state
5. `/portfolio` — empty state if no investments; add one via Add investment modal; verify linked ASSET transaction appears on /today
6. Update prices via modal → P/L recalculates
7. `/council` — WeeklyCouncilCard renders with this week's data; type a commitment, save
8. If local time ≥ 21:00 and no verdict for today: DailyVerdictModal appears over /today, cannot be dismissed without answering, three buttons work, reveal screen shows guess vs. actual

If anything fails, fix it before committing.

Stop the dev server.

- [ ] **Step 5: Final commit (only if any fixes were needed in steps 1–4)**

```bash
git add -A
git status
git commit -m "fix(phase-3): smoke-test fixes from final pass"
```

If nothing needed fixing, skip this step.

- [ ] **Step 6: Update CLAUDE_CODE_PLAN.md to mark Phase 3 sub-items as done**

Open `CLAUDE_CODE_PLAN.md` and check off the relevant Phase 3 items from §4. Commit:

```bash
git add CLAUDE_CODE_PLAN.md
git commit -m "docs(phase-3): mark Phase 3 UI items complete in plan"
```

---

# Definition of done (from spec §12)

- [ ] All 5 routes render against real Firestore data (`/`, `/today`, `/curve`, `/portfolio`, `/council`)
- [ ] Add Transaction modal works end-to-end including liability friction
- [ ] Daily Verdict modal triggers at 9pm and writes a `DailyVerdictDoc`
- [ ] Weekly Council saves a commitment and the next-week follow-through gate works
- [ ] Asset Curve renders with at least 5 transactions of seed data
- [ ] Portfolio shows holdings with correct P/L from `lib/calculations/portfolio.ts`
- [ ] `npm run lint` + `npm run typecheck` pass
- [ ] Existing classifier tests still pass
- [ ] `firestore.rules` has the warning comment
- [ ] `BACKLOG.md` exists with the CSV import entry
- [ ] Kayden uses the app for 1 full day with real transactions and notes friction in `BACKLOG.md`
- [ ] Committed and pushed
