import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ServiceError,
  type ChecklistItem,
  type Comment,
  type Ticket,
  type TicketDetail,
  type TicketStatus,
  type TicketType,
} from "@/lib/types";
import { logActivity, listActivityForTicket } from "@/lib/services/activity";
import { getProjectById, getProjectBySlug } from "@/lib/services/projects";

function mapTicket(row: Record<string, unknown>, commentCount?: number): Ticket {
  return {
    id: row.id as string,
    project_id: row.project_id as string,
    title: row.title as string,
    description: (row.description as string) ?? "",
    type: row.type as TicketType,
    status: row.status as TicketStatus,
    assigned_to: (row.assigned_to as string) ?? null,
    claimed_at: (row.claimed_at as string) ?? null,
    agent_name: (row.agent_name as string) ?? null,
    agent_run_id: (row.agent_run_id as string) ?? null,
    harness_name: (row.harness_name as string) ?? null,
    branch_name: (row.branch_name as string) ?? null,
    github_pr_number: (row.github_pr_number as number) ?? null,
    github_pr_url: (row.github_pr_url as string) ?? null,
    github_pr_state: (row.github_pr_state as string) ?? null,
    github_head_sha: (row.github_head_sha as string) ?? null,
    github_merge_commit_sha: (row.github_merge_commit_sha as string) ?? null,
    merged_at: (row.merged_at as string) ?? null,
    checklist: (row.checklist as ChecklistItem[]) ?? [],
    created_by: (row.created_by as string) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    comment_count: commentCount,
  };
}

/** Resolve actor: explicit userId (API key path) or session on the client. */
async function requireUserId(
  supabase: SupabaseClient,
  userId?: string
): Promise<string> {
  if (userId) return userId;
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    throw new ServiceError("Unauthorized", 401);
  }
  return user.id;
}

export async function listTickets(
  supabase: SupabaseClient,
  opts: {
    project_id?: string;
    project_slug?: string;
    status?: TicketStatus;
  }
): Promise<Ticket[]> {
  if (!opts.project_id && !opts.project_slug) {
    throw new ServiceError("project_id or project_slug is required", 400);
  }

  let projectId = opts.project_id;
  if (!projectId && opts.project_slug) {
    const project = await getProjectBySlug(supabase, opts.project_slug);
    projectId = project.id;
  }

  let query = supabase
    .from("tickets")
    .select("*, comments(count)")
    // created_at keeps card order stable; updated_at would reshuffle on every touch
    .eq("project_id", projectId!)
    .order("created_at", { ascending: false });

  if (opts.status) {
    query = query.eq("status", opts.status);
  }

  const { data, error } = await query;
  if (error) {
    throw new ServiceError(error.message, 500);
  }

  return (data ?? []).map((row) => {
    const record = row as Record<string, unknown> & {
      comments?: { count: number }[];
    };
    const count = Array.isArray(record.comments)
      ? record.comments[0]?.count ?? 0
      : 0;
    const rest = { ...record };
    delete rest.comments;
    return mapTicket(rest, count);
  });
}

export async function getTicket(
  supabase: SupabaseClient,
  ticketId: string
): Promise<TicketDetail> {
  const { data, error } = await supabase
    .from("tickets")
    .select("*")
    .eq("id", ticketId)
    .maybeSingle();

  if (error) {
    throw new ServiceError(error.message, 500);
  }
  if (!data) {
    throw new ServiceError("Ticket not found", 404);
  }

  const { data: comments, error: commentsError } = await supabase
    .from("comments")
    .select("*")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });

  if (commentsError) {
    throw new ServiceError(commentsError.message, 500);
  }

  const activity = await listActivityForTicket(supabase, ticketId);

  return {
    ...mapTicket(data as Record<string, unknown>),
    comments: (comments ?? []) as Comment[],
    activity,
  };
}

