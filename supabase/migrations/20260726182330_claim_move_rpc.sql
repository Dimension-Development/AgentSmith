-- Plan 02: race-safe, transactional claim/move as Postgres functions.
--
-- Why: PostgREST cannot run multi-statement transactions, so the TS services
-- previously did update-then-insert-activity as separate statements (activity
-- could be lost, and moveTicket was read-then-write racy). These functions do
-- lock → check → mutate → log in ONE transaction.
--
-- Error signaling convention (mapped to ServiceError in lib/services/tickets.ts):
--   errcode 'P0404' → 404 (not found)
--   errcode 'P0409' → 409 (conflict: already claimed)
--   errcode 'P0400' → 400 (rule violation; message is user-facing)

create or replace function public.claim_ticket(
  p_ticket_id uuid,
  p_user_id uuid,
  p_agent_name text default null,
  p_agent_run_id text default null,
  p_harness_name text default null
) returns public.tickets
language plpgsql
as $$
declare
  t public.tickets;
begin
  select * into t from public.tickets where id = p_ticket_id for update;
  if not found then
    raise exception 'Ticket not found' using errcode = 'P0404';
  end if;

  -- Idempotent re-claim by the same assignee: refresh agent identity for the
  -- new run, no duplicate ticket_claimed activity.
  if t.assigned_to = p_user_id and t.status = 'in_progress' then
    update public.tickets set
      agent_name = coalesce(p_agent_name, agent_name),
      agent_run_id = coalesce(p_agent_run_id, agent_run_id),
      harness_name = coalesce(p_harness_name, harness_name)
    where id = p_ticket_id
    returning * into t;
    return t;
  end if;

  -- PRD §8: "already assigned to another user" wins over "not open" — a
  -- ticket someone else holds must 409, whatever its status.
  if t.assigned_to is not null and t.assigned_to <> p_user_id then
    raise exception 'Ticket already claimed' using errcode = 'P0409';
  end if;

  if t.status <> 'open' then
    raise exception 'Ticket not claimable' using errcode = 'P0400';
  end if;

  update public.tickets set
    assigned_to = p_user_id,
    claimed_at = now(),
    status = 'in_progress',
    agent_name = p_agent_name,
    agent_run_id = p_agent_run_id,
    harness_name = p_harness_name
  where id = p_ticket_id
  returning * into t;

  insert into public.activity_log
    (ticket_id, project_id, actor_id, activity_type, message, metadata)
  values (
    t.id,
    t.project_id,
    p_user_id,
    'ticket_claimed',
    case
      when p_agent_name is not null then 'Claimed by ' || p_agent_name
      else 'Ticket claimed'
    end,
    jsonb_build_object(
      'agent_name', p_agent_name,
      'harness_name', p_harness_name,
      'agent_run_id', p_agent_run_id
    )
  );

  return t;
end;
$$;

create or replace function public.move_ticket(
  p_ticket_id uuid,
  p_user_id uuid,
  p_status public.ticket_status
) returns public.tickets
language plpgsql
as $$
declare
  t public.tickets;
  moved public.tickets;
  was_claimed boolean;
  releasing boolean;
begin
  select * into t from public.tickets where id = p_ticket_id for update;
  if not found then
    raise exception 'Ticket not found' using errcode = 'P0404';
  end if;

  if t.status = p_status then
    return t;
  end if;

  if t.status = 'open' and p_status = 'in_progress' then
    raise exception 'Use claim_ticket to move open tickets to in_progress'
      using errcode = 'P0400';
  end if;

  was_claimed := t.assigned_to is not null or t.claimed_at is not null;
  releasing := p_status in ('open', 'backlog');

  update public.tickets set
    status = p_status,
    assigned_to = case when releasing and was_claimed then null else assigned_to end,
    claimed_at = case when releasing and was_claimed then null else claimed_at end,
    agent_name = case when releasing and was_claimed then null else agent_name end,
    agent_run_id = case when releasing and was_claimed then null else agent_run_id end,
    harness_name = case when releasing and was_claimed then null else harness_name end
  where id = p_ticket_id
  returning * into moved;

  insert into public.activity_log
    (ticket_id, project_id, actor_id, activity_type, message, metadata)
  values (
    moved.id,
    moved.project_id,
    p_user_id,
    'status_changed',
    format('Status changed from %s to %s', t.status, p_status),
    jsonb_build_object('from', t.status, 'to', p_status)
  );

  if releasing and was_claimed then
    insert into public.activity_log
      (ticket_id, project_id, actor_id, activity_type, message, metadata)
    values (
      moved.id,
      moved.project_id,
      p_user_id,
      'ticket_unclaimed',
      format('Ticket unclaimed (moved to %s)', p_status),
      jsonb_build_object('previous_assignee', t.assigned_to)
    );
  end if;

  if p_status = 'complete' then
    insert into public.activity_log
      (ticket_id, project_id, actor_id, activity_type, message, metadata)
    values (
      moved.id,
      moved.project_id,
      p_user_id,
      'ticket_completed',
      'Ticket marked complete',
      '{}'::jsonb
    );
  end if;

  return moved;
end;
$$;
