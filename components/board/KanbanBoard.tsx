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
    <div className="space-y-3">
      {error && (
        <p className="micro border border-[rgba(226,114,74,.55)] bg-[rgba(226,114,74,.12)] px-3 py-2 text-alarm">
          {error}
        </p>
      )}
      <div className="overflow-x-auto pb-4">
        <div className="grid min-w-[1200px] grid-cols-5 gap-px border border-line bg-line backdrop-blur-xl">
          {TICKET_STATUSES.map((status) => {
            const columnTickets = items.filter((t) => t.status === status);
            return (
              <section
                key={status}
                className={cn(
                  "flex flex-col gap-4 bg-[rgba(12,14,8,.55)] p-5 pb-6 transition-colors",
                  dragOver === status && "bg-[rgba(28,32,16,.7)]"
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
                <header className="micro flex items-center justify-between text-mute">
                  <h2>{STATUS_LABELS[status]}</h2>
                  <span className="text-mute-dim">
                    {String(columnTickets.length).padStart(2, "0")}
                  </span>
                </header>
                <div className="flex min-h-[120px] flex-1 flex-col gap-3">
                  {columnTickets.map((ticket) => (
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
                  ))}
                  {(columnTickets.length === 0 || dragOver === status) && (
                    <div className="micro border border-dashed border-line px-4 py-6 text-center text-mute-dim">
                      {dragOver === status ? "Drop a ticket here" : "Empty"}
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
