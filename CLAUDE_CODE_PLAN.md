# Cashflow — Claude Code Execution Plan (v2, Simplest)

> **Project:** Cashflow — A behavioral finance journal that builds Rich Dad cashflow mindset through daily reflection, asset/liability classification, and investment portfolio tracking.
>
> **Builder:** Solo dev (Kayden). **Stack:** Next.js + TS + Postgres.
>
> **Goal:** Ship in 10 days. Use it daily. Show recruiters.

---

## 0. Rules for Claude Code

1. **One phase at a time. Stop at each checkpoint.**
2. **No feature creep.** If it's not in this doc, don't build it.
3. **Test the classification engine. Skip tests elsewhere.** (Solo, MVP, time-boxed.)
4. **Commit after every phase.** `feat:` / `fix:` / `chore:`.
5. **No mock data outside `seeds/`.**
6. **Ask before adding any dependency.**

---

## 1. Tech Stack (locked, minimal)

| Layer | Choice |
|---|---|
| Framework | Next.js 14 App Router + TypeScript |
| Styling | Tailwind + shadcn/ui |
| DB | Firebase Firestore |
| Auth | Firebase Auth (email + Google) |
| Client SDK | `firebase` (web SDK) |
| Server SDK | `firebase-admin` (Phase 2+, API routes only) |
| AI (Phase 4 only) | Claude Haiku for classify, Sonnet for insight |
| Charts | Recharts |
| Deploy | Vercel |

**Banned for MVP:** Redux, tRPC, Docker, microservices, Plaid, CSV import, Prisma/SQL/ORMs.

> **Pivot note (2026-04-07):** Originally planned with Supabase + Prisma + Postgres. Switched mid-Phase 1 to Firebase. Classification engine is persistence-agnostic and survived the pivot unchanged — only type imports and the persistence layer changed. Firebase Web API key is public-by-design (it identifies the project, not authenticates) but **must** still live in `NEXT_PUBLIC_FIREBASE_*` env vars. Real security is enforced in `firestore.rules` + Firebase Auth. **Set Google Cloud budget alerts before deploy.**

---

## 2. The 5 Mindset Mechanisms (core product)

These are NOT optional features. They ARE the product.

| # | Mechanism | What it does | Phase |
|---|---|---|---|
| 1 | **Two Numbers** | Top bar shows Asset Ratio % and Liability Ratio % only | 3 |
| 2 | **Daily Verdict** | 9pm prompt: "Richer or poorer today?" → reveal truth | 3 |
| 3 | **Liability Friction** | Force user to type a reason before saving any LIABILITY | 3 |
| 4 | **Asset Curve** | Single line chart of cumulative asset added over time | 3 |
| 5 | **Weekly Council** | Sunday review with 3 biggest decisions + commitment | 4 |

**Design rule:** Every screen shows MAX 1 number, 1 question, or 1 chart.

---

## 3. Investment Portfolio Module

**Why it matters:** Asset bucket without portfolio tracking = incomplete. If user buys VOO, app must show what happened to that money.

**Scope (MVP only):**
- Manual entry only. No broker sync. No real-time prices.
- Track: ticker, shares, avg cost, current price (manual update), notes
- Auto-calculate: unrealized P/L, allocation %, total value
- Link investments to ASSET transactions (logging "Bought VOO $500" creates a portfolio entry)

**Out of scope:** Real-time quotes, dividends, options, crypto, tax lots, Plaid.

---

## 4. Phase Breakdown (10 days)

### Phase 0 — Setup (Day 1, 2h)

- [ ] `npx create-next-app@latest cashflow --typescript --tailwind --app`
- [ ] Install: shadcn/ui, firebase, zod, recharts, vitest (firebase-admin in Phase 2)
- [ ] `.env.example`, README, folder structure
- [ ] First commit: `chore: scaffold`

**Checkpoint:** `npm run dev` shows blank "Cashflow" page.

---

### Phase 1 — Types + Classification Engine (Days 2–3)

**The heart. Do not rush.**

