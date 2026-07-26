import { NextResponse } from "next/server";
import { z } from "zod";
import { createApiKey, listApiKeys } from "@/lib/services/api-keys";
import { errorResponse } from "@/lib/services/errors";
import { resolveRequestAuth } from "@/lib/auth/request-auth";
import { ServiceError } from "@/lib/types";

const createSchema = z.object({
  name: z.string().min(1).max(100),
});

export async function GET(request: Request) {
  try {
    const { supabase, userId, via } = await resolveRequestAuth(request);
    if (via === "api_key") {
      throw new ServiceError("Manage API keys from the web UI session", 403);
    }
    const keys = await listApiKeys(supabase, userId);
    return NextResponse.json({ keys });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, userId, via } = await resolveRequestAuth(request);
    if (via === "api_key") {
      throw new ServiceError("Create API keys from the web UI session", 403);
    }
    const body = await request.json();
    const parsed = createSchema.parse(body);
    const key = await createApiKey(supabase, userId, parsed.name);
    return NextResponse.json({ key }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
