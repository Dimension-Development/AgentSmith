# AgentSmith.dev — Product Requirements Document (PRD)

**Version:** 1.0  
**Date:** 2026-07-26  
**Status:** MVP  
**Owner:** [Your Name]  
**Target consumers:** Grok Build / Claude Code / Cursor agents  

---

## 1. Vision

AgentSmith is a lightweight, agent-first Kanban board for small teams (especially 1–3 people) who ship software with AI coding agents.

Non-technical stakeholders create feature requests and bug reports.  
Developers (or “vibe coders”) pull those tickets into coding agents (Grok Build, Claude Code, Cursor, etc.) via MCP, scope the work, update the ticket, and move it through a simple pipeline that ends with a reviewed & merged PR.

The board is the single source of truth for work. Agents are first-class citizens that can read, write, and move tickets.

**Tagline:** *The Kanban board that agents actually use.*

---

## 2. Goals

### Primary Goals (MVP)
1. Non-technical users can create clear tickets in under 30 seconds.
2. A coding agent can discover open tickets, pull full context, update the ticket with a plan, and move it between columns via MCP.
3. The human developer can see ticket status and activity at a glance.
4. The core loop (Create → Scope → Implement → PR Review → Complete) works end-to-end with minimal friction.

### Secondary Goals (post-MVP)
- Automatic status transitions driven by GitHub PR events.
- Support for multiple parallel agents / worktrees.
- Richer ticket fields, checklists, attachments, and activity history.
- Real-time board updates.
- Multi-project support with clean isolation.

### Non-Goals (explicitly out of scope for MVP)
- Full project management suite (roadmaps, sprints, velocity charts, time tracking).
- Complex workflow engines or custom statuses per project.
- Mobile-native apps.
- Multi-tenant SaaS with billing.
- Built-in code review or CI.

---

## 3. Personas

### 1. Non-Technical Stakeholder (“Requester”)
- Product person, designer, founder, client, or domain expert.
- Wants to request features or report bugs without learning developer tools.
- Needs a dead-simple form and clear visibility of progress.

### 2. Developer / Vibe Coder (“Operator”)
- Uses AI coding agents heavily (Grok Build, Claude Code, Cursor, etc.).
- Wants to pull work into the agent, scope it, keep the ticket updated, and ship.
- Prefers keyboard + agent over clicking around a heavy UI.

### 3. Coding Agent (via MCP)
- Needs structured, reliable tools to list, read, update, and move tickets.
- Must receive clean context (title, description, acceptance criteria, comments, status).

---

## 4. Core User Flows

### Flow A — Requester creates a ticket
1. Log in (magic link or Google).
2. Select a project (or default project).
3. Click “New Ticket”.
4. Fill: Title, Description, Type (Feature / Bug).
5. Submit → Ticket appears in **Backlog** (or **Open**).

### Flow B — Operator + Agent scopes and works a ticket
1. Operator opens AgentSmith board or asks agent: “Show me open tickets in project X”.
2. Agent uses MCP `list_tickets` → returns summary.
3. Operator: “Work on ticket #42”.
4. Agent uses `get_ticket` → receives full context.
5. Agent (or human) scopes the work, writes a plan.
6. Agent uses `update_ticket` + `add_comment` to record the plan / checklist.
7. Agent (or human) moves ticket to **In Progress** via `move_ticket`.
8. Implementation happens in the coding agent + git.
9. When PR is opened, ticket is moved to **PR Review** (manual in MVP).
10. After merge, ticket is moved to **Complete**.

### Flow C — Human review on the board
- Operator opens the board, filters by project/status, reads comments, moves tickets manually if needed.

---

## 5. MVP Feature Set

### 5.1 Authentication
- Supabase Auth
- Supported methods: Magic Link (email) + Google OAuth
- Simple role model for MVP:
  - `member` (can create tickets, view, comment, move)
  - Future: `admin`, `viewer`

### 5.2 Projects
- A project is a container for tickets.
- Fields: `id`, `name`, `slug`, `description` (optional), `created_at`
- MVP: Support multiple projects, but start with one default project.
- User can switch projects via simple selector.

