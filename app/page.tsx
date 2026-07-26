import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listProjects } from "@/lib/services/projects";

/**
 * Root entry: redirect authenticated users to their board.
 * Unauthenticated users are sent to /login by middleware.
 */
export default async function RootPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const projects = await listProjects(supabase).catch(() => []);
  if (projects[0]) {
    redirect(`/projects/${projects[0].slug}`);
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16 space-y-4">
      <h1 className="text-xl font-semibold">AgentSmith</h1>
      <p className="text-sm text-zinc-500">
        No projects yet. Seed one locally with{" "}
        <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
          npm run db:reset
        </code>{" "}
        or insert a row into{" "}
        <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
          projects
        </code>{" "}
        via Supabase Studio, then refresh.
      </p>
    </div>
  );
}
