# AgentSmith MCP (Phase 2)

Local coding agents talk to AgentSmith over **MCP → REST API → services**, authenticated with a **personal API key**.

Keys are **not** GitHub credentials. They act as the human owner for claim / move / comments.

## Prerequisites

1. App running: `npm run dev` (and local Supabase via `npm run db:start`)
2. Signed in as admin (or any user)
3. Create a key: **Settings → API keys** (or `/settings/api-keys`)

## Configure Claude Code / Cursor

```json
{
  "mcpServers": {
    "agentsmith": {
      "command": "npx",
      "args": ["tsx", "mcp/server.ts"],
      "cwd": "/absolute/path/to/AgentSmith",
      "env": {
        "AGENTSMITH_API_URL": "http://127.0.0.1:3000",
        "AGENTSMITH_API_KEY": "asm_your_key_here"
      }
    }
  }
}
```

Or from the repo:

```bash
export AGENTSMITH_API_URL=http://127.0.0.1:3000
export AGENTSMITH_API_KEY=asm_…
npm run mcp
```

## Tools

| Tool | Purpose |
|------|---------|
| `list_tickets` | List by `project_id` or `project_slug` (+ optional `status`) |
| `get_ticket` | Full ticket + comments + activity |
| `create_ticket` | Create (always **backlog**) |
| `claim_ticket` | Atomic claim from **open** |
| `update_ticket` | Partial update / PR metadata |
| `add_comment` | Comment (+ activity) |
| `move_ticket` | Status change (soft guardrails) |

## Suggested agent loop

```
list_tickets({ project_slug: "default", status: "open" })
claim_ticket({ ticket_id, agent_name: "Grok Build", harness_name: "grok-build" })
get_ticket({ ticket_id })
add_comment / update_ticket …
move_ticket({ status: "pr_review" })
```

Tickets start in **backlog**; promote with `move_ticket({ status: "open" })` (or the board UI) before claim.

## Security notes

- Store only the **hash** of keys in the DB; full key shown once at create time.
- Revoke compromised keys in the UI.
- `/api/*` accepts Bearer `asm_…` or browser session cookies.
- Service role is used only on the server for API-key auth lookups — never expose it to agents.
