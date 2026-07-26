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
 * API-key path uses the service-role client so RLS does not block agent actions;
 * `userId` is always the human owner of the key / session.
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

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new ServiceError("Unauthorized", 401);
  }

  return {
    supabase,
    userId: user.id,
    via: "session",
  };
}
