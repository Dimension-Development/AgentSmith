# AgentSmith.dev — Product Requirements Document (PRD)

**Version:** 1.1  
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

## 2. Design decisions since v1.0

| Decision | Reason |
|----------|--------|
| Explicit ticket **claiming** | Deterministic ownership when multiple agents (or agent + human) are active |
| Separate `activity_log` | Machine-readable audit trail; comments stay human discussion |
| Project → GitHub binding | Every project knows where its code lives |
| Richer GitHub PR metadata | Makes future webhooks trivial |
| Agent / harness tracking | Trace which agent performed the work |
| Service layer | Shared business rules for REST, MCP, and later webhooks |
| Board columns stay simple | Claim is an *action*; board stays clear for non-technical users |

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

### 3. Coding Agent (via MCP)
- Needs structured tools to list, **claim**, read, update, and move tickets.
- Must receive clean context and leave an auditable trail.

---

## 5. Core User Flows

### Flow A — Requester creates a ticket
1. Log in (magic link or Google).
2. Select a project.
3. Create ticket: Title, Description, Type (Feature / Bug).
4. Ticket lands in **Backlog** (or **Open**).

### Flow B — Agent claims and works a ticket
1. Agent (or human) lists open tickets.
2. Agent calls **`claim_ticket`** → ticket is assigned, `claimed_at` set, status → `in_progress`, activity logged.
3. Agent gets full ticket context.
4. Agent scopes work, writes plan via `add_comment` / `update_ticket` (checklist).
5. Implementation happens in the coding agent + git (branch recorded on ticket).
6. When PR is opened → ticket moved to **PR Review** (manual in MVP; webhook later).
7. After merge → ticket moved to **Complete**.

### Flow C — Human review on the board
- Operator sees status, assignee, agent/harness, activity, and comments.
- Can move tickets or re-assign if needed.

---

## 6. Ticket Lifecycle (board columns)

**Visible board columns (fixed for MVP):**

```
backlog → open → in_progress → pr_review → complete
```

| Status | Meaning |
|--------|---------|
| `backlog` | Ideas / not yet ready to pick up |
| `open` | Ready to be claimed |
| `in_progress` | Claimed and actively being worked |
| `pr_review` | PR is open, waiting for human review |
| `complete` | Merged / done |

**Claim is an action, not a separate column.**  
Calling `claim_ticket` on an `open` ticket moves it to `in_progress` and records ownership.

Planning may be recorded as a system activity / comment; it does not need its own column in MVP.

---

## 7. MVP Feature Set

### 7.1 Authentication
- Supabase Auth (Magic Link + Google OAuth).
- Simple role model for MVP: authenticated members can create, view, comment, claim, and move.
- Target model (document now, enforce later): `owner` | `developer` | `requester` | `viewer` via `project_members`.

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
- `status` (see lifecycle above)
- `created_by`, `created_at`, `updated_at`

**Ownership / agent fields**
- `assigned_to` (uuid, nullable)
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
- `merged_at` (timestamptz, nullable)

**Other**
- `checklist` (jsonb, default `[]`)

### 7.4 Comments vs Activity
- **Comments** = human (and optional agent) discussion threads.
- **Activity log** = machine-readable audit trail (created, claimed, status changed, PR linked, merged, etc.).
- Do **not** store activity as comments.

### 7.5 Board UI
- Five columns matching statuses.
- Cards show: title, type badge, assignee/agent indicator, comment count.
- Detail view: description, comments, activity timeline, claim/move controls, PR metadata.
- Create ticket form (title, description, type).
- Project switcher.

### 7.6 MCP Server (Critical)
Core tools:

| Tool | Purpose |
|------|---------|
| `list_tickets` | List tickets (filter by project + status) |
| `get_ticket` | Full ticket + comments + recent activity |
| `create_ticket` | Create ticket |
| `update_ticket` | Partial update (description, checklist, branch, PR fields, etc.) |
| `add_comment` | Human or system comment |
| `claim_ticket` | **Atomically claim** an open ticket |
| `move_ticket` | Change status (with validation) |

### 7.7 API + Service Layer
```
API Routes  →  Services  →  Repositories  →  Database
```
All status transitions, claim rules, and permissions live in **Services** so REST, MCP, and future webhooks share the same logic.

---

## 8. Claim Rules (normative)

`claim_ticket` input:
- `ticket_id` (required)
- `agent_name` (required for agents)
- `agent_run_id` (optional)
- `harness_name` (optional)

Rules:
1. Ticket must be in `open` (optionally allow `backlog` if product decides).
2. If already claimed by another assignee → return clear error.
3. On success:
   - set `assigned_to`, `claimed_at`, agent/harness fields
   - set status → `in_progress`
   - write `activity_log` entry (`ticket_claimed`)
4. Re-claim by the same agent/run may be treated as idempotent.

---

## 9. Data Model (summary)

See `01-database-schema.md` for full SQL.

**Tables**
- `projects` (+ GitHub binding fields)
- `tickets` (+ ownership, agent, PR metadata fields)
- `comments`
- `activity_log` (new)
- `project_members` (new; light enforcement in MVP)

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
2. Next.js + Auth (magic link + Google)
3. Projects + GitHub binding fields
4. Tickets CRUD + **claim** action
5. Activity log written on key events
6. Basic Kanban board (5 columns)
7. Thin service layer for ticket operations

### Phase 2 — Agent surface
1. API routes hardened with Zod
2. MCP server with all tools including `claim_ticket`
3. API key auth for MCP
4. Comments + harness tracking visible in UI
5. End-to-end test with at least one coding agent

### Phase 3 — GitHub automation
1. Populate PR metadata from agent or webhook
2. GitHub webhooks:
   - PR opened → `pr_review`
   - PR merged → `complete`
   - PR closed without merge → return to `open` (or `in_progress`)
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
- Agent can list → claim → get → update → move using only MCP tools.
- Two agents cannot successfully claim the same open ticket.
- Full loop (create → claim → implement → PR review → complete) usable within the first week of deployment.

---

**End of PRD v1.1**

This document is intentionally detailed so coding agents can implement Phase 1 with minimal clarification. Prefer finishing Phase 1 completely before starting Phase 2.
