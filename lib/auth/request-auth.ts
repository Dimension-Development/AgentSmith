import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authenticateApiKey } from "@/lib/services/api-keys";
import { ServiceError } from "@/lib/types";

export type RequestAuth = {
  supabase: SupabaseClient;
  userId: string;
  via: "session" | "api_key";
};

/**
 * Resolve the caller from a Supabase cookie session or Bearer API key (`asm_…`).
 *
 * Both paths return the ADMIN client for data access so session and API-key
 * requests traverse identical service code; only identity provenance differs.
 * Authorization is enforced in the service layer (lib/services/access.ts),
 * with RLS as a read-only backstop. `userId` is always the human owner of the
 * key / session.
 */
export async function resolveRequestAuth(
  request: Request
): Promise<RequestAuth> {
  const header = request.headers.get("authorization");
  const bearer = header?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();

  if (bearer?.startsWith("asm_")) {
    const { userId } = await authenticateApiKey(bearer);
    return {
      supabase: createAdminClient(),
      userId,
      via: "api_key",
    };
  }

  const sessionClient = await createClient();
  const {
    data: { user },
    error,
  } = await sessionClient.auth.getUser();

  if (error || !user) {
    throw new ServiceError("Unauthorized", 401);
  }

  return {
    supabase: createAdminClient(),
    userId: user.id,
    via: "session",
  };
}
