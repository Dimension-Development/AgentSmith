-- Plan 03 (Option A): the service layer is the single authorization authority.
-- All writes now flow through API routes / services using the service-role
-- client (which bypasses RLS). RLS becomes a READ-ONLY backstop: an anon-key
-- client with a bare authenticated JWT can read, but cannot write directly to
-- tables. Server components keep working (they only read via the session
-- client); api_keys keeps its own owner-scoped policies as defense in depth.

drop policy "Authenticated users can manage projects" on public.projects;
drop policy "Authenticated users can manage project_members" on public.project_members;
drop policy "Authenticated users can manage tickets" on public.tickets;
drop policy "Authenticated users can manage comments" on public.comments;
drop policy "Authenticated users can manage activity_log" on public.activity_log;

create policy "Authenticated can read projects"
  on public.projects for select to authenticated
  using (true);

create policy "Authenticated can read project_members"
  on public.project_members for select to authenticated
  using (true);

create policy "Authenticated can read tickets"
  on public.tickets for select to authenticated
  using (true);

create policy "Authenticated can read comments"
  on public.comments for select to authenticated
  using (true);

create policy "Authenticated can read activity_log"
  on public.activity_log for select to authenticated
  using (true);
