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
import {
  addCommentShape,
  claimTicketShape,
  createTicketShape,
  getTicketShape,
  listTicketsShape,
  moveTicketShape,
  updateTicketShape,
  TOOL_DESCRIPTIONS,
} from "../lib/mcp/tool-schemas";

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
    description: TOOL_DESCRIPTIONS.list_tickets,
    inputSchema: listTicketsShape,
  },
  async (args) => {
    try {
      const params = new URLSearchParams();
      if (args.project_id) params.set("project_id", args.project_id);
      if (args.project_slug) params.set("project_slug", args.project_slug);
      if (args.status) params.set("status", args.status);
      if (args.limit) params.set("limit", String(args.limit));
      if (args.before) params.set("before", args.before);
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
    description: TOOL_DESCRIPTIONS.get_ticket,
    inputSchema: getTicketShape,
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
    description: TOOL_DESCRIPTIONS.create_ticket,
    inputSchema: createTicketShape,
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
    description: TOOL_DESCRIPTIONS.claim_ticket,
    inputSchema: claimTicketShape,
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
    description: TOOL_DESCRIPTIONS.update_ticket,
    inputSchema: updateTicketShape,
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
    description: TOOL_DESCRIPTIONS.add_comment,
    inputSchema: addCommentShape,
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
    description: TOOL_DESCRIPTIONS.move_ticket,
    inputSchema: moveTicketShape,
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
