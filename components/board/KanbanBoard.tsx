"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  TICKET_STATUSES,
  STATUS_LABELS,
  type Ticket,
  type TicketStatus,
} from "@/lib/types";
import { TicketCard } from "@/components/board/TicketCard";
import { cn } from "@/lib/utils";

type DragPayload = { ticketId: string; from: TicketStatus };

export function KanbanBoard({
  tickets,
  projectSlug,
}: {
  tickets: Ticket[];
  projectSlug: string;
}) {
  const router = useRouter();
  // Local copy so drops render instantly; server refreshes re-sync via props.
  const [items, setItems] = useState(tickets);
  const [dragOver, setDragOver] = useState<TicketStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const errorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setItems(tickets);
  }, [tickets]);

  useEffect(() => {
    return () => {
      if (errorTimer.current) clearTimeout(errorTimer.current);
    };
  }, []);

  function showError(message: string) {
    setError(message);
    if (errorTimer.current) clearTimeout(errorTimer.current);
    errorTimer.current = setTimeout(() => setError(null), 5000);
  }

  async function handleDrop(payload: DragPayload, to: TicketStatus) {
    const { ticketId, from } = payload;
    if (from === to) return;

    const previous = items;
    setItems((current) =>
      current.map((t) => (t.id === ticketId ? { ...t, status: to } : t))
    );

    try {
      // Dragging Open → In Progress is a claim (PRD: that transition is
      // claim-only); the current user becomes the assignee.
      const isClaim = from === "open" && to === "in_progress";
      const res = await fetch(
        isClaim
          ? `/api/tickets/${ticketId}/claim`
          : `/api/tickets/${ticketId}/move`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(isClaim ? {} : { status: to }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to move ticket");
      }
      router.refresh();
    } catch (err) {
      setItems(previous);
      showError(err instanceof Error ? err.message : "Failed to move ticket");
    }
  }

  return (
    <div className="space-y-2">
      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {TICKET_STATUSES.map((status) => {
          const columnTickets = items.filter((t) => t.status === status);
          return (
            <section
              key={status}
              className={cn(
                "flex w-72 shrink-0 flex-col rounded-xl bg-zinc-50/80 transition-colors dark:bg-zinc-900/50",
                dragOver === status &&
                  "bg-zinc-100 ring-2 ring-zinc-300 dark:bg-zinc-900 dark:ring-zinc-700"
              )}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setDragOver(status);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setDragOver(null);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(null);
                try {
                  const payload = JSON.parse(
                    e.dataTransfer.getData("application/x-agentsmith-ticket")
                  ) as DragPayload;
                  if (payload?.ticketId) void handleDrop(payload, status);
                } catch {
                  // Foreign drag (text, file, …) — ignore.
                }
              }}
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
                    <div
                      key={ticket.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData(
                          "application/x-agentsmith-ticket",
                          JSON.stringify({
                            ticketId: ticket.id,
                            from: ticket.status,
                          } satisfies DragPayload)
                        );
                      }}
                      className="cursor-grab active:cursor-grabbing"
                    >
                      <TicketCard ticket={ticket} projectSlug={projectSlug} />
                    </div>
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
