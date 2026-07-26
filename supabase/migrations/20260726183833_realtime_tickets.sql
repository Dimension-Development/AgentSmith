-- Plan 06: live board. Broadcast tickets changes over Supabase Realtime.
-- postgres_changes respects RLS: authenticated users can read tickets, so
-- they may subscribe to change events for them.

alter publication supabase_realtime add table public.tickets;
