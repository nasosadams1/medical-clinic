/*
  Bring the tracked Supabase migrations back into parity with the duel schema that
  the current application runtime expects.

  This covers:
  - duel user match counters
  - richer match lifecycle metadata
  - richer submission verdict/result fields
  - replay/event tables used by moderation and replay tooling
  - problem memory limits used by duel problem admin
*/

alter table public.duel_users
  add column if not exists matches_played integer default 0;

update public.duel_users
set matches_played = coalesce(matches_played, total_matches, 0)
where matches_played is null;

create or replace function public.sync_duel_user_match_counts()
returns trigger
language plpgsql
as $$
begin
  if new.total_matches is not null then
    new.matches_played := new.total_matches;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_duel_user_match_counts on public.duel_users;
create trigger trg_sync_duel_user_match_counts
before insert or update on public.duel_users
for each row
execute function public.sync_duel_user_match_counts();

alter table public.matches
  add column if not exists start_time timestamptz null,
  add column if not exists end_time timestamptz null,
  add column if not exists duration_seconds integer null,
  add column if not exists ranked boolean default true,
  add column if not exists end_time_ms bigint null,
  add column if not exists ended_at timestamptz null,
  add column if not exists player_a_rating_change integer default 0,
  add column if not exists player_b_rating_change integer default 0,
  add column if not exists reason text null;

update public.matches
set ranked = case when match_type = 'casual' then false else true end
where ranked is null;

alter table public.matches
  alter column status set default 'WAITING';

alter table public.matches
  drop constraint if exists matches_status_check;

alter table public.matches
  add constraint matches_status_check
  check (
    upper(status) = any (
      array[
        'WAITING',
        'ACTIVE',
        'IN_PROGRESS',
        'FINISHED',
        'COMPLETED',
        'CANCELLED',
        'ABANDONED',
        'ENDED'
      ]
    )
  ) not valid;

alter table public.matches validate constraint matches_status_check;

alter table public.problems
  add column if not exists memory_limit_mb integer default 256,
  add column if not exists problem_statement text null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'problems_memory_limit_mb_check'
  ) then
    alter table public.problems
      add constraint problems_memory_limit_mb_check
      check (memory_limit_mb between 32 and 4096) not valid;
  end if;
end
$$;

update public.problems
set memory_limit_mb = 256
where memory_limit_mb is null;

alter table public.problems validate constraint problems_memory_limit_mb_check;

alter table public.submissions
  add column if not exists result text default 'unknown',
  add column if not exists score integer default 0,
  add column if not exists runtime_ms integer default 0,
  add column if not exists memory_kb integer default 0,
  add column if not exists is_winning_submission boolean default false,
  add column if not exists failed_count integer default 0,
  add column if not exists verdict text default 'pending',
  add column if not exists passed_count integer default 0,
  add column if not exists total_count integer default 0;

update public.submissions
set
  result = coalesce(result, verdict, 'unknown'),
  verdict = coalesce(verdict, result, 'pending'),
  score = coalesce(score, 0),
  runtime_ms = coalesce(runtime_ms, execution_time_ms, 0),
  memory_kb = coalesce(memory_kb, 0),
  is_winning_submission = coalesce(is_winning_submission, false),
  failed_count = coalesce(failed_count, greatest(coalesce(total_count, total_tests, 0) - coalesce(passed_count, passed_tests, 0), 0)),
  passed_count = coalesce(passed_count, passed_tests, 0),
  total_count = coalesce(total_count, total_tests, 0)
where
  result is null
  or verdict is null
  or score is null
  or runtime_ms is null
  or memory_kb is null
  or is_winning_submission is null
  or failed_count is null
  or passed_count is null
  or total_count is null;

create table if not exists public.match_events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid null references public.matches(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  user_id uuid null
);

create index if not exists match_events_match_created_idx
  on public.match_events (match_id, created_at asc);
create index if not exists match_events_user_created_idx
  on public.match_events (user_id, created_at desc);

create table if not exists public.match_replays (
  id uuid primary key default gen_random_uuid(),
  match_id uuid null references public.matches(id) on delete cascade,
  replay_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  events jsonb not null default '[]'::jsonb,
  player_a_timeline jsonb not null default '[]'::jsonb,
  player_b_timeline jsonb not null default '[]'::jsonb
);

create index if not exists match_replays_match_created_idx
  on public.match_replays (match_id, created_at desc);

alter table public.match_events enable row level security;
alter table public.match_replays enable row level security;

revoke all on table public.match_events from anon, authenticated;
revoke all on table public.match_replays from anon, authenticated;

grant all on table public.match_events to service_role;
grant all on table public.match_replays to service_role;

drop policy if exists match_events_authenticated_select_from_own_matches on public.match_events;
drop policy if exists match_replays_authenticated_select_from_own_matches on public.match_replays;
drop policy if exists match_events_service_role_all on public.match_events;
drop policy if exists match_replays_service_role_all on public.match_replays;

create policy match_events_service_role_all
on public.match_events
for all
to service_role
using (true)
with check (true);

create policy match_replays_service_role_all
on public.match_replays
for all
to service_role
using (true)
with check (true);
