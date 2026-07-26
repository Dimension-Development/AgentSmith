import { NextResponse } from "next/server";
import { addComment } from "@/lib/services/tickets";
import { addCommentSchema } from "@/lib/validations/tickets";
import { errorResponse } from "@/lib/services/errors";
import { resolveRequestAuth } from "@/lib/auth/request-auth";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, userId } = await resolveRequestAuth(request);
    const { id } = await context.params;
    const body = await request.json();
    const parsed = addCommentSchema.parse({ ...body, ticket_id: id });
    const comment = await addComment(supabase, parsed, userId);
    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
