# AgentSmith.dev — PRD Package (v1.2)

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

- Agents are first-class users (via personal API keys on MCP).
- Tickets are **claimed** before implementation (`open` only).
- Ticket ownership is explicit (`assigned_to` = human key owner + agent metadata).
- AgentSmith owns work state; GitHub owns code.

## Files

| File | Purpose |
|------|---------|
| `PRD.md` | Master product requirements (v1.2) — start here |
| `01-database-schema.md` | Supabase / Postgres schema + RLS + claim SQL |
| `02-mcp-and-api.md` | MCP tool contracts + API routes (includes `claim_ticket`) |
| `03-ui-and-implementation.md` | UI requirements, folder structure, build order |

## How to use with Grok Build (or other agents)

1. Point the agent at this `docs/` folder (or the whole repo).
2. Start with `PRD.md` and `01-database-schema.md`.
3. Implement **Phase 1** completely before Phase 2.
4. When building MCP, follow `02-mcp-and-api.md` strictly (especially atomic `claim_ticket`).

### Suggested first prompt

```
Read the entire docs/ folder, especially PRD.md and 01-database-schema.md (v1.2).

Implement Phase 1 of AgentSmith:
- Supabase schema (including claim fields, activity_log, project_members)
- Next.js App Router + TypeScript + Tailwind + shadcn/ui
- Supabase Auth (magic link + Google); private/invite-only posture
- Projects + GitHub binding fields
- Service layer first: create, claim (atomic conditional UPDATE), move (soft guardrails), activity
- Tickets CRUD + claim action (only from open)
- Create always lands in backlog; promote to open via move
- Moving to open/backlog clears claim fields and logs ticket_unclaimed
- Activity log on create / claim / unclaim / status change / every comment
- Kanban board with five columns
- Ticket detail with comments thread + activity timeline

Follow the implementation order in 03-ui-and-implementation.md.
Do not implement the MCP server or API keys yet (Phase 2).
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
`open` → `in_progress` is not allowed via bare move — use claim.

## v1.2 locks (summary)

- Personal API key → human user → `assigned_to`
- Create → backlog; claim only from open
- Unclaim = move to open/backlog
- Atomic claim SQL; idempotent same-user re-claim
- `merged_at` only on real PR merge
- Comments + activity UI in Phase 1

---

**Project:** AgentSmith.dev  
**PRD version:** 1.2  
**Date:** 2026-07-26
