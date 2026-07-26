import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  addComment,
  createTicket,
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
  ctx = await setupContext(1);
});

afterAll(async () => {
  await teardownContext(ctx);
});

async function ticket(title: string): Promise<string> {
  const t = await createTicket(
    ctx.admin,
    { project_id: ctx.projectId, title, type: "feature" },
    ctx.userIds[0]
  );
  return t.id;
}

describe("update_ticket PR metadata", () => {
  it("linking a PR writes pr_linked activity", async () => {
    const id = await ticket("pr link");
    const updated = await updateTicket(
      ctx.admin,
      {
        ticket_id: id,
        github_pr_number: 42,
        github_pr_url: "https://github.com/example/repo/pull/42",
        github_pr_state: "open",
      },
      ctx.userIds[0]
    );

    expect(updated.github_pr_number).toBe(42);
    expect(await activityTypes(ctx, id)).toContain("pr_linked");
  });

  it("marking merged writes pr_merged activity", async () => {
    const id = await ticket("pr merge");
    await updateTicket(
      ctx.admin,
      {
        ticket_id: id,
        github_pr_state: "merged",
        merged_at: new Date().toISOString(),
      },
      ctx.userIds[0]
    );
    expect(await activityTypes(ctx, id)).toContain("pr_merged");
  });

  it("checklist round-trips", async () => {
    const id = await ticket("checklist");
    const updated = await updateTicket(
      ctx.admin,
      {
        ticket_id: id,
        checklist: [
          { id: "1", text: "scope", done: true },
          { id: "2", text: "implement", done: false },
        ],
      },
      ctx.userIds[0]
    );
    expect(updated.checklist).toHaveLength(2);
    expect(updated.checklist[0].done).toBe(true);
  });

  it("empty patch is a no-op returning the current ticket", async () => {
    const id = await ticket("noop update");
    const before = (await activityTypes(ctx, id)).length;
    const updated = await updateTicket(ctx.admin, { ticket_id: id }, ctx.userIds[0]);
    expect(updated.id).toBe(id);
    expect((await activityTypes(ctx, id)).length).toBe(before);
  });
});

describe("comments", () => {
  it("add_comment writes the comment and comment_added activity", async () => {
    const id = await ticket("commented");
    const comment = await addComment(
      ctx.admin,
      { ticket_id: id, body: "Plan: do the thing" },
      ctx.userIds[0]
    );

    expect(comment.body).toBe("Plan: do the thing");
    expect(comment.author_id).toBe(ctx.userIds[0]);
    expect(await activityTypes(ctx, id)).toContain("comment_added");
  });

  it("comment on nonexistent ticket → 404", async () => {
    await expect(
      addComment(
        ctx.admin,
        { ticket_id: "00000000-0000-4000-8000-0000000000ff", body: "hi" },
        ctx.userIds[0]
      )
    ).rejects.toMatchObject({ status: 404 });
  });
});
