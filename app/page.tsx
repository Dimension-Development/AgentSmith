import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listProjects } from "@/lib/services/projects";
import { CreateProjectDialog } from "@/components/projects/CreateProjectDialog";
import { Button } from "@/components/ui/button";

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
      <h1 className="display text-5xl">AgentSmith</h1>
      <p className="text-sm text-mute">
        No projects yet. Create one to get a board, then point it at the
        GitHub repo where the code lives.
      </p>
      <CreateProjectDialog trigger={<Button>Create your first project</Button>} />
    </div>
  );
}
