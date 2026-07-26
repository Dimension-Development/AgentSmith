# AgentSmith

Lightweight, agent-first Kanban board for small teams shipping with AI coding agents.

> The agent-native change request queue that turns stakeholder requests into reviewed pull requests.

Non-technical stakeholders create tickets. Developers and coding agents **claim** them, implement in tools like Grok Build, Claude Code, or Cursor, open a PR, and move work to complete.

## Systems of record

| Concern | System |
|---------|--------|
| Work state | **AgentSmith** |
| Code | **GitHub** |
| Execution | Coding agents |

## Workflow

```
Stakeholder → Backlog → Open → Claim → In Progress → PR Review → Complete
```

- New tickets start in **backlog**; promote to **open** when ready for agents.
- **Claim** is an action (not a column): only from `open`, atomic, sets ownership.
- Local agents auth to AgentSmith MCP with a **personal API key** (acts as that user). Keys are for AgentSmith APIs, not GitHub. (Phase 2)

## Quick start (local)

### Prerequisites

- Node.js 20+
- Docker running
- [Supabase CLI](https://supabase.com/docs/guides/cli) (`brew install supabase/tap/supabase`)

### Run

```bash
npm install
npm run db:start    # Docker stack + apply migrations
npm run db:env      # write .env.local from local keys
npm run dev         # http://127.0.0.1:3000
```

Run the integration tests (requires the local stack; REST smoke tests also want `npm run dev` running):

```bash
npm run test
```

| Tool | URL |
|------|-----|
| App | http://127.0.0.1:3000 |
| Supabase Studio | http://127.0.0.1:54323 |
| Mailpit (magic links) | http://127.0.0.1:54324 |

Sign in with the seed admin (after `db:reset` / first start with seed):

- **Email:** `admin@agentsmith.local`  
- **Password:** `admin123`  

Or use **magic link** and open Mailpit (http://127.0.0.1:54324). Stop the DB with `npm run db:stop`.

### Database changes

See **[docs/database.md](./docs/database.md)** for the full workflow:

```bash
npm run db:new -- describe_change   # new migration file
# edit supabase/migrations/<timestamp>_describe_change.sql
npm run db:reset                    # reapply all migrations locally
# PR → then on hosted: supabase link && npm run db:push
```

## Stack

- Next.js 15 (App Router) + TypeScript
- Vercel (target host)
- Supabase (Postgres + Auth) — local Docker for dev, hosted for deploy
- Tailwind CSS + Radix UI primitives
- Zod

## Docs

- **[AGENTS.md](./AGENTS.md)** — instructions for coding agents (repo map, claim rules, MCP, conventions)

See [docs/](./docs/) for the full Product Requirements Document and implementation specs:

- [PRD.md](./docs/PRD.md) — master requirements (v1.2)
- [01-database-schema.md](./docs/01-database-schema.md) — Supabase schema
- [02-mcp-and-api.md](./docs/02-mcp-and-api.md) — MCP tools & API (includes claim)
- [03-ui-and-implementation.md](./docs/03-ui-and-implementation.md) — UI & build order
- [database.md](./docs/database.md) — local Supabase + migration workflow

## MCP (agents)

1. Create a personal key under **API keys** in the app (`/settings/api-keys`).
2. Connect — see [docs/mcp.md](./docs/mcp.md) for both options:

**HTTP (recommended, zero install):** point any MCP client at
`http://127.0.0.1:3000/api/mcp` with `Authorization: Bearer asm_…`.

**stdio bridge (local/offline):**

```bash
export AGENTSMITH_API_URL=http://127.0.0.1:3000
export AGENTSMITH_API_KEY=asm_…
npm run mcp
```

## Status

**Phase 1 + 2 complete, hardened:** App, Supabase Docker, transactional claim/move
(Postgres functions), service-layer authorization with read-only RLS backstop, personal
API keys, MCP over stdio **and** HTTP (`/api/mcp`), live board (Realtime), integration
test suite (`npm run test`), hosted-deploy hardening (see
[docs/database.md](./docs/database.md) deploy checklist).

**Not yet:** Hosted deploy itself, GitHub webhooks (Phase 3), project CRUD UI.
Deferred polish is tracked in [docs/plans/06-product-polish.md](./docs/plans/06-product-polish.md).
