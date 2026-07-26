-- Local / reset seed data (applied after migrations on `supabase db reset`).
-- Generic admin for development only — do not use these credentials in production.

-- Fixed UUID so seeds and docs stay stable across resets.
-- Email:    admin@agentsmith.local
-- Password: admin123

create extension if not exists pgcrypto;

do $$
declare
  admin_id uuid := 'a0000000-0000-4000-8000-000000000001';
  default_project_id uuid;
begin
  -- Auth user (email + password)
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  )
  values (
    '00000000-0000-0000-0000-000000000000',
    admin_id,
    'authenticated',
    'authenticated',
    'admin@agentsmith.local',
    crypt('admin123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"AgentSmith Admin"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  )
  on conflict (id) do nothing;

  -- Required for email/password sign-in on recent GoTrue versions
  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  )
  values (
    admin_id,
    admin_id,
    format(
      '{"sub":"%s","email":"admin@agentsmith.local","email_verified":true,"phone_verified":false}',
      admin_id
    )::jsonb,
    'email',
    admin_id::text,
    now(),
    now(),
    now()
  )
  on conflict do nothing;

  -- Owner membership on the default project (created in the initial migration)
  select id into default_project_id
  from public.projects
  where slug = 'default'
  limit 1;

  if default_project_id is not null then
    insert into public.project_members (project_id, user_id, role)
    values (default_project_id, admin_id, 'owner')
    on conflict (project_id, user_id) do nothing;
  end if;
end $$;
