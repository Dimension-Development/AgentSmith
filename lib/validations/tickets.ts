import { z } from "zod";
import { PR_STATES, TICKET_STATUSES, TICKET_TYPES } from "@/lib/types";

// Input size limits — agents can be chatty; keep payloads bounded.
export const LIMITS = {
  description: 20_000,
  commentBody: 10_000,
  checklistItems: 100,
  checklistText: 500,
  agentField: 200,
  githubField: 500,
} as const;

export const checklistSchema = z
  .array(
    z.object({
      id: z.string().max(100),
      text: z.string().max(LIMITS.checklistText),
      done: z.boolean(),
    })
  )
  .max(LIMITS.checklistItems);

export const createTicketSchema = z.object({
  project_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(LIMITS.description).optional().default(""),
  type: z.enum(TICKET_TYPES),
});

export const claimTicketSchema = z.object({
  ticket_id: z.string().uuid(),
  agent_name: z.string().min(1).max(LIMITS.agentField).optional(),
  agent_run_id: z.string().max(LIMITS.agentField).optional(),
  harness_name: z.string().max(LIMITS.agentField).optional(),
});

export const moveTicketSchema = z.object({
  ticket_id: z.string().uuid(),
  status: z.enum(TICKET_STATUSES),
});

export const updateTicketSchema = z.object({
  ticket_id: z.string().uuid(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(LIMITS.description).optional(),
  type: z.enum(TICKET_TYPES).optional(),
  branch_name: z.string().max(LIMITS.agentField).nullable().optional(),
  checklist: checklistSchema.optional(),
  github_pr_number: z.number().int().nullable().optional(),
  github_pr_url: z.string().max(LIMITS.githubField).nullable().optional(),
  github_pr_state: z.enum(PR_STATES).nullable().optional(),
  github_head_sha: z.string().max(LIMITS.githubField).nullable().optional(),
  github_merge_commit_sha: z
    .string()
    .max(LIMITS.githubField)
    .nullable()
    .optional(),
  merged_at: z.string().max(LIMITS.agentField).nullable().optional(),
});

export const addCommentSchema = z.object({
  ticket_id: z.string().uuid(),
  body: z.string().min(1).max(LIMITS.commentBody),
  is_system: z.boolean().optional().default(false),
});

/** Base object (no refine) so MCP tool schemas can reuse `.shape`. */
export const listTicketsBaseSchema = z.object({
  project_id: z.string().uuid().optional(),
  project_slug: z.string().min(1).optional(),
  status: z.enum(TICKET_STATUSES).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  /** Cursor: return tickets created strictly before this ISO timestamp. */
  before: z.string().datetime({ offset: true }).optional(),
});

export const listTicketsSchema = listTicketsBaseSchema.refine(
  (data) => data.project_id || data.project_slug,
  { message: "project_id or project_slug is required" }
);
