"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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

function clock(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

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

  const shortId = `AS-${ticket.id.slice(0, 4).toUpperCase()}`;
  const claimed = Boolean(ticket.assigned_to);
  const checklistTotal = ticket.checklist.length;
  const checklistDone = ticket.checklist.filter((i) => i.done).length;
  const checklistPct =
    checklistTotal > 0
      ? Math.round((checklistDone / checklistTotal) * 100)
      : null;

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
    <div className="space-y-10 pb-24">
      {/* Top strip: breadcrumb centre, type + status right */}
      <div className="micro grid grid-cols-2 items-center gap-2 text-mute sm:grid-cols-3">
        <span />
        <span className="hidden sm:block sm:text-center">
          <Link href={`/projects/${projectSlug}`} className="hover:text-bone">
            ← Board
          </Link>{" "}
          <span className="text-mute-dim">/</span> {shortId}
        </span>
        <span className="flex items-center justify-end gap-2.5">
          <Badge variant={ticket.type === "bug" ? "bug" : "feature"}>
            {ticket.type === "bug" ? "Bug" : "Feature"}
          </Badge>
          <span>{STATUS_LABELS[ticket.status]}</span>
          {ticket.status === "in_progress" && <span className="agent-dot" />}
        </span>
      </div>

      {error && (
        <p className="micro border border-[rgba(226,114,74,.55)] bg-[rgba(226,114,74,.12)] px-3 py-2 text-alarm">
          {error}
        </p>
      )}

      <div className="grid gap-12 lg:grid-cols-[1fr_320px]">
        {/* Main column */}
        <div className="space-y-8">
          <h1 className="display max-w-[14ch] text-[clamp(44px,6.5vw,96px)]">
            {ticket.title}
          </h1>

          {editingDescription ? (
            <div className="space-y-3">
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={8}
              />
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
                  variant="outline"
                  size="sm"
                  onClick={saveDescription}
                  disabled={loading === "description"}
                >
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <div className="prose prose-sm max-w-[640px] text-[17px] font-light leading-relaxed text-bone-dim">
              {ticket.description ? (
                <ReactMarkdown>{ticket.description}</ReactMarkdown>
              ) : (
                <p className="text-mute-dim">No description</p>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2.5">
            {ticket.status === "open" && (
              <Button onClick={claim} disabled={loading === "claim"} size="sm">
                {loading === "claim" ? "Claiming…" : "Claim ticket"}
              </Button>
            )}
            {ticket.github_pr_url && (
              <Button variant="outline" size="sm" asChild>
                <a href={ticket.github_pr_url} target="_blank" rel="noreferrer">
                  Open diff ↗
                </a>
              </Button>
            )}
            {claimed && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => move("open")}
                disabled={loading === "move:open"}
              >
                Release claim
              </Button>
            )}
            {!editingDescription && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingDescription(true)}
              >
                Edit description
              </Button>
            )}
            {moveTargets
              .filter((s) => !(claimed && s === "open"))
              .map((status) => (
                <Button
                  key={status}
                  variant="ghost"
                  size="sm"
                  disabled={loading === `move:${status}`}
                  onClick={() => move(status)}
                >
                  Move to {STATUS_LABELS[status]}
                </Button>
              ))}
          </div>

          {/* Timeline: activity log, newest first */}
          <div className="border-t border-line">
            {ticket.activity.length === 0 && (
              <p className="micro py-4 text-mute-dim">No activity yet</p>
            )}
            {ticket.activity.map((a) => {
              const agent =
                typeof a.metadata?.agent_name === "string"
                  ? a.metadata.agent_name
                  : null;
              return (
                <div
                  key={a.id}
                  className="grid grid-cols-[64px_150px_1fr] items-baseline gap-4 border-b border-line py-3.5"
                >
                  <span className="micro text-mute-dim">
                    {clock(a.created_at)}
                  </span>
                  <span className="micro text-mute">
                    {agent ?? a.activity_type.replace(/_/g, " ")}
                  </span>
                  <span className="text-[15px] font-light text-bone-dim">
                    {a.message}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Comments */}
          <section className="space-y-4">
            <h2 className="micro text-mute">Comments</h2>
            <ul className="space-y-3">
              {ticket.comments.length === 0 && (
                <li className="text-sm text-mute-dim">No comments yet</li>
              )}
              {ticket.comments.map((c) => (
                <li key={c.id} className="border border-line bg-panel p-4">
                  <div className="micro mb-2 flex items-center justify-between text-mute-dim">
                    <span>{c.is_system ? "System" : "Comment"}</span>
                    <span>{formatRelativeTime(c.created_at)}</span>
                  </div>
                  <div className="prose prose-sm max-w-none text-bone-dim">
                    <ReactMarkdown>{c.body}</ReactMarkdown>
                  </div>
                </li>
              ))}
            </ul>
            <form onSubmit={submitComment} className="space-y-3">
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a comment…"
                rows={3}
              />
              <Button
                type="submit"
                variant="outline"
                size="sm"
                disabled={loading === "comment" || !comment.trim()}
              >
                {loading === "comment" ? "Posting…" : "Comment"}
              </Button>
            </form>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-8 border-line lg:border-l lg:pl-10">
          <div className="space-y-3">
            <h2 className="micro text-mute-dim">Claimed by</h2>
            {claimed ? (
              <>
                <p className="text-[26px] font-light text-bone">
                  {ticket.agent_name || "Assigned"}
                </p>
                <p className="micro text-mute">
                  Running {formatRelativeTime(ticket.claimed_at)}
                  {ticket.harness_name ? ` · ${ticket.harness_name}` : ""}
                </p>
                {checklistPct !== null && (
                  <div className="h-0.5 bg-[rgba(236,233,216,.12)]">
                    <i
                      className="block h-full bg-lime"
                      style={{ width: `${checklistPct}%` }}
                    />
                  </div>
                )}
              </>
            ) : (
              <p className="micro text-mute">Unclaimed</p>
            )}
          </div>

          <dl className="micro grid grid-cols-2 gap-x-6 gap-y-5">
            <div>
              <dt className="text-mute-dim">Branch</dt>
              <dd className="mt-1 break-all text-bone-dim">
                {ticket.branch_name || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-mute-dim">Opened</dt>
              <dd className="mt-1 text-bone-dim">
                {formatRelativeTime(ticket.created_at)}
              </dd>
            </div>
            <div>
              <dt className="text-mute-dim">Reporter</dt>
              <dd className="mt-1 text-bone-dim">
                {ticket.created_by ? ticket.created_by.slice(0, 8) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-mute-dim">Comments</dt>
              <dd className="mt-1 text-bone-dim">
                {String(ticket.comments.length).padStart(2, "0")}
              </dd>
            </div>
            <div>
              <dt className="text-mute-dim">PR</dt>
              <dd className="mt-1 text-bone-dim">
                {ticket.github_pr_number ? (
                  <a
                    href={ticket.github_pr_url ?? undefined}
                    target="_blank"
                    rel="noreferrer"
                    className="text-teal hover:underline"
                  >
                    #{ticket.github_pr_number} · {ticket.github_pr_state}
                  </a>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-mute-dim">Merged</dt>
              <dd className="mt-1 text-bone-dim">
                {formatRelativeTime(ticket.merged_at)}
              </dd>
            </div>
          </dl>

          {checklistTotal > 0 && (
            <div className="space-y-3">
              <h2 className="micro text-mute-dim">
                Checklist {checklistDone}/{checklistTotal}
              </h2>
              <ul className="space-y-2">
                {ticket.checklist.map((item) => (
                  <li
                    key={item.id}
                    className="micro flex items-start gap-2.5 text-bone-dim"
                  >
                    <span
                      className={
                        item.done
                          ? "mt-[3px] h-1.5 w-1.5 shrink-0 rounded-full bg-lime"
                          : "mt-[3px] h-1.5 w-1.5 shrink-0 rounded-full border border-mute"
                      }
                    />
                    <span className={item.done ? "line-through opacity-60" : ""}>
                      {item.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
