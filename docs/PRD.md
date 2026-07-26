# AgentSmith.dev — Product Requirements Document (PRD)

**Version:** 1.2  
**Date:** 2026-07-26  
**Status:** MVP  
**Owner:** Dimension Development  
**Target consumers:** Grok Build / Claude Code / Cursor agents  

---

## 1. Vision

AgentSmith is a lightweight, agent-first Kanban board for small teams (especially 1–3 people) who ship software with AI coding agents.

Non-technical stakeholders create feature requests and bug reports.  
Developers (or "vibe coders") and coding agents **claim** those tickets, scope the work, implement, open a PR, and move the ticket through a simple pipeline that ends with a reviewed & merged pull request.

**Tagline:** *The Kanban board that agents actually use.*

**Positioning:**  
> The agent-native change request queue that turns stakeholder requests into reviewed pull requests.

### Systems of record

| Concern | System of record |
|---------|------------------|
| Work state (tickets, status, ownership) | **AgentSmith** |
| Code (branches, PRs, commits) | **GitHub** |
| Execution | Coding agents (Grok Build, Claude Code, Cursor, Codex, etc.) |

Do not turn AgentSmith into Slack.  
Do not turn AgentSmith into GitHub.

---

## 2. Design decisions

### Since v1.0

| Decision | Reason |
|----------|--------|
| Explicit ticket **claiming** | Deterministic ownership when multiple agents (or agent + human) are active |
| Separate `activity_log` | Machine-readable audit trail; comments stay human discussion |
| Project → GitHub binding | Every project knows where its code lives |
| Richer GitHub PR metadata | Makes future webhooks trivial |
| Agent / harness tracking | Trace which agent performed the work |
| Service layer | Shared business rules for REST, MCP, and later webhooks |
| Board columns stay simple | Claim is an *action*; board stays clear for non-technical users |

### Since v1.1 (normative locks)

| Decision | Rule |
|----------|------|
| Agent identity | Personal **API key belongs to a human user**. Claim sets `assigned_to` to that user; `agent_name` / `agent_run_id` / `harness_name` record which agent ran. Keys auth to AgentSmith API/MCP — not GitHub. |
| Create status | New tickets always default to **`backlog`**. |
| Claim eligibility | **`claim_ticket` only from `open`**. Promote via `move_ticket` (no separate open tool). |
| Unclaim | **No separate unclaim tool.** Moving to **`open` or `backlog`** clears claim/agent fields and logs `ticket_unclaimed`. |
| Status transitions | Soft guardrails: most any→any allowed, but **`open` → `in_progress` only via `claim_ticket`**. |
| Re-claim | Same assignee re-claim is **idempotent success** (return current ticket; no duplicate activity required). |
| Atomic claim | Conditional `UPDATE … WHERE status = 'open' AND assigned_to IS NULL RETURNING *` (see §8). |
| `merged_at` | Set **only when a PR is actually merged** (PR metadata / webhook). Never set merely because status is `complete`. |
| Comment activity | Every `add_comment` writes `activity_log` `comment_added`. |
| `list_tickets` | **Require** `project_id` or `project_slug`. |
| RLS (MVP) | Open among authenticated users; private / invite-only deploy. |
| Comments + activity UI | Phase 1 ticket detail includes both. |

---

## 3. Goals

### Primary Goals (MVP)
1. Non-technical users can create clear tickets in under 30 seconds.
2. A coding agent can list open tickets, **claim** one atomically, pull full context, update it with a plan, and move it via MCP.
3. Ticket ownership is explicit (`assigned_to` + claim metadata).
4. The core loop works end-to-end with minimal friction.

### Secondary Goals (post-MVP)
- Automatic status transitions driven by GitHub PR webhooks.
- Worktree / branch helpers per claimed ticket.
- Richer permissions via project membership.
- Parallel agents across many tickets.

