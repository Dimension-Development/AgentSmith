import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { claimTicket } from "@/lib/services/tickets";
import { claimTicketSchema } from "@/lib/validations/tickets";
import { errorResponse } from "@/lib/services/errors";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const parsed = claimTicketSchema.parse({ ...body, ticket_id: id });
    const supabase = await createClient();
    const ticket = await claimTicket(supabase, parsed);
    return NextResponse.json({ ticket });
  } catch (error) {
    return errorResponse(error);
  }
}
