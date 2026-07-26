import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { moveTicket } from "@/lib/services/tickets";
import { moveTicketSchema } from "@/lib/validations/tickets";
import { errorResponse } from "@/lib/services/errors";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const parsed = moveTicketSchema.parse({ ...body, ticket_id: id });
    const supabase = await createClient();
    const ticket = await moveTicket(supabase, parsed);
    return NextResponse.json({ ticket });
  } catch (error) {
    return errorResponse(error);
  }
}
