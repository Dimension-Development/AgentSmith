# AgentSmith — MCP Tools & API Specification

**Version:** 1.1

This document defines the exact contracts that coding agents (Grok Build, Claude Code, Cursor, etc.) will use.

## Design Rules for Implementers

1. All tools must return **structured JSON**. Never return free-form text as the primary response.
2. Errors must be clear and actionable (e.g. `"Ticket not found"`, `"Ticket already claimed"`).
3. Prefer calling Next.js API routes / **Services** from the MCP server rather than talking directly to Supabase.
4. Use Zod for input validation on both API and MCP layers.
5. Keep tool names stable — agents will hard-code them.
6. All status transitions and claim logic live in the **service layer**.

---

## Architecture

```
MCP tools  ──┐
REST API   ──┼──►  Services  ──►  Repositories  ──►  Database
Webhooks   ──┘
```

---

## MCP Tools

### 1. `list_tickets`

**Description:** List tickets in a project. Optionally filter by status.

**Input**
```ts
{
  project_id?: string;
  project_slug?: string;
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
    assigned_to: string | null;
    agent_name: string | null;
    harness_name: string | null;
    created_at: string;
    updated_at: string;
  }>;
}
```

---

### 2. `get_ticket`

**Description:** Full ticket details including comments and recent activity.

**Input**
```ts
{ ticket_id: string }
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
  assigned_to: string | null;
  claimed_at: string | null;
  agent_name: string | null;
  agent_run_id: string | null;
  harness_name: string | null;
  branch_name: string | null;
  github_pr_number: number | null;
  github_pr_url: string | null;
  github_pr_state: string | null;
  github_head_sha: string | null;
  github_merge_commit_sha: string | null;
  merged_at: string | null;
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
  activity: Array<{
    id: string;
    activity_type: string;
    message: string;
    metadata: object;
    created_at: string;
  }>;
}
```

---

### 3. `create_ticket`

**Input**
```ts
{
  project_id: string;
  title: string;
  description?: string;
  type: "feature" | "bug";
  status?: "backlog" | "open"; // default backlog
}
```

**Output:** Full ticket object (without comments/activity is fine).

On success, write `activity_log` entry `ticket_created`.

---

### 4. `claim_ticket`  ★ critical

**Description:** Atomically claim an open ticket for work.

**Input**
```ts
{
  ticket_id: string;
  agent_name: string;       // required for agents, e.g. "Grok Build"
  agent_run_id?: string;
  harness_name?: string;    // e.g. "cursor" | "claude-code" | "grok-build"
}
```

**Output:** Updated full ticket.

**Rules (enforced in service layer)**
1. Ticket must exist and be in status `open` (product may also allow `backlog`).
2. If already claimed by a different assignee → error `"Ticket already claimed"`.
3. On success:
   - set `assigned_to` (current user / service identity)
   - set `claimed_at = now()`
   - set `agent_name`, `agent_run_id`, `harness_name`
   - set `status = in_progress`
   - write activity_log `ticket_claimed`
4. Same agent/run re-claim may be idempotent (return current ticket).

---

### 5. `update_ticket`

**Input**
```ts
{
  ticket_id: string;
  title?: string;
  description?: string;
  type?: "feature" | "bug";
  branch_name?: string | null;
  checklist?: Array<{ id: string; text: string; done: boolean }>;
  github_pr_number?: number | null;
  github_pr_url?: string | null;
  github_pr_state?: string | null;
  github_head_sha?: string | null;
  github_merge_commit_sha?: string | null;
  merged_at?: string | null;
}
```

**Output:** Updated ticket.

Write activity_log `ticket_updated` when meaningful fields change.  
When PR fields are set, also write `pr_linked` if appropriate.

---

### 6. `add_comment`

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

Optionally write activity_log `comment_added`.

---

### 7. `move_ticket`

**Description:** Change ticket status.

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

Write activity_log `status_changed` with from/to in metadata.  
When moving to `complete`, set `merged_at` if not already set (optional).

MVP may allow any → any; tighten transitions later if desired.

---

## Suggested Agent Workflow

```
1. list_tickets({ project_slug: "default", status: "open" })
2. claim_ticket({ ticket_id, agent_name: "Grok Build", harness_name: "grok-build" })
3. get_ticket({ ticket_id })
4. add_comment({ ticket_id, body: "## Plan\n- ...", is_system: true })
5. update_ticket({ ticket_id, checklist: [...], branch_name: "feature/..." })
6. // implement in agent + git
7. update_ticket({ ticket_id, github_pr_url, github_pr_number, github_pr_state: "open" })
8. move_ticket({ ticket_id, status: "pr_review" })
9. // after merge
10. move_ticket({ ticket_id, status: "complete" })
```

---

## Suggested Next.js API Routes

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/projects` | List projects |
| GET | `/api/projects/[id]/tickets` | List tickets (`?status=`) |
| POST | `/api/tickets` | Create ticket |
| GET | `/api/tickets/[id]` | Get ticket + comments + activity |
| PATCH | `/api/tickets/[id]` | Update ticket |
| POST | `/api/tickets/[id]/claim` | Claim ticket |
| POST | `/api/tickets/[id]/comments` | Add comment |
| POST | `/api/tickets/[id]/move` | Move ticket |

**Auth**
- Browser: Supabase session.
- MCP: `Authorization: Bearer <api_key>` validated server-side.

All routes should call the same service functions used by MCP.