export async function createTicket(
  supabase: SupabaseClient,
  input: {
    project_id: string;
    title: string;
    description?: string;
    type: TicketType;
  },
  actorUserId?: string
): Promise<Ticket> {
  const userId = await requireUserId(supabase, actorUserId);
  await getProjectById(supabase, input.project_id);

  const { data, error } = await supabase
    .from("tickets")
    .insert({
      project_id: input.project_id,
      title: input.title.trim(),
      description: input.description ?? "",
      type: input.type,
      status: "backlog",
      created_by: userId,
    })
    .select("*")
    .single();

  if (error) {
    throw new ServiceError(error.message, 500);
  }

  await logActivity(supabase, {
    ticket_id: data.id,
    project_id: data.project_id,
    actor_id: userId,
    activity_type: "ticket_created",
    message: `Ticket created: ${data.title}`,
    metadata: { type: data.type, status: "backlog" },
  });

  return mapTicket(data as Record<string, unknown>);
}

/**
 * Map errors raised by the claim/move Postgres functions (see the
 * claim_move_rpc migration for the errcode convention) to ServiceErrors.
 */
function rpcError(error: { code?: string; message: string }): ServiceError {
  switch (error.code) {
    case "P0404":
      return new ServiceError(error.message, 404);
    case "P0409":
      return new ServiceError(error.message, 409);
    case "P0400":
      return new ServiceError(error.message, 400);
    default:
      return new ServiceError(error.message, 500);
  }
}

export async function claimTicket(
  supabase: SupabaseClient,
  input: {
    ticket_id: string;
    agent_name?: string;
    agent_run_id?: string;
    harness_name?: string;
  },
  actorUserId?: string
): Promise<Ticket> {
  const userId = await requireUserId(supabase, actorUserId);

  // Single transaction in Postgres: lock row, check claimability, set claim
  // fields, write ticket_claimed activity. Idempotent same-user re-claim.
  const { data, error } = await supabase.rpc("claim_ticket", {
    p_ticket_id: input.ticket_id,
    p_user_id: userId,
    p_agent_name: input.agent_name ?? null,
    p_agent_run_id: input.agent_run_id ?? null,
    p_harness_name: input.harness_name ?? null,
  });

  if (error) {
    throw rpcError(error);
  }

  return mapTicket(data as Record<string, unknown>);
}

export async function moveTicket(
  supabase: SupabaseClient,
  input: { ticket_id: string; status: TicketStatus },
  actorUserId?: string
): Promise<Ticket> {
  const userId = await requireUserId(supabase, actorUserId);

  // Single transaction in Postgres: lock row, enforce guardrails, update
  // status (clearing claim fields when releasing), write all activity rows.
  // merged_at is never set here — only when a PR is actually merged.
  const { data, error } = await supabase.rpc("move_ticket", {
    p_ticket_id: input.ticket_id,
    p_user_id: userId,
    p_status: input.status,
  });

  if (error) {
    throw rpcError(error);
  }

  return mapTicket(data as Record<string, unknown>);
}

