import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTicket, updateTicket } from "@/lib/services/tickets";
import { updateTicketSchema } from "@/lib/validations/tickets";
import { errorResponse } from "@/lib/services/errors";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
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
    const { id } = await context.params;
    const body = await request.json();
    const parsed = updateTicketSchema.parse({ ...body, ticket_id: id });
    const supabase = await createClient();
    const ticket = await updateTicket(supabase, parsed);
    return NextResponse.json({ ticket });
  } catch (error) {
    return errorResponse(error);
  }
}
