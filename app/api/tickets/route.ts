import { NextResponse } from "next/server";
import { createTicket, listTickets } from "@/lib/services/tickets";
import { createTicketSchema, listTicketsSchema } from "@/lib/validations/tickets";
import { errorResponse } from "@/lib/services/errors";
import { resolveRequestAuth } from "@/lib/auth/request-auth";

export async function GET(request: Request) {
  try {
    const { supabase } = await resolveRequestAuth(request);
    const { searchParams } = new URL(request.url);
    const parsed = listTicketsSchema.parse({
      project_id: searchParams.get("project_id") || undefined,
      project_slug: searchParams.get("project_slug") || undefined,
      status: searchParams.get("status") || undefined,
      limit: searchParams.get("limit") || undefined,
      before: searchParams.get("before") || undefined,
    });
    const tickets = await listTickets(supabase, parsed);
    return NextResponse.json({ tickets });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, userId } = await resolveRequestAuth(request);
    const body = await request.json();
    const parsed = createTicketSchema.parse(body);
    const ticket = await createTicket(supabase, parsed, userId);
    return NextResponse.json({ ticket }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
