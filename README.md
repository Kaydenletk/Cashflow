# Cashflow

**A behavioral finance journal for building the Rich Dad cashflow mindset.**

Track daily income vs. expenses, monitor your investment portfolio, and receive
AI-powered weekly insights — all designed to shift focus from net worth to cashflow.

## Tech Stack

| Layer     | Choice                                          |
|-----------|-------------------------------------------------|
| Framework | Next.js 16 (App Router) + TypeScript + React 19 |
| Styling   | Tailwind CSS 4 + shadcn/ui                      |
| DB + Auth | Supabase (Postgres + Auth) — Phase 2            |
| ORM       | Prisma 6 (`prisma-client` generator)            |
| AI        | Anthropic SDK — Phase 4                         |
| Charts    | Recharts                                        |
| Tests     | Vitest                                          |
| Deploy    | Vercel — Phase 5                                |

> **Notes:** The plan locks Next.js 14, but `create-next-app@latest` installs
> Next 16 + React 19 + Tailwind 4 as of April 2026. Patterns from later phases
> (async `params`/`searchParams`, Tailwind 4 `@import`) follow the installed
> versions, not the plan's literal version pins. Prisma 6 outputs the generated
> client to `lib/generated/prisma`, so Phase 1+ imports use
> `@/lib/generated/prisma`, not `@prisma/client`.
>
> `shadcn init` transitively pulled in `lucide-react`, `@base-ui/react`,
> `class-variance-authority`, `clsx`, `tailwind-merge`, and `tw-animate-css`.
> These are part of the shadcn/ui stack, not separately chosen deps.

## Quickstart

```bash
npm install
cp .env.example .env.local
# Fill in .env.local with Supabase and database credentials
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

Available scripts: `npm run build`, `npm run lint`, `npm run typecheck`, `npm run test`.

## Build Plan

See [`CLAUDE_CODE_PLAN.md`](./CLAUDE_CODE_PLAN.md) for the full phased build plan.
