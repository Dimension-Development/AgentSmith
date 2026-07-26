-- Personal API keys for MCP / agent auth (Phase 2)

create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  key_prefix text not null,
  key_hash text not null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  last_used_at timestamptz
);

create index api_keys_user_id_idx on public.api_keys (user_id);
create unique index api_keys_key_hash_uidx on public.api_keys (key_hash);

alter table public.api_keys enable row level security;

-- Users manage only their own keys (browser session).
-- Key lookup by hash for MCP auth uses the service role client (bypasses RLS).
create policy "Users can select own api_keys"
  on public.api_keys for select to authenticated
  using (user_id = auth.uid());

create policy "Users can insert own api_keys"
  on public.api_keys for insert to authenticated
  with check (user_id = auth.uid());

create policy "Users can update own api_keys"
  on public.api_keys for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can delete own api_keys"
  on public.api_keys for delete to authenticated
  using (user_id = auth.uid());
