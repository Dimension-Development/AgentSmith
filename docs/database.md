# Database workflow (local Supabase + migrations)

AgentSmith uses **Supabase CLI + Docker** for local development and **versioned SQL migrations** for all schema changes.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine) running
- [Supabase CLI](https://supabase.com/docs/guides/cli) (`brew install supabase/tap/supabase`)
- Node.js 20+

**Port note:** Default local ports are `54321` (API), `54322` (Postgres), `54323` (Studio), `54324` (Mailpit). Only **one** local Supabase stack can use these ports at a time. If start fails with “port is already allocated”, stop the other project:

```bash
supabase stop --project-id <other-project-id>
```

## Day-to-day

```bash
# Start local stack (applies migrations)
npm run db:start

# Write .env.local from the running stack
npm run db:env

# App
npm run dev
```

| Service | URL |
|---------|-----|
| API | http://127.0.0.1:54321 |
| Studio | http://127.0.0.1:54323 |
| Mailpit (magic-link emails) | http://127.0.0.1:54324 |
| Postgres | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |

Stop when done: `npm run db:stop`

## Making a schema change

1. **Create a new migration** (never edit an already-applied migration that others may have run):

   ```bash
   npm run db:new -- add_ticket_priority
   # → supabase/migrations/<timestamp>_add_ticket_priority.sql
   ```

2. **Edit the SQL** in that file (DDL only; keep it idempotent when practical).

3. **Apply locally** (rebuilds DB from all migrations + seed):

   ```bash
   npm run db:reset
   ```

4. **Exercise the app** against local Supabase (`npm run dev`).

5. **Open a PR** that includes the migration file.

6. **Promote to hosted Supabase** (staging/prod) after review:

   ```bash
   # Once per machine / project
   supabase login
   supabase link --project-ref <your-project-ref>

   npm run db:push
   ```

`db:push` applies **pending** migrations only. Do not hand-edit production schema outside migrations.

## Commands (npm scripts)

| Script | What it runs |
|--------|----------------|
| `db:start` | `supabase start` |
| `db:stop` | `supabase stop` |
| `db:status` | `supabase status` |
| `db:reset` | `supabase db reset` (migrations + `seed.sql`) |
| `db:new` | `supabase migration new` (pass name after `--`) |
| `db:diff` | `supabase db diff` (optional; generate SQL from Studio changes) |
| `db:push` | `supabase db push` (linked remote) |
| `db:env` | `scripts/write-local-env.sh` → `.env.local` |

## Layout

```
supabase/
  config.toml              # local stack config (ports, auth redirects)
  migrations/              # ordered SQL migrations (source of truth)
  seed.sql                 # optional data after reset
  .gitignore
scripts/
  write-local-env.sh       # generate .env.local from `supabase status`
```

## Auth on local

### Seed admin (password)

After `npm run db:reset` (or a fresh `db:start` that applies seed), sign in with:

| Field | Value |
|-------|--------|
| Email | `admin@agentsmith.local` |
| Password | `admin123` |

Defined in `supabase/seed.sql`. **Local/dev only** — never reuse in production.

### Magic link / Google

- Magic-link emails land in **Mailpit** (not your real inbox): http://127.0.0.1:54324  
- Redirect URLs for the Next app are configured in `config.toml` (`site_url` + `additional_redirect_urls`).  
- Email confirmations are **off** locally (`enable_confirmations = false`) for faster loops.

## Rules of thumb

1. **Migrations are the only way** schema changes land in shared environments.  
2. **Never rewrite** an old migration after it has been applied elsewhere — add a new file.  
3. Prefer **`db:reset`** locally over ad-hoc SQL in Studio for permanent changes (or use `db:diff` then commit the result).  
4. Keep **service role keys** out of the browser; only `NEXT_PUBLIC_*` is client-safe.  
5. Hosted projects: disable public signup for private MVP (see PRD); local allows signup for convenience.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Port already allocated | `supabase stop --project-id <other>` or stop other containers using 5432x |
| App can’t reach API | `npm run db:status` then `npm run db:env` |
| Migration failed mid-apply | Fix SQL, then `npm run db:reset` |
| Magic link missing | Open Mailpit; check rate limits in `config.toml` |
| Remote push rejected | Ensure `supabase link` and you are logged in; check migration history in Studio |
