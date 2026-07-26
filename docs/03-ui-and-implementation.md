# AgentSmith — UI & Implementation Guidance

**Version:** 1.1

## Tech Stack (locked)

- **Framework:** Next.js 15 (App Router) + TypeScript
- **Hosting:** Vercel
- **Database & Auth:** Supabase
- **Styling:** Tailwind CSS + shadcn/ui
- **Validation:** Zod
- **Markdown:** `react-markdown` (or equivalent)

Do not introduce additional major dependencies unless clearly justified.

---

## Architecture reminder

```
API Routes / MCP  →  Services  →  Repositories  →  Database
```

Claim rules, status transitions, and activity logging belong in **Services**.

---

## Recommended Folder Structure

```
app/
├── (auth)/
│   └── login/
├── (app)/
│   ├── layout.tsx
│   ├── page.tsx
│   └── projects/
│       └── [slug]/
│           ├── page.tsx              # Kanban board
│           └── tickets/[id]/
└── api/
    ├── projects/
    └── tickets/
components/
├── board/
│   ├── KanbanBoard.tsx
│   ├── TicketCard.tsx
│   ├── TicketDetail.tsx
│   └── CreateTicketDialog.tsx
└── ui/
lib/
├── supabase/
│   ├── client.ts
│   ├── server.ts
│   └── middleware.ts
├── services/          # claim, move, create, activity helpers
├── repositories/
└── validations/       # Zod schemas
```

---

## UI Requirements (MVP)

### Board Page (`/projects/[slug]`)
- Horizontal Kanban with **5 columns**: Backlog, Open, In Progress, PR Review, Complete.
- Column header + ticket count.
- Ticket cards show:
  - Title
  - Type badge (Feature / Bug)
  - Agent / assignee indicator when claimed
  - Comment count
- Click card → detail (drawer or page).
- Prominent **New Ticket** button.
- Project switcher in header.

### Ticket Detail
- Title + rendered markdown description.
- Status + type badges.
- Claim button (when `open`) and move controls.
- Ownership block: assignee, agent_name, harness_name, claimed_at, branch_name.
- GitHub PR block (url, number, state) when present.
- Comments thread.
- Activity timeline (from `activity_log`).
- Edit description / checklist.

### Create Ticket
- Modal or simple form: Title (required), Description, Type (Feature / Bug).
- Defaults to current project.
- On success → appears in `backlog` or `open`.

### Design Notes
- Clean dark or light theme (both if easy).
- Generous whitespace; avoid dense enterprise UI.
- Loading and empty states required.
- Mobile: basic responsiveness (horizontal scroll for board is fine).

---

## Implementation Order (strict)

### Phase 1 – Foundation
1. Supabase project + schema from `01-database-schema.md`.
2. Next.js App Router + TypeScript + Tailwind + shadcn/ui.
3. Supabase Auth (magic link + Google).
4. Projects (with GitHub binding fields) + switcher.
5. Tickets CRUD + **claim** service/action.
6. Activity log writes on create / claim / status change.
7. Basic Kanban board UI (5 columns).
8. Thin service layer for ticket operations.

### Phase 2 – Agent Surface
1. Harden API routes with Zod.
2. MCP server with all tools including `claim_ticket`.
3. API-key authentication for MCP.
4. Comments + activity visible in detail view.
5. Harness / agent fields visible on cards and detail.
6. End-to-end test with Grok Build (or another agent).

### Phase 3 – GitHub Automation
1. PR metadata population.
2. Webhooks (opened → pr_review, merged → complete, closed → open).
3. Optional worktree / branch helpers.

---

## Coding Standards for Agents

- Prefer Server Components; Client Components only when interactivity is required.
- Business logic in services, not React components or raw route handlers.
- Every MCP tool and API route has TypeScript types + Zod schemas.
- Clear error messages so agents can self-correct.
- When in doubt, choose the simpler implementation.

---

## Out of Scope for First Implementation

- Drag-and-drop (buttons are fine).
- Realtime subscriptions.
- GitHub webhooks / automatic status changes (Phase 3).
- File attachments.
- Sub-tickets / epics.
- Custom statuses.
- Notifications / agent heartbeat.
- Full membership RLS enforcement (table exists; policies can stay open for private MVP).
