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
- Local agents auth to AgentSmith MCP with a **personal API key** (acts as that user). Keys are for AgentSmith APIs, not GitHub.

## Docs

See [docs/](./docs/) for the full Product Requirements Document and implementation specs:

- [PRD.md](./docs/PRD.md) — master requirements (v1.2)
- [01-database-schema.md](./docs/01-database-schema.md) — Supabase schema
- [02-mcp-and-api.md](./docs/02-mcp-and-api.md) — MCP tools & API (includes claim)
- [03-ui-and-implementation.md](./docs/03-ui-and-implementation.md) — UI & build order

## Stack (planned)

- Next.js 15 (App Router) + TypeScript
- Vercel
- Supabase (Postgres + Auth)
- Tailwind + shadcn/ui
- Zod

## Status

PRD v1.2 complete (claim, auth, and lifecycle rules locked). Ready for Phase 1 implementation.
