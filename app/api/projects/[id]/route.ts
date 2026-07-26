import { NextResponse } from "next/server";
import { getProjectById, updateProject } from "@/lib/services/projects";
import { updateProjectSchema } from "@/lib/validations/projects";
import { errorResponse } from "@/lib/services/errors";
import { resolveRequestAuth } from "@/lib/auth/request-auth";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase } = await resolveRequestAuth(request);
    const { id } = await context.params;
    const project = await getProjectById(supabase, id);
    return NextResponse.json({ project });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, userId } = await resolveRequestAuth(request);
    const { id } = await context.params;
    const body = await request.json();
    const parsed = updateProjectSchema.parse({ ...body, project_id: id });
    const project = await updateProject(supabase, parsed, userId);
    return NextResponse.json({ project });
  } catch (error) {
    return errorResponse(error);
  }
}
