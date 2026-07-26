"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { TicketType } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Full-screen New Ticket takeover (Phantom). */
export function CreateTicketDialog({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<TicketType>("feature");
  const [column, setColumn] = useState<"backlog" | "open">("backlog");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId, title, description, type }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create ticket");
      }
      // Tickets always land in backlog; promote when the requester says so.
      if (column === "open") {
        await fetch(`/api/tickets/${data.ticket.id}/move`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "open" }),
        });
      }
      setOpen(false);
      setTitle("");
      setDescription("");
      setType("feature");
      setColumn("backlog");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create ticket");
    } finally {
      setLoading(false);
    }
  }

  const typePill = (value: TicketType, label: string, activeCls: string) => (
    <button
      type="button"
      onClick={() => setType(value)}
      className={cn(
        "micro rounded-full border px-4 py-2 transition-colors",
        type === value
          ? activeCls
          : "border-line text-mute hover:border-line-strong"
      )}
    >
      {label}
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>New ticket</Button>
      </DialogTrigger>
      <DialogContent className="h-screen max-h-screen w-screen max-w-none grid-rows-[auto_1fr] gap-0 border-0 bg-[rgba(10,12,7,.9)] p-0">
        <div className="micro flex items-center justify-between px-8 py-6 text-mute">
          <span />
          <span className="text-bone">New ticket</span>
          <span className="text-mute-dim">Esc to cancel</span>
        </div>
        <div className="overflow-y-auto px-6 pb-16">
          <form
            onSubmit={onSubmit}
            className="relative mx-auto grid max-w-[1000px] gap-9 border border-line bg-[rgba(16,18,8,.7)] p-8 sm:p-12"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-4">
              <DialogTitle className="text-[clamp(40px,6vw,84px)]">
                New ticket
              </DialogTitle>
              <span className="micro text-mute-dim">Draft</span>
            </div>
            <div className="space-y-3">
              <Label htmlFor="ticket-title">Title</Label>
              <Input
                id="ticket-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={200}
                placeholder="Short, clear request"
              />
            </div>
            <div className="space-y-3">
              <Label htmlFor="ticket-description">Description</Label>
              <Textarea
                id="ticket-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the failure, expected behaviour and any reproduction steps the agent should follow…"
                rows={3}
              />
            </div>
            <div className="grid gap-8 sm:grid-cols-2">
              <div className="space-y-3">
                <Label>Type</Label>
                <div className="flex gap-2.5">
                  {typePill(
                    "bug",
                    "Bug",
                    "border-[rgba(240,180,92,.7)] text-amber"
                  )}
                  {typePill(
                    "feature",
                    "Feature",
                    "border-[rgba(198,214,138,.7)] text-olive"
                  )}
                </div>
              </div>
              <div className="space-y-3">
                <Label htmlFor="ticket-column">Column</Label>
                <select
                  id="ticket-column"
                  value={column}
                  onChange={(e) =>
                    setColumn(e.target.value as "backlog" | "open")
                  }
                  className="micro w-full cursor-pointer border-0 border-b border-line-strong bg-transparent pb-3 text-bone focus:border-olive focus:outline-none"
                >
                  <option value="backlog" className="bg-ink">
                    Backlog
                  </option>
                  <option value="open" className="bg-ink">
                    Open — ready for agents
                  </option>
                </select>
              </div>
            </div>
            {error && <p className="micro text-alarm">{error}</p>}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <span className="micro text-mute-dim">
                {column === "open"
                  ? "Agents can claim this immediately"
                  : "Stays in backlog until promoted"}
              </span>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading || !title.trim()}>
                  {loading ? "Creating…" : "Create ticket"}
                </Button>
              </div>
            </div>
            {/* Light cone from the sphere below (decorative) */}
            <div className="sphere pointer-events-none absolute -bottom-64 left-1/2 -z-10 h-96 w-96 -translate-x-1/2 opacity-50" />
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
