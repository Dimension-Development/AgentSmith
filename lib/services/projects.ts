import type { SupabaseClient } from "@supabase/supabase-js";
import { ServiceError, type Project } from "@/lib/types";
import { slugify, slugSchema } from "@/lib/validations/projects";
import { requireProjectAccess } from "@/lib/services/access";

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

export async function createProject(
  supabase: SupabaseClient,
  input: {
    name: string;
    slug?: string;
    description?: string;
    github_owner?: string | null;
    github_repo?: string | null;
    default_branch?: string;
  },
  actorUserId: string
): Promise<Project> {
  if (!actorUserId) {
    throw new ServiceError("Unauthorized", 401);
  }

  const slug = input.slug ?? slugify(input.name);
  const slugCheck = slugSchema.safeParse(slug);
  if (!slugCheck.success) {
    throw new ServiceError(
      "Could not derive a valid slug from the name — provide one explicitly",
      400
    );
  }

  const { data, error } = await supabase
    .from("projects")
    .insert({
      name: input.name.trim(),
      slug,
      description: input.description?.trim() || null,
      github_owner: input.github_owner?.trim() || null,
      github_repo: input.github_repo?.trim() || null,
      default_branch: input.default_branch?.trim() || "main",
    })
    .select("*")
    .single();

  if (error) {
    // 23505 = unique_violation (projects.slug)
    if (error.code === "23505") {
      throw new ServiceError(`Slug "${slug}" is already in use`, 409);
    }
    throw new ServiceError(error.message, 500);
  }

  return data as Project;
}

export async function updateProject(
  supabase: SupabaseClient,
  input: {
    project_id: string;
    name?: string;
    description?: string | null;
    github_owner?: string | null;
    github_repo?: string | null;
    default_branch?: string;
  },
  actorUserId: string
): Promise<Project> {
  await getProjectById(supabase, input.project_id);
  await requireProjectAccess(supabase, actorUserId, input.project_id);

  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.description !== undefined)
    patch.description = input.description?.trim() || null;
  if (input.github_owner !== undefined)
    patch.github_owner = input.github_owner?.trim() || null;
  if (input.github_repo !== undefined)
    patch.github_repo = input.github_repo?.trim() || null;
  if (input.default_branch !== undefined)
    patch.default_branch = input.default_branch.trim() || "main";

  if (Object.keys(patch).length === 0) {
    return getProjectById(supabase, input.project_id);
  }

  const { data, error } = await supabase
    .from("projects")
    .update(patch)
    .eq("id", input.project_id)
    .select("*")
    .single();

  if (error) {
    throw new ServiceError(error.message, 500);
  }

  return data as Project;
}