### 5.3 Tickets
**Required fields**
- `id` (UUID)
- `project_id`
- `title` (string, max 200)
- `description` (markdown text)
- `type` (enum: `feature` | `bug`)
- `status` / column (enum — see below)
- `created_by` (user id)
- `created_at`, `updated_at`

**Optional / nice-to-have in MVP**
- `github_pr_url` (string, nullable)
- `priority` (low / medium / high) — can be deferred
- Simple checklist stored as JSONB

**Status / Columns (fixed for MVP)**
```
backlog → open → in_progress → pr_review → complete
```

- `backlog`: Ideas / not yet ready
- `open`: Ready to be picked up
- `in_progress`: Agent or human is actively working
- `pr_review`: PR is open, waiting for human review
- `complete`: Merged / done

### 5.4 Board UI
- Kanban-style columns matching the statuses above.
- Cards show: title, type badge, short description preview, comment count.
- Click card → detail drawer or page with full description, comments, activity, move buttons.
- Create ticket button (prominent).
- Project switcher.
- Very clean, minimal design (prefer shadcn/ui + Tailwind).

### 5.5 Comments / Activity
- Simple comment thread on each ticket.
- System can also write activity entries (e.g. “moved to In Progress by AgentSmith MCP”).
- Markdown support preferred.

### 5.6 MCP Server (Critical)
Expose the following tools (exact names preferred):

| Tool              | Description                                      | Key Parameters                          |
|-------------------|--------------------------------------------------|-----------------------------------------|
| `list_tickets`    | List tickets for a project, optionally filtered by status | `project_id` or `project_slug`, `status?` |
| `get_ticket`      | Get full ticket + comments                       | `ticket_id`                             |
| `create_ticket`   | Create a new ticket (mainly for agents)          | `project_id`, `title`, `description`, `type` |
| `update_ticket`   | Update title, description, checklist, pr_url etc.| `ticket_id`, partial fields             |
| `add_comment`     | Add a comment to a ticket                        | `ticket_id`, `body`                     |
| `move_ticket`     | Change status/column                             | `ticket_id`, `status`                   |

- Authentication for MCP: API key or service token scoped to a user/project.
- All tools must return clear, structured JSON that coding agents can reason over.
- Prefer calling Next.js API routes rather than talking directly to Supabase from the MCP (keeps business logic centralized).

### 5.7 API Layer
Next.js Route Handlers (App Router) under `/api/...` that power both the frontend and the MCP.

Suggested routes:
- `GET /api/projects`
- `GET /api/projects/[id]/tickets`
- `POST /api/tickets`
- `GET /api/tickets/[id]`
- `PATCH /api/tickets/[id]`
- `POST /api/tickets/[id]/comments`
- `POST /api/tickets/[id]/move`

All routes protected by Supabase Auth (or API key for MCP).

---

## 6. Data Model (Supabase / Postgres)

```sql
-- projects
create table projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  created_at timestamptz default now()
);

-- tickets
create table tickets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade not null,
  title text not null check (char_length(title) <= 200),
  description text not null default '',
  type text not null check (type in ('feature', 'bug')),
  status text not null default 'backlog'
    check (status in ('backlog', 'open', 'in_progress', 'pr_review', 'complete')),
  github_pr_url text,
  checklist jsonb default '[]'::jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- comments
create table comments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid references tickets(id) on delete cascade not null,
  author_id uuid references auth.users(id),
  body text not null,
  is_system boolean default false, -- true for agent/system messages
  created_at timestamptz default now()
);

-- Optional: simple activity log (can be derived from comments + status changes initially)
```

**Indexes**
- `tickets(project_id, status)`
- `tickets(created_at desc)`
- `comments(ticket_id, created_at)`

**Row Level Security (RLS)**
- Authenticated users can read/write tickets and comments in projects they belong to.
- For MVP, a simple policy that allows all authenticated users is acceptable if the deployment is private.
- Service role / API key used by MCP should be carefully scoped.

---

## 7. Tech Stack

| Layer            | Choice                          | Notes |
|------------------|----------------------------------|-------|
| Frontend + API   | Next.js 15 (App Router)         | TypeScript |
| Hosting          | Vercel                          | Edge + Serverless |
| Database + Auth  | Supabase                        | Postgres + Auth + (later) Realtime |
| UI               | Tailwind + shadcn/ui            | Clean, modern, accessible |
| MCP Server       | TypeScript (Node)               | Can start as Vercel serverless function or separate small service |
| Validation       | Zod                             | Shared between API and MCP |
| Markdown         | react-markdown or similar       | For ticket descriptions & comments |

