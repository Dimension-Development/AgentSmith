# Plan 03 — Single Authorization Authority

**Theme:** Decide (and implement) where authorization is enforced, before Phase 3 makes
the current split expensive.
**Size:** M (mostly a decision + one refactor)
**Depends on:** Plan 02 (RPC functions should exist first so enforcement has one choke point)

---

## The problem

Today there are two enforcement regimes:

| Path | Client | Governed by |
|------|--------|-------------|
| Browser session | anon-key client + user JWT | RLS (`using (true)` for now) |
| API key (agents) | **service-role client** | nothing — RLS bypassed |

That's symmetrical only because RLS is wide open. The moment membership RLS lands
(PRD Phase 3 / "Future"), the session path tightens and the agent path silently stays
god-mode. Authorization implemented in two places is the classic recipe for a hole.

## Options

### Option A — Service layer is the authority (recommended)

- Both paths use the **admin client**; RLS becomes defense-in-depth only.
- Services (and the Plan 02 SQL functions) take `p_user_id` and enforce membership
  explicitly: `is_project_member(user_id, project_id)` checks inside the functions /
  services.
- Pros: one choke point shared by REST, MCP, and future webhooks; agent path and human
  path *provably* identical; easy to unit-test.
- Cons: RLS no longer the safety net for session traffic; a missed check in a new
  service is exposed (mitigate: helper `requireProjectAccess()` called at the top of
  every service, enforced by convention + tests).

### Option B — RLS is the authority

- Keep session path as-is. For API keys, stop using the service-role client for data
  access: mint a short-lived user-scoped JWT (sign with the project's JWT secret,
  `sub = key owner`, `role = authenticated`) and build a client with it, so RLS applies
  identically to agents.
- Pros: Postgres enforces everything; impossible to forget in app code.
- Cons: JWT minting couples us to Supabase JWT internals; membership rules expressed in
  SQL policies are harder to evolve/test; complex rules (e.g. "requester can't move to
  complete") don't fit RLS well anyway.

**Recommendation: Option A.** Role/status rules (viewer can't move tickets, requester
can't claim) are business rules, and those were already decided to live in services.
Splitting "who can see" (RLS) from "who can do" (services) reproduces the two-authority
problem. Keep restrictive RLS as a backstop, but treat services as the source of truth.

## Tasks (assuming Option A)

- [x] Record the decision in PRD (amend §7.1 target model) and AGENTS.md
- [x] Add `requireProjectAccess(supabase, userId, projectId, minRole?)` in
      `lib/services/` — for MVP it checks the user exists / is authenticated; wired for
      membership checks later
- [x] Call it at the top of every ticket/comment/project service function
- [x] Switch session-path services to the admin client **via the service layer only**
      (routes still resolve the session for identity; only `lib/services/*` touches the
      admin client)
- [x] Thread `p_user_id` into the Plan 02 SQL functions as the sole actor identity
- [x] Tighten RLS from `using (true)` to "authenticated can read; writes via service
      role only" as backstop (separate migration; verify UI still works — UI mutations
      go through API routes, but **check for any direct supabase-js writes in
      components first**)
- [x] Confirm `api_keys` service functions still pass an explicitly-scoped `user_id`
      everywhere (they do today — keep it that way)

## Non-goals

- Actual membership/role enforcement (owner/developer/requester/viewer) — that's Phase 3
  product work. This plan builds the choke point it will plug into.

## Acceptance criteria

- Grep test: no route or component reaches Supabase for ticket/project data except
  through `lib/services/`.
- An API-key request and a session request for the same action traverse the identical
  service code path with only `userId` provenance differing.
- RLS backstop: with the anon key and a bare authenticated JWT, direct table writes to
  `tickets` fail; reads still work.
- Documented decision in PRD + AGENTS.md.
