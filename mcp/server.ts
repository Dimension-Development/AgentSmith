/**
 * AgentSmith MCP server (stdio).
 * Calls the Next.js REST API with a personal API key.
 *
 * Env:
 *   AGENTSMITH_API_URL  — e.g. http://127.0.0.1:3000
 *   AGENTSMITH_API_KEY  — asm_… from Settings → API keys
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API_URL = (process.env.AGENTSMITH_API_URL ?? "http://127.0.0.1:3000").replace(
  /\/$/,
  ""
);
const API_KEY = process.env.AGENTSMITH_API_KEY;

if (!API_KEY) {
  console.error(
    "AGENTSMITH_API_KEY is required. Create a key in the AgentSmith UI (Settings → API keys)."
  );
  process.exit(1);
}

const statusEnum = z.enum([
  "backlog",
  "open",
  "in_progress",
  "pr_review",
  "complete",
]);

async function api<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { error: text || res.statusText };
  }

  if (!res.ok) {
    const err =
      typeof body === "object" &&
      body &&
      "error" in body &&
      typeof (body as { error: unknown }).error === "string"
        ? (body as { error: string }).error
        : `HTTP ${res.status}`;
    throw new Error(err);
  }

  return body as T;
}

function jsonResult(data: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

function errorResult(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return {
    isError: true as const,
    content: [{ type: "text" as const, text: JSON.stringify({ error: message }) }],
  };
}

const server = new McpServer({
  name: "agentsmith",
  version: "0.2.0",
});

server.registerTool(
  "list_tickets",
  {
    description:
      "List tickets in a project. Requires project_id or project_slug. Optionally filter by status.",
    inputSchema: {
      project_id: z.string().uuid().optional(),
      project_slug: z.string().min(1).optional(),
      status: statusEnum.optional(),
    },
  },
  async (args) => {
    try {
      const params = new URLSearchParams();
      if (args.project_id) params.set("project_id", args.project_id);
      if (args.project_slug) params.set("project_slug", args.project_slug);
      if (args.status) params.set("status", args.status);
      const data = await api<{ tickets: unknown[] }>(
        `/api/tickets?${params.toString()}`
      );
      return jsonResult(data);
    } catch (err) {
      return errorResult(err);
    }
  }
);

server.registerTool(
  "get_ticket",
  {
    description: "Full ticket details including comments and recent activity.",
    inputSchema: {
      ticket_id: z.string().uuid(),
    },
  },
  async (args) => {
    try {
      const data = await api(`/api/tickets/${args.ticket_id}`);
      return jsonResult(data);
    } catch (err) {
      return errorResult(err);
    }
  }
);

server.registerTool(
  "create_ticket",
  {
    description:
      "Create a ticket (always starts in backlog). Promote to open with move_ticket when ready.",
    inputSchema: {
      project_id: z.string().uuid(),
      title: z.string().min(1).max(200),
      description: z.string().max(20_000).optional(),
      type: z.enum(["feature", "bug"]),
    },
  },
  async (args) => {
    try {
      const data = await api(`/api/tickets`, {
        method: "POST",
        body: JSON.stringify(args),
      });
      return jsonResult(data);
    } catch (err) {
      return errorResult(err);
    }
  }
);

server.registerTool(
  "claim_ticket",
  {
    description:
      "Atomically claim an open ticket. Sets assignee to the API key owner and status to in_progress.",
    inputSchema: {
      ticket_id: z.string().uuid(),
      agent_name: z.string().min(1).max(200),
      agent_run_id: z.string().max(200).optional(),
      harness_name: z.string().max(200).optional(),
    },
  },
  async (args) => {
    try {
      const { ticket_id, ...body } = args;
      const data = await api(`/api/tickets/${ticket_id}/claim`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      return jsonResult(data);
    } catch (err) {
      return errorResult(err);
    }
  }
);

server.registerTool(
  "update_ticket",
  {
    description:
      "Partial update (description, checklist, branch, PR metadata). merged_at only when a PR is actually merged.",
    inputSchema: {
      ticket_id: z.string().uuid(),
      title: z.string().min(1).max(200).optional(),
      description: z.string().optional(),
      type: z.enum(["feature", "bug"]).optional(),
      branch_name: z.string().max(200).nullable().optional(),
      checklist: z
        .array(
          z.object({
            id: z.string().max(100),
            text: z.string().max(500),
            done: z.boolean(),
          })
        )
        .max(100)
        .optional(),
      github_pr_number: z.number().int().nullable().optional(),
      github_pr_url: z.string().max(500).nullable().optional(),
      github_pr_state: z.enum(["open", "closed", "merged"]).nullable().optional(),
      github_head_sha: z.string().max(500).nullable().optional(),
      github_merge_commit_sha: z.string().max(500).nullable().optional(),
      merged_at: z.string().max(200).nullable().optional(),
    },
  },
  async (args) => {
    try {
      const { ticket_id, ...body } = args;
      const data = await api(`/api/tickets/${ticket_id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      return jsonResult(data);
    } catch (err) {
      return errorResult(err);
    }
  }
);

server.registerTool(
  "add_comment",
  {
    description: "Add a comment to a ticket (also writes activity_log).",
    inputSchema: {
      ticket_id: z.string().uuid(),
      body: z.string().min(1).max(10_000),
      is_system: z.boolean().optional(),
    },
  },
  async (args) => {
    try {
      const { ticket_id, ...body } = args;
      const data = await api(`/api/tickets/${ticket_id}/comments`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      return jsonResult(data);
    } catch (err) {
      return errorResult(err);
    }
  }
);

server.registerTool(
  "move_ticket",
  {
    description:
      "Change ticket status. open→in_progress must use claim_ticket. Moving to open/backlog unclaims.",
    inputSchema: {
      ticket_id: z.string().uuid(),
      status: statusEnum,
    },
  },
  async (args) => {
    try {
      const data = await api(`/api/tickets/${args.ticket_id}/move`, {
        method: "POST",
        body: JSON.stringify({ status: args.status }),
      });
      return jsonResult(data);
    } catch (err) {
      return errorResult(err);
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
