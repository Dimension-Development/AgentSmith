# AgentSmith — MCP Tools & API Specification

**Version:** 1.2

This document defines the exact contracts that coding agents (Grok Build, Claude Code, Cursor, etc.) will use.

## Design Rules for Implementers

1. All tools must return **structured JSON**. Never return free-form text as the primary response.
2. Errors must be clear and actionable (e.g. `"Ticket not found"`, `"Ticket already claimed"`, `"Ticket not claimable"`, `"project_id or project_slug is required"`).
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

## Auth

| Client | Auth |
|--------|------|
| Browser | Supabase session (cookie / JWT) |
| MCP / local agents | `Authorization: Bearer <api_key>` |

### Personal API keys (Phase 2)

- Keys are **owned by a human user** (`api_keys.user_id`).
- The key acts as that user for claim, move, comments, etc. (`assigned_to` / `actor_id` = key owner).
- Keys are **not** GitHub credentials. Agents still use git/GitHub for code; AgentSmith keys exist so the agent can call list/claim/update APIs. **Git push alone does not update AgentSmith work state.**
- Scope (MVP): user-owned; can act on any project the user can access under open authenticated RLS.
- Store only a hash of the key; show `key_prefix` in the UI; support revoke.

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

**Validation:** At least one of `project_id` or `project_slug` is **required**. If neither is provided, return a clear validation error (e.g. `"project_id or project_slug is required"`).

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
  // status is not accepted on create for MVP — always backlog
}
```

**Output:** Full ticket object (without comments/activity is fine).

On success:
- status is always **`backlog`**
- write `activity_log` entry `ticket_created`

Promote to `open` with `move_ticket` when ready for agents.

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

**Caller:** authenticated user (session or API key owner). That user is `$user_id` for `assigned_to`.

**Rules (enforced in service layer)**
1. Ticket must exist and be in status **`open`** only. Claim from `backlog` is not allowed.
2. Use an **atomic conditional update** (required):

```sql
UPDATE tickets
SET assigned_to = $user_id,
    claimed_at = now(),
    status = 'in_progress',
    agent_name = $agent_name,
    agent_run_id = $agent_run_id,
    harness_name = $harness_name,
    updated_at = now()
WHERE id = $ticket_id
  AND status = 'open'
  AND assigned_to IS NULL
RETURNING *;
```

3. If 0 rows and ticket is already `assigned_to = $user_id` with status `in_progress` → **idempotent success**: return current ticket, do **not** write another `ticket_claimed`.
4. If 0 rows and assigned to another user → error `"Ticket already claimed"`.
5. If 0 rows for any other reason (not open, missing, etc.) → error `"Ticket not claimable"` (or `"Ticket not found"`).
6. On first successful claim: write activity_log `ticket_claimed`.

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

**`merged_at`:** set only when reflecting an actual PR merge (e.g. `github_pr_state` becomes `merged`, or Phase 3 webhook). Do **not** set `merged_at` merely because status moved to `complete`.

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

**Always** write activity_log `comment_added` (every comment).

---

### 7. `move_ticket`

**Description:** Change ticket status (soft guardrails).

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

**Rules (service layer)**
1. Soft guardrails: most transitions are allowed for operator flexibility.
2. **Reject** `open` → `in_progress` via `move_ticket`. Clients must use `claim_ticket`. Error e.g. `"Use claim_ticket to move open tickets to in_progress"`.
3. When moving **to** `open` or `backlog` and the ticket was claimed (had `assigned_to` / `claimed_at`):
   - clear `assigned_to`, `claimed_at`, `agent_name`, `agent_run_id`, `harness_name`
   - leave `branch_name` as-is unless product later chooses to clear it
   - write activity_log `ticket_unclaimed` (and `status_changed` as usual)
4. Write activity_log `status_changed` with from/to in metadata.
5. Moving to `complete` does **not** set `merged_at`. Set `merged_at` only when a PR is actually merged (update_ticket / webhook).

There is **no** separate `unclaim_ticket` tool — unclaim is move to open/backlog.

---

## Suggested Agent Workflow

```
# Human or agent promotes work when ready:
0. move_ticket({ ticket_id, status: "open" })   // from backlog

1. list_tickets({ project_slug: "default", status: "open" })
2. claim_ticket({ ticket_id, agent_name: "Grok Build", harness_name: "grok-build" })
3. get_ticket({ ticket_id })
4. add_comment({ ticket_id, body: "## Plan\n- ...", is_system: true })
5. update_ticket({ ticket_id, checklist: [...], branch_name: "feature/..." })
6. // implement in agent + git
7. update_ticket({ ticket_id, github_pr_url, github_pr_number, github_pr_state: "open" })
8. move_ticket({ ticket_id, status: "pr_review" })
9. // after merge (agent or Phase 3 webhook):
10. update_ticket({ ticket_id, github_pr_state: "merged", merged_at: "<iso>", github_merge_commit_sha: "..." })
11. move_ticket({ ticket_id, status: "complete" })
```

If humans always promote backlog → open on the board, agents can start at step 1.

---

## Suggested Next.js API Routes

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/projects` | List projects |
| GET | `/api/projects/[id]/tickets` | List tickets (`?status=`) |
| POST | `/api/tickets` | Create ticket (always backlog) |
| GET | `/api/tickets/[id]` | Get ticket + comments + activity |
| PATCH | `/api/tickets/[id]` | Update ticket |
| POST | `/api/tickets/[id]/claim` | Claim ticket |
| POST | `/api/tickets/[id]/comments` | Add comment |
| POST | `/api/tickets/[id]/move` | Move ticket |
| POST | `/api/api-keys` | Phase 2: create personal key |
| GET | `/api/api-keys` | Phase 2: list own keys (prefix only) |
| DELETE | `/api/api-keys/[id]` | Phase 2: revoke key |

**Auth**
- Browser: Supabase session.
- MCP: `Authorization: Bearer <api_key>` validated server-side → resolve `user_id`.

All routes should call the same service functions used by MCP.
