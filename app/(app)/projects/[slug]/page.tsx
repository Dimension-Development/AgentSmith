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

  const openCount = tickets.filter((t) => t.status === "open").length;
  const claimedCount = tickets.filter(
    (t) => t.status === "in_progress" && t.assigned_to
  ).length;
  const shippedCount = tickets.filter((t) => t.status === "complete").length;

  return (
    <div className="space-y-8">
      <div className="relative">
        {/* One sphere per screen (olive default) */}
        <div className="sphere pointer-events-none absolute -top-16 right-24 hidden h-48 w-48 opacity-60 lg:block" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3 sm:hidden">
              <ProjectSwitcher projects={projects} currentSlug={slug} />
            </div>
            <div className="flex items-end gap-2">
              <h1 className="display text-[clamp(56px,8vw,110px)]">
                {project.name}
              </h1>
              <span className="pb-3">
                <ProjectSettingsDialog project={project} />
              </span>
            </div>
            <p className="micro text-mute">
              {project.github_owner && project.github_repo
                ? `${project.github_owner}/${project.github_repo} · branch ${project.default_branch}`
                : "No GitHub binding — set one in project settings"}
              {project.description ? ` · ${project.description}` : null}
            </p>
          </div>
          <div className="flex items-start gap-5 pb-2">
            <span className="micro text-right leading-[1.7] text-mute">
              {openCount} open
              <br />
              {claimedCount} claimed
              <br />
              {shippedCount} shipped
            </span>
            <CreateTicketDialog projectId={project.id} />
          </div>
        </div>
      </div>

      <KanbanBoard tickets={tickets} projectSlug={project.slug} />
      <BoardRealtime projectId={project.id} />
    </div>
  );
}
