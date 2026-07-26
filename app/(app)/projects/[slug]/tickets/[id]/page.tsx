import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTicket } from "@/lib/services/tickets";
import { getProjectBySlug } from "@/lib/services/projects";
import { TicketDetail } from "@/components/board/TicketDetail";
import { ServiceError } from "@/lib/types";

export default async function TicketPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const supabase = await createClient();

  try {
    await getProjectBySlug(supabase, slug);
    const ticket = await getTicket(supabase, id);
    return <TicketDetail ticket={ticket} projectSlug={slug} />;
  } catch (e) {
    if (e instanceof ServiceError && e.status === 404) notFound();
    throw e;
  }
}
