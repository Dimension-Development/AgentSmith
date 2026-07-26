import { NextResponse } from "next/server";
import { revokeApiKey } from "@/lib/services/api-keys";
import { errorResponse } from "@/lib/services/errors";
import { resolveRequestAuth } from "@/lib/auth/request-auth";
import { ServiceError } from "@/lib/types";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, userId, via } = await resolveRequestAuth(request);
    if (via === "api_key") {
      throw new ServiceError("Revoke API keys from the web UI session", 403);
    }
    const { id } = await context.params;
    await revokeApiKey(supabase, userId, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
