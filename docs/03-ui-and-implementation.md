# AgentSmith — UI & Implementation Guidance

**Version:** 1.2

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

Claim rules, status transitions, claim-field clearing on move to open/backlog, and activity logging belong in **Services**.

---

## Recommended Folder Structure

```
app/
├── (auth)/
│   └── login/
├── (app)/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── settings/
│   │   └── api-keys/               # Phase 2
│   └── projects/
│       └── [slug]/
│           ├── page.tsx              # Kanban board
│           └── tickets/[id]/
└── api/
    ├── projects/
    ├── tickets/
    └── api-keys/                     # Phase 2
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

### Ticket Detail (Phase 1)
- Title + rendered markdown description.
- Status + type badges.
- **Claim** button only when status is `open` (calls claim service, not raw status update).
- Move controls with soft guardrails:
  - Do not offer / block `open` → `in_progress` without claim.
  - Moving to Open or Backlog releases claim (service clears ownership fields).
- Ownership block: assignee, agent_name, harness_name, claimed_at, branch_name.
- GitHub PR block (url, number, state, merged_at when present).
- **Comments thread** (Phase 1).
- **Activity timeline** from `activity_log` (Phase 1).
- Edit description / checklist.

### Create Ticket
- Modal or simple form: Title (required), Description, Type (Feature / Bug).
- Defaults to current project.
- On success → always appears in **`backlog`**.
- Operators promote with **Move to Open** when ready for agents (no separate “ready” control required).

### Design Notes
- Clean dark or light theme (both if easy).
- Generous whitespace; avoid dense enterprise UI.
- Loading and empty states required.
- Mobile: basic responsiveness (horizontal scroll for board is fine).

### Settings (Phase 2)
- Create / list / revoke personal API keys for MCP.
- Show key once on create; thereafter only prefix.
- Short help: keys auth to AgentSmith (list/claim tickets), not GitHub.

---

## Implementation Order (strict)

### Phase 1 – Foundation
1. Supabase project + schema from `01-database-schema.md` (tables needed for Phase 1; `api_keys` can wait).
2. Next.js App Router + TypeScript + Tailwind + shadcn/ui.
3. Supabase Auth (magic link + Google); private / invite-only signup posture.
4. Projects (with GitHub binding fields) + switcher.
5. **Service layer** for create / claim / move / activity (atomic claim; soft move guardrails; unclaim-via-move).
6. Tickets CRUD + claim action wired through services.
7. Activity log writes on create / claim / unclaim / status change / comment.
8. Kanban board UI (5 columns).
9. Ticket detail: comments + activity timeline + claim/move controls.

### Phase 2 – Agent Surface
1. Harden API routes with Zod.
2. Personal API keys (schema + UI + Bearer validation).
3. MCP server with all tools including `claim_ticket`.
4. Harness / agent fields on cards if not already visible.
5. End-to-end test with Grok Build (or another agent).

### Phase 3 – GitHub Automation
1. PR metadata population.
2. Webhooks (opened → pr_review, merged → complete **and** set `merged_at`, closed without merge → open with claim cleared).
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
- Full membership RLS enforcement (table exists; policies stay open for private MVP).
- Separate unclaim tool (use move to open/backlog).
