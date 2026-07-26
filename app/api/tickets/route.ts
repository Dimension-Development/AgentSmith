import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createTicket, listTickets } from "@/lib/services/tickets";
import { createTicketSchema, listTicketsSchema } from "@/lib/validations/tickets";
import { errorResponse } from "@/lib/services/errors";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = listTicketsSchema.parse({
      project_id: searchParams.get("project_id") || undefined,
      project_slug: searchParams.get("project_slug") || undefined,
      status: searchParams.get("status") || undefined,
    });
    const supabase = await createClient();
    const tickets = await listTickets(supabase, parsed);
    return NextResponse.json({ tickets });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createTicketSchema.parse(body);
    const supabase = await createClient();
    const ticket = await createTicket(supabase, parsed);
    return NextResponse.json({ ticket }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
