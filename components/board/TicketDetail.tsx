"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  STATUS_LABELS,
  TICKET_STATUSES,
  type TicketDetail as TicketDetailType,
  type TicketStatus,
} from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils";

export function TicketDetail({
  ticket,
  projectSlug,
}: {
  ticket: TicketDetailType;
  projectSlug: string;
}) {
  const router = useRouter();
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [description, setDescription] = useState(ticket.description);
  const [editingDescription, setEditingDescription] = useState(false);

  async function claim() {
    setLoading("claim");
    setError(null);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_name: "Human", harness_name: "web" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Claim failed");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Claim failed");
    } finally {
      setLoading(null);
    }
  }

  async function move(status: TicketStatus) {
    setLoading(`move:${status}`);
    setError(null);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Move failed");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Move failed");
    } finally {
      setLoading(null);
    }
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim()) return;
    setLoading("comment");
    setError(null);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: comment }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Comment failed");
      setComment("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Comment failed");
    } finally {
      setLoading(null);
    }
  }

  async function saveDescription() {
    setLoading("description");
    setError(null);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      setEditingDescription(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setLoading(null);
    }
  }

  const moveTargets = TICKET_STATUSES.filter((s) => {
    if (s === ticket.status) return false;
    // Block open → in_progress without claim
    if (ticket.status === "open" && s === "in_progress") return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={ticket.type === "bug" ? "bug" : "feature"}>
            {ticket.type === "bug" ? "Bug" : "Feature"}
          </Badge>
          <Badge variant="muted">{STATUS_LABELS[ticket.status]}</Badge>
          <a
            href={`/projects/${projectSlug}`}
            className="micro text-mute hover:text-bone"
          >
            ← Back to board
          </a>
        </div>
        <h1 className="display text-[clamp(34px,5vw,60px)] normal-case">
          {ticket.title}
        </h1>
      </div>

      {error && (
        <p className="micro border border-[rgba(226,114,74,.55)] bg-[rgba(226,114,74,.12)] px-3 py-2 text-alarm">
          {error}
        </p>
      )}

      <section className="flex flex-wrap gap-2">
        {ticket.status === "open" && (
          <Button onClick={claim} disabled={loading === "claim"}>
            {loading === "claim" ? "Claiming…" : "Claim ticket"}
          </Button>
        )}
        {moveTargets.map((status) => (
          <Button
            key={status}
            variant="outline"
            size="sm"
            disabled={loading === `move:${status}`}
            onClick={() => move(status)}
          >
            Move to {STATUS_LABELS[status]}
          </Button>
        ))}
      </section>

      <section className="grid gap-6 border border-line bg-panel p-5 sm:grid-cols-2">
        <div>
          <h2 className="micro mb-3 text-mute-dim">
            Ownership
          </h2>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="micro text-mute-dim">Assignee</dt>
              <dd className="font-mono text-xs text-bone-dim">
                {ticket.assigned_to
                  ? ticket.assigned_to.slice(0, 8) + "…"
                  : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="micro text-mute-dim">Agent</dt>
              <dd>{ticket.agent_name || "—"}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="micro text-mute-dim">Harness</dt>
              <dd>{ticket.harness_name || "—"}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="micro text-mute-dim">Claimed</dt>
              <dd>{formatRelativeTime(ticket.claimed_at)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="micro text-mute-dim">Branch</dt>
              <dd className="font-mono text-xs text-bone-dim">{ticket.branch_name || "—"}</dd>
            </div>
          </dl>
        </div>
        <div>
          <h2 className="micro mb-3 text-mute-dim">
            GitHub PR
          </h2>
          {ticket.github_pr_url || ticket.github_pr_number ? (
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="micro text-mute-dim">Number</dt>
                <dd>#{ticket.github_pr_number ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="micro text-mute-dim">State</dt>
                <dd>{ticket.github_pr_state || "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="micro text-mute-dim">Merged at</dt>
                <dd>{formatRelativeTime(ticket.merged_at)}</dd>
              </div>
              {ticket.github_pr_url && (
                <a
                  href={ticket.github_pr_url}
                  target="_blank"
                  rel="noreferrer"
                  className="micro mt-2 inline-block text-teal hover:underline"
                >
                  Open PR ↗
                </a>
              )}
            </dl>
          ) : (
            <p className="text-sm text-mute-dim">No PR linked yet</p>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="micro text-mute">
            Description
          </h2>
          {!editingDescription ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditingDescription(true)}
            >
              Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDescription(ticket.description);
                  setEditingDescription(false);
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={saveDescription}
                disabled={loading === "description"}
              >
                Save
              </Button>
            </div>
          )}
        </div>
        {editingDescription ? (
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={8}
          />
        ) : (
          <div className="prose prose-sm max-w-none border border-line bg-panel p-4 text-bone-dim">
            {ticket.description ? (
              <ReactMarkdown>{ticket.description}</ReactMarkdown>
            ) : (
              <p className="text-mute-dim">No description</p>
            )}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="micro text-mute">
          Comments
        </h2>
        <ul className="space-y-3">
          {ticket.comments.length === 0 && (
            <li className="text-sm text-mute-dim">No comments yet</li>
          )}
          {ticket.comments.map((c) => (
            <li
              key={c.id}
              className="border border-line bg-panel p-3"
            >
              <div className="micro mb-1 flex items-center justify-between text-mute-dim">
                <span>{c.is_system ? "System" : "Comment"}</span>
                <span>{formatRelativeTime(c.created_at)}</span>
              </div>
              <div className="prose prose-sm max-w-none text-bone-dim">
                <ReactMarkdown>{c.body}</ReactMarkdown>
              </div>
            </li>
          ))}
        </ul>
        <form onSubmit={submitComment} className="space-y-2">
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add a comment…"
            rows={3}
          />
          <Button type="submit" disabled={loading === "comment" || !comment.trim()}>
            {loading === "comment" ? "Posting…" : "Post comment"}
          </Button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="micro text-mute">
          Activity
        </h2>
        <ol className="space-y-3 border-l border-line pl-4">
          {ticket.activity.length === 0 && (
            <li className="text-sm text-mute-dim">No activity yet</li>
          )}
          {ticket.activity.map((a) => (
            <li key={a.id} className="relative text-sm">
              <span className="absolute -left-[1.3rem] top-1.5 h-2 w-2 rounded-full bg-mute-dim" />
              <p className="text-bone-dim">{a.message}</p>
              <p className="micro text-mute-dim">
                {a.activity_type} · {formatRelativeTime(a.created_at)}
              </p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
