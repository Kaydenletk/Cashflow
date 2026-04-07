# Cashflow — Claude Code Execution Plan

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
| Framework | Next.js 16 App Router + TypeScript + React 19 |
| Styling | Tailwind 4 + shadcn/ui |
| DB + Auth | Supabase (Postgres + Auth) |
| ORM | Prisma 6 (`prisma-client` generator → `lib/generated/prisma`) |
| AI (Phase 4 only) | Claude Haiku for classify, Sonnet for insight |
| Charts | Recharts |
| Deploy | Vercel |

**Banned for MVP:** Redux, tRPC, Docker, microservices, Plaid, CSV import.

> **Version drift note (updated 2026-04-07 during Phase 0):** Plan was originally
> written assuming Next 14 / React 18 / Tailwind 3 / Prisma 5. As of the actual
> scaffold, `create-next-app@latest` installs Next 16 / React 19 / Tailwind 4, and
> `prisma init` uses Prisma 6. All later phases follow the installed versions,
> not the original pins. Practical implications:
>
> - Route handler `params` and `searchParams` are now async (`Promise<...>`) — affects Phase 2 API routes and Phase 3 dynamic pages.
> - Tailwind 4 uses `@import "tailwindcss"` instead of the v3 `@tailwind base/components/utilities` directives.
> - Prisma client imports are `from "@/lib/generated/prisma"`, not `from "@prisma/client"`.

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
- [ ] Install: shadcn/ui, prisma, @supabase/supabase-js, zod, recharts, vitest
- [ ] `.env.example`, README, folder structure
- [ ] First commit: `chore: scaffold`

**Checkpoint:** `npm run dev` shows blank "Cashflow" page.

---

### Phase 1 — Schema + Classification Engine (Days 2–3)

**The heart. Do not rush.**

- [ ] Prisma schema (Section 5) — Transaction + Investment models
- [ ] First migration
- [ ] Build `lib/classification/`:
  - [ ] `merchant-rules.ts` (~40 entries: Vanguard, Fidelity, Robinhood, Publix, Amazon, Uber, etc.)
  - [ ] `category-rules.ts` (fallback)
  - [ ] `classifier.ts` (orchestrator)
- [ ] Vitest: 15 test cases, all 4 buckets, edge cases
- [ ] `seeds/transactions.ts` — 30 realistic Tampa-life transactions

**Checkpoint:** `npm test` passes. Classify 10 of your real transactions, accuracy ≥ 80%.

---

### Phase 2 — Auth + API (Day 4)

- [ ] Supabase Auth (email + Google)
- [ ] API routes:
  - [ ] `POST/GET/PATCH/DELETE /api/transactions`
  - [ ] `POST/GET/PATCH/DELETE /api/investments`
  - [ ] `GET /api/summary/monthly` → asset/liability/expense/income ratios
  - [ ] `GET /api/portfolio` → holdings with P/L
- [ ] Zod validation everywhere
- [ ] Supabase RLS on both tables

**Checkpoint:** Create + retrieve 5 transactions and 3 investments via curl.

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
- [ ] Deploy: Vercel + Supabase prod
- [ ] Smoke test
- [ ] Record 60s demo video

**Checkpoint:** Live URL. Demo-ready tomorrow.

---

## 5. Prisma Schema

```prisma
model User {
  id           String          @id @default(cuid())
  email        String          @unique
  createdAt    DateTime        @default(now())
  transactions Transaction[]
  investments  Investment[]
  verdicts     DailyVerdict[]
  councils     WeeklyCouncil[]
}

model Transaction {
  id              String       @id @default(cuid())
  userId          String
  user            User         @relation(fields: [userId], references: [id])
  amount          Decimal      @db.Decimal(12, 2)
  merchant        String
  category        String?
  bucket          Bucket
  incomeType      IncomeType?
  classifiedBy    ClassifiedBy
  confidence      Float        @default(1.0)
  userOverridden  Boolean      @default(false)
  liabilityReason String?      // forced when bucket = LIABILITY
  mood            Mood?
  note            String?
  date            DateTime
  createdAt       DateTime     @default(now())
  investment      Investment?  @relation(fields: [investmentId], references: [id])
  investmentId    String?

  @@index([userId, date])
}

model Investment {
  id           String        @id @default(cuid())
  userId       String
  user         User          @relation(fields: [userId], references: [id])
  ticker       String
  shares       Decimal       @db.Decimal(12, 4)
  avgCost      Decimal       @db.Decimal(12, 2)
  currentPrice Decimal       @db.Decimal(12, 2)
  lastUpdated  DateTime      @default(now())
  notes        String?
  transactions Transaction[]

  @@index([userId])
}

model DailyVerdict {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id])
  date          DateTime
  guess         Verdict
  actual        Verdict
  perceptionGap Boolean
  createdAt     DateTime @default(now())

  @@unique([userId, date])
}

model WeeklyCouncil {
  id           String   @id @default(cuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id])
  weekStart    DateTime
  commitment   String
  followedThru Boolean?
  createdAt    DateTime @default(now())

  @@unique([userId, weekStart])
}

enum Bucket       { ASSET LIABILITY EXPENSE INCOME }
enum IncomeType   { ACTIVE PASSIVE }
enum ClassifiedBy { RULE CATEGORY AI USER }
enum Mood         { HAPPY NEUTRAL REGRET }
enum Verdict      { RICHER SAME POORER }
```

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
│   ├── insights/
│   ├── portfolio/          ← P/L calc, allocation
│   └── db.ts
├── prisma/schema.prisma
├── seeds/
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

> Built **Cashflow**, a behavioral finance journal using **Next.js 14, TypeScript, Postgres, Prisma**, featuring a **3-tier asset/liability classification engine** (rule → category → LLM) with **85%+ accuracy**, an **investment portfolio tracker**, and **5 behavioral mechanisms** designed to build long-term cashflow mindset. Reduced LLM API costs **~70%** vs naive AI-only classification.

Every claim must be measurable. Don't write the bullet until numbers are real.

---

## 10. First Command for Claude Code

Paste into Claude Code in an empty repo:

> Read `CLAUDE_CODE_PLAN.md` in full. Then start Phase 0 only. Stop at the Phase 0 checkpoint and show me the result before proceeding to Phase 1.
