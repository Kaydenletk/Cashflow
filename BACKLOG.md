# BACKLOG

Deferred features and ideas. When the urge to add scope appears, write it here and move on.

## Deferred from Phase 3 (2026-04-07)

- **CSV import** — paste CSV from bank statements, parse, classify in batch, preview before commit. Out of scope for Phase 3 (would have added file upload UI, papaparse dependency, column mapping, dedupe logic). Revisit after MVP is in daily use.

## Deferred from Phase 3 — possibly worth revisiting after dogfooding

- **"Add to portfolio?" toggle inside the Add Transaction modal** for ASSET + investment-merchant transactions. Spec §2 chose to keep investment creation on `/portfolio` only. If the dual-flow proves annoying, revisit.
- **Edit / delete transactions** — Phase 3 is add-only. If a typo bug shows up while journaling, revisit.
