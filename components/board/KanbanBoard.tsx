import { TICKET_STATUSES, STATUS_LABELS, type Ticket } from "@/lib/types";
import { TicketCard } from "@/components/board/TicketCard";

export function KanbanBoard({
  tickets,
  projectSlug,
}: {
  tickets: Ticket[];
  projectSlug: string;
}) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {TICKET_STATUSES.map((status) => {
        const columnTickets = tickets.filter((t) => t.status === status);
        return (
          <section
            key={status}
            className="flex w-72 shrink-0 flex-col rounded-xl bg-zinc-50/80 dark:bg-zinc-900/50"
          >
            <header className="flex items-center justify-between px-3 py-3">
              <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                {STATUS_LABELS[status]}
              </h2>
              <span className="rounded-full bg-zinc-200/80 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                {columnTickets.length}
              </span>
            </header>
            <div className="flex flex-1 flex-col gap-2 px-2 pb-3 min-h-[120px]">
              {columnTickets.length === 0 ? (
                <p className="px-2 py-6 text-center text-xs text-zinc-400">
                  No tickets
                </p>
              ) : (
                columnTickets.map((ticket) => (
                  <TicketCard
                    key={ticket.id}
                    ticket={ticket}
                    projectSlug={projectSlug}
                  />
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