export async function updateTicket(
  supabase: SupabaseClient,
  input: {
    ticket_id: string;
    title?: string;
    description?: string;
    type?: TicketType;
    branch_name?: string | null;
    checklist?: ChecklistItem[];
    github_pr_number?: number | null;
    github_pr_url?: string | null;
    github_pr_state?: string | null;
    github_head_sha?: string | null;
    github_merge_commit_sha?: string | null;
    merged_at?: string | null;
  },
  actorUserId?: string
): Promise<Ticket> {
  const userId = await requireUserId(supabase, actorUserId);

  const { data: existing, error: loadError } = await supabase
    .from("tickets")
    .select("*")
    .eq("id", input.ticket_id)
    .maybeSingle();

  if (loadError) {
    throw new ServiceError(loadError.message, 500);
  }
  if (!existing) {
    throw new ServiceError("Ticket not found", 404);
  }

  const patch: Record<string, unknown> = {};
  if (input.title !== undefined) patch.title = input.title.trim();
  if (input.description !== undefined) patch.description = input.description;
  if (input.type !== undefined) patch.type = input.type;
  if (input.branch_name !== undefined) patch.branch_name = input.branch_name;
  if (input.checklist !== undefined) patch.checklist = input.checklist;
  if (input.github_pr_number !== undefined)
    patch.github_pr_number = input.github_pr_number;
  if (input.github_pr_url !== undefined) patch.github_pr_url = input.github_pr_url;
  if (input.github_pr_state !== undefined)
    patch.github_pr_state = input.github_pr_state;
  if (input.github_head_sha !== undefined)
    patch.github_head_sha = input.github_head_sha;
  if (input.github_merge_commit_sha !== undefined)
    patch.github_merge_commit_sha = input.github_merge_commit_sha;
  if (input.merged_at !== undefined) patch.merged_at = input.merged_at;

  if (Object.keys(patch).length === 0) {
    return mapTicket(existing as Record<string, unknown>);
  }

  const { data: updated, error: updateError } = await supabase
    .from("tickets")
    .update(patch)
    .eq("id", input.ticket_id)
    .select("*")
    .single();

  if (updateError) {
    throw new ServiceError(updateError.message, 500);
  }

  await logActivity(supabase, {
    ticket_id: updated.id,
    project_id: updated.project_id,
    actor_id: userId,
    activity_type: "ticket_updated",
    message: "Ticket updated",
    metadata: { fields: Object.keys(patch) },
  });

  const prLinked =
    input.github_pr_url !== undefined ||
    input.github_pr_number !== undefined;
  if (prLinked && (updated.github_pr_url || updated.github_pr_number)) {
    await logActivity(supabase, {
      ticket_id: updated.id,
      project_id: updated.project_id,
      actor_id: userId,
      activity_type: "pr_linked",
      message: updated.github_pr_url
        ? `PR linked: ${updated.github_pr_url}`
        : `PR #${updated.github_pr_number} linked`,
      metadata: {
        github_pr_number: updated.github_pr_number,
        github_pr_url: updated.github_pr_url,
        github_pr_state: updated.github_pr_state,
      },
    });
  }

  if (
    input.github_pr_state === "merged" ||
    (input.merged_at && !existing.merged_at)
  ) {
    await logActivity(supabase, {
      ticket_id: updated.id,
      project_id: updated.project_id,
      actor_id: userId,
      activity_type: "pr_merged",
      message: "PR marked as merged",
      metadata: {
        merged_at: updated.merged_at,
        github_merge_commit_sha: updated.github_merge_commit_sha,
      },
    });
  }

  return mapTicket(updated as Record<string, unknown>);
}

export async function addComment(
  supabase: SupabaseClient,
  input: { ticket_id: string; body: string; is_system?: boolean },
  actorUserId?: string
): Promise<Comment> {
  const userId = await requireUserId(supabase, actorUserId);

  const { data: ticket, error: loadError } = await supabase
    .from("tickets")
    .select("id, project_id")
    .eq("id", input.ticket_id)
    .maybeSingle();

  if (loadError) {
    throw new ServiceError(loadError.message, 500);
  }
  if (!ticket) {
    throw new ServiceError("Ticket not found", 404);
  }

  const { data, error } = await supabase
    .from("comments")
    .insert({
      ticket_id: input.ticket_id,
      author_id: userId,
      body: input.body.trim(),
      is_system: input.is_system ?? false,
    })
    .select("*")
    .single();

  if (error) {
    throw new ServiceError(error.message, 500);
  }

  await logActivity(supabase, {
    ticket_id: ticket.id,
    project_id: ticket.project_id,
    actor_id: userId,
    activity_type: "comment_added",
    message: "Comment added",
    metadata: { comment_id: data.id, is_system: data.is_system },
  });

  return data as Comment;
}
