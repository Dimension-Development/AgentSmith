import { z } from "zod";
import { TICKET_STATUSES, TICKET_TYPES } from "@/lib/types";

export const createTicketSchema = z.object({
  project_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().optional().default(""),
  type: z.enum(TICKET_TYPES),
});

export const claimTicketSchema = z.object({
  ticket_id: z.string().uuid(),
  agent_name: z.string().min(1).optional(),
  agent_run_id: z.string().optional(),
  harness_name: z.string().optional(),
});

export const moveTicketSchema = z.object({
  ticket_id: z.string().uuid(),
  status: z.enum(TICKET_STATUSES),
});

export const updateTicketSchema = z.object({
  ticket_id: z.string().uuid(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  type: z.enum(TICKET_TYPES).optional(),
  branch_name: z.string().nullable().optional(),
  checklist: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        done: z.boolean(),
      })
    )
    .optional(),
  github_pr_number: z.number().int().nullable().optional(),
  github_pr_url: z.string().nullable().optional(),
  github_pr_state: z.string().nullable().optional(),
  github_head_sha: z.string().nullable().optional(),
  github_merge_commit_sha: z.string().nullable().optional(),
  merged_at: z.string().nullable().optional(),
});

export const addCommentSchema = z.object({
  ticket_id: z.string().uuid(),
  body: z.string().min(1),
  is_system: z.boolean().optional().default(false),
});

export const listTicketsSchema = z
  .object({
    project_id: z.string().uuid().optional(),
    project_slug: z.string().min(1).optional(),
    status: z.enum(TICKET_STATUSES).optional(),
  })
  .refine((data) => data.project_id || data.project_slug, {
    message: "project_id or project_slug is required",
  });
