# Plan 01 — Quick Fixes

**Theme:** Known bugs and small correctness fixes. All independent, all low-risk.
**Size:** S (≈1–2 hours total)
**Depends on:** nothing

---

## 1. `last_used_at` is never written (real bug)

`lib/services/api-keys.ts` (`authenticateApiKey`) does:

```ts
void admin.from("api_keys").update({ last_used_at: ... }).eq("id", data.id);
```

supabase-js query builders are **lazy thenables** — the HTTP request only fires when the
builder is awaited or `.then()`-ed. `void` builds the query and discards it, so the
update never executes and every key shows "never used" forever.

**Fix:** keep it best-effort but actually execute it:

```ts
admin
  .from("api_keys")
  .update({ last_used_at: new Date().toISOString() })
  .eq("id", data.id)
  .then(undefined, () => {}); // fire-and-forget, swallow errors
```

- [x] Fix in `authenticateApiKey`
- [x] Manually verify: call the API with a key, confirm `last_used_at` populates in Studio

## 2. Idempotent re-claim ignores new agent metadata

`claimTicket` returns early on same-assignee re-claim without touching
`agent_name` / `agent_run_id` / `harness_name`. A fresh run by the same user keeps the
stale run's identity — bad for the audit story.

**Fix:** on the idempotent path, if any agent field differs from what's stored, update
those fields (no `ticket_claimed` activity — PRD rule stands: no duplicate claim event).

- [x] Update idempotent branch in `claimTicket` (both the pre-check and post-race branch)
- [x] Keep: no duplicate `ticket_claimed` activity on re-claim

## 3. `logActivity` accepts `activity_type: string`

The DB column is a Postgres enum; a typo in a service becomes a runtime 500.

**Fix:** export an `ActivityType` union from `lib/types.ts` matching the enum
(`ticket_created | ticket_updated | ticket_claimed | ticket_unclaimed | status_changed |
comment_added | pr_linked | pr_merged | ticket_completed`) and use it in
`LogActivityInput`.

- [x] Add `ActivityType` union to `lib/types.ts`
- [x] Type `LogActivityInput.activity_type` with it; fix any resulting compile errors

## 4. `github_pr_state` validated as bare string

Docs say `open | closed | merged`; Zod says `z.string()`.

**Fix:** `z.enum(["open", "closed", "merged"]).nullable().optional()` in
`lib/validations/tickets.ts` **and** the duplicated schema in `mcp/server.ts`
(schema dedupe itself is Plan 06, but keep these two in sync until then).

- [x] Tighten in `lib/validations/tickets.ts`
- [x] Tighten in `mcp/server.ts`

## 5. Unbounded inputs

`description`, comment `body`, `checklist` items, and agent metadata fields have no max
size — an agent can write megabytes.

**Fix (Zod only, no migration needed):**

- `description`: max 20 000 chars
- comment `body`: max 10 000 chars
- `checklist`: max 100 items; `text` max 500 chars
- `agent_name` / `harness_name` / `agent_run_id` / `branch_name`: max 200 chars
- `github_pr_url` / sha fields: max 500 chars

- [x] Apply limits in `lib/validations/tickets.ts`
- [x] Mirror in `mcp/server.ts` schemas

## 6. Board card reshuffling

`listTickets` orders by `updated_at desc`, so cards jump within a column on every touch.

**Fix:** order by `created_at desc` (stable). Explicit positions are out of scope
(Plan 06 notes it).

- [x] Change ordering in `listTickets`

---

## Acceptance criteria

- `last_used_at` visibly updates after an API-key request.
- Re-claim by the same user with a new `agent_run_id` updates the run id, adds no
  duplicate claim activity.
- `tsc` catches an invalid activity type at compile time.
- `update_ticket` rejects `github_pr_state: "banana"` with a 400.
- Oversized description/comment/checklist rejected with a 400.
- Lint + typecheck clean; board still renders.
