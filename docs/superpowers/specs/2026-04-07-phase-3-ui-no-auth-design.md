# Phase 3 UI (No-Auth Personal Mode) — Design

**Date:** 2026-04-07
**Status:** Approved (pending spec review)
**Author:** Kayden + Claude (brainstorming session)
**Supersedes:** N/A — first slice of Phase 3

---

## 1. Goal

Build all 5 product screens from `CLAUDE_CODE_PLAN.md` §4 Phase 3, usable end-to-end, without implementing Phase 2 (Auth + API routes). The dashboard runs against a single hardcoded user ID so Kayden can start journaling daily transactions immediately. Real Firebase Auth lands in a later slice.

The 5 screens implement the 5 mindset mechanisms that ARE the product (CLAUDE_CODE_PLAN.md §2):

1. **Two Numbers** — sticky bar showing only Asset% and Liability% (never raw dollars)
2. **Daily Verdict** — 9pm gate asking "Richer or poorer today?"
3. **Liability Friction** — typing a 10+ char reason required before saving any LIABILITY
4. **Asset Curve** — single line chart of cumulative asset over time
5. **Weekly Council** — Sunday review with commitment + next-week follow-through

## 2. Non-goals

Explicitly NOT in this slice (anything here is out of scope and must NOT be added):

- Firebase Auth (login, signup, sign-out, profile UI) — Phase 2 deferred
- Next.js API routes (`app/api/**` stays empty)
- Firebase Admin SDK / `lib/firebase/admin.ts`
- AI insight cards (Phase 4)
- CSV import (in `BACKLOG.md`)
- Real-time price feeds (manual price updates only)
- Edit / delete transactions (add-only this slice)
- Settings, theme switcher, dark mode toggle, internationalization
- Multi-device sync conflict handling (single user, single device assumption)
- Tests beyond the existing classifier suite (per CLAUDE_CODE_PLAN.md rule "Test the classification engine. Skip tests elsewhere.")
- The "Add to portfolio?" toggle inside the Add Transaction modal that CLAUDE_CODE_PLAN.md §4 Phase 3 mentions. This spec deliberately separates investment creation: investments are added from `/portfolio` via `<AddInvestmentModal />`, which auto-creates the linked ASSET transaction. Reason: keeps the Add Transaction modal focused on the daily-journal flow and avoids a conditional sub-form. If this turns out to feel wrong while dogfooding, revisit in a follow-up slice.

## 3. Constraints (locked in by CLAUDE_CODE_PLAN.md)

| Constraint | Source | Impact on this design |
|---|---|---|
| Next.js 14 App Router + TypeScript | §1 stack | All routes use `app/` directory; React 19 server/client component split |
| Firebase Firestore (no Postgres, no Prisma) | §1 stack + memory | Direct Firestore client SDK calls; sub-collection paths under `users/{uid}` |
| shadcn/ui + Tailwind | §1 stack | Primitives via `npx shadcn add`; no custom design system |
| Recharts for charts | §1 stack | Asset Curve uses Recharts `<LineChart />` |
| Mobile-first | §5 deploy: "Lighthouse mobile audit" | Bottom nav (not sidebar); single-column layouts; tap-friendly hit areas |
| "Every screen shows MAX 1 number, 1 question, or 1 chart" | §2 design rule | No multi-widget dashboards; each screen has one focal element |
| Ask before adding any dependency | §0 rule 6 | shadcn `add` may pull `class-variance-authority` etc., but those are already installed |
| No mock data outside `seeds/` | §0 rule 5 | Empty states use real-prose copy, never placeholder data |

## 4. Architecture

### 4.1 The single-user constant

```ts
// lib/config.ts (NEW)
export const PERSONAL_USER_ID = 'personal' as const;
```

This constant is the **only** thing that changes when real auth lands. Every Firestore call in `lib/firebase/*.ts` reads from this constant. The migration path to authenticated multi-user mode is:

