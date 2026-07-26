# AgentSmith.dev — PRD Package

This folder contains the complete Product Requirements Document and supporting specifications for **AgentSmith.dev**.

It is written so that a coding agent (Grok Build, Claude Code, Cursor, etc.) can implement the MVP with minimal additional questions.

## Files

| File | Purpose |
|------|---------|
| `PRD.md` | Master product requirements document — start here |
| `01-database-schema.md` | Exact Supabase / Postgres schema + RLS |
| `02-mcp-and-api.md` | MCP tool contracts + suggested API routes |
| `03-ui-and-implementation.md` | UI requirements, folder structure, implementation order |

## How to use with Grok Build (or other agents)

1. Open this folder (or copy the contents) into your repository.
2. Point the agent at `PRD.md` first.
3. Tell it to implement **Phase 1** completely before moving to Phase 2.
4. When it reaches the MCP work, have it follow `02-mcp-and-api.md` strictly.

### Suggested first prompt for Grok Build

```
Read the entire docs/ folder, especially PRD.md and 01-database-schema.md.

Implement Phase 1 of AgentSmith:
- Supabase schema
- Next.js App Router + TypeScript + Tailwind + shadcn/ui
- Supabase Auth (magic link + Google)
- Projects + Tickets CRUD
- Basic Kanban board with the five fixed columns
- Manual status movement

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

---

**Project name:** AgentSmith.dev  
**PRD version:** 1.0  
**Date:** 2026-07-26
