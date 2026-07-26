import { z } from "zod";
import {
  addCommentSchema,
  claimTicketSchema,
  createTicketSchema,
  listTicketsBaseSchema,
  moveTicketSchema,
  updateTicketSchema,
  LIMITS,
} from "@/lib/validations/tickets";

/**
 * Single source of truth for MCP tool input shapes, derived from the REST
 * Zod schemas so the two surfaces cannot drift (Plan 06 §3).
 *
 * Shapes (ZodRawShape) are what the MCP SDK's registerTool expects.
 */

export const listTicketsShape = listTicketsBaseSchema.shape;

export const getTicketShape = {
  ticket_id: z.string().uuid(),
};

export const createTicketShape = createTicketSchema.shape;

// Intentional difference from REST (PRD §8): agents must self-identify, so
// agent_name is REQUIRED over MCP while staying optional for human REST calls.
export const claimTicketShape = {
  ...claimTicketSchema.shape,
  agent_name: z.string().min(1).max(LIMITS.agentField),
};

export const updateTicketShape = updateTicketSchema.shape;

export const moveTicketShape = moveTicketSchema.shape;

export const addCommentShape = addCommentSchema.shape;

export const TOOL_DESCRIPTIONS = {
  list_tickets:
    "List tickets in a project (newest first). Requires project_id or project_slug. Optional status filter and limit/before pagination (before = ISO created_at cursor).",
  get_ticket:
    "Full ticket details including latest comments and recent activity.",
  create_ticket:
    "Create a ticket (always starts in backlog). Promote to open with move_ticket when ready.",
  claim_ticket:
    "Atomically claim an open ticket. Sets assignee to the API key owner and status to in_progress.",
  update_ticket:
    "Partial update (description, checklist, branch, PR metadata). merged_at only when a PR is actually merged.",
  add_comment: "Add a comment to a ticket (also writes activity_log).",
  move_ticket:
    "Change ticket status. open→in_progress must use claim_ticket. Moving to open/backlog unclaims.",
} as const;
