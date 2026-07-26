"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ApiKeyPublic } from "@/lib/services/api-keys";
import { formatRelativeTime } from "@/lib/utils";

export function ApiKeysSettings() {
  const [keys, setKeys] = useState<ApiKeyPublic[]>([]);
  const [name, setName] = useState("Local agent");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newKey, setNewKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/api-keys");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load keys");
    setKeys(data.keys ?? []);
  }, []);

  useEffect(() => {
    load().catch((err) =>
      setError(err instanceof Error ? err.message : "Failed to load")
    );
  }, [load]);

  async function createKey(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNewKey(null);
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create key");
      setNewKey(data.key.key as string);
      setName("Local agent");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create key");
    } finally {
      setLoading(false);
    }
  }

  async function revoke(id: string) {
    if (!confirm("Revoke this key? Agents using it will stop working.")) return;
    setError(null);
    try {
      const res = await fetch(`/api/api-keys/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to revoke");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke");
    }
  }

  return (
    <div className="space-y-8">
      <form
        onSubmit={createKey}
        className="space-y-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
      >
        <div className="space-y-2">
          <Label htmlFor="key-name">Key name</Label>
          <Input
            id="key-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Claude Code laptop"
            required
            maxLength={100}
          />
        </div>
        <Button type="submit" disabled={loading || !name.trim()}>
          {loading ? "Creating…" : "Create key"}
        </Button>
      </form>

      {newKey && (
        <div className="space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/40">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
            Copy this key now — it won’t be shown again.
          </p>
          <code className="block break-all rounded bg-white px-3 py-2 text-xs dark:bg-zinc-950">
            {newKey}
          </code>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => navigator.clipboard.writeText(newKey)}
          >
            Copy to clipboard
          </Button>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <div className="space-y-3">
        <h2 className="text-sm font-semibold">Your keys</h2>
        {keys.length === 0 ? (
          <p className="text-sm text-zinc-400">No keys yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {keys.map((k) => (
              <li
                key={k.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0 space-y-0.5">
                  <p className="text-sm font-medium">{k.name}</p>
                  <p className="font-mono text-xs text-zinc-500">
                    {k.key_prefix}…
                    {k.revoked_at ? " · revoked" : ""}
                  </p>
                  <p className="text-xs text-zinc-400">
                    Created {formatRelativeTime(k.created_at)}
                    {k.last_used_at
                      ? ` · last used ${formatRelativeTime(k.last_used_at)}`
                      : ""}
                  </p>
                </div>
                {!k.revoked_at && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => revoke(k.id)}
                  >
                    Revoke
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-zinc-200 p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
        <p className="font-medium text-zinc-800 dark:text-zinc-200">
          MCP config (Claude Code / Cursor)
        </p>
        <pre className="mt-2 overflow-x-auto rounded bg-zinc-50 p-3 text-xs dark:bg-zinc-900">
{`{
  "mcpServers": {
    "agentsmith": {
      "command": "npx",
      "args": ["tsx", "mcp/server.ts"],
      "cwd": "/path/to/AgentSmith",
      "env": {
        "AGENTSMITH_API_URL": "http://127.0.0.1:3000",
        "AGENTSMITH_API_KEY": "asm_…"
      }
    }
  }
}`}
        </pre>
        <p className="mt-2 text-xs">
          Or run <code className="font-mono">npm run mcp</code> with those env
          vars set. See <code className="font-mono">docs/mcp.md</code>.
        </p>
      </div>
    </div>
  );
}