- [x] Firestore data shape (Section 5) — TS interfaces in `lib/types/transaction.ts` (Bucket / IncomeType / ClassifiedBy / Mood / Verdict const objects + Doc interfaces)
- [x] Build `lib/classification/`:
  - [x] `merchant-rules.ts` (84 entries: Vanguard, Fidelity, Robinhood, Publix, Amazon, Uber, plus Tampa locals)
  - [x] `category-rules.ts` (25 entries, fallback)
  - [x] `classifier.ts` (orchestrator, 3-tier precedence)
- [x] Vitest: 36 test cases, all 4 buckets, edge cases
- [x] `seeds/transactions.ts` — 30 realistic Tampa-life transactions
- [x] `lib/firebase/client.ts` — Firebase Web SDK init (env-driven, SSR-safe)
- [x] `firestore.rules` — placeholder lock-everything rules (real rules in Phase 2)
- [x] `firestore.indexes.json` — empty composite-index file (Phase 2 fills as queries are written)

**Checkpoint:** `npm test` passes. Classify 10 of your real transactions, accuracy ≥ 80%.

---

### Phase 2 — Auth + API (Day 4)

- [ ] Firebase Auth (email + Google) — sign-in, sign-out, session via ID token
- [ ] `lib/firebase/admin.ts` — Firebase Admin SDK init (server-side, service account from env)
- [ ] API routes (all verify ID token with Admin SDK before reading/writing):
  - [ ] `POST/GET/PATCH/DELETE /api/transactions`
  - [ ] `POST/GET/PATCH/DELETE /api/investments`
  - [ ] `GET /api/summary/monthly` → asset/liability/expense/income ratios
  - [ ] `GET /api/portfolio` → holdings with P/L
- [ ] Zod validation on every request body
- [ ] Real `firestore.rules` enforcing `request.auth.uid == userId` for sub-collection access
- [ ] First composite indexes added to `firestore.indexes.json` as queries demand them
- [ ] Seed runner (`scripts/seed.ts`) writes `seeds/transactions.ts` data into Firestore for the dev user

**Checkpoint:** Create + retrieve 5 transactions and 3 investments via curl with a valid Firebase ID token.

---

### Phase 3 — Core UI + 4 of 5 Mechanisms (Days 5–8)

#### Screen 1: Today (homepage)

```
┌─────────────────────────────────┐
│  ASSET 34%        LIABILITY 12% │  ← Mechanism 1
├─────────────────────────────────┤
│      ↗ +$420 this month         │
│         (richer)                │
├─────────────────────────────────┤
│  Today's entries:               │
│  • Vanguard $200 🟢 ASSET       │
│  • Starbucks $6 🟡 EXPENSE      │
│              [+ Add]            │
└─────────────────────────────────┘
```

- [ ] Two Numbers top bar (sticky)
- [ ] Big monthly net direction
- [ ] Today's transaction timeline (no table)
- [ ] FAB: Add transaction

#### Screen 2: Add Transaction Modal

- [ ] Amount, merchant, date
- [ ] Auto-classified bucket with confidence badge
- [ ] 4 colored override buttons
- [ ] Optional: mood emoji, note
- [ ] **Mechanism 3:** If LIABILITY → require 10+ char reason BEFORE save enables
- [ ] If ASSET + investment merchant → "Add to portfolio?" toggle → mini form (ticker, shares)

#### Screen 3: Asset Curve (Mechanism 4)

- [ ] Single Recharts line: cumulative asset over time
- [ ] Dotted projection: "If you keep this pace, in 10 years: $X"
- [ ] No other chart on this screen

#### Screen 4: Portfolio

```
┌─────────────────────────────────┐
│  Total: $4,820                  │
│  P/L:  +$320 (7%)               │
├─────────────────────────────────┤
│  VOO   $2,400  +$180  ▓▓▓▓▓ 50% │
│  QQQ   $1,500  +$90   ▓▓▓░░ 31% │
│  GLD   $920    +$50   ▓▓░░░ 19% │
│         [Update prices]         │
└─────────────────────────────────┘
```

- [ ] Holdings list with allocation bars
- [ ] Manual "Update prices" button (type current price per ticker)