**Future-friendly choices already in place**
- Clean separation of API routes → easy to add GitHub webhooks later.
- JSONB checklist field → can grow into richer structures.
- Status as simple enum → can later support custom workflows if needed.
- MCP tools are additive.

---

## 8. Non-Functional Requirements

- **Performance**: Board should load in < 1.5 s for a project with ≤ 200 tickets.
- **Reliability**: API and MCP tools must return clear error messages (not silent failures).
- **Security**: No public write access. Auth required. MCP uses scoped tokens.
- **Developer Experience**: Clear TypeScript types, Zod schemas, and good error messages so coding agents can self-correct.
- **Extensibility**: Adding a new ticket field or MCP tool should not require major refactors.

---

## 9. Success Metrics (MVP)

- A non-technical user can create a ticket in < 30 seconds.
- An agent can list tickets, read one, update it with a plan, and move it using only MCP tools.
- The full loop (create → scope → implement → PR Review → Complete) is usable by the two-person team within the first week of deployment.
- Zero critical data loss or permission bugs in the first month.

---

## 10. Implementation Phases (suggested for agents)

### Phase 1 — Foundation
1. Supabase project + tables + basic RLS
2. Next.js app with Auth (magic link + Google)
3. Project model + simple project switcher
4. Ticket CRUD (create, list, detail, update)
5. Manual status movement
6. Basic Kanban board UI

### Phase 2 — Agent Interface
1. API routes fully hardened with Zod
2. MCP server exposing the 6 core tools
3. API key / token auth for MCP
4. Test end-to-end with Grok Build / Claude Code / Cursor

### Phase 3 — Polish & Extensibility Hooks
1. Comments + simple activity
2. GitHub PR URL field
3. Better empty states, loading states, error handling
4. Seed data / demo project

---

## 11. Design Principles

1. **Agent-first, human-friendly** — Every important action must be possible via MCP *and* via the UI.
2. **Boring technology** — Prefer proven, simple patterns over clever ones.
3. **Minimal ceremony** — No required fields beyond title + description + type.
4. **Clear status language** — Column names should be obvious to both humans and agents.
5. **Single source of truth** — The board is the system of record; git/PRs are the execution layer.

---

## 12. Open Questions / Decisions for later

- Exact authentication story for MCP (personal API keys vs project tokens).
- Whether to support sub-tickets / parent-child in v1.1.
- How aggressively to auto-move tickets from GitHub webhooks.
- Whether to store agent session IDs or run IDs on the ticket for traceability.

---

## 13. Appendix — Example MCP Tool Contracts (for implementers)

```typescript
// list_tickets
{
  name: "list_tickets",
  description: "List tickets in a project. Optionally filter by status.",
  input: {
    project_id?: string,      // UUID
    project_slug?: string,    // alternative
    status?: "backlog" | "open" | "in_progress" | "pr_review" | "complete"
  },
  output: {
    tickets: Array<{
      id: string,
      title: string,
      type: "feature" | "bug",
      status: string,
      created_at: string,
      updated_at: string
    }>
  }
}

// get_ticket
{
  name: "get_ticket",
  description: "Get full details of a ticket including comments.",
  input: { ticket_id: string },
  output: {
    id, title, description, type, status,
    github_pr_url, checklist, created_at, updated_at,
    comments: Array<{ id, body, is_system, created_at, author_name? }>
  }
}

// move_ticket
{
  name: "move_ticket",
  description: "Move a ticket to a new status/column.",
  input: {
    ticket_id: string,
    status: "backlog" | "open" | "in_progress" | "pr_review" | "complete"
  }
}

// update_ticket, add_comment, create_ticket follow the same clear, typed pattern.
```

---

**End of PRD**

This document is intentionally detailed so that a coding agent (Grok Build, Claude Code, Cursor, etc.) can implement the MVP with minimal additional clarification. Prefer implementing Phase 1 completely before starting Phase 2.
