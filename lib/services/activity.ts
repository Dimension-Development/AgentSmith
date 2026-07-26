import type { SupabaseClient } from "@supabase/supabase-js";
import type { Activity } from "@/lib/types";

type LogActivityInput = {
  ticket_id: string;
  project_id: string;
  actor_id: string | null;
  activity_type: string;
  message: string;
  metadata?: Record<string, unknown>;
};

export async function logActivity(
  supabase: SupabaseClient,
  input: LogActivityInput
): Promise<void> {
  const { error } = await supabase.from("activity_log").insert({
    ticket_id: input.ticket_id,
    project_id: input.project_id,
    actor_id: input.actor_id,
    activity_type: input.activity_type,
    message: input.message,
    metadata: input.metadata ?? {},
  });

  if (error) {
    throw new Error(`Failed to write activity: ${error.message}`);
  }
}

export async function listActivityForTicket(
  supabase: SupabaseClient,
  ticketId: string,
  limit = 50
): Promise<Activity[]> {
  const { data, error } = await supabase
    .from("activity_log")
    .select("*")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to load activity: ${error.message}`);
  }

  return (data ?? []) as Activity[];
}