### Non-Goals (out of scope for MVP)
- Full project management suite (roadmaps, sprints, velocity).
- Complex custom workflows per project.
- Mobile-native apps.
- Multi-tenant SaaS with billing.
- Built-in code review or CI.
- Real-time collaboration chat (Buzz or similar is a future optional layer only).

---

## 4. Personas

### 1. Non-Technical Stakeholder ("Requester")
- Creates feature requests and bug reports.
- Needs a dead-simple form and clear progress visibility.

### 2. Developer / Vibe Coder ("Operator")
- Uses AI coding agents heavily.
- Claims work, scopes it, reviews PRs, and ships.
- Creates a personal API key for local agents (Claude Code, Grok Build, Codex, etc.).

### 3. Coding Agent (via MCP)
- Needs structured tools to list, **claim**, read, update, and move tickets.
- Authenticates with the operator's personal API key (acts as that user).
- Must receive clean context and leave an auditable trail.

---

## 5. Core User Flows

### Flow A — Requester creates a ticket
1. Log in (magic link or Google).
2. Select a project.
3. Create ticket: Title, Description, Type (Feature / Bug).
4. Ticket always lands in **Backlog**.
5. Operator (or agent via `move_ticket`) promotes to **Open** when ready for agents.

### Flow B — Agent claims and works a ticket
1. Operator has promoted the ticket to **Open** (human UI or `move_ticket`).
2. Agent lists open tickets (`list_tickets` with project + `status: "open"`).
3. Agent calls **`claim_ticket`** → atomic assign, `claimed_at` set, status → `in_progress`, activity logged.
4. Agent gets full ticket context.
5. Agent scopes work, writes plan via `add_comment` / `update_ticket` (checklist).
6. Implementation happens in the coding agent + git (branch recorded on ticket).
7. When PR is opened → ticket moved to **PR Review** (manual in MVP; webhook later).
8. After merge → ticket moved to **Complete**; set `merged_at` only when the PR is actually merged.

### Flow C — Human review on the board
- Operator sees status, assignee, agent/harness, activity, and comments.
- Can move tickets (soft guardrails) or clear ownership by moving back to open/backlog.

---

## 6. Ticket Lifecycle (board columns)

**Visible board columns (fixed for MVP):**

```
backlog → open → in_progress → pr_review → complete
```

| Status | Meaning |
|--------|---------|
| `backlog` | Ideas / not yet ready to pick up (create default) |
| `open` | Ready to be claimed |
| `in_progress` | Claimed and actively being worked |
| `pr_review` | PR is open, waiting for human review |
| `complete` | Done (merged or otherwise finished) |

**Claim is an action, not a separate column.**  
Calling `claim_ticket` on an `open` ticket moves it to `in_progress` and records ownership.

**Soft transition guardrails (normative):**
1. Most status changes via `move_ticket` / UI are allowed (any → any) for operator flexibility.
2. **`open` → `in_progress` is not allowed via `move_ticket`** — must use `claim_ticket`.
3. Moving to **`open` or `backlog`** clears claim fields (`assigned_to`, `claimed_at`, agent/harness fields) and writes `ticket_unclaimed` when the ticket was previously claimed.
4. There is no separate `unclaim_ticket` tool.

Planning may be recorded as a system activity / comment; it does not need its own column in MVP.

---

## 7. MVP Feature Set

### 7.1 Authentication
- Supabase Auth (Magic Link + Google OAuth).
- Simple role model for MVP: authenticated users can create, view, comment, claim, and move (open RLS among authenticated users).
- **Private / invite-only deployment** for MVP — do not leave public self-signup open in production.
- Target model (document now, enforce later): `owner` | `developer` | `requester` | `viewer` via `project_members`.
- **MCP:** personal API keys owned by a human user (Phase 2). Key acts as that user. Not GitHub credentials — agents need them to call AgentSmith list/claim/update APIs; git push alone does not update work state.

### 7.2 Projects
- Container for tickets.
- Fields include GitHub binding:
  - `github_owner` (e.g. `Dimension-Development`)
  - `github_repo` (e.g. `AgentSmith`)
  - `default_branch` (e.g. `main`)
