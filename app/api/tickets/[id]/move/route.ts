import { NextResponse } from "next/server";
import { moveTicket } from "@/lib/services/tickets";
import { moveTicketSchema } from "@/lib/validations/tickets";
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
    const parsed = moveTicketSchema.parse({ ...body, ticket_id: id });
    const ticket = await moveTicket(supabase, parsed, userId);
    return NextResponse.json({ ticket });
  } catch (error) {
    return errorResponse(error);
  }
}
