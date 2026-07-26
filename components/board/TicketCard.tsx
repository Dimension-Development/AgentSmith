import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { Ticket } from "@/lib/types";
import { cn, formatRelativeTime } from "@/lib/utils";

/** Phantom ticket card: square hairline panel, mono ID row, agent pulse. */
export function TicketCard({
  ticket,
  projectSlug,
}: {
  ticket: Ticket;
  projectSlug: string;
}) {
  const shortId = `AS-${ticket.id.slice(0, 4).toUpperCase()}`;
  const claimed = Boolean(ticket.assigned_to);
  const done = ticket.status === "complete";
  const checklistTotal = ticket.checklist.length;
  const checklistDone = ticket.checklist.filter((i) => i.done).length;

  return (
    <Link
      href={`/projects/${projectSlug}/tickets/${ticket.id}`}
      className={cn(
        "flex flex-col gap-3.5 border border-line bg-panel p-4 transition-[border-color,transform,background,opacity] duration-200",
        "hover:-translate-y-0.5 hover:border-line-strong hover:bg-[rgba(236,233,216,.06)]",
        claimed &&
          !done &&
          "border-[rgba(198,214,138,.34)] bg-gradient-to-b from-[rgba(154,173,87,.14)] to-[rgba(236,233,216,.02)] hover:border-[rgba(198,214,138,.7)]",
        done &&
          "border-[rgba(236,233,216,.1)] bg-transparent opacity-60 hover:translate-y-0 hover:opacity-100"
      )}
    >
      <div className="micro flex items-center justify-between gap-2 text-mute">
        <span>{shortId}</span>
        {done && ticket.merged_at ? (
          <Badge variant="merged">Merged</Badge>
        ) : (
          <Badge variant={ticket.type === "bug" ? "bug" : "feature"}>
            {ticket.type === "bug" ? "Bug" : "Feature"}
          </Badge>
        )}
      </div>
      <p className="text-[19px] font-light leading-tight tracking-[-.01em] text-bone">
        {ticket.title}
      </p>
      <div className="micro flex items-center justify-between gap-2 text-mute-dim">
        {claimed && !done ? (
          <span className="inline-flex items-center gap-2 text-olive">
            <span className="agent-dot" />
            {ticket.agent_name || "Assigned"}
            {ticket.claimed_at
              ? ` · ${formatRelativeTime(ticket.claimed_at)}`
              : ""}
          </span>
        ) : (
          <span>{done ? ticket.agent_name || "Complete" : "Unclaimed"}</span>
        )}
        <span>{String(ticket.comment_count ?? 0).padStart(2, "0")}</span>
      </div>
      {claimed && !done && checklistTotal > 0 && (
        <div className="h-0.5 bg-[rgba(236,233,216,.12)]">
          <i
            className="block h-full bg-lime"
            style={{
              width: `${Math.round((checklistDone / checklistTotal) * 100)}%`,
            }}
          />
        </div>
      )}
    </Link>
  );
}