```diff
- import { PERSONAL_USER_ID } from '@/lib/config';
- const uid = PERSONAL_USER_ID;
+ import { useAuth } from '@/lib/auth/context';
+ const { uid } = useAuth();
```

Zero data migration: documents already live at `users/personal/transactions/...`. When Kayden creates his first authenticated account, that user's UID becomes the new prefix and the existing `personal` data is either ignored, deleted, or one-time copied — that decision happens at the Phase 2 milestone, not here.

### 4.2 Direct client SDK, no API layer

UI components import Firestore helpers from `lib/firebase/*.ts` directly. No `fetch('/api/...')` calls. No API route handlers. Three reasons:

1. **Real-time updates for free** via `onSnapshot` — the Two Numbers bar, transaction list, and portfolio P/L all update live as the user adds entries, with no polling and no client-side cache invalidation.
2. **Less code to write and maintain** — no zod request validation layer, no ID-token forwarding, no error-shape contract between client and server.
3. **Same code path post-auth** — when auth lands, the only thing that changes is the path prefix. The component code doesn't move.

The trade-off: business logic lives in the browser. For a personal-use app this is acceptable; firestore.rules enforces scoping (and will enforce ownership once auth is added).

### 4.3 Dev-mode firestore.rules

The current `firestore.rules` locks everything (`allow read, write: if false`). For this slice it gets relaxed to allow access only to `users/personal/**`:

```
// DEV-ONLY rules — single hardcoded user, no auth.
// MUST be tightened to require request.auth.uid == userId before deploy.
// See docs/superpowers/specs/2026-04-07-phase-3-ui-no-auth-design.md §4.3.
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

The comment block is non-negotiable — it makes the temporary state visible to anyone (including future-Kayden) opening the file. Tightening these rules is a Phase 2 task, NOT something to forget.

### 4.4 Pure calculation modules

All mindset math lives in pure functions in `lib/calculations/*.ts`. No React, no Firestore — just `(transactions: TransactionDoc[]) => number` style helpers. This makes the math trivially correct and trivially testable later if a bug surfaces.

```ts
// lib/calculations/ratios.ts
export function assetRatio(txns: TransactionDoc[]): number;        // 0–1 float
export function liabilityRatio(txns: TransactionDoc[]): number;    // 0–1 float
export function monthlyNet(txns: TransactionDoc[]): number;        // dollars, signed
export function isRicher(net: number): 'richer' | 'flat' | 'poorer';

// lib/calculations/asset-curve.ts
export function cumulativeAssetByDate(txns: TransactionDoc[]): { date: string; total: number }[];
export function projectForward(curve: { date: string; total: number }[], years: number): number;

// lib/calculations/portfolio.ts
export function totalPortfolioValue(holdings: InvestmentDoc[]): number;
export function unrealizedPL(holding: InvestmentDoc): { dollars: number; percent: number };
export function allocationPct(holding: InvestmentDoc, total: number): number;
```

The exact signatures are illustrative; the implementation plan will pin them down.

## 5. Data layer

### 5.1 Modules

| File | Exports | Notes |
|---|---|---|
| `lib/firebase/transactions.ts` | `addTransaction`, `subscribeToTransactions`, `updateTransactionBucket` | Validates with zod before write; calls `classify()` from existing classifier |
| `lib/firebase/investments.ts` | `addInvestment`, `subscribeToInvestments`, `updateInvestmentPrice` | `updateInvestmentPrice` writes `lastUpdated: serverTimestamp()` |
| `lib/firebase/verdicts.ts` | `getTodayVerdict`, `saveVerdict` | Doc ID = `YYYY-MM-DD`; uses `setDoc(..., { merge: true })` |
| `lib/firebase/councils.ts` | `getThisWeekCouncil`, `saveCouncil`, `markFollowedThru` | Doc ID = `YYYY-Www` per ISO 8601 |

### 5.2 React hooks

Each Firestore module gets a thin React hook wrapper in `lib/hooks/`:

| Hook | Returns | Subscription type |
|---|---|---|
| `useTransactions()` | `{ transactions, loading, error }` | `onSnapshot` (live) |
| `useInvestments()` | `{ investments, loading, error }` | `onSnapshot` (live) |
| `useTodayVerdict()` | `{ verdict, loading }` | One-shot read on mount + revalidate on save |
| `useThisWeekCouncil()` | `{ council, loading }` | One-shot read on mount + revalidate on save |

`useTransactions()` returns the **current month** of transactions only — not the full history — because every consumer (Two Numbers bar, MonthNetCard, Today timeline) is scoped to "this month" or "today." If a future feature needs full history (e.g., Asset Curve does — see §6.2), it gets its own hook variant `useAllTransactions()` to keep the snapshot small for the common case.

### 5.3 Validation

All writes are validated with Zod schemas defined alongside each Firebase module (`lib/firebase/transactions.ts` exports `transactionInputSchema` etc.). The schemas mirror the TS interfaces in `lib/types/transaction.ts`. If validation fails, the function throws — the modal catches and displays the error inline. Liability friction is enforced at the schema level (`liabilityReason` required when `bucket === 'LIABILITY'` and length ≥ 10).

## 6. Routes & screens

### 6.1 Routing

| URL | File | Group |
|---|---|---|
| `/` | `app/page.tsx` | Root — `redirect('/today')` |
| `/today` | `app/(app)/today/page.tsx` | `(app)` |
| `/curve` | `app/(app)/curve/page.tsx` | `(app)` |
| `/portfolio` | `app/(app)/portfolio/page.tsx` | `(app)` |
| `/council` | `app/(app)/council/page.tsx` | `(app)` |

The `(app)` route group has a shared layout `app/(app)/layout.tsx` that renders:
- `<TwoNumbersBar />` sticky top
- `{children}` (the active screen)
- `<BottomNav />` sticky bottom (mobile-first 4-tab nav, lucide icons)
- `<DailyVerdictGate />` (modal mounted at layout level, gates everything once 9pm hits)

The `(auth)/login/` folder remains empty — kept in tree for future Phase 2.

### 6.2 Screen contracts

#### Screen 1: `/today`

```
┌─────────────────────────────────┐
│  ASSET 34%        LIABILITY 12% │  ← TwoNumbersBar (in shared layout)
├─────────────────────────────────┤
│      ↗ +$420 this month         │
│         (richer)                │  ← MonthNetCard
├─────────────────────────────────┤
│  Today                          │
│  • Vanguard $200 🟢 ASSET       │
│  • Starbucks $6 🟡 EXPENSE      │  ← TodayTimeline
│                                 │
│                          [+]    │  ← AddTransactionFab (fixed bottom-right)
└─────────────────────────────────┘
```

**Data:** `useTransactions()` → filtered to current month for ratios + net, filtered to today for timeline.
**Empty state:** "Nothing logged today. Tap + to add."
**Mindset enforcement:** TwoNumbersBar shows percentages only — no dollar totals, no net worth, no "you have $X." MonthNetCard shows the monthly delta as a single signed number with one word ("richer" / "poorer" / "flat").

#### Screen 2: `/curve` — Asset Curve (Mechanism 4)

```
┌─────────────────────────────────┐
│  Asset Curve                    │
│                                 │
│       ╱─╲    ╱──                │
│      ╱   ╲──╱                   │  ← Recharts <LineChart />
│   ──╱                           │
│                                 │
│  If you keep this pace,         │
│  in 10 years: $42,000           │  ← <ProjectionCaption />
└─────────────────────────────────┘
```

**Data:** `useAllTransactions()` (full history) → `cumulativeAssetByDate()` → array of `{ date, total }`.
**One chart, no others.** Per design rule §3, this screen has nothing else on it. No legend, no axis labels beyond minimum, no tooltip flourishes — single line, single projection caption.
**Empty state (< 5 data points):** "Add at least 5 ASSET transactions to see your curve."

#### Screen 3: `/portfolio`

```
┌─────────────────────────────────┐
│  Total: $4,820                  │
│  P/L:  +$320 (7%)               │  ← <PortfolioSummary />
├─────────────────────────────────┤
│  VOO  $2,400  +$180  ▓▓▓▓▓ 50% │
│  QQQ  $1,500  +$90   ▓▓▓░░ 31% │  ← <HoldingsList />
│  GLD  $920    +$50   ▓▓░░░ 19% │
│                                 │
│         [Update prices]         │  ← opens UpdatePricesModal
│              [+]                │  ← opens AddInvestmentModal
└─────────────────────────────────┘
```

**Data:** `useInvestments()` → derived total + per-holding P/L via `lib/calculations/portfolio.ts`.
**Add flow:** `+` opens an investment-specific modal (ticker, shares, avgCost, currentPrice, optional notes). Saving creates an `InvestmentDoc` AND a linked `TransactionDoc` with bucket=ASSET, merchant=ticker, amount=shares×avgCost, `investmentId` set to the new doc ID. (Per CLAUDE_CODE_PLAN.md §3: "Link investments to ASSET transactions.")
**Update prices:** modal lists current holdings; user types new prices; one batched write on save with `lastUpdated: serverTimestamp()`.
**Empty state:** "No investments yet. Tap + to add your first holding."

#### Screen 4: `/council` — Weekly Council (Mechanism 5)

```
┌─────────────────────────────────┐
│  Week of Apr 5 — Apr 11         │
│  Net: ↗ +$280  (richer)         │
├─────────────────────────────────┤
│  3 biggest decisions this week  │
│  • Vanguard buy  $200  ASSET    │
│  • Rent          $1200 EXPENSE  │
│  • Bonus         $400  INCOME   │
├─────────────────────────────────┤
│  What will you do differently?  │
│  ┌───────────────────────────┐  │
│  │ [textarea]                │  │
│  └───────────────────────────┘  │
│            [Commit]             │
└─────────────────────────────────┘
```

**Data:** `useTransactions()` filtered to current ISO week (Mon–Sun) → top 3 by absolute amount; `useThisWeekCouncil()` for the commitment doc.
**Follow-through prompt:** if last week's `WeeklyCouncilDoc` exists with `followedThru === undefined`, render a card at the top of the screen first: *"Last week you said: '[commitment]'. Did you do it?"* with Yes/No buttons. Only after answering does the new council form become visible. This enforces accountability week-over-week.
**Save:** creates/updates `users/personal/councils/{YYYY-Www}` with the commitment text. `setDoc(..., { merge: true })` so re-saves don't clobber the follow-through field.
**Empty state (no transactions this week):** "No transactions logged this week. Add some on the Today screen."

### 6.3 Modal contracts

#### `<AddTransactionModal />`

Triggered from: Today screen FAB.

Fields, in order:
1. Amount (number input, required, > 0)
2. Merchant (text input, required)
3. Date (date picker, defaults to today)
4. **Live classification preview** — runs `classify({ merchant })` on debounced merchant input, shows `<BucketBadge bucket={result.bucket} confidence={result.confidence} />` below the merchant field
5. **4 colored override buttons** (ASSET green / LIABILITY red / EXPENSE yellow / INCOME blue) — clicking sets `userOverridden: true` and `classifiedBy: 'USER'`. **When the user does NOT override**, the saved doc carries the classifier result's `classifiedBy` value verbatim (`'RULE'`, `'CATEGORY'`, or `'AI'` in Phase 4) and `userOverridden: false`.
6. **Liability reason field** — appears ONLY when bucket is LIABILITY (auto or override). Required, ≥ 10 chars. Save button stays disabled until satisfied. Placeholder: *"Why did you spend this? Be honest with future-you."*
7. Mood emoji selector (optional, 3 buttons mapped to the `Mood` enum in `lib/types/transaction.ts`): 😊 → `HAPPY`, 😐 → `NEUTRAL`, 😞 → `REGRET`
8. Note (optional textarea, 1-line collapsed by default)

Save button calls `addTransaction({...})`. On success: close modal, optimistic UI handled by `onSnapshot` re-emitting (no manual cache invalidation).

#### `<DailyVerdictModal />` (Mechanism 2)

Mounted in `(app)/layout.tsx` via `<DailyVerdictGate />`. Logic:

```
on mount, on route change, on every minute (interval):
  if local time >= 21:00 AND !verdictExistsForToday:
    open modal
modal:
  cannot dismiss (no X button, no backdrop close)
  one question: "Were you richer or poorer today?"
  three large buttons: 🟢 RICHER  |  🟡 SAME  |  🔴 POORER
  on click:
    1. compute actual = isRicher(monthlyNet for today only)
    2. write DailyVerdictDoc with guess + actual + perceptionGap
    3. transition to reveal screen: "You said X. Truth: Y. (Gap noted.)"
    4. dismiss button enables, closes modal
```

**Why no dismiss:** the friction IS the mechanism. Dismissable would defeat the point. Acceptable failure mode: Kayden closes the browser before answering — verdict is missed for that day. Tomorrow's gate doesn't backfill.

#### `<UpdatePricesModal />`

Triggered from: Portfolio screen "Update prices" button.

Lists every holding with the current price pre-filled. User edits whichever ones they want. Save batches all changed prices into one Firestore write per holding (using `Promise.all`, not a real Firestore batch — sub-collection writes don't strictly need batching for this volume).

## 7. Navigation

Bottom nav, 4 tabs, sticky bottom on mobile, sticky bottom on desktop too (no responsive switch — keep one layout). Active tab gets a colored top border + filled icon variant. Icons from `lucide-react` (already a dep).

| Tab | Icon | Route |
|---|---|---|
| Today | `Calendar` | `/today` |
| Curve | `TrendingUp` | `/curve` |
| Portfolio | `PieChart` | `/portfolio` |
| Council | `Users` | `/council` |

The Two Numbers bar is sticky **top** on every `(app)` route. Together with bottom nav, the screen content area is everything between them.

## 8. Mindset enforcement principles (non-negotiable)

These shape every component decision. If a design choice softens any of these, push back.

1. **Never display dollar totals on the Two Numbers bar.** Only percentages. The whole point is breaking the user's "I have $X in checking" mental model.
2. **Liability friction is REAL friction.** The reason field is not just a nice-to-have — saves are blocked until 10+ chars are typed. Don't add a "skip for now" option.
3. **One focal element per screen.** Asset Curve has nothing but the curve and a projection. Council has nothing but the commitment flow. Today has the timeline. Don't add "while we're at it" widgets.
4. **Daily Verdict cannot be dismissed.** No X button, no escape key, no backdrop close. Three buttons or nothing.
5. **Weekly Council follow-through is gated.** New commitment cannot be entered until last week's follow-through is answered.

## 9. File layout

```
app/
├── layout.tsx                       (existing, unchanged)
├── page.tsx                         (REWRITE: redirect('/today'))
├── (app)/
│   ├── layout.tsx                   (NEW: TwoNumbersBar + BottomNav + DailyVerdictGate)
│   ├── today/page.tsx               (NEW)
│   ├── curve/page.tsx               (NEW)
│   ├── portfolio/page.tsx           (NEW)
│   └── council/page.tsx             (NEW)
└── (auth)/login/                    (untouched, empty)

components/
├── ui/                              (shadcn primitives, added via CLI)
├── two-numbers-bar.tsx              (NEW)
├── month-net-card.tsx               (NEW)
├── today-timeline.tsx               (NEW)
├── transaction-row.tsx              (NEW)
├── add-transaction-fab.tsx          (NEW)
├── add-transaction-modal.tsx       (NEW)
├── bucket-badge.tsx                 (NEW)
├── daily-verdict-gate.tsx           (NEW)
├── daily-verdict-modal.tsx          (NEW)
├── asset-curve-chart.tsx            (NEW)
├── projection-caption.tsx           (NEW)
├── portfolio-summary.tsx            (NEW)
├── holdings-list.tsx                (NEW)
├── add-investment-modal.tsx         (NEW)
├── update-prices-modal.tsx          (NEW)
├── weekly-council-card.tsx          (NEW)
├── council-followup-card.tsx        (NEW)
└── bottom-nav.tsx                   (NEW)

lib/
├── config.ts                        (NEW: PERSONAL_USER_ID constant)
├── firebase/
│   ├── client.ts                    (existing, unchanged)
│   ├── transactions.ts              (NEW)
│   ├── investments.ts               (NEW)
│   ├── verdicts.ts                  (NEW)
│   └── councils.ts                  (NEW)
├── hooks/
│   ├── use-transactions.ts          (NEW)
│   ├── use-all-transactions.ts      (NEW: full-history variant for /curve)
│   ├── use-investments.ts           (NEW)
│   ├── use-today-verdict.ts         (NEW)
│   └── use-this-week-council.ts     (NEW)
├── calculations/
│   ├── ratios.ts                    (NEW)
│   ├── asset-curve.ts               (NEW)
│   └── portfolio.ts                 (NEW)
├── classification/                  (existing, unchanged)
├── types/transaction.ts             (existing, unchanged)
├── insights/                        (existing, unused this slice)
└── portfolio/                       (DELETE: empty stub from scaffold; functionality lives in lib/calculations/portfolio.ts)

firestore.rules                      (UPDATE: dev-only rules with warning comment)
BACKLOG.md                           (NEW: deferred-feature log, seeded with CSV import)
```

## 10. Migration path to real auth (one-line swap)

When Phase 2 lands:

1. Add `lib/auth/context.tsx` with `<AuthProvider>` and `useAuth()` hook
2. Wrap `app/layout.tsx` body in `<AuthProvider>`
3. Replace `import { PERSONAL_USER_ID } from '@/lib/config'` with `import { useAuth } from '@/lib/auth/context'` in each `lib/firebase/*.ts` module — these become hooks or take `uid` as a parameter (TBD at Phase 2)
4. Tighten `firestore.rules` to require `request.auth.uid == userId`
5. Implement `(auth)/login/page.tsx`
6. One-time data migration: copy `users/personal/**` to `users/{newUid}/**` for the first authenticated account, OR delete and start fresh — Kayden's call at the time

The data shape, hook contracts, and component code do not change.

## 11. Risks and trade-offs

| Risk | Mitigation |
|---|---|
| Dev firestore.rules accidentally ship to prod | (a) Bold warning comment in the file; (b) Phase 2 PR description must include "tightened firestore.rules" as a checkbox |
| Scope is large (~15–20 files, ~1500–2000 LOC) for one slice | Execute in topological order (data hooks → shared components → screens → modals → gate logic). Each commit leaves the app in a working state. Plan can stop at any commit if scope creep appears. |
| Single-device assumption breaks if Kayden uses two browsers | Acceptable for this slice — both devices read/write the same `users/personal` doc, last write wins. Real conflict handling waits for auth. |
| Daily Verdict gate is annoying (cannot dismiss) | This IS the design intent (Mechanism 2). If it becomes unbearable while dogfooding, revisit the *trigger time* (move from 9pm to 10pm) before relaxing the dismiss rule. |
| Liability friction (10+ char reason) feels punitive | Same as above. The friction IS the feature. If a category of LIABILITY genuinely doesn't need a reason, the right move is to reclassify those merchants as EXPENSE in `merchant-rules.ts`, not weaken the friction. |

## 12. Definition of done

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
