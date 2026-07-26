import { NextResponse } from "next/server";
import { getTicket, updateTicket } from "@/lib/services/tickets";
import { updateTicketSchema } from "@/lib/validations/tickets";
import { errorResponse } from "@/lib/services/errors";
import { resolveRequestAuth } from "@/lib/auth/request-auth";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase } = await resolveRequestAuth(request);
    const { id } = await context.params;
    const ticket = await getTicket(supabase, id);
    return NextResponse.json(ticket);
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
    const parsed = updateTicketSchema.parse({ ...body, ticket_id: id });
    const ticket = await updateTicket(supabase, parsed, userId);
    return NextResponse.json({ ticket });
  } catch (error) {
    return errorResponse(error);
  }
}
