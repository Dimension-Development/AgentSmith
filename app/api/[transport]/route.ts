import { createMcpHandler, withMcpAuth } from "mcp-handler";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { createAdminClient } from "@/lib/supabase/admin";
import { authenticateApiKey } from "@/lib/services/api-keys";
import {
  addComment,
  claimTicket,
  createTicket,
  getTicket,
  listTickets,
  moveTicket,
  updateTicket,
} from "@/lib/services/tickets";
import {
  addCommentShape,
  claimTicketShape,
  createTicketShape,
  getTicketShape,
  listTicketsShape,
  moveTicketShape,
  updateTicketShape,
  TOOL_DESCRIPTIONS,
} from "@/lib/mcp/tool-schemas";

/**
 * Hosted MCP endpoint (Streamable HTTP) at /api/mcp — agents connect with
 * just a URL and a personal `asm_…` key, no repo checkout needed. Same auth
 * and the same service layer as REST; the stdio bridge (mcp/server.ts)
 * remains for local/offline use.
 */

function jsonResult(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

function errorResult(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return {
    isError: true as const,
    content: [{ type: "text" as const, text: JSON.stringify({ error: message }) }],
  };
}

function userIdFrom(extra: { authInfo?: AuthInfo }): string {
  const userId = extra.authInfo?.extra?.userId;
  if (typeof userId !== "string" || !userId) {
    throw new Error("Unauthorized");
  }
  return userId;
}

const handler = createMcpHandler(
  (server) => {
    const admin = () => createAdminClient();

    server.registerTool(
      "list_tickets",
      { description: TOOL_DESCRIPTIONS.list_tickets, inputSchema: listTicketsShape },
      async (args, extra) => {
        try {
          userIdFrom(extra);
          return jsonResult({ tickets: await listTickets(admin(), args) });
        } catch (err) {
          return errorResult(err);
        }
      }
    );

    server.registerTool(
      "get_ticket",
      { description: TOOL_DESCRIPTIONS.get_ticket, inputSchema: getTicketShape },
      async (args, extra) => {
        try {
          userIdFrom(extra);
          return jsonResult(await getTicket(admin(), args.ticket_id));
        } catch (err) {
          return errorResult(err);
        }
      }
    );

    server.registerTool(
      "create_ticket",
      { description: TOOL_DESCRIPTIONS.create_ticket, inputSchema: createTicketShape },
      async (args, extra) => {
        try {
          const ticket = await createTicket(admin(), args, userIdFrom(extra));
          return jsonResult({ ticket });
        } catch (err) {
          return errorResult(err);
        }
      }
    );

    server.registerTool(
      "claim_ticket",
      { description: TOOL_DESCRIPTIONS.claim_ticket, inputSchema: claimTicketShape },
      async (args, extra) => {
        try {
          const ticket = await claimTicket(admin(), args, userIdFrom(extra));
          return jsonResult({ ticket });
        } catch (err) {
          return errorResult(err);
        }
      }
    );

    server.registerTool(
      "update_ticket",
      { description: TOOL_DESCRIPTIONS.update_ticket, inputSchema: updateTicketShape },
      async (args, extra) => {
        try {
          const ticket = await updateTicket(admin(), args, userIdFrom(extra));
          return jsonResult({ ticket });
        } catch (err) {
          return errorResult(err);
        }
      }
    );

    server.registerTool(
      "add_comment",
      { description: TOOL_DESCRIPTIONS.add_comment, inputSchema: addCommentShape },
      async (args, extra) => {
        try {
          const comment = await addComment(admin(), args, userIdFrom(extra));
          return jsonResult({ comment });
        } catch (err) {
          return errorResult(err);
        }
      }
    );

    server.registerTool(
      "move_ticket",
      { description: TOOL_DESCRIPTIONS.move_ticket, inputSchema: moveTicketShape },
      async (args, extra) => {
        try {
          const ticket = await moveTicket(admin(), args, userIdFrom(extra));
          return jsonResult({ ticket });
        } catch (err) {
          return errorResult(err);
        }
      }
    );
  },
  {},
  { basePath: "/api" }
);

const verifyToken = async (
  _req: Request,
  bearerToken?: string
): Promise<AuthInfo | undefined> => {
  if (!bearerToken?.startsWith("asm_")) return undefined;
  try {
    const { userId, keyId } = await authenticateApiKey(bearerToken);
    return {
      token: bearerToken,
      scopes: [],
      clientId: keyId,
      extra: { userId },
    };
  } catch {
    return undefined;
  }
};

const authHandler = withMcpAuth(handler, verifyToken, { required: true });

export { authHandler as GET, authHandler as POST, authHandler as DELETE };
