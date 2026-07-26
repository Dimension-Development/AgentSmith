import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Integration-test helpers. Everything runs against the LOCAL Supabase stack
 * with the service-role client — the same client shape the service layer uses
 * in production (Plan 03: services are the authorization authority).
 */
export function adminClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export type TestContext = {
  admin: SupabaseClient;
  projectId: string;
  userIds: string[];
};

export async function createTestUser(
  admin: SupabaseClient,
  label: string
): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email: `test-${label}-${randomUUID()}@test.local`,
    email_confirm: true,
  });
  if (error || !data.user) {
    throw new Error(`createTestUser failed: ${error?.message}`);
  }
  return data.user.id;
}

export async function createTestProject(
  admin: SupabaseClient
): Promise<string> {
  const { data, error } = await admin
    .from("projects")
    .insert({
      name: `Test ${randomUUID().slice(0, 8)}`,
      slug: `test-${randomUUID()}`,
      description: "integration test project",
    })
    .select("id")
    .single();
  if (error) {
    throw new Error(`createTestProject failed: ${error.message}`);
  }
  return data.id as string;
}

export async function setupContext(userCount = 1): Promise<TestContext> {
  const admin = adminClient();
  const projectId = await createTestProject(admin);
  const userIds: string[] = [];
  for (let i = 0; i < userCount; i++) {
    userIds.push(await createTestUser(admin, `u${i}`));
  }
  return { admin, projectId, userIds };
}

export async function teardownContext(ctx: TestContext): Promise<void> {
  // Project delete cascades tickets → comments/activity.
  await ctx.admin.from("projects").delete().eq("id", ctx.projectId);
  for (const id of ctx.userIds) {
    await ctx.admin.auth.admin.deleteUser(id);
  }
}

export async function activityTypes(
  ctx: TestContext,
  ticketId: string
): Promise<string[]> {
  const { data, error } = await ctx.admin
    .from("activity_log")
    .select("activity_type")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => r.activity_type as string);
}
