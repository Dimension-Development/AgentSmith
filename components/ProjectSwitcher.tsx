"use client";

import { useRouter } from "next/navigation";
import type { Project } from "@/lib/types";

export function ProjectSwitcher({
  projects,
  currentSlug,
}: {
  projects: Project[];
  currentSlug?: string;
}) {
  const router = useRouter();

  return (
    <select
      className="h-9 rounded-md border border-zinc-200 bg-transparent px-2 text-sm dark:border-zinc-700"
      value={currentSlug ?? projects[0]?.slug ?? ""}
      onChange={(e) => {
        if (e.target.value) {
          router.push(`/projects/${e.target.value}`);
        }
      }}
      aria-label="Project"
    >
      {projects.map((p) => (
        <option key={p.id} value={p.slug}>
          {p.name}
        </option>
      ))}
    </select>
  );
}
