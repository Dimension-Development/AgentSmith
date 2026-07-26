import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApiKey, revokeApiKey } from "@/lib/services/api-keys";
import {
  setupContext,
  teardownContext,
  type TestContext,
} from "./helpers";

/**
 * REST smoke tests over a running dev server (npm run dev). Covers the auth
 * resolution layer the service-level tests bypass: Bearer key path, 401s,
 * Zod 400s, key-management scoping. Skipped when no server is listening.
 */
const API = process.env.AGENTSMITH_TEST_API_URL ?? "http://127.0.0.1:3000";

const serverUp = await (async () => {
  try {
    await fetch(`${API}/api/projects`, { signal: AbortSignal.timeout(2000) });
    return true;
  } catch {
    console.warn(`No dev server at ${API} — skipping REST smoke tests`);
    return false;
  }
})();

let ctx: TestContext;
let rawKey: string;
let keyId: string;

beforeAll(async () => {
  if (!serverUp) return;
  ctx = await setupContext(2);
  const created = await createApiKey(ctx.admin, ctx.userIds[0], "vitest key");
  rawKey = created.key;
  keyId = created.id;
});

afterAll(async () => {
  if (ctx) await teardownContext(ctx);
});

function authed(path: string, init?: RequestInit) {
  return fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${rawKey}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

describe("REST auth resolution", () => {
  it.skipIf(!serverUp)("valid API key lists tickets and stamps last_used_at", async () => {
    const res = await authed(
      `/api/tickets?project_id=${ctx.projectId}`
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.tickets)).toBe(true);

    // last_used_at is fire-and-forget; give it a beat.
    await new Promise((r) => setTimeout(r, 1500));
    const { data } = await ctx.admin
      .from("api_keys")
      .select("last_used_at")
      .eq("id", keyId)
      .single();
    expect(data?.last_used_at).toBeTruthy();
  });

  it.skipIf(!serverUp)("no auth → 401; garbage key → 401", async () => {
    const bare = await fetch(`${API}/api/tickets?project_id=${crypto.randomUUID()}`);
    expect(bare.status).toBe(401);

    const garbage = await fetch(`${API}/api/projects`, {
      headers: { Authorization: "Bearer asm_notarealkey" },
    });
    expect(garbage.status).toBe(401);
  });

  it.skipIf(!serverUp)("Zod validation errors → 400", async () => {
    const res = await authed("/api/tickets", {
      method: "POST",
      body: JSON.stringify({
        project_id: ctx.projectId,
        title: "",
        type: "banana",
      }),
    });
    expect(res.status).toBe(400);
  });

  it.skipIf(!serverUp)("oversized description → 400", async () => {
    const res = await authed("/api/tickets", {
      method: "POST",
      body: JSON.stringify({
        project_id: ctx.projectId,
        title: "too big",
        type: "bug",
        description: "x".repeat(20_001),
      }),
    });
    expect(res.status).toBe(400);
  });

  it.skipIf(!serverUp)("API keys cannot manage API keys → 403", async () => {
    const res = await authed("/api/api-keys");
    expect(res.status).toBe(403);
  });

  it.skipIf(!serverUp)("user A cannot revoke user B's key", async () => {
    const [a, b] = ctx.userIds;
    const bKey = await createApiKey(ctx.admin, b, "b's key");
    await expect(revokeApiKey(ctx.admin, a, bKey.id)).rejects.toMatchObject({
      status: 404,
    });
    // b can revoke their own
    await revokeApiKey(ctx.admin, b, bKey.id);
  });

  it.skipIf(!serverUp)("revoked key → 401", async () => {
    await revokeApiKey(ctx.admin, ctx.userIds[0], keyId);
    const res = await authed("/api/projects");
    expect(res.status).toBe(401);
  });
});