#### Screen 5: Daily Verdict Modal (Mechanism 2)

- [ ] Trigger: 9pm or first open after 9pm
- [ ] One question: "Richer or poorer today?"
- [ ] 3 buttons: 🟢 / 🟡 / 🔴
- [ ] After tap → reveal real number → log perception gap if mismatch
- [ ] Cannot dismiss without answering

**Checkpoint:** Use the app for 2 full days with real transactions. Note every UX friction.

---

### Phase 4 — Weekly Council + AI Insight (Day 9)

#### Mechanism 5: Weekly Council

- [ ] Trigger: Sunday 7pm (or first open after)
- [ ] Card shows: net direction this week, 3 biggest decisions, text input "What will you do differently?"
- [ ] Next week, before showing new Council: "Last week you said: '[X]'. Did you do it?" → Yes/No

#### AI Insight

- [ ] `lib/insights/monthly-summary.ts` — deterministic stats only
- [ ] `lib/insights/insight-generator.ts` — pass stats to Sonnet, get explanation
- [ ] **Strict rule:** AI never outputs a number that wasn't computed first
- [ ] Show on Today as small expandable card: "This month in 1 sentence"

**Checkpoint:** Insights for 1 month of seed data. Zero hallucinated numbers.

---

### Phase 5 — Deploy (Day 10)

- [ ] Lighthouse mobile audit
- [ ] Favicon, OG image, meta
- [ ] README with screenshots
- [ ] Deploy: Vercel + Firebase prod project (Firestore + Auth enabled, real `firestore.rules` published, Google Cloud budget alerts set)
- [ ] Smoke test
- [ ] Record 60s demo video

**Checkpoint:** Live URL. Demo-ready tomorrow.

---

## 5. Firestore Data Shape

Authoritative TS definitions live in [`lib/types/transaction.ts`](lib/types/transaction.ts). This section is the human-readable summary.

