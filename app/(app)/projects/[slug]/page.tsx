import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProjectBySlug, listProjects } from "@/lib/services/projects";
import { listTickets } from "@/lib/services/tickets";
import { KanbanBoard } from "@/components/board/KanbanBoard";
import { BoardRealtime } from "@/components/board/BoardRealtime";
import { CreateTicketDialog } from "@/components/board/CreateTicketDialog";
import { ProjectSwitcher } from "@/components/ProjectSwitcher";
import { ProjectSettingsDialog } from "@/components/projects/ProjectSettingsDialog";
import { PillNav } from "@/components/PillNav";
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

  const activeAgents = new Set(
    tickets
      .filter((t) => t.status === "in_progress" && t.agent_name)
      .map((t) => t.agent_name)
  ).size;

  return (
    <div className="space-y-8 pb-24">
      {/* Top strip: agents status centre, repo binding right */}
      <div className="micro grid grid-cols-1 items-start gap-2 text-mute sm:grid-cols-3">
        <div className="flex items-center gap-3 sm:hidden">
          <ProjectSwitcher projects={projects} currentSlug={slug} />
        </div>
        <span className="hidden sm:block" />
        <div className="flex items-center gap-2.5 sm:justify-center">
          {activeAgents > 0 && <span className="agent-dot" />}
          <span>Agents [{activeAgents} active]</span>
        </div>
        <div className="text-left leading-[1.8] sm:text-right">
          {project.github_owner && project.github_repo ? (
            <>
              {project.github_owner}/{project.github_repo}
              <br />
              Branch {project.default_branch}
            </>
          ) : (
            "No GitHub binding — set one in settings"
          )}
        </div>
      </div>

      <div className="relative">
        {/* Orbit rings + one sphere per screen (kept quiet) */}
        <div className="pointer-events-none absolute -top-40 right-[8%] hidden h-[520px] w-[520px] rounded-full border border-[rgba(236,233,216,.07)] lg:block" />
        <div className="pointer-events-none absolute -top-24 right-[16%] hidden h-[340px] w-[340px] rounded-full border border-[rgba(236,233,216,.05)] lg:block" />
        <div className="sphere pointer-events-none absolute -top-14 right-[12%] hidden h-44 w-44 opacity-60 lg:block" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-end gap-2">
              <h1 className="display text-[clamp(56px,9vw,130px)]">
                {project.name}
              </h1>
              <span className="pb-4">
                <ProjectSettingsDialog project={project} />
              </span>
            </div>
            {project.description && (
              <p className="micro text-mute">{project.description}</p>
            )}
          </div>
          <span className="pb-3">
            <CreateTicketDialog projectId={project.id} />
          </span>
        </div>
      </div>

      <KanbanBoard tickets={tickets} projectSlug={project.slug} />
      <BoardRealtime projectId={project.id} />
      <PillNav projectSlug={project.slug} />
    </div>
  );
}