- Multiple projects supported; start with one default.

### 7.3 Tickets
**Core fields**
- `id`, `project_id`, `title`, `description`, `type` (`feature` | `bug`)
- `status` (default `backlog`; see lifecycle above)
- `created_by`, `created_at`, `updated_at`

**Ownership / agent fields**
- `assigned_to` (uuid, nullable) — human user who owns the claim (API key owner when claimed via MCP)
- `claimed_at` (timestamptz, nullable)
- `agent_name` (text, nullable) — e.g. `Grok Build`
- `agent_run_id` (text, nullable)
- `harness_name` (text, nullable) — e.g. `cursor`, `claude-code`, `grok-build`
- `branch_name` (text, nullable)

**GitHub PR metadata**
- `github_pr_number` (int, nullable)
- `github_pr_url` (text, nullable)
- `github_pr_state` (text, nullable) — `open` | `closed` | `merged`
- `github_head_sha` (text, nullable)
- `github_merge_commit_sha` (text, nullable)
- `merged_at` (timestamptz, nullable) — set only when a PR is actually merged

**Other**
- `checklist` (jsonb, default `[]`)

### 7.4 Comments vs Activity
- **Comments** = human (and optional agent) discussion threads.
- **Activity log** = machine-readable audit trail (created, claimed, unclaimed, status changed, PR linked, merged, comment_added, etc.).
- Do **not** store activity as comments.
- Every new comment also writes `activity_log` `comment_added`.

### 7.5 Board UI
- Five columns matching statuses.
- Cards show: title, type badge, assignee/agent indicator, comment count.
- Detail view (Phase 1): description, comments thread, activity timeline, claim/move controls, PR metadata.
- Claim control only when status is `open`.
- Create ticket form (title, description, type) → always **backlog**.
- Project switcher.

### 7.6 MCP Server (Critical)
Core tools:

| Tool | Purpose |
|------|---------|
| `list_tickets` | List tickets (require project; optional status filter) |
| `get_ticket` | Full ticket + comments + recent activity |
| `create_ticket` | Create ticket (default `backlog`) |
| `update_ticket` | Partial update (description, checklist, branch, PR fields, etc.) |
| `add_comment` | Human or system comment (+ activity) |
| `claim_ticket` | **Atomically claim** an open ticket |
| `move_ticket` | Change status (soft guardrails) |

### 7.7 API + Service Layer
```
API Routes  →  Services  →  Repositories  →  Database
```
All status transitions, claim rules, claim-field clearing, and activity logging live in **Services** so REST, MCP, and future webhooks share the same logic.

---

## 8. Claim Rules (normative)

`claim_ticket` input:
- `ticket_id` (required)
- `agent_name` (required for agents)
- `agent_run_id` (optional)
- `harness_name` (optional)

**Caller identity:** the authenticated user (browser session or API key owner). That user becomes `assigned_to`.

Rules:
1. Ticket must exist and be in status **`open`** only. Claim from `backlog` is not allowed.
2. Implement claim with an **atomic conditional update** (required for the multi-agent success metric).
   *Implementation note (post-v1.2):* claim and move are now Postgres functions
   (`claim_ticket` / `move_ticket`, see the `claim_move_rpc` migration) that lock the
   row and write the activity log in the same transaction — the conditional-update
   invariant below is preserved and strengthened. Reference SQL:

```sql
UPDATE tickets
SET assigned_to = $user_id,
    claimed_at = now(),
    status = 'in_progress',
    agent_name = $agent_name,
    agent_run_id = $agent_run_id,
    harness_name = $harness_name,
    updated_at = now()
WHERE id = $ticket_id
  AND status = 'open'
  AND assigned_to IS NULL
RETURNING *;
```

3. If the update returns **0 rows**:
   - already assigned to another user → `"Ticket already claimed"`
   - status is not `open` (and not the idempotent path below) → `"Ticket not claimable"`
