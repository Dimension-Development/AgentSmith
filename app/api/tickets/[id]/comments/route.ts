import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { addComment } from "@/lib/services/tickets";
import { addCommentSchema } from "@/lib/validations/tickets";
import { errorResponse } from "@/lib/services/errors";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const parsed = addCommentSchema.parse({ ...body, ticket_id: id });
    const supabase = await createClient();
    const comment = await addComment(supabase, parsed);
    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
