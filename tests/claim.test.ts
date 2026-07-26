import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  claimTicket,
  createTicket,
  moveTicket,
} from "@/lib/services/tickets";
import { ServiceError } from "@/lib/types";
import {
  activityTypes,
  setupContext,
  teardownContext,
  type TestContext,
} from "./helpers";

let ctx: TestContext;

beforeAll(async () => {
  ctx = await setupContext(6);
});

afterAll(async () => {
  await teardownContext(ctx);
});

async function openTicket(title: string): Promise<string> {
  const [creator] = ctx.userIds;
  const t = await createTicket(
    ctx.admin,
    { project_id: ctx.projectId, title, type: "feature" },
    creator
  );
  await moveTicket(ctx.admin, { ticket_id: t.id, status: "open" }, creator);
  return t.id;
}

describe("claim_ticket (PRD §8)", () => {
  it("claims an open unassigned ticket atomically", async () => {
    const id = await openTicket("basic claim");
    const [user] = ctx.userIds;

    const claimed = await claimTicket(
      ctx.admin,
      { ticket_id: id, agent_name: "TestAgent", harness_name: "vitest" },
      user
    );

    expect(claimed.status).toBe("in_progress");
    expect(claimed.assigned_to).toBe(user);
    expect(claimed.claimed_at).toBeTruthy();
    expect(claimed.agent_name).toBe("TestAgent");

    const acts = await activityTypes(ctx, id);
    expect(acts.filter((a) => a === "ticket_claimed")).toHaveLength(1);
  });

  it("parallel claims: exactly one winner, losers get 409", async () => {
    const id = await openTicket("parallel claim");
    const claimers = ctx.userIds.slice(1, 6); // 5 distinct users

    const results = await Promise.allSettled(
      claimers.map((user, i) =>
        claimTicket(
          ctx.admin,
          { ticket_id: id, agent_name: `Agent${i}` },
          user
        )
      )
    );

    const wins = results.filter((r) => r.status === "fulfilled");
    const losses = results.filter(
      (r): r is PromiseRejectedResult => r.status === "rejected"
    );

    expect(wins).toHaveLength(1);
    expect(losses).toHaveLength(4);
    for (const loss of losses) {
      expect(loss.reason).toBeInstanceOf(ServiceError);
      expect((loss.reason as ServiceError).status).toBe(409);
      expect((loss.reason as ServiceError).message).toMatch(/already claimed/i);
    }

    const acts = await activityTypes(ctx, id);
    expect(acts.filter((a) => a === "ticket_claimed")).toHaveLength(1);
  });

  it("rejects claim from backlog / in_progress / complete with 400", async () => {
    const [creator] = ctx.userIds;
    const t = await createTicket(
      ctx.admin,
      { project_id: ctx.projectId, title: "not claimable", type: "bug" },
      creator
    );

    // backlog
    await expect(
      claimTicket(ctx.admin, { ticket_id: t.id, agent_name: "A" }, creator)
    ).rejects.toMatchObject({ status: 400, message: /not claimable/i });

    // complete
    await moveTicket(ctx.admin, { ticket_id: t.id, status: "complete" }, creator);
    await expect(
      claimTicket(
        ctx.admin,
        { ticket_id: t.id, agent_name: "A" },
        ctx.userIds[1]
      )
    ).rejects.toMatchObject({ status: 400 });
  });

  it("in_progress claimed by someone else → 409", async () => {
    const id = await openTicket("owned by A");
    const [, a, b] = ctx.userIds;
    await claimTicket(ctx.admin, { ticket_id: id, agent_name: "A" }, a);

    await expect(
      claimTicket(ctx.admin, { ticket_id: id, agent_name: "B" }, b)
    ).rejects.toMatchObject({ status: 409 });
  });

  it("idempotent same-user re-claim refreshes agent metadata, no duplicate activity", async () => {
    const id = await openTicket("re-claim");
    const [, user] = ctx.userIds;

    await claimTicket(
      ctx.admin,
      { ticket_id: id, agent_name: "RunOne", agent_run_id: "run-1" },
      user
    );
    const again = await claimTicket(
      ctx.admin,
      { ticket_id: id, agent_name: "RunTwo", agent_run_id: "run-2" },
      user
    );

    expect(again.status).toBe("in_progress");
    expect(again.assigned_to).toBe(user);
    expect(again.agent_name).toBe("RunTwo");
    expect(again.agent_run_id).toBe("run-2");

    const acts = await activityTypes(ctx, id);
    expect(acts.filter((a) => a === "ticket_claimed")).toHaveLength(1);
  });

  it("claim of a nonexistent ticket → 404", async () => {
    await expect(
      claimTicket(
        ctx.admin,
        {
          ticket_id: "00000000-0000-4000-8000-000000000000",
          agent_name: "A",
        },
        ctx.userIds[0]
      )
    ).rejects.toMatchObject({ status: 404 });
  });
});