4. On success: write `activity_log` entry `ticket_claimed`.
5. **Idempotent re-claim:** if the ticket is already `assigned_to = $user_id` and status is `in_progress`, return the current ticket with no error and **do not** write a duplicate `ticket_claimed` activity.

**Unclaim (via move only):** when `move_ticket` (or UI move) sets status to `open` or `backlog` and the ticket was claimed, clear `assigned_to`, `claimed_at`, `agent_name`, `agent_run_id`, and `harness_name`. Leave `branch_name` unchanged. Write `ticket_unclaimed`.

---

## 9. Data Model (summary)

See `01-database-schema.md` for full SQL.

**Tables**
- `projects` (+ GitHub binding fields)
- `tickets` (+ ownership, agent, PR metadata fields)
- `comments`
- `activity_log`
- `project_members` (table exists; RLS not membership-gated in MVP)
- `api_keys` (Phase 2 — personal keys for MCP)

---

## 10. Tech Stack

| Layer | Choice |
|-------|--------|
| Frontend + API | Next.js 15 (App Router) + TypeScript |
| Hosting | Vercel |
| Database + Auth | Supabase (Postgres + Auth) |
| UI | Tailwind + shadcn/ui |
| Validation | Zod |
| MCP Server | TypeScript (Node / Vercel function) |

---

## 11. Implementation Phases

### Phase 1 — Foundation
1. Supabase schema (projects, tickets with claim/agent/PR fields, comments, activity_log, project_members)
2. Next.js + Auth (magic link + Google); invite-only / private signup posture
3. Projects + GitHub binding fields
4. **Service layer** for create / claim / move / activity (before or with first ticket mutations)
5. Tickets CRUD + **claim** action (atomic)
6. Activity log on create / claim / unclaim-via-move / status change / comment
7. Kanban board (5 columns) + ticket detail with **comments + activity timeline**
8. Create always → backlog; claim only from open; soft move guardrails in UI

### Phase 2 — Agent surface
1. API routes hardened with Zod
2. Personal API keys (create/revoke in UI; Bearer auth for MCP)
3. MCP server with all tools including `claim_ticket`
4. Harness / agent fields visible on cards and detail (if not already)
5. End-to-end test with at least one coding agent

### Phase 3 — GitHub automation
1. Populate PR metadata from agent or webhook
2. GitHub webhooks:
   - PR opened → `pr_review`
   - PR merged → `complete` **and** set `merged_at` (and related merge fields)
   - PR closed without merge → return to `open` (clears claim fields per unclaim rules)
3. Optional worktree / branch helpers

---

## 12. Design Principles

1. **Agent-first, human-friendly** — Every important action works via UI *and* MCP.
2. **AgentSmith owns work state** — GitHub owns code.
3. **Humans approve; agents implement.**
4. **Claim before implement** — Ownership is explicit and deterministic.
5. **Deterministic over clever** — No hidden magic; everything is observable via activity log.
6. **Boring technology** — Prefer proven, simple patterns.
7. **Minimal ceremony** — Required fields stay small (title, description, type).

---

## 13. Future (documented, not in MVP)

- GitHub App + `github_installation_id`
- Worktree path per claimed ticket
- Agent heartbeat / `agent_status` (`planning` | `coding` | `waiting` | `review` | `idle`)
- Full project membership RLS
- Buzz or other collaboration layer (optional; not core)

---

## 14. Success Metrics (MVP)

- Non-technical user creates a ticket in < 30 seconds.
- After a ticket is **open**, agent can list → claim → get → update → move using only MCP tools.
- Two agents cannot successfully claim the same open ticket (atomic claim).
- Full loop (create → open → claim → implement → PR review → complete) usable within the first week of deployment.

---

**End of PRD v1.2**

This document is intentionally detailed so coding agents can implement Phase 1 with minimal clarification. Prefer finishing Phase 1 completely before starting Phase 2.
