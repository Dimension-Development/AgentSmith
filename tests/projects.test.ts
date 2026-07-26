import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createProject, updateProject } from "@/lib/services/projects";
import { slugify } from "@/lib/validations/projects";
import {
  adminClient,
  createTestUser,
  type TestContext,
} from "./helpers";

let ctx: Omit<TestContext, "projectId"> & { projectIds: string[] };

beforeAll(async () => {
  const admin = adminClient();
  ctx = { admin, userIds: [await createTestUser(admin, "proj")], projectIds: [] };
});

afterAll(async () => {
  for (const id of ctx.projectIds) {
    await ctx.admin.from("projects").delete().eq("id", id);
  }
  for (const id of ctx.userIds) {
    await ctx.admin.auth.admin.deleteUser(id);
  }
});

describe("slugify", () => {
  it("derives kebab-case slugs", () => {
    expect(slugify("My App")).toBe("my-app");
    expect(slugify("  Agent Smith 2.0!  ")).toBe("agent-smith-2-0");
  });
});

describe("project CRUD", () => {
  it("creates a project with derived slug and GitHub binding", async () => {
    const suffix = crypto.randomUUID().slice(0, 8);
    const project = await createProject(
      ctx.admin,
      {
        name: `Test Project ${suffix}`,
        description: "created by tests",
        github_owner: "test-org",
        github_repo: "test-repo",
      },
      ctx.userIds[0]
    );
    ctx.projectIds.push(project.id);

    expect(project.slug).toBe(`test-project-${suffix}`);
    expect(project.github_owner).toBe("test-org");
    expect(project.github_repo).toBe("test-repo");
    expect(project.default_branch).toBe("main");
  });

  it("rejects a duplicate slug with 409", async () => {
    const slug = `dupe-${crypto.randomUUID().slice(0, 8)}`;
    const first = await createProject(
      ctx.admin,
      { name: "First", slug },
      ctx.userIds[0]
    );
    ctx.projectIds.push(first.id);

    await expect(
      createProject(ctx.admin, { name: "Second", slug }, ctx.userIds[0])
    ).rejects.toMatchObject({ status: 409 });
  });

  it("updates the GitHub binding, clearing with null", async () => {
    const project = await createProject(
      ctx.admin,
      {
        name: `Bind ${crypto.randomUUID().slice(0, 8)}`,
        github_owner: "old-org",
        github_repo: "old-repo",
      },
      ctx.userIds[0]
    );
    ctx.projectIds.push(project.id);

    const updated = await updateProject(
      ctx.admin,
      {
        project_id: project.id,
        github_owner: "new-org",
        github_repo: "new-repo",
        default_branch: "develop",
      },
      ctx.userIds[0]
    );
    expect(updated.github_owner).toBe("new-org");
    expect(updated.github_repo).toBe("new-repo");
    expect(updated.default_branch).toBe("develop");

    const cleared = await updateProject(
      ctx.admin,
      { project_id: project.id, github_owner: null, github_repo: null },
      ctx.userIds[0]
    );
    expect(cleared.github_owner).toBeNull();
    expect(cleared.github_repo).toBeNull();
  });

  it("update of nonexistent project → 404", async () => {
    await expect(
      updateProject(
        ctx.admin,
        { project_id: "00000000-0000-4000-8000-0000000000aa", name: "x" },
        ctx.userIds[0]
      )
    ).rejects.toMatchObject({ status: 404 });
  });
});
