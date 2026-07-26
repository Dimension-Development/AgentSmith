import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listProjects } from "@/lib/services/projects";
import { errorResponse } from "@/lib/services/errors";

export async function GET() {
  try {
    const supabase = await createClient();
    const projects = await listProjects(supabase);
    return NextResponse.json({ projects });
  } catch (error) {
    return errorResponse(error);
  }
}
