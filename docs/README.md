# AgentSmith.dev — PRD Package (v1.1)

This folder contains the complete Product Requirements Document and supporting specifications for **AgentSmith.dev**.

It is written so that a coding agent (Grok Build, Claude Code, Cursor, etc.) can implement the MVP with minimal additional questions.

## Positioning

> The agent-native change request queue that turns stakeholder requests into reviewed pull requests.

**Workflow**

```
Stakeholder
    ↓
Backlog → Open
    ↓
Claim Ticket
    ↓
In Progress (planning + implementation)
    ↓
PR Review
    ↓
Complete
```

- Agents are first-class users.
- Tickets are **claimed** before implementation.
- Ticket ownership is explicit.
- AgentSmith owns work state; GitHub owns code.

## Files

| File | Purpose |
|------|---------|
| `PRD.md` | Master product requirements (v1.1) — start here |
| `01-database-schema.md` | Supabase / Postgres schema + RLS |
| `02-mcp-and-api.md` | MCP tool contracts + API routes (includes `claim_ticket`) |
| `03-ui-and-implementation.md` | UI requirements, folder structure, build order |

## How to use with Grok Build (or other agents)

1. Point the agent at this `docs/` folder (or the whole repo).
2. Start with `PRD.md` and `01-database-schema.md`.
3. Implement **Phase 1** completely before Phase 2.
4. When building MCP, follow `02-mcp-and-api.md` strictly (especially `claim_ticket`).

### Suggested first prompt

```
Read the entire docs/ folder, especially PRD.md and 01-database-schema.md.

Implement Phase 1 of AgentSmith:
- Supabase schema (including claim fields, activity_log, project_members)
- Next.js App Router + TypeScript + Tailwind + shadcn/ui
- Supabase Auth (magic link + Google)
- Projects + GitHub binding fields
- Tickets CRUD + claim action
- Activity log on key events
- Basic Kanban board with five columns
- Thin service layer for ticket operations

Follow the implementation order in 03-ui-and-implementation.md.
Do not implement the MCP server yet.
```

## Stack (locked)

- Next.js 15 (App Router) + TypeScript
- Vercel
- Supabase (Postgres + Auth)
- Tailwind + shadcn/ui
- Zod

## Status Columns (fixed)

`backlog` → `open` → `in_progress` → `pr_review` → `complete`

Claim is an **action** (not a column). Claiming an `open` ticket moves it to `in_progress`.

---

**Project:** AgentSmith.dev  
**PRD version:** 1.1  
**Date:** 2026-07-26
