# Plan 06 — Product Polish & Distribution

**Theme:** Post-foundation value: live board, easier MCP adoption, schema dedupe, and
deferred niceties. Items are independent — cherry-pick.
**Size:** L (in aggregate; each item S–M)
**Depends on:** Plans 01–04 for a trustworthy base

---

## 1. Live board (highest product value)

Agents mutate tickets over MCP, but a human watching the board sees nothing until manual
refresh — and "watch a card move itself" is *the* demo moment for this product.

- [ ] Enable Supabase Realtime on `tickets` (publication) — migration
- [ ] Client component wrapper on the board page subscribes to
      `postgres_changes` for the current `project_id` and calls `router.refresh()`
      (cheap MVP: refetch server component; no client cache to reconcile)
- [ ] Debounce refreshes (agents can burst updates)
- [ ] Fallback: 30s polling if Realtime unavailable
- [ ] Verify with the seeded flow: move a ticket via MCP, watch the board update

## 2. MCP distribution (adoption blocker)

Using the MCP today requires cloning this repo and running `tsx mcp/server.ts` — wrong
friction level for "the Kanban board that agents actually use."

Pick one (or both, HTTP first):

- [ ] **HTTP MCP endpoint** in the Next app (e.g. `mcp-handler` at `/api/mcp`,
      Streamable HTTP) reusing the exact same Bearer `asm_` auth → any agent connects
      with a URL + key, zero install. The stdio bridge stays for local/offline use.
- [ ] **npm package** `agentsmith-mcp` (move `mcp/server.ts` into a small workspace
      package with a bin) → `npx agentsmith-mcp` for stdio-only harnesses
- [ ] Update `docs/mcp.md` + README with the new connection story

## 3. Schema single-source (drift already observed)

Zod schemas are duplicated across `lib/validations/tickets.ts` and `mcp/server.ts`
(drift example: `agent_name` required in MCP, optional in REST).

- [ ] Export request schemas (minus `ticket_id` path params) from `lib/validations/`
- [ ] MCP server imports and derives its `inputSchema`s from them
- [ ] Decide the `agent_name` rule once (PRD says required for agents → keep required in
      MCP, optional in REST for humans; document it as intentional, not drift)

## 4. Pagination & limits

- [ ] `list_tickets`: `limit` (default 100) + `before`/cursor on `created_at`
- [ ] `get_ticket`: cap comments (e.g. latest 100) — activity already capped at 50
- [ ] Mirror params in MCP tools

## 5. Deferred / tracked ideas (not scheduled)

- Explicit board `position` column + drag-and-drop (replaces `created_at` ordering)
- Optimistic locking or JSON-patch for `checklist` (last-writer-wins today; two agents
  editing the checklist overwrite each other)
- Per-key rate limiting (needs hosted usage data first)
- GitHub webhooks (PRD Phase 3 — the real fix for trust-based `merged_at`; until then
  consider gating `merged_at` / `github_merge_commit_sha` to webhook-only)
- CI: GitHub Actions running Plan 05 suite against `supabase start`
- Project CRUD UI (create/edit projects + GitHub binding; today only the seeded default)
- Roles/membership enforcement (plugs into Plan 03's choke point)

## Acceptance criteria (for items 1–4)

- Two browsers on the same board: MCP-driven move appears on both within ~2s.
- A fresh machine connects an agent to hosted AgentSmith with only a URL + API key.
- `rg "z.object" mcp/server.ts` shows derived/imported schemas, not hand-copied ones.
- `list_tickets` on a 1 000-ticket project returns one bounded page.
