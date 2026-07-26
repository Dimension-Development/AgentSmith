import { ApiKeysSettings } from "@/components/settings/ApiKeysSettings";

export default function ApiKeysPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-1">
        <h1 className="display text-4xl">API keys</h1>
        <p className="micro text-mute">
          Personal keys for local coding agents (Claude Code, Grok Build, Cursor,
          etc.) via MCP. Keys act as <strong>you</strong> on AgentSmith — they are
          not GitHub credentials.
        </p>
      </div>
      <ApiKeysSettings />
    </div>
  );
}
