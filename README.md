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

## Quick start (Phase 1)

### 1. Install

```bash
npm install
cp .env.example .env.local
```

### 2. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Copy **Project URL** and **anon key** into `.env.local`.
3. Run the SQL in `supabase/migrations/001_initial.sql` (SQL Editor → New query → Run).
4. Auth → URL configuration:
   - Site URL: `http://localhost:3000`
   - Redirect URLs: `http://localhost:3000/auth/callback`
5. Enable **Email** (magic link) and optionally **Google** OAuth.
6. Prefer **invite-only** / disable public signups for private MVP.

### 3. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign in, create tickets on the board.

## Stack

- Next.js 15 (App Router) + TypeScript
- Vercel (target host)
- Supabase (Postgres + Auth)
- Tailwind CSS + Radix UI primitives
- Zod

## Docs

See [docs/](./docs/) for the full Product Requirements Document and implementation specs:

- [PRD.md](./docs/PRD.md) — master requirements (v1.2)
- [01-database-schema.md](./docs/01-database-schema.md) — Supabase schema
- [02-mcp-and-api.md](./docs/02-mcp-and-api.md) — MCP tools & API (includes claim)
- [03-ui-and-implementation.md](./docs/03-ui-and-implementation.md) — UI & build order

## Status

**Phase 1 in progress:** Next.js app, schema migration, service layer (create / claim / move / comments / activity), auth (magic link + Google), Kanban board, ticket detail.

**Not yet:** MCP server, personal API keys UI (Phase 2), GitHub webhooks (Phase 3).
