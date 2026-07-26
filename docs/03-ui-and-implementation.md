# AgentSmith — UI & Implementation Guidance

## Tech Stack (locked)

- **Framework:** Next.js 15 (App Router) + TypeScript
- **Hosting:** Vercel
- **Database & Auth:** Supabase
- **Styling:** Tailwind CSS + shadcn/ui
- **Validation:** Zod
- **Markdown rendering:** `react-markdown` (or equivalent)

Do not introduce additional major dependencies unless clearly justified.

---

## Recommended Folder Structure

```
apps/web/                  # or just root if single package
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── ...
│   ├── (app)/
│   │   ├── layout.tsx          # authenticated layout
│   │   ├── page.tsx            # redirect or project list
│   │   ├── projects/
│   │   │   └── [slug]/
│   │   │       ├── page.tsx    # Kanban board
│   │   │       └── tickets/
│   │   │           └── [id]/
│   │   └── ...
│   └── api/
│       ├── projects/
│       ├── tickets/
│       └── ...
├── components/
│   ├── board/
│   │   ├── KanbanBoard.tsx
│   │   ├── TicketCard.tsx
│   │   ├── TicketDetail.tsx
│   │   └── CreateTicketDialog.tsx
│   └── ui/                     # shadcn components
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   ├── validations/            # Zod schemas
│   └── mcp/                    # or separate package for MCP server
└── ...
```

---

## UI Requirements (MVP)

### Board Page (`/projects/[slug]`)
- Horizontal Kanban with 5 columns matching statuses.
- Each column has a clear header + ticket count.
- Ticket cards show:
  - Title (truncated)
  - Type badge (Feature / Bug)
  - Very short description preview (optional)
  - Comment count indicator
- Clicking a card opens a detail view (drawer or dedicated page).
- Prominent “New Ticket” button.
- Simple project switcher in the header.

### Ticket Detail
- Full title + description (rendered markdown).
- Status + type badges.
- Move-to-status controls (buttons or select).
- Comment thread (newest at bottom or top — pick one and stay consistent).
- Ability to edit description.
- Field for `github_pr_url` (optional in first pass).

### Create Ticket
- Modal or dedicated simple form.
- Fields: Title (required), Description, Type (Feature / Bug).
- Defaults to current project.
- On success → ticket appears in `backlog` or `open`.

### Design Notes
- Prefer a clean dark or light theme (support both if easy).
- Use generous whitespace; avoid dense enterprise UI.
- Loading and empty states must exist.
- Mobile: basic responsiveness is enough (board can scroll horizontally).

---

## Implementation Order (strict)

Follow this sequence. Do not jump ahead.

### Phase 1 – Foundation
1. Create Supabase project and run the schema from `01-database-schema.md`.
2. Scaffold Next.js app with TypeScript, Tailwind, shadcn/ui.
3. Wire Supabase Auth (magic link + Google).
4. Implement projects table + simple project list / switcher.
5. Implement ticket create + list + detail + update + manual move.
6. Build the basic Kanban board UI that reads from the API.

### Phase 2 – Agent Surface
1. Harden all API routes with Zod validation and clear errors.
2. Add API-key authentication path for MCP.
3. Implement the MCP server exposing the six tools defined in `02-mcp-and-api.md`.
4. Test the full agent loop with at least one coding agent (Grok Build preferred).

### Phase 3 – Minimal Polish
1. Comments + system comments.
2. `github_pr_url` field.
3. Better empty / loading / error states.
4. Seed a default project + a few sample tickets.

---

## Coding Standards for Agents

- Prefer Server Components where possible; use Client Components only when interactivity is required.
- Keep business logic in API routes or shared server utilities — not in React components.
- All user-facing strings should be clear and concise.
- Every MCP tool and API route must have TypeScript types and Zod schemas.
- When in doubt, choose the simpler implementation.

---

## Out of Scope for First Implementation

- Drag-and-drop (buttons to move are fine).
- Realtime subscriptions.
- GitHub webhooks / automatic status changes.
- File attachments.
- Sub-tickets / epics.
- Custom statuses or workflows.
- Notifications.
- Analytics / dashboards.

These can be added later on the same foundation.
