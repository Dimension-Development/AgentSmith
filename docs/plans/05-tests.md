# Plan 05 — Tests for the Core Invariants

**Theme:** The PRD's success metrics have never been exercised by a test. Lock in the
claim/move invariants with integration tests against local Supabase.
**Size:** M
**Depends on:** Plan 02 (test the final RPC shape, not the interim TS logic)

---

## Philosophy

- **Integration over unit.** The invariants live in SQL functions + service glue;
  mocking Supabase would test nothing. Run against the local Docker stack
  (`npm run db:start`), reset state between suites.
- Test the **service layer** directly (import from `lib/services/*`) with an admin
  client + explicit `userId`s — no HTTP server needed for most cases.
- One thin smoke suite over the **REST API** (spawn `next dev` or use a running dev
  server) to cover auth resolution: session-less Bearer key path, 401s, Zod 400s.

## Setup tasks

- [x] Add `vitest` (+ `dotenv` loading of `.env.local`)
- [x] Test helper: admin client factory, `createTestUser()` (via
      `auth.admin.createUser`), `createTestProject()`, per-suite cleanup (delete rows by
      test-run marker)
- [x] `npm run test` script; document "requires `npm run db:start`" in README
- [ ] CI note: defer GitHub Actions wiring until hosted deploy exists (track in Plan 06)

## Invariant suites

### Claim (PRD §8 — the headline metric)

- [x] Claim an `open` unassigned ticket → `in_progress`, claim fields set, exactly one
      `ticket_claimed` activity
- [x] **Parallel claims** (`Promise.all` × 5 users, one ticket) → exactly one winner;
      losers get `409 Ticket already claimed`; exactly one claim activity row
- [x] Claim from `backlog` / `in_progress` / `complete` → `400 Ticket not claimable`
- [x] Idempotent re-claim (same user) → success, no duplicate activity, agent fields
      refreshed (Plan 01 §2)
- [x] Claim by user B on a ticket claimed by A → 409

### Move

- [x] `open → in_progress` via move → 400 with "use claim_ticket" message
- [x] Move claimed ticket to `open` → claim fields cleared, `status_changed` **and**
      `ticket_unclaimed` activities, `branch_name` preserved
- [x] Move to `backlog` → same unclaim behavior
- [x] Move to `complete` → `ticket_completed` activity, `merged_at` still null
- [x] Same-status move → no-op, no activity
- [x] Parallel conflicting moves → activity `from → to` chain is consistent

### Update / PR metadata

- [x] Setting `github_pr_url` writes `pr_linked` activity
- [x] Setting `github_pr_state: "merged"` writes `pr_merged` activity
- [x] Invalid `github_pr_state` → 400 (Plan 01 §4)
- [x] Oversized description / checklist → 400 (Plan 01 §5)

### Comments & activity

- [x] `add_comment` writes comment + `comment_added` activity atomically
- [x] Activity exists iff mutation committed (force a failure: e.g. move nonexistent
      ticket → no orphan activity)

### API keys / auth (REST smoke)

- [x] Valid `asm_` key → 200 on `GET /api/tickets?project_slug=...`; `last_used_at`
      updates (Plan 01 §1)
- [x] Revoked key → 401; garbage key → 401; no auth → 401
- [x] API key cannot list/create API keys (403)
- [x] Key management scoped to owner (user A cannot revoke B's key)

## Acceptance criteria

- `npm run test` green against a fresh `db:reset`.
- The parallel-claim test fails if the conditional/locked update is replaced with a
  naive read-then-write (verify once by intentionally breaking it).
- Suite runs in < 60s locally.
