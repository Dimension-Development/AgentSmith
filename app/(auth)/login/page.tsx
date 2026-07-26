"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@agentsmith.local");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function passwordSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (authError) throw authError;
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  async function magicLink() {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          // Invite-only posture (PRD §7.1): magic links sign in existing
          // users only — they must never create accounts.
          shouldCreateUser: false,
        },
      });
      if (authError) throw authError;
      setMessage(
        "Magic link sent. Locally, open Mailpit at http://127.0.0.1:54324"
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  async function google() {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (authError) throw authError;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="display text-5xl">AgentSmith</h1>
          <p className="micro text-mute">
            Sign in to manage tickets and claims
          </p>
        </div>

        <form onSubmit={passwordSignIn} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <p className="border border-line bg-panel px-3 py-2 text-xs text-mute">
          Local seed admin:{" "}
          <span className="font-mono">admin@agentsmith.local</span> /{" "}
          <span className="font-mono">admin123</span>
          <br />
          (created by <span className="font-mono">supabase/seed.sql</span> on{" "}
          <span className="font-mono">db:reset</span>)
        </p>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-line" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="micro bg-ink px-2 text-mute-dim">
              Or
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={magicLink}
            disabled={loading || !email}
          >
            Send magic link
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={google}
            disabled={loading}
          >
            Continue with Google
          </Button>
        </div>

        {message && (
          <p className="micro text-center text-lime">
            {message}
          </p>
        )}
        {error && (
          <p className="micro text-center text-alarm">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
