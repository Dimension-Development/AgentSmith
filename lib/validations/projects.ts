import { z } from "zod";

export const PROJECT_LIMITS = {
  name: 100,
  slug: 50,
  description: 2_000,
  github: 100,
} as const;

/** kebab-case, e.g. "agent-smith" */
export const slugSchema = z
  .string()
  .min(1)
  .max(PROJECT_LIMITS.slug)
  .regex(
    /^[a-z0-9]+(-[a-z0-9]+)*$/,
    "Slug must be lowercase letters, numbers, and hyphens"
  );

export const createProjectSchema = z.object({
  name: z.string().min(1).max(PROJECT_LIMITS.name),
  /** Optional — derived from name when omitted. */
  slug: slugSchema.optional(),
  description: z.string().max(PROJECT_LIMITS.description).optional(),
  github_owner: z.string().max(PROJECT_LIMITS.github).nullable().optional(),
  github_repo: z.string().max(PROJECT_LIMITS.github).nullable().optional(),
  default_branch: z.string().min(1).max(PROJECT_LIMITS.github).optional(),
});

export const updateProjectSchema = z.object({
  project_id: z.string().uuid(),
  name: z.string().min(1).max(PROJECT_LIMITS.name).optional(),
  description: z.string().max(PROJECT_LIMITS.description).nullable().optional(),
  github_owner: z.string().max(PROJECT_LIMITS.github).nullable().optional(),
  github_repo: z.string().max(PROJECT_LIMITS.github).nullable().optional(),
  default_branch: z.string().min(1).max(PROJECT_LIMITS.github).optional(),
});

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, PROJECT_LIMITS.slug)
    .replace(/-+$/g, "");
}
