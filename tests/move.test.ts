import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  claimTicket,
  createTicket,
  moveTicket,
  updateTicket,
} from "@/lib/services/tickets";
import {
  activityTypes,
  setupContext,
  teardownContext,
  type TestContext,
} from "./helpers";

let ctx: TestContext;

beforeAll(async () => {
  ctx = await setupContext(2);
});

afterAll(async () => {
  await teardownContext(ctx);
});

async function claimedTicket(title: string): Promise<string> {
  const [user] = ctx.userIds;
  const t = await createTicket(
    ctx.admin,
    { project_id: ctx.projectId, title, type: "feature" },
    user
  );
  await moveTicket(ctx.admin, { ticket_id: t.id, status: "open" }, user);
  await claimTicket(
    ctx.admin,
    { ticket_id: t.id, agent_name: "Agent", harness_name: "vitest" },
    user
  );
  await updateTicket(
    ctx.admin,
    { ticket_id: t.id, branch_name: "feat/test-branch" },
    user
  );
  return t.id;
}

describe("move_ticket guardrails", () => {
  it("open → in_progress via move is rejected with claim hint", async () => {
    const [user] = ctx.userIds;
    const t = await createTicket(
      ctx.admin,
      { project_id: ctx.projectId, title: "guardrail", type: "bug" },
      user
    );
    await moveTicket(ctx.admin, { ticket_id: t.id, status: "open" }, user);

    await expect(
      moveTicket(ctx.admin, { ticket_id: t.id, status: "in_progress" }, user)
    ).rejects.toMatchObject({ status: 400, message: /claim_ticket/i });
  });

  it("move claimed ticket to open: clears claim fields, keeps branch, logs unclaim", async () => {
    const id = await claimedTicket("unclaim to open");
    const [user] = ctx.userIds;

    const moved = await moveTicket(
      ctx.admin,
      { ticket_id: id, status: "open" },
      user
    );

    expect(moved.status).toBe("open");
    expect(moved.assigned_to).toBeNull();
    expect(moved.claimed_at).toBeNull();
    expect(moved.agent_name).toBeNull();
    expect(moved.agent_run_id).toBeNull();
    expect(moved.harness_name).toBeNull();
    expect(moved.branch_name).toBe("feat/test-branch"); // preserved per PRD §8

    const acts = await activityTypes(ctx, id);
    expect(acts).toContain("status_changed");
    expect(acts).toContain("ticket_unclaimed");
  });

  it("move claimed ticket to backlog also unclaims", async () => {
    const id = await claimedTicket("unclaim to backlog");
    const [user] = ctx.userIds;

    const moved = await moveTicket(
      ctx.admin,
      { ticket_id: id, status: "backlog" },
      user
    );
    expect(moved.assigned_to).toBeNull();
    expect((await activityTypes(ctx, id)).filter((a) => a === "ticket_unclaimed"))
      .toHaveLength(1);
  });

  it("move to complete logs ticket_completed and never sets merged_at", async () => {
    const id = await claimedTicket("completion");
    const [user] = ctx.userIds;

    const moved = await moveTicket(
      ctx.admin,
      { ticket_id: id, status: "complete" },
      user
    );

    expect(moved.status).toBe("complete");
    expect(moved.merged_at).toBeNull();
    expect(await activityTypes(ctx, id)).toContain("ticket_completed");
  });

  it("same-status move is a no-op with no activity", async () => {
    const [user] = ctx.userIds;
    const t = await createTicket(
      ctx.admin,
      { project_id: ctx.projectId, title: "noop", type: "bug" },
      user
    );
    const before = (await activityTypes(ctx, t.id)).length;

    const moved = await moveTicket(
      ctx.admin,
      { ticket_id: t.id, status: "backlog" },
      user
    );
    expect(moved.status).toBe("backlog");
    expect((await activityTypes(ctx, t.id)).length).toBe(before);
  });

  it("move of nonexistent ticket → 404 and writes no orphan activity", async () => {
    const ghost = "00000000-0000-4000-8000-00000000dead";
    await expect(
      moveTicket(ctx.admin, { ticket_id: ghost, status: "open" }, ctx.userIds[0])
    ).rejects.toMatchObject({ status: 404 });

    const { data } = await ctx.admin
      .from("activity_log")
      .select("id")
      .eq("ticket_id", ghost);
    expect(data ?? []).toHaveLength(0);
  });

  it("parallel conflicting moves keep the activity from→to chain consistent", async () => {
    const [user] = ctx.userIds;
    const t = await createTicket(
      ctx.admin,
      { project_id: ctx.projectId, title: "racing moves", type: "bug" },
      user
    );

    await Promise.allSettled([
      moveTicket(ctx.admin, { ticket_id: t.id, status: "open" }, user),
      moveTicket(ctx.admin, { ticket_id: t.id, status: "pr_review" }, user),
      moveTicket(ctx.admin, { ticket_id: t.id, status: "complete" }, user),
    ]);

    const { data } = await ctx.admin
      .from("activity_log")
      .select("metadata, created_at")
      .eq("ticket_id", t.id)
      .eq("activity_type", "status_changed")
      .order("created_at", { ascending: true });

    // Each transition must start where the previous one ended.
    let prev = "backlog";
    for (const row of data ?? []) {
      const m = row.metadata as { from: string; to: string };
      expect(m.from).toBe(prev);
      prev = m.to;
    }
  });
});