**Collection layout (sub-collections under each user — no `userId` field needed, it's in the path):**

```text
users/{uid}                        ← UserDoc            (user profile)
  ├── transactions/{txId}          ← TransactionDoc     (auto-ID)
  ├── investments/{invId}          ← InvestmentDoc      (auto-ID)
  ├── verdicts/{YYYY-MM-DD}        ← DailyVerdictDoc    (date string = doc ID, enforces uniqueness for free)
  └── councils/{YYYY-Www}          ← WeeklyCouncilDoc   (ISO week string = doc ID, e.g. "2026-W14")
```

**Document interfaces (excerpt — full source in `lib/types/transaction.ts`):**

```ts
export interface TransactionDoc {
  amount: number;          // dollars, 2 decimal precision (e.g. 19.99)
  merchant: string;
  category?: string;
  bucket: Bucket;          // 'ASSET' | 'LIABILITY' | 'EXPENSE' | 'INCOME'
  incomeType?: IncomeType; // 'ACTIVE' | 'PASSIVE'
  classifiedBy: ClassifiedBy; // 'RULE' | 'CATEGORY' | 'AI' | 'USER'
  confidence: number;      // 0–1 float
  userOverridden: boolean;
  liabilityReason?: string; // required when bucket === 'LIABILITY'
  mood?: Mood;             // 'HAPPY' | 'NEUTRAL' | 'REGRET'
  note?: string;
  date: Date;              // serialized to Firestore Timestamp at write time
  createdAt: Date;         // serverTimestamp() at write time
  investmentId?: string;   // doc ID of linked Investment in the same user's investments sub-collection
}

export interface InvestmentDoc {
  ticker: string;
  shares: number;          // up to 4 decimal places
  avgCost: number;         // dollars per share
  currentPrice: number;    // dollars per share, manually updated
  lastUpdated: Date;
  notes?: string;
}

export interface DailyVerdictDoc {
  date: string;            // matches doc ID, "YYYY-MM-DD"
  guess: Verdict;          // 'RICHER' | 'SAME' | 'POORER'
  actual: Verdict;
  perceptionGap: boolean;  // true when guess !== actual
  createdAt: Date;
}

export interface WeeklyCouncilDoc {
  weekStart: string;       // matches doc ID, "YYYY-Www"
  commitment: string;
  followedThru?: boolean;  // null until next week's follow-up
  createdAt: Date;
}
```

**Storage decisions:**

- **Amounts** are stored as `number` (dollars with 2 decimals), not integer cents. Simpler for MVP; if precision bugs surface in Phase 4, migrate to integer cents then.
- **Dates** are stored as Firestore `Timestamp`. Server-generated timestamps use `serverTimestamp()`; user-supplied dates use `Timestamp.fromDate()`.
- **Enums** are stored as plain strings, validated by Zod on every write and by the TS const object exports in `lib/types/transaction.ts`.
- **Foreign keys** (`investmentId`) are plain string doc IDs — no Firestore `DocumentReference` types in stored data, to keep serialization clean.
- **Unique-per-day/week** records (`DailyVerdict`, `WeeklyCouncil`) use the date/week string as the document ID directly. Firestore enforces uniqueness automatically and a `setDoc(..., { merge: true })` makes upserts trivial.

---

## 6. Folder Structure

```
cashflow/
├── app/
│   ├── (auth)/login/
│   ├── (app)/
│   │   ├── today/          ← homepage
│   │   ├── curve/          ← Asset Curve
│   │   ├── portfolio/
│   │   └── council/        ← Weekly Council
│   ├── api/
│   │   ├── transactions/
│   │   ├── investments/
│   │   ├── summary/
│   │   ├── portfolio/
│   │   ├── verdict/
│   │   └── council/
│   └── layout.tsx
├── components/
│   ├── ui/                 ← shadcn
│   ├── two-numbers-bar.tsx
│   ├── add-transaction-modal.tsx
│   ├── daily-verdict-modal.tsx
│   ├── asset-curve-chart.tsx
│   ├── portfolio-list.tsx
│   └── weekly-council-card.tsx
├── lib/
│   ├── classification/
│   │   ├── merchant-rules.ts
│   │   ├── category-rules.ts
│   │   ├── classifier.ts
│   │   └── classifier.test.ts
│   ├── firebase/
│   │   ├── client.ts       ← Firebase Web SDK init (Phase 1)
│   │   └── admin.ts        ← Firebase Admin SDK init (Phase 2)
│   ├── types/
│   │   └── transaction.ts  ← Bucket/IncomeType/etc. + Doc interfaces
│   ├── insights/
│   └── portfolio/          ← P/L calc, allocation
├── seeds/
├── firestore.rules         ← Firestore Security Rules
├── firestore.indexes.json  ← composite-index manifest
└── README.md
```

---

## 7. Definition of Done (per phase)

- [ ] All tasks checked
- [ ] `npm run lint` + `npm run typecheck` pass
- [ ] Classification tests pass (Phase 1 only)
- [ ] Manually tested by Kayden
- [ ] Committed and pushed
- [ ] Checkpoint criterion met

---

## 8. Hard NO list (do not build in v1)

CSV import · Plaid · real-time quotes · retirement calc · "what if" simulator · push/email notifications · mobile native · multi-currency · recurring detection · social/sharing · dividends · options · tax lots · crypto

If urge appears → write to `BACKLOG.md` and move on.

---

## 9. Resume Bullet (target)

> Built **Cashflow**, a behavioral finance journal using **Next.js 14, TypeScript, Firebase (Firestore + Auth)**, featuring a **3-tier asset/liability classification engine** (rule → category → LLM) with **85%+ accuracy**, an **investment portfolio tracker**, and **5 behavioral mechanisms** designed to build long-term cashflow mindset. Reduced LLM API costs **~70%** vs naive AI-only classification.

Every claim must be measurable. Don't write the bullet until numbers are real.

---

## 10. First Command for Claude Code

Paste into Claude Code in an empty repo:

> Read `CLAUDE_CODE_PLAN.md` in full. Then start Phase 0 only. Stop at the Phase 0 checkpoint and show me the result before proceeding to Phase 1.
