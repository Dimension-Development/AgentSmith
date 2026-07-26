import type { SupabaseClient } from "@supabase/supabase-js";
import { ServiceError } from "@/lib/types";

/**
 * Authorization choke point (see docs/plans/03-authorization.md, Option A):
 * the SERVICE LAYER is the single authority for who may act. Both auth paths
 * (browser session and API key) resolve to a userId and flow through these
 * checks with an admin client; RLS remains only as a read backstop.
 *
 * MVP posture: every authenticated user may access every project (PRD §7.1).
 * When membership roles land, enforce them HERE — check project_members for
 * (projectId, userId) and the required role — and both REST and MCP pick the
 * rule up automatically.
 */
export async function requireProjectAccess(
  _supabase: SupabaseClient,
  userId: string,
  projectId: string
): Promise<void> {
  if (!userId) {
    throw new ServiceError("Unauthorized", 401);
  }
  if (!projectId) {
    throw new ServiceError("Project not found", 404);
  }
  // MVP: open among authenticated users — no membership check yet.
}

/** Resolve a ticket's project and run the project access check. */
export async function requireTicketAccess(
  supabase: SupabaseClient,
  userId: string,
  ticketId: string
): Promise<{ projectId: string }> {
  const { data, error } = await supabase
    .from("tickets")
    .select("project_id")
    .eq("id", ticketId)
    .maybeSingle();

  if (error) {
    throw new ServiceError(error.message, 500);
  }
  if (!data) {
    throw new ServiceError("Ticket not found", 404);
  }

  await requireProjectAccess(supabase, userId, data.project_id);
  return { projectId: data.project_id };
}
