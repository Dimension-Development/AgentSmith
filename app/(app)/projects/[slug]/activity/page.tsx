import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProjectBySlug } from "@/lib/services/projects";
import { listActivityForProject } from "@/lib/services/activity";
import { PillNav } from "@/components/PillNav";
import { ServiceError } from "@/lib/types";

function timeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function dayOf(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
}

export default async function ActivityPage({
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

  const activity = await listActivityForProject(supabase, project.id);

  return (
    <div className="space-y-10 pb-24">
      <div className="relative flex flex-wrap items-end justify-between gap-6">
        <h1 className="display text-[clamp(56px,9vw,130px)]">Activity</h1>
        <span className="micro pb-4 text-mute">
          Last {activity.length} events · {project.name}
        </span>
      </div>

      {activity.length === 0 ? (
        <div className="micro border border-dashed border-line px-4 py-16 text-center text-mute-dim">
          No activity yet
        </div>
      ) : (
        <div className="border-t border-line">
          {activity.map((a) => {
            const agent =
              typeof a.metadata?.agent_name === "string"
                ? a.metadata.agent_name
                : null;
            return (
              <Link
                key={a.id}
                href={`/projects/${slug}/tickets/${a.ticket_id}`}
                className="grid grid-cols-[110px_170px_1fr] items-baseline gap-4 border-b border-line py-4 transition-colors hover:bg-[rgba(236,233,216,.04)]"
              >
                <span className="micro text-mute-dim">
                  {dayOf(a.created_at)} {timeOf(a.created_at)}
                </span>
                <span className="micro text-mute">
                  {agent ?? a.activity_type.replace(/_/g, " ")}
                </span>
                <span className="text-[15px] font-light text-bone-dim">
                  {a.message}
                </span>
              </Link>
            );
          })}
        </div>
      )}

      <PillNav projectSlug={slug} />
    </div>
  );
}
