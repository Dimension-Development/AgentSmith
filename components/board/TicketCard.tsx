import Link from "next/link";
import { MessageSquare, Bot } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Ticket } from "@/lib/types";
import { cn } from "@/lib/utils";

export function TicketCard({
  ticket,
  projectSlug,
}: {
  ticket: Ticket;
  projectSlug: string;
}) {
  return (
    <Link
      href={`/projects/${projectSlug}/tickets/${ticket.id}`}
      className={cn(
        "block rounded-lg border border-zinc-200 bg-white p-3 shadow-sm transition hover:border-zinc-300 hover:shadow dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug text-zinc-900 dark:text-zinc-50">
          {ticket.title}
        </p>
        <Badge variant={ticket.type === "bug" ? "bug" : "feature"}>
          {ticket.type === "bug" ? "Bug" : "Feature"}
        </Badge>
      </div>
      <div className="flex items-center justify-between gap-2 text-xs text-zinc-500">
        <div className="flex min-w-0 items-center gap-1">
          {(ticket.agent_name || ticket.assigned_to) && (
            <>
              <Bot className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">
                {ticket.agent_name || "Assigned"}
              </span>
            </>
          )}
        </div>
        <span className="inline-flex items-center gap-1 shrink-0">
          <MessageSquare className="h-3.5 w-3.5" />
          {ticket.comment_count ?? 0}
        </span>
      </div>
    </Link>
  );
}
