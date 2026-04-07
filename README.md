# Cashflow

**A behavioral finance journal for building the Rich Dad cashflow mindset.**

Track daily income vs. expenses, monitor your investment portfolio, and receive
AI-powered weekly insights — all designed to shift focus from net worth to cashflow.

## Tech Stack

| Layer      | Choice                                           |
|------------|--------------------------------------------------|
| Framework  | Next.js 16 (App Router) + TypeScript + React 19  |
| Styling    | Tailwind CSS 4 + shadcn/ui                       |
| Database   | Firebase Firestore                               |
| Auth       | Firebase Auth (email + Google) — Phase 2         |
| Client SDK | `firebase` (Web SDK)                             |
| Server SDK | `firebase-admin` — Phase 2 (API routes only)     |
| Types      | `lib/types/transaction.ts` (TS const objects)    |
| AI         | Anthropic SDK — Phase 4                          |
| Charts     | Recharts                                         |
| Tests      | Vitest                                           |
| Deploy     | Vercel — Phase 5                                 |

> **Notes:** The plan locks Next.js 14, but `create-next-app@latest` installs
> Next 16 + React 19 + Tailwind 4 as of April 2026. Patterns from later phases
> (async `params`/`searchParams`, Tailwind 4 `@import`) follow the installed
> versions, not the plan's literal version pins.
>
> **Pivot (2026-04-07):** Originally scaffolded with Supabase + Prisma. Switched
> to Firebase mid-Phase 1. The classification engine, tests, and seeds carry
> over unchanged — only the persistence layer and type imports were swapped.
> See [`CLAUDE_CODE_PLAN.md`](./CLAUDE_CODE_PLAN.md) Section 5 for the Firestore
> data shape.
>
> `shadcn init` transitively pulled in `lucide-react`, `@base-ui/react`,
> `class-variance-authority`, `clsx`, `tailwind-merge`, and `tw-animate-css`.
> These are part of the shadcn/ui stack, not separately chosen deps.

## Quickstart

```bash
npm install
cp .env.example .env.local
# Fill in .env.local with your Firebase web config (NEXT_PUBLIC_FIREBASE_*)
npm run dev
```

Firebase setup:

1. Create a Firebase project at <https://console.firebase.google.com>
2. Enable **Firestore** (in production mode) and **Authentication** (Email/Password + Google providers)
3. Project Settings → Your apps → register a Web app, copy the config into `.env.local`
4. **Set Google Cloud budget alerts before deploying** — the Firebase web API key is public-by-design but quotas can still be abused
5. (Phase 2+) Install `firebase-admin` and download a service account key for server-side API routes; never commit the key

Open [http://localhost:3000](http://localhost:3000) in your browser.

Available scripts: `npm run build`, `npm run lint`, `npm run typecheck`, `npm run test`.

## Build Plan

See [`CLAUDE_CODE_PLAN.md`](./CLAUDE_CODE_PLAN.md) for the full phased build plan.
