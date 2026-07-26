# AgentSmith — Database Schema (Supabase / Postgres)

This file is the canonical schema for the MVP. Implement exactly as specified unless a clear improvement is needed.

## Tables

### projects

```sql
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  created_at timestamptz not null default now()
);

create index projects_slug_idx on public.projects (slug);
```

### tickets

```sql
create type public.ticket_type as enum ('feature', 'bug');
create type public.ticket_status as enum (
  'backlog',
  'open',
  'in_progress',
  'pr_review',
  'complete'
);

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null check (char_length(title) > 0 and char_length(title) <= 200),
  description text not null default '',
  type public.ticket_type not null,
  status public.ticket_status not null default 'backlog',
  github_pr_url text,
  checklist jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tickets_project_status_idx on public.tickets (project_id, status);
create index tickets_created_at_idx on public.tickets (created_at desc);
```

### comments

```sql
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
```

## Triggers

```sql
-- Keep updated_at fresh
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
```

## Row Level Security (MVP – private deployment)

For the initial private/team deployment, the following is acceptable:

```sql
alter table public.projects enable row level security;
alter table public.tickets enable row level security;
alter table public.comments enable row level security;

-- Allow all authenticated users full access (tighten later)
create policy "Authenticated users can manage projects"
  on public.projects for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can manage tickets"
  on public.tickets for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can manage comments"
  on public.comments for all
  to authenticated
  using (true)
  with check (true);
```

**Note for implementers:**  
When adding the MCP service role / API key path, prefer going through Next.js API routes rather than giving the MCP the full `service_role` key.

## Seed data (optional but useful)

```sql
insert into public.projects (name, slug, description)
values ('Default', 'default', 'Primary project for AgentSmith');
```
