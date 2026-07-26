# Plan 04 — Hosted Deploy Hardening

**Theme:** Everything that must be true before AgentSmith runs on Vercel + hosted
Supabase. **This plan is a hard blocker for hosting; nothing else is.**
**Size:** M
**Depends on:** none (can run parallel to Plans 02–03)

---

## 1. Close open signup (critical)

PRD mandates invite-only, but nothing enforces it:

- `signInWithOtp` defaults to `shouldCreateUser: true` — a magic link to **any** email
  creates an account.
- RLS is `using (true)` for all authenticated users.
- Net: anyone on the internet gets full read/write/delete on all projects and tickets.

Tasks:

- [ ] `app/(auth)/login/page.tsx`: pass `shouldCreateUser: false` in `signInWithOtp`
- [ ] Hosted Supabase: **Disable new user signups** in Auth settings (document the
      toggle in `docs/database.md` deploy section)
- [ ] Google OAuth: disabling signups covers it (sign-in only for existing users) —
      verify and document
- [ ] Decide + document the invite mechanism (MVP: admin creates users in the Supabase
      dashboard; that's fine, just write it down)
- [ ] Seed admin (`admin@agentsmith.local` / `admin123`): assert it is **local-only**
      — it lives in `seed.sql`, which `supabase db push` does not apply to hosted; note
      this explicitly in `docs/database.md` so nobody "helpfully" runs it remotely

## 2. Get org-specific seed data out of migrations

The initial migration hard-codes a `Dimension-Development/AgentSmith` default project,
so every future deploy ships our org's GitHub binding. Same insert is duplicated a third
time in `ensureDefaultProject()` (`lib/services/projects.ts`).

- [ ] New migration is unnecessary — the insert is idempotent (`on conflict do nothing`)
      and already applied locally; instead move the insert into `supabase/seed.sql` for
      fresh local resets
- [ ] Remove the insert from the initial migration **only if** we accept re-baselining
      before first hosted push (we haven't pushed hosted yet — safe now, impossible
      later; do it now)
- [ ] Replace `ensureDefaultProject()` hard-coded GitHub binding with a neutral default
      (no `github_owner`/`github_repo`), or delete the function if the UI can handle
      zero projects with a "create project" empty state — check usage in `app/page.tsx`

## 3. Stop echoing internal errors

`lib/services/errors.ts` returns raw `error.message` for unexpected errors — Postgres/
driver details leak to clients.

- [ ] 500 path: log full error server-side, return `{ error: "Internal server error" }`
- [ ] Keep `ServiceError` and Zod messages as-is (they're intentional)

## 4. Environment & config hygiene

- [ ] Verify hosted env vars documented: `NEXT_PUBLIC_SUPABASE_URL`,
      `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- [ ] Confirm `SUPABASE_SERVICE_ROLE_KEY` is never imported client-side
      (`lib/supabase/admin.ts` is server-only today — add a `import "server-only"`
      guard to make the bundler enforce it)
- [ ] `.mcp.json` contains a live `asm_` key — already gitignored; add a
      `.mcp.json.example` with placeholder so the setup is copyable
- [ ] Auth redirect URLs: add the hosted domain to Supabase allowed redirect list;
      document in `docs/database.md`

## 5. Basic abuse limits (cheap, do now; real rate limiting later)

- [ ] Middleware currently runs `supabase.auth.getUser()` on every API request even for
      Bearer-key traffic — skip session resolution when the path starts with `/api/`
      (routes self-authenticate); saves a network hop per agent call
- [ ] Note (not MVP): per-key rate limiting once hosted usage exists — track in Plan 06

## Acceptance criteria

- A magic-link request for an unknown email does **not** create a user (hosted config +
  `shouldCreateUser: false` both in place).
- Fresh clone → `db:start` → local flow unchanged (default project still appears).
- No org-specific data in any migration file.
- Unexpected server errors return a generic message; details only in server logs.
- Build fails if `admin.ts` is imported from a client component.
