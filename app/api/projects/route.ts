import { NextResponse } from "next/server";
import { listProjects } from "@/lib/services/projects";
import { errorResponse } from "@/lib/services/errors";
import { resolveRequestAuth } from "@/lib/auth/request-auth";

export async function GET(request: Request) {
  try {
    const { supabase } = await resolveRequestAuth(request);
    const projects = await listProjects(supabase);
    return NextResponse.json({ projects });
  } catch (error) {
    return errorResponse(error);
  }
}
