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
      className="micro h-8 cursor-pointer border border-transparent bg-transparent px-1 text-bone transition-colors hover:border-line focus:border-line-strong focus:outline-none"
      value={currentSlug ?? projects[0]?.slug ?? ""}
      onChange={(e) => {
        if (e.target.value) {
          router.push(`/projects/${e.target.value}`);
        }
      }}
      aria-label="Project"
    >
      {projects.map((p) => (
        <option key={p.id} value={p.slug} className="bg-ink text-bone">
          {p.name}
        </option>
      ))}
    </select>
  );
}
