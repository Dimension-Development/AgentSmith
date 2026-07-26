# AGENTS.md — Guide for coding agents

This file is for AI coding agents (Claude Code, Cursor, Grok Build, Codex, etc.) working **on** the AgentSmith codebase or **with** AgentSmith as a work queue via MCP.

Humans: start with [README.md](./README.md). Full product rules: [docs/PRD.md](./docs/PRD.md).

---

## What this project is

AgentSmith is an **agent-first Kanban** for small teams. It owns **work state** (tickets, claim, status). **GitHub** owns code. **Coding agents** execute implementation.

```
Stakeholder → Backlog → Open → Claim → In Progress → PR Review → Complete
```

- **Claim is an action**, not a column. Claiming moves `open` → `in_progress`.
- New tickets always start in **`backlog`**. Promote with `move_ticket` / UI before claim.
- Do **not** turn AgentSmith into Slack or GitHub.

---

## Repo map

| Path | Role |
|------|------|
| `app/` | Next.js App Router (UI + API routes) |
| `components/` | React UI (board, settings, primitives) |
| `lib/services/` | **Business rules** (claim, move, activity) — single source of truth |
| `lib/auth/` | Session + Bearer API key resolution |
| `lib/supabase/` | Browser, server, admin (service role) clients |
| `lib/validations/` | Zod schemas |
| `mcp/server.ts` | Stdio MCP bridge → REST API |
| `supabase/migrations/` | Versioned SQL (source of truth for schema) |
| `supabase/seed.sql` | Local seed (admin user, etc.) |
| `docs/` | PRD, schema, MCP, database workflow |

Architecture:

```
UI / MCP → API routes → Services → Supabase (Postgres)
```

Never put claim/status rules only in React components or raw route handlers. Change **services** first.

---

## Local environment (required for most work)

Prerequisites: Node 20+, Docker, Supabase CLI.

```bash
npm install
npm run db:start    # local Supabase (Docker)
npm run db:env      # writes .env.local (includes SERVICE_ROLE_KEY)
npm run dev         # http://127.0.0.1:3000
```

| Service | URL |
|---------|-----|
| App | http://127.0.0.1:3000 |
| Studio | http://127.0.0.1:54323 |
| Mailpit | http://127.0.0.1:54324 |
| API | http://127.0.0.1:54321 |

**Seed admin (local only):** `admin@agentsmith.local` / `admin123`  
(After `db:reset` or first start with seed.)

Only one local Supabase stack can use default ports (`54321`–`54324`) at a time.

---

## Database changes

1. `npm run db:new -- short_description`
2. Edit `supabase/migrations/<timestamp>_*.sql`
3. `npm run db:reset` (reapplies all migrations + seed)
4. Never rewrite a migration already applied on shared environments — add a new file
5. Hosted: `supabase link` + `npm run db:push`

Details: [docs/database.md](./docs/database.md).

---

## Normative product rules (do not “simplify” away)

These are locked in PRD v1.2:

1. **Create** → always `backlog`.
2. **Claim** only from `open`; atomic `UPDATE … WHERE status = 'open' AND assigned_to IS NULL`.
3. **`open` → `in_progress`** only via `claim_ticket`, not bare `move_ticket`.
4. Move to **`open` or `backlog`** clears claim fields and logs `ticket_unclaimed`.
5. Same assignee re-claim is **idempotent** (no duplicate activity).
6. **`merged_at`** only when a PR is actually merged — not merely because status is `complete`.
7. Every **comment** writes `activity_log` `comment_added`.
8. **`list_tickets`** requires `project_id` or `project_slug`.
9. Default project slug for local seed: **`default`** (not `agentsmith`).

---

## Using AgentSmith as a work queue (MCP)

Agents acting *on tickets* (not necessarily editing this repo) use MCP tools against a running app.

### Auth

- Personal API key (`asm_…`) from UI: **Settings → API keys** (`/settings/api-keys`).
- Key acts as the **human owner** (`assigned_to` / `actor_id`). Not a GitHub token.
- Env for the MCP server:
  - `AGENTSMITH_API_URL` — e.g. `http://127.0.0.1:3000`
  - `AGENTSMITH_API_KEY` — full `asm_…` secret

### Tools

`list_tickets` · `get_ticket` · `create_ticket` · `claim_ticket` · `update_ticket` · `add_comment` · `move_ticket`

### Suggested loop

```
list_tickets({ project_slug: "default", status: "open" })
claim_ticket({ ticket_id, agent_name: "<your agent>", harness_name: "claude-code" })
get_ticket({ ticket_id })
# implement in git
update_ticket / add_comment / move_ticket → pr_review → complete
```

Promote backlog → open before claim when needed.

Details: [docs/mcp.md](./docs/mcp.md).

### Claude Code project MCP

Project config lives in **`.mcp.json`** (gitignored). Do not commit API keys.

```bash
claude mcp add agentsmith \
  -s project \
  -e AGENTSMITH_API_URL=http://127.0.0.1:3000 \
  -e AGENTSMITH_API_KEY='asm_…' \
  -- npx tsx /absolute/path/to/AgentSmith/mcp/server.ts
```

App must be running for MCP tools to succeed.

---

## Coding conventions

- **TypeScript** strict; prefer clear names over cleverness.
- **Server Components** by default; Client Components only for interactivity.
- **Zod** on API inputs; structured JSON errors (`{ error: string }`).
- **Service layer** owns claim, move, unclaim-via-move, activity logging.
- API routes use `resolveRequestAuth` (session cookie **or** Bearer `asm_…`).
- Prefer small, focused PRs; match existing style in touched files.
- Do not add major dependencies without a clear need (stack is intentionally boring).

### Commands

```bash
npm run lint
npm run build          # needs env vars; .env.local from db:env is fine
npm run db:status
```

---

## Security — never commit

| Path / secret | Notes |
|---------------|--------|
| `.env.local` | Local Supabase keys |
| `.mcp.json` | Often contains `AGENTSMITH_API_KEY` |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only — never expose to browser or MCP clients |
| Full `asm_…` keys | Show once at creation; rotate if leaked into chat/logs |

Service role is used server-side only, behind API routes and the service layer. Agents authenticate with personal keys, not service role.

## Authorization model (Plan 03 decision)

The **service layer is the single authorization authority**. Both auth paths (browser
session and Bearer API key) resolve to a `userId` in `lib/auth/request-auth.ts` and use
the admin (service-role) client for data access, so REST and MCP traverse identical
service code. `lib/services/access.ts` (`requireProjectAccess` / `requireTicketAccess`)
is the choke point — when membership roles land, enforce them there and nowhere else.
RLS is a read-only backstop: authenticated users can read; direct table writes are
blocked (writes must go through services). Claim/move rules are transactional Postgres
functions (`claim_ticket` / `move_ticket`) — change them via migration, not in TS.

---

## Out of scope (for agents implementing features)

Unless a ticket explicitly asks:

- Multi-tenant billing / SaaS packaging  
- Mobile native apps  
- Built-in code review / CI product  
- Real-time chat (Buzz, etc.)  
- Full membership RLS (table exists; MVP RLS is open among authenticated users for private deploy)

Phase 3 (not required for local MVP): GitHub webhooks for PR status automation.

---

## When stuck

1. Read [docs/PRD.md](./docs/PRD.md) § claim rules and lifecycle.  
2. Read the matching service in `lib/services/`.  
3. Reproduce with `curl` + Bearer key or the board UI.  
4. Prefer the simpler fix that preserves claim atomicity and activity audit trail.

**Default project slug:** `default`.
