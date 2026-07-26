# AgentSmith

Lightweight, agent-first Kanban board for small teams shipping with AI coding agents.

Non-technical stakeholders create tickets. Developers pull them into coding agents (Grok Build, Claude Code, Cursor, etc.) via MCP, scope the work, and move tickets through a simple pipeline ending in a reviewed & merged PR.

## Docs

See the [docs/](./docs/) folder for the full Product Requirements Document and implementation specs:

- [PRD.md](./docs/PRD.md) — master requirements
- [01-database-schema.md](./docs/01-database-schema.md) — Supabase schema
- [02-mcp-and-api.md](./docs/02-mcp-and-api.md) — MCP tools & API
- [03-ui-and-implementation.md](./docs/03-ui-and-implementation.md) — UI & build order

## Stack (planned)

- Next.js 15 (App Router) + TypeScript
- Vercel
- Supabase (Postgres + Auth)
- Tailwind + shadcn/ui
- Zod

## Status

PRD complete. Implementation starting with Phase 1.
