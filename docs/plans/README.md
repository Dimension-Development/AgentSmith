# Remediation & Hardening Plans

Working plans derived from the 2026-07-26 deep code review. Each doc is a self-contained
workstream with tasks, touched files, and acceptance criteria. Work top to bottom —
earlier plans unblock or de-risk later ones.

| # | Plan | Theme | Size | Status |
|---|------|-------|------|--------|
| 1 | [01-quick-fixes.md](./01-quick-fixes.md) | Known bugs + small correctness fixes | S | **Done** |
| 2 | [02-concurrency-and-atomicity.md](./02-concurrency-and-atomicity.md) | Race-safe moves, transactional claim + activity | M | **Done** |
| 3 | [03-authorization.md](./03-authorization.md) | Single authorization authority (session vs API key) | M | **Done** |
| 4 | [04-deploy-hardening.md](./04-deploy-hardening.md) | Blockers for hosted deploy (signup lockdown, seeds, error hygiene) | M | **Done** |
| 5 | [05-tests.md](./05-tests.md) | Integration tests for the claim/move invariants | M | **Done** |
| 6 | [06-product-polish.md](./06-product-polish.md) | Realtime board, MCP distribution, pagination, ordering | L | **Done** (npm pkg deferred) |

## Ground rules

- Business rules change in `lib/services/` first (per AGENTS.md); routes and MCP stay thin.
- Schema changes go through `npm run db:new` migrations — never edit applied migrations.
- Update the **Status** column here as plans progress; check off tasks inside each doc.
- Plan 4 (deploy hardening) is a **hard blocker** for any hosted deploy; nothing else is.

## Sequencing rationale

1. **Quick fixes** are independent and shrink the diff noise for everything after.
2. **Concurrency** rewrites the claim path as a Postgres function; do it before tests so
   tests assert the final shape.
3. **Authorization** decides where enforcement lives *before* Phase 3 (webhooks,
   membership RLS) makes the two-enforcement-points problem expensive.
4. **Deploy hardening** can run in parallel with 2–3 but must land before hosting.
5. **Tests** lock in the invariants once 2–3 settle the architecture.
6. **Polish** is post-MVP value: do after the foundations are trustworthy.
