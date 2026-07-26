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
            className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          >
            ← Back to board
          </a>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {ticket.title}
        </h1>
      </div>

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
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

      <section className="grid gap-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800 sm:grid-cols-2">
        <div>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Ownership
          </h2>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-zinc-500">Assignee</dt>
              <dd className="font-mono text-xs">
                {ticket.assigned_to
                  ? ticket.assigned_to.slice(0, 8) + "…"
                  : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-zinc-500">Agent</dt>
              <dd>{ticket.agent_name || "—"}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-zinc-500">Harness</dt>
              <dd>{ticket.harness_name || "—"}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-zinc-500">Claimed</dt>
              <dd>{formatRelativeTime(ticket.claimed_at)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-zinc-500">Branch</dt>
              <dd className="font-mono text-xs">{ticket.branch_name || "—"}</dd>
            </div>
          </dl>
        </div>
        <div>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            GitHub PR
          </h2>
          {ticket.github_pr_url || ticket.github_pr_number ? (
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-zinc-500">Number</dt>
                <dd>#{ticket.github_pr_number ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-zinc-500">State</dt>
                <dd>{ticket.github_pr_state || "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-zinc-500">Merged at</dt>
                <dd>{formatRelativeTime(ticket.merged_at)}</dd>
              </div>
              {ticket.github_pr_url && (
                <a
                  href={ticket.github_pr_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-sm text-sky-600 hover:underline dark:text-sky-400"
                >
                  Open PR ↗
                </a>
              )}
            </dl>
          ) : (
            <p className="text-sm text-zinc-400">No PR linked yet</p>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
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
          <div className="prose prose-sm dark:prose-invert max-w-none rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            {ticket.description ? (
              <ReactMarkdown>{ticket.description}</ReactMarkdown>
            ) : (
              <p className="text-zinc-400">No description</p>
            )}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
          Comments
        </h2>
        <ul className="space-y-3">
          {ticket.comments.length === 0 && (
            <li className="text-sm text-zinc-400">No comments yet</li>
          )}
          {ticket.comments.map((c) => (
            <li
              key={c.id}
              className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
            >
              <div className="mb-1 flex items-center justify-between text-xs text-zinc-500">
                <span>{c.is_system ? "System" : "Comment"}</span>
                <span>{formatRelativeTime(c.created_at)}</span>
              </div>
              <div className="prose prose-sm dark:prose-invert max-w-none">
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
        <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
          Activity
        </h2>
        <ol className="space-y-2 border-l border-zinc-200 pl-4 dark:border-zinc-800">
          {ticket.activity.length === 0 && (
            <li className="text-sm text-zinc-400">No activity yet</li>
          )}
          {ticket.activity.map((a) => (
            <li key={a.id} className="relative text-sm">
              <span className="absolute -left-[1.3rem] top-1.5 h-2 w-2 rounded-full bg-zinc-300 dark:bg-zinc-600" />
              <p className="text-zinc-800 dark:text-zinc-200">{a.message}</p>
              <p className="text-xs text-zinc-400">
                {a.activity_type} · {formatRelativeTime(a.created_at)}
              </p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
