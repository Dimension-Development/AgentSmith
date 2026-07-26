import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureDefaultProject, listProjects } from "@/lib/services/projects";

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

  try {
    const project = await ensureDefaultProject(supabase);
    redirect(`/projects/${project.slug}`);
  } catch {
    const projects = await listProjects(supabase).catch(() => []);
    if (projects[0]) {
      redirect(`/projects/${projects[0].slug}`);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16 space-y-4">
      <h1 className="text-xl font-semibold">AgentSmith</h1>
      <p className="text-sm text-zinc-500">
        Database not ready. Apply{" "}
        <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
          supabase/migrations/001_initial.sql
        </code>{" "}
        in the Supabase SQL editor, set{" "}
        <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
          .env.local
        </code>{" "}
        from <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">.env.example</code>, then
        refresh.
      </p>
    </div>
  );
}
