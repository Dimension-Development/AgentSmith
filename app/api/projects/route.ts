import { NextResponse } from "next/server";
import { createProject, listProjects } from "@/lib/services/projects";
import { createProjectSchema } from "@/lib/validations/projects";
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

export async function POST(request: Request) {
  try {
    const { supabase, userId } = await resolveRequestAuth(request);
    const body = await request.json();
    const parsed = createProjectSchema.parse(body);
    const project = await createProject(supabase, parsed, userId);
    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
