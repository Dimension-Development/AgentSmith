import type { SupabaseClient } from "@supabase/supabase-js";
import { ServiceError, type Project } from "@/lib/types";

export async function listProjects(
  supabase: SupabaseClient
): Promise<Project[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    throw new ServiceError(error.message, 500);
  }

  return (data ?? []) as Project[];
}

export async function getProjectBySlug(
  supabase: SupabaseClient,
  slug: string
): Promise<Project> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw new ServiceError(error.message, 500);
  }
  if (!data) {
    throw new ServiceError("Project not found", 404);
  }

  return data as Project;
}

export async function getProjectById(
  supabase: SupabaseClient,
  id: string
): Promise<Project> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new ServiceError(error.message, 500);
  }
  if (!data) {
    throw new ServiceError("Project not found", 404);
  }

  return data as Project;
}

/** Ensure a default project exists (idempotent seed for empty DBs). */
export async function ensureDefaultProject(
  supabase: SupabaseClient
): Promise<Project> {
  const existing = await listProjects(supabase);
  if (existing.length > 0) {
    return existing[0];
  }

  const { data, error } = await supabase
    .from("projects")
    .insert({
      name: "Default",
      slug: "default",
      description: "Primary project for AgentSmith",
      github_owner: "Dimension-Development",
      github_repo: "AgentSmith",
      default_branch: "main",
    })
    .select("*")
    .single();

  if (error) {
    throw new ServiceError(error.message, 500);
  }

  return data as Project;
}
