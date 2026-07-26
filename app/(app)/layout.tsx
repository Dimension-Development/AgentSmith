import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listProjects } from "@/lib/services/projects";
import { ProjectSwitcher } from "@/components/ProjectSwitcher";
import { SignOutButton } from "@/components/SignOutButton";
import { CreateProjectDialog } from "@/components/projects/CreateProjectDialog";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const projects = await listProjects(supabase).catch(() => []);

  return (
    <div className="min-h-screen">
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-4 px-5">
          <div className="flex items-center gap-3">
            <Link href="/" className="micro flex items-center gap-3 text-bone">
              <span className="grid h-[26px] w-[26px] place-items-center rounded-full border border-[rgba(236,233,216,.5)]">
                A
              </span>
              <span className="tracking-[.16em]">AgentSmith</span>
            </Link>
            {projects.length > 0 && (
              <>
                <span className="micro text-mute-dim">/</span>
                <ProjectSwitcher projects={projects} />
              </>
            )}
            <CreateProjectDialog />
          </div>
          <div className="micro flex items-center gap-4 text-mute">
            <Link href="/settings/api-keys" className="hover:text-bone">
              API keys
            </Link>
            {user?.email && (
              <span className="hidden max-w-[220px] truncate normal-case sm:inline">
                {user.email}
              </span>
            )}
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1400px] px-5 py-8">{children}</main>
    </div>
  );
}
