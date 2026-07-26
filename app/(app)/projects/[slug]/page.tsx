import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProjectBySlug, listProjects } from "@/lib/services/projects";
import { listTickets } from "@/lib/services/tickets";
import { KanbanBoard } from "@/components/board/KanbanBoard";
import { BoardRealtime } from "@/components/board/BoardRealtime";
import { CreateTicketDialog } from "@/components/board/CreateTicketDialog";
import { ProjectSwitcher } from "@/components/ProjectSwitcher";
import { ProjectSettingsDialog } from "@/components/projects/ProjectSettingsDialog";
import { ServiceError } from "@/lib/types";

export default async function ProjectBoardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  let project;
  try {
    project = await getProjectBySlug(supabase, slug);
  } catch (e) {
    if (e instanceof ServiceError && e.status === 404) notFound();
    throw e;
  }

  const [tickets, projects] = await Promise.all([
    listTickets(supabase, { project_id: project.id }),
    listProjects(supabase),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3 sm:hidden">
            <ProjectSwitcher projects={projects} currentSlug={slug} />
          </div>
          <div className="flex items-center gap-1">
            <h1 className="text-xl font-semibold tracking-tight">
              {project.name}
            </h1>
            <ProjectSettingsDialog project={project} />
          </div>
          <p className="text-sm text-zinc-500">
            {project.github_owner && project.github_repo
              ? `${project.github_owner}/${project.github_repo} (${project.default_branch})`
              : "No GitHub binding yet — set one in project settings"}
            {project.description ? ` · ${project.description}` : null}
          </p>
        </div>
        <CreateTicketDialog projectId={project.id} />
      </div>

      <KanbanBoard tickets={tickets} projectSlug={project.slug} />
      <BoardRealtime projectId={project.id} />
    </div>
  );
}
