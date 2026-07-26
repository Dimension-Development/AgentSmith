import { NextResponse } from "next/server";
import { claimTicket } from "@/lib/services/tickets";
import { claimTicketSchema } from "@/lib/validations/tickets";
import { errorResponse } from "@/lib/services/errors";
import { resolveRequestAuth } from "@/lib/auth/request-auth";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, userId } = await resolveRequestAuth(request);
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const parsed = claimTicketSchema.parse({ ...body, ticket_id: id });
    const ticket = await claimTicket(supabase, parsed, userId);
    return NextResponse.json({ ticket });
  } catch (error) {
    return errorResponse(error);
  }
}
