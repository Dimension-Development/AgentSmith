-- AgentSmith Phase 1 schema (from docs/01-database-schema.md v1.2)
-- Apply in Supabase SQL editor or via supabase db push.

create type public.ticket_type as enum ('feature', 'bug');

create type public.ticket_status as enum (
  'backlog',
  'open',
  'in_progress',
  'pr_review',
  'complete'
);

create type public.member_role as enum (
  'owner',
  'developer',
  'requester',
  'viewer'
);

create type public.activity_type as enum (
  'ticket_created',
  'ticket_updated',
  'ticket_claimed',
  'ticket_unclaimed',
  'status_changed',
  'comment_added',
  'pr_linked',
  'pr_merged',
  'ticket_completed'
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  github_owner text,
  github_repo text,
  default_branch text not null default 'main',
  created_at timestamptz not null default now()
);

create index projects_slug_idx on public.projects (slug);

create table public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.member_role not null default 'developer',
  created_at timestamptz not null default now(),
  unique (project_id, user_id)
);

create index project_members_user_id_idx on public.project_members (user_id);
create index project_members_project_id_idx on public.project_members (project_id);

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,

  title text not null check (char_length(title) > 0 and char_length(title) <= 200),
  description text not null default '',
  type public.ticket_type not null,
  status public.ticket_status not null default 'backlog',

  assigned_to uuid references auth.users(id) on delete set null,
  claimed_at timestamptz,
  agent_name text,
  agent_run_id text,
  harness_name text,
  branch_name text,

  github_pr_number integer,
  github_pr_url text,
  github_pr_state text,
  github_head_sha text,
  github_merge_commit_sha text,
  merged_at timestamptz,

  checklist jsonb not null default '[]'::jsonb,

  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tickets_project_status_idx on public.tickets (project_id, status);
create index tickets_assigned_to_idx on public.tickets (assigned_to);
create index tickets_created_at_idx on public.tickets (created_at desc);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  body text not null check (char_length(body) > 0),
  is_system boolean not null default false,
  created_at timestamptz not null default now()
);

create index comments_ticket_id_created_at_idx
  on public.comments (ticket_id, created_at);

create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  activity_type public.activity_type not null,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index activity_log_ticket_id_created_at_idx
  on public.activity_log (ticket_id, created_at desc);
create index activity_log_project_id_created_at_idx
  on public.activity_log (project_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger tickets_set_updated_at
  before update on public.tickets
  for each row
  execute function public.set_updated_at();

alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.tickets enable row level security;
alter table public.comments enable row level security;
alter table public.activity_log enable row level security;

create policy "Authenticated users can manage projects"
  on public.projects for all to authenticated
  using (true) with check (true);

create policy "Authenticated users can manage project_members"
  on public.project_members for all to authenticated
  using (true) with check (true);

create policy "Authenticated users can manage tickets"
  on public.tickets for all to authenticated
  using (true) with check (true);

create policy "Authenticated users can manage comments"
  on public.comments for all to authenticated
  using (true) with check (true);

create policy "Authenticated users can manage activity_log"
  on public.activity_log for all to authenticated
  using (true) with check (true);

-- Seed data (default project, admin user) lives in supabase/seed.sql —
-- migrations must stay free of org-specific data.
