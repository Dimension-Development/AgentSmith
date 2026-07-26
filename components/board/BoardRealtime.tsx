"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

const REFRESH_DEBOUNCE_MS = 400;
const POLL_FALLBACK_MS = 30_000;

/**
 * Live board: re-render the server-rendered board whenever a ticket in this
 * project changes (agents move cards over MCP; humans should see it happen).
 * Falls back to 30s polling if the Realtime channel never subscribes.
 */
export function BoardRealtime({ projectId }: { projectId: string }) {
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let channel: RealtimeChannel | null = null;
    let subscribed = false;
    let disposed = false;

    const refresh = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        router.refresh();
      }, REFRESH_DEBOUNCE_MS); // agents can burst updates
    };

    (async () => {
      // Realtime evaluates RLS with the socket's JWT — attach the user's
      // session token explicitly (the socket does not pick it up on its own).
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        await supabase.realtime.setAuth(session.access_token);
      }
      if (disposed) return;

      channel = supabase
        .channel(`board-${projectId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "tickets",
            filter: `project_id=eq.${projectId}`,
          },
          refresh
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") subscribed = true;
        });
    })();

    const poll = setInterval(() => {
      if (!subscribed) router.refresh();
    }, POLL_FALLBACK_MS);

    return () => {
      disposed = true;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      clearInterval(poll);
      if (channel) supabase.removeChannel(channel);
    };
  }, [projectId, router]);

  return null;
}
