import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ensureDefaultProject, listProjects } from "@/lib/services/projects";
import { ProjectSwitcher } from "@/components/ProjectSwitcher";
import { SignOutButton } from "@/components/SignOutButton";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let projects: Awaited<ReturnType<typeof listProjects>> = [];
  try {
    await ensureDefaultProject(supabase);
    projects = await listProjects(supabase);
  } catch {
    projects = [];
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
            >
              AgentSmith
            </Link>
            {projects.length > 0 && (
              <ProjectSwitcher projects={projects} />
            )}
          </div>
          <div className="flex items-center gap-3 text-sm text-zinc-500">
            {user?.email && (
              <span className="hidden sm:inline truncate max-w-[200px]">
                {user.email}
              </span>
            )}
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1400px] px-4 py-6">{children}</main>
    </div>
  );
}
