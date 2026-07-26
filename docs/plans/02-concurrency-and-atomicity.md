# Plan 02 — Concurrency & Atomicity

**Theme:** Make every status mutation race-safe and make mutation + activity log atomic.
**Size:** M
**Depends on:** Plan 01 (small, avoids rebase noise)

The product's headline promise is deterministic multi-agent behavior ("two agents cannot
claim the same ticket"). `claimTicket` honors that with a conditional update, but
`moveTicket` doesn't, and *no* mutation writes its activity row in the same transaction.

---

## Problem A — `moveTicket` is read → decide → unconditional update

Two concurrent movers (or a move racing a claim) interleave:

- the final `update` isn't guarded on the status the decision was based on, so the
  activity log can record a wrong `from → to`;
- the unclaim decision (`wasClaimed`, `releasing`) uses a stale read, so claim fields can
  be cleared or preserved incorrectly.

## Problem B — mutation and activity log are separate statements

Every service does `update` then `insert activity`. Consequences:

- If the activity insert fails, the mutation **succeeded** but the client gets a 500 —
  an agent will retry a claim it already holds.
- A crash between the two silently loses audit trail, undercutting the PRD principle
  "everything is observable via activity log".
- `moveTicket` writes up to 3 activity rows sequentially — partial failure leaves a
  half-told story.

PostgREST cannot run multi-statement transactions, so the fix is **Postgres functions**
(`supabase.rpc(...)`) for the mutating paths.

---

## Approach

One migration adding three `security definer`-free (invoker-rights) SQL functions. The
service layer calls them via `rpc()`; routes and MCP are untouched. Services keep doing
input validation, error mapping, and shaping — the functions own the
check-mutate-log transaction.

### 1. `claim_ticket(p_ticket_id, p_user_id, p_agent_name, p_agent_run_id, p_harness_name)`

Single transaction:

1. `SELECT ... FOR UPDATE` the ticket (row lock ends re-check dance in TS).
2. Idempotent path: already `assigned_to = p_user_id` and `in_progress` → refresh agent
   fields if changed (per Plan 01 §2), return row, **no** activity.
3. Not `open` → raise `not_claimable`; assigned to someone else → raise `already_claimed`.
4. Otherwise set claim fields + `status = 'in_progress'`, insert `ticket_claimed`
   activity, return row.

Service maps raised errors to the existing `ServiceError`s (400 / 409) so API behavior
is unchanged.

### 2. `move_ticket(p_ticket_id, p_user_id, p_status)`

Single transaction:

1. `SELECT ... FOR UPDATE`.
2. Same-status → return row (no activity).
3. `open → in_progress` → raise `use_claim_ticket`.
4. Update status; if moving to `open`/`backlog` and was claimed, clear claim fields.
5. Insert `status_changed` (+ `ticket_unclaimed`, + `ticket_completed`) rows in the same
   transaction.

### 3. `create_ticket_with_activity(...)` — optional

Create + `ticket_created` activity. Lower value (creates rarely race); include only if
cheap while in there. Same question for `add_comment` + `comment_added`.

---

## Tasks

- [x] `npm run db:new -- claim_move_rpc` — write the functions
- [x] Decide error signaling convention (e.g. `raise exception using errcode/message`)
      and document it in the migration header
- [x] `claimTicket` service → `rpc("claim_ticket", ...)`, map errors, keep return shape
- [x] `moveTicket` service → `rpc("move_ticket", ...)`, same
- [x] Delete the now-dead re-check/race code paths in the service
- [x] Update `docs/01-database-schema.md` + PRD §8 note: atomic claim now implemented as
      a DB function (spirit of the conditional-update rule preserved, stronger)
- [x] Manual race test: two parallel `claim` curls against one open ticket → exactly one
      201-path success, one 409 (Plan 05 automates this)

## Non-goals

- No optimistic-locking / etag on `update_ticket` checklist writes (last-writer-wins is
  accepted for MVP; noted in Plan 06).
- No change to REST/MCP contracts.

## Acceptance criteria

- Parallel claims on one ticket: exactly one winner, loser gets 409, exactly one
  `ticket_claimed` activity row.
- Parallel `move` calls produce activity rows whose `from → to` chain is consistent
  (no impossible transitions logged).
- Activity rows for a mutation exist **iff** the mutation committed.
- All existing API/MCP behavior (status codes, response bodies) unchanged.
