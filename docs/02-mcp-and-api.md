# AgentSmith — MCP Tools & API Specification

This document defines the exact contracts that coding agents (Grok Build, Claude Code, Cursor, etc.) will use.

## Design Rules for Implementers

1. All tools must return **structured JSON**. Never return free-form text as the primary response.
2. Errors must be clear and actionable (e.g. `"Ticket not found"`, `"Invalid status transition"`).
3. Prefer calling Next.js API routes from the MCP server rather than talking directly to Supabase.
4. Use Zod (or equivalent) for input validation on both the API and MCP layers.
5. Keep tool names stable — agents will hard-code them.

---

## MCP Tools

### 1. `list_tickets`

**Description:** List tickets belonging to a project. Optionally filter by status.

**Input**
```ts
{
  project_id?: string;   // UUID – preferred
  project_slug?: string; // alternative if id not known
  status?: "backlog" | "open" | "in_progress" | "pr_review" | "complete";
}
```

**Output**
```ts
{
  tickets: Array<{
    id: string;
    title: string;
    type: "feature" | "bug";
    status: string;
    created_at: string; // ISO
    updated_at: string; // ISO
  }>;
}
```

---

### 2. `get_ticket`

**Description:** Retrieve full details of a single ticket including its comments.

**Input**
```ts
{
  ticket_id: string;
}
```

**Output**
```ts
{
  id: string;
  project_id: string;
  title: string;
  description: string;
  type: "feature" | "bug";
  status: string;
  github_pr_url: string | null;
  checklist: Array<{ id: string; text: string; done: boolean }>;
  created_at: string;
  updated_at: string;
  comments: Array<{
    id: string;
    body: string;
    is_system: boolean;
    created_at: string;
    author_id: string | null;
  }>;
}
```

---

### 3. `create_ticket`

**Description:** Create a new ticket (primarily for agents, but also usable by humans via API).

**Input**
```ts
{
  project_id: string;
  title: string;
  description?: string;
  type: "feature" | "bug";
  status?: "backlog" | "open"; // default = "backlog"
}
```

**Output**
```ts
{
  id: string;
  title: string;
  status: string;
  // ... full ticket object
}
```

---

### 4. `update_ticket`

**Description:** Partially update a ticket. Only provided fields are changed.

**Input**
```ts
{
  ticket_id: string;
  title?: string;
  description?: string;
  type?: "feature" | "bug";
  github_pr_url?: string | null;
  checklist?: Array<{ id: string; text: string; done: boolean }>;
}
```

**Output**
```ts
{
  // updated full ticket (same shape as get_ticket without comments is fine)
}
```

---

### 5. `add_comment`

**Description:** Add a comment to a ticket. Use `is_system: true` for agent-generated notes.

**Input**
```ts
{
  ticket_id: string;
  body: string;
  is_system?: boolean; // default false
}
```

**Output**
```ts
{
  id: string;
  body: string;
  is_system: boolean;
  created_at: string;
}
```

---

### 6. `move_ticket`

**Description:** Change the status (column) of a ticket.

**Input**
```ts
{
  ticket_id: string;
  status: "backlog" | "open" | "in_progress" | "pr_review" | "complete";
}
```

**Output**
```ts
{
  id: string;
  status: string;
  updated_at: string;
}
```

**Notes**
- MVP does **not** enforce strict status transitions (any → any is allowed).
- Later versions may add transition rules.

---

## Suggested Next.js API Routes

All routes live under `/api` and should be protected.

| Method | Path                              | Purpose                          |
|--------|-----------------------------------|----------------------------------|
| GET    | `/api/projects`                   | List projects                    |
| GET    | `/api/projects/[id]/tickets`      | List tickets (supports `?status=`) |
| POST   | `/api/tickets`                    | Create ticket                    |
| GET    | `/api/tickets/[id]`               | Get ticket + comments            |
| PATCH  | `/api/tickets/[id]`               | Update ticket                    |
| POST   | `/api/tickets/[id]/comments`      | Add comment                      |
| POST   | `/api/tickets/[id]/move`          | Move ticket                      |

**Authentication**
- Browser requests: Supabase session (cookies / JWT).
- MCP requests: `Authorization: Bearer <api_key>` or similar.  
  Validate the key server-side and map it to a user or service identity.

---

## Example Agent Workflow (for testing)

```
1. list_tickets({ project_slug: "default", status: "open" })
2. get_ticket({ ticket_id: "..." })
3. add_comment({ ticket_id: "...", body: "## Plan\n- ...", is_system: true })
4. update_ticket({ ticket_id: "...", checklist: [...] })
5. move_ticket({ ticket_id: "...", status: "in_progress" })
6. (later) move_ticket({ ticket_id: "...", status: "pr_review" })
7. (later) move_ticket({ ticket_id: "...", status: "complete" })
```

Implementers should make this sequence work reliably before adding polish.
