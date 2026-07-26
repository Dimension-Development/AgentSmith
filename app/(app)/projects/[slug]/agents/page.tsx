import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProjectBySlug } from "@/lib/services/projects";
import { listTickets } from "@/lib/services/tickets";
import { PillNav } from "@/components/PillNav";
import { ServiceError, type Ticket } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils";

/* Sphere gradients cycle per agent (olive / amber / teal — from foundations). */
const SPHERES = [
  "radial-gradient(circle at 38% 22%, #f0f2cd, #d8e0a2 18%, #9aad57 44%, #4d5c14 70%, #21280b)",
  "radial-gradient(circle at 36% 24%, #ffe7b0, #f2b45c 26%, #c07316 56%, #4a2606 82%, #1a1207)",
  "radial-gradient(circle at 34% 24%, #bff0e2, #4fcbb0 50%, #14705f)",
];

type AgentRow = {
  name: string;
  harness: string | null;
  working: boolean;
  ticket: Ticket | null;
  shipped: number;
};

/** Agents are derived from ticket claims — no separate roster exists (yet). */
function deriveAgents(tickets: Ticket[]): AgentRow[] {
  const byName = new Map<string, AgentRow>();
  for (const t of tickets) {
    if (!t.agent_name) continue;
    const existing = byName.get(t.agent_name) ?? {
      name: t.agent_name,
      harness: t.harness_name,
      working: false,
      ticket: null,
      shipped: 0,
    };
    if (t.status === "in_progress" && t.assigned_to) {
      existing.working = true;
      existing.ticket = t;
      existing.harness = t.harness_name ?? existing.harness;
    }
    if (t.status === "complete") existing.shipped += 1;
    byName.set(t.agent_name, existing);
  }
  return [...byName.values()].sort(
    (a, b) => Number(b.working) - Number(a.working) || a.name.localeCompare(b.name)
  );
}

function checklistPct(t: Ticket | null): number | null {
  if (!t || t.checklist.length === 0) return null;
  return Math.round(
    (t.checklist.filter((i) => i.done).length / t.checklist.length) * 100
  );
}

export default async function AgentsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  let project;
  try {
    project = await getProjectBySlug(supabase, slug);
  } catch (e) {
    if (e instanceof ServiceError && e.status === 404) notFound();
    throw e;
  }

  const tickets = await listTickets(supabase, { project_id: project.id });
  const agents = deriveAgents(tickets);
  const working = agents.filter((a) => a.working).length;
  const shipped = tickets.filter((t) => t.status === "complete").length;

  return (
    <div className="space-y-10 pb-24">
      <div className="micro grid grid-cols-1 gap-2 text-mute sm:grid-cols-3">
        <span />
        <div className="flex items-center gap-2.5 sm:justify-center">
          {working > 0 && <span className="agent-dot" />}
          <span>Agents [{working} active]</span>
        </div>
        <div className="sm:text-right">
          <Link
            href="/settings/api-keys"
            className="inline-flex h-11 items-center rounded-full bg-[#f4f2e4] px-6 font-sans text-base normal-case tracking-normal text-[#14150f] hover:bg-white"
          >
            Connect agent
          </Link>
        </div>
      </div>

      <div className="relative flex flex-wrap items-end justify-between gap-6">
        <h1 className="display text-[clamp(56px,9vw,130px)]">Agents</h1>
        <span className="micro pb-4 text-right leading-[1.8] text-mute">
          {agents.length} connected
          <br />
          {working} working
          <br />
          {shipped} tickets shipped
        </span>
      </div>

      {agents.length === 0 ? (
        <div className="micro border border-dashed border-line px-4 py-16 text-center text-mute-dim">
          No agents have claimed tickets yet — connect one via an API key
        </div>
      ) : (
        <div className="border-t border-line">
          <div className="micro grid grid-cols-[1fr_140px_1fr_120px] gap-4 border-b border-line py-3 text-mute-dim">
            <span>Agent</span>
            <span>State</span>
            <span>Current ticket</span>
            <span className="text-right">Progress</span>
          </div>
          {agents.map((agent, i) => {
            const pct = checklistPct(agent.ticket);
            return (
              <div
                key={agent.name}
                className="grid grid-cols-[1fr_140px_1fr_120px] items-center gap-4 border-b border-line py-5"
              >
                <div className="flex items-center gap-4">
                  <span
                    className="h-8 w-8 rounded-full"
                    style={{ background: SPHERES[i % SPHERES.length] }}
                  />
                  <div>
                    <p className="text-[19px] font-light text-bone">
                      {agent.name}
                    </p>
                    {agent.harness && (
                      <p className="micro text-mute-dim">{agent.harness}</p>
                    )}
                  </div>
                </div>
                <span className="micro flex items-center gap-2 text-mute">
                  {agent.working ? (
                    <>
                      <span className="agent-dot" />
                      Working
                    </>
                  ) : (
                    <>
                      <span className="h-1.5 w-1.5 rounded-full border border-mute" />
                      Idle
                    </>
                  )}
                </span>
                {agent.ticket ? (
                  <Link
                    href={`/projects/${slug}/tickets/${agent.ticket.id}`}
                    className="text-[15px] font-light text-bone-dim hover:text-bone"
                  >
                    <span className="micro text-mute-dim">
                      AS-{agent.ticket.id.slice(0, 4).toUpperCase()}
                    </span>{" "}
                    · {agent.ticket.title}
                    {agent.ticket.claimed_at && (
                      <span className="micro block text-mute-dim">
                        claimed {formatRelativeTime(agent.ticket.claimed_at)}
                      </span>
                    )}
                  </Link>
                ) : (
                  <span className="text-mute-dim">—</span>
                )}
                <div className="text-right">
                  {pct !== null ? (
                    <>
                      <span className="micro text-mute-dim">{pct}%</span>
                      <div className="mt-1.5 h-0.5 bg-[rgba(236,233,216,.12)]">
                        <i
                          className="block h-full bg-lime"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </>
                  ) : (
                    <span className="micro text-mute-dim">
                      {agent.working ? "—" : "0%"}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <PillNav projectSlug={slug} />
    </div>
  );
}
