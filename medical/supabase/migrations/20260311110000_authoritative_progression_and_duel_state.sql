revoke update on table public.user_profiles from authenticated;
grant update (name, updated_at) on public.user_profiles to authenticated;

delete from public.lesson_completion_events a
using public.lesson_completion_events b
where a.user_id = b.user_id
  and a.lesson_id = b.lesson_id
  and a.id > b.id;

create unique index if not exists lesson_completion_events_user_lesson_uidx
  on public.lesson_completion_events (user_id, lesson_id);

drop policy if exists lesson_completion_events_insert_own on public.lesson_completion_events;
revoke insert on table public.lesson_completion_events from authenticated;

alter table public.matches
  add column if not exists integrity_status text not null default 'valid',
  add column if not exists invalidation_reason text null,
  add column if not exists invalidated_at timestamptz null,
  add column if not exists invalidated_by uuid null references auth.users(id) on delete set null,
  add column if not exists rating_reverted_at timestamptz null,
  add column if not exists rating_reverted_by uuid null references auth.users(id) on delete set null,
  add column if not exists moderation_note text null,
  add column if not exists player_a_subrating_field text null,
  add column if not exists player_b_subrating_field text null,
  add column if not exists player_a_subrating_before integer null,
  add column if not exists player_b_subrating_before integer null,
  add column if not exists player_a_subrating_after integer null,
  add column if not exists player_b_subrating_after integer null,
  add column if not exists player_a_subrating_change integer null,
  add column if not exists player_b_subrating_change integer null;

create table if not exists public.duel_player_sanctions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scope text not null default 'duels' check (scope in ('duels', 'progression', 'all')),
  action text not null default 'suspend' check (action in ('suspend', 'review_hold', 'watch')),
  status text not null default 'active' check (status in ('active', 'lifted', 'expired')),
  reason text not null,
  metadata jsonb not null default '{}'::jsonb,
  case_id uuid null references public.anti_cheat_cases(id) on delete set null,
  match_id uuid null references public.matches(id) on delete set null,
  issued_by uuid null references auth.users(id) on delete set null,
  issued_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz null,
  lifted_by uuid null references auth.users(id) on delete set null,
  lifted_at timestamptz null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists duel_player_sanctions_user_status_idx
  on public.duel_player_sanctions (user_id, status, issued_at desc);
create index if not exists duel_player_sanctions_scope_status_idx
  on public.duel_player_sanctions (scope, status, issued_at desc);

create table if not exists public.duel_runtime_presence (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  socket_id text null,
  server_instance_id text not null,
  match_type text not null default 'ranked' check (match_type in ('ranked', 'casual')),
  rating integer not null default 500,
  session_evidence jsonb not null default '{}'::jsonb,
  connection_risk_flags text[] not null default '{}'::text[],
  connected_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists duel_runtime_presence_server_updated_idx
  on public.duel_runtime_presence (server_instance_id, updated_at desc);

create table if not exists public.duel_matchmaking_queue (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  rating integer not null default 500,
  socket_id text null,
  server_instance_id text not null,
  session_evidence jsonb not null default '{}'::jsonb,
  connection_risk_flags text[] not null default '{}'::text[],
  match_type text not null default 'ranked' check (match_type in ('ranked', 'casual')),
  joined_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists duel_matchmaking_queue_type_server_joined_idx
  on public.duel_matchmaking_queue (match_type, server_instance_id, joined_at asc);
create index if not exists duel_matchmaking_queue_type_rating_idx
  on public.duel_matchmaking_queue (match_type, rating asc, joined_at asc);

create table if not exists public.duel_runtime_matches (
  match_id uuid primary key references public.matches(id) on delete cascade,
  owner_instance_id text not null,
  status text not null,
  state jsonb not null default '{}'::jsonb,
  lease_expires_at timestamptz not null default timezone('utc', now()) + interval '30 seconds',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists duel_runtime_matches_owner_updated_idx
  on public.duel_runtime_matches (owner_instance_id, updated_at desc);
create index if not exists duel_runtime_matches_lease_idx
  on public.duel_runtime_matches (lease_expires_at asc);

create or replace function public.set_duel_runtime_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists duel_player_sanctions_set_updated_at on public.duel_player_sanctions;
create trigger duel_player_sanctions_set_updated_at
before update on public.duel_player_sanctions
for each row
execute function public.set_duel_runtime_updated_at();

drop trigger if exists duel_runtime_presence_set_updated_at on public.duel_runtime_presence;
create trigger duel_runtime_presence_set_updated_at
before update on public.duel_runtime_presence
for each row
execute function public.set_duel_runtime_updated_at();

drop trigger if exists duel_matchmaking_queue_set_updated_at on public.duel_matchmaking_queue;
create trigger duel_matchmaking_queue_set_updated_at
before update on public.duel_matchmaking_queue
for each row
execute function public.set_duel_runtime_updated_at();

drop trigger if exists duel_runtime_matches_set_updated_at on public.duel_runtime_matches;
create trigger duel_runtime_matches_set_updated_at
before update on public.duel_runtime_matches
for each row
execute function public.set_duel_runtime_updated_at();

create or replace function public.claim_duel_matchmaking_pair(
  p_match_type text,
  p_server_instance_id text,
  p_base_range integer default 75,
  p_max_range integer default 350,
  p_range_grow_per_sec integer default 2
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_left public.duel_matchmaking_queue%rowtype;
  v_right public.duel_matchmaking_queue%rowtype;
  v_left_range integer;
begin
  if coalesce(trim(p_match_type), '') = '' then
    raise exception 'MATCH_TYPE_REQUIRED';
  end if;

  if coalesce(trim(p_server_instance_id), '') = '' then
    raise exception 'SERVER_INSTANCE_REQUIRED';
  end if;

  lock table public.duel_matchmaking_queue in share row exclusive mode;

  for v_left in
    select *
    from public.duel_matchmaking_queue
    where match_type = p_match_type
      and server_instance_id = p_server_instance_id
    order by rating asc, joined_at asc
  loop
    v_right := null;
    v_left_range := least(
      greatest(coalesce(p_max_range, 350), 1),
      greatest(coalesce(p_base_range, 75), 1) +
        greatest(0, floor(extract(epoch from (clock_timestamp() - v_left.joined_at)))::integer) * greatest(coalesce(p_range_grow_per_sec, 2), 0)
    );

    select candidate.*
    into v_right
    from public.duel_matchmaking_queue candidate
    where candidate.match_type = p_match_type
      and candidate.server_instance_id = p_server_instance_id
      and candidate.user_id <> v_left.user_id
      and abs(candidate.rating - v_left.rating) <= greatest(
        v_left_range,
        least(
          greatest(coalesce(p_max_range, 350), 1),
          greatest(coalesce(p_base_range, 75), 1) +
            greatest(0, floor(extract(epoch from (clock_timestamp() - candidate.joined_at)))::integer) * greatest(coalesce(p_range_grow_per_sec, 2), 0)
        )
      )
    order by abs(candidate.rating - v_left.rating) asc, candidate.joined_at asc
    limit 1;

    exit when v_right.user_id is not null;
  end loop;

  if v_left.user_id is null or v_right.user_id is null then
    return null;
  end if;

  delete from public.duel_matchmaking_queue
  where user_id in (v_left.user_id, v_right.user_id);

  return jsonb_build_object(
    'playerA', to_jsonb(v_left),
    'playerB', to_jsonb(v_right)
  );
end;
$$;

alter table public.duel_player_sanctions enable row level security;
alter table public.duel_runtime_presence enable row level security;
alter table public.duel_matchmaking_queue enable row level security;
alter table public.duel_runtime_matches enable row level security;

revoke all on table public.duel_player_sanctions from anon, authenticated;
revoke all on table public.duel_runtime_presence from anon, authenticated;
revoke all on table public.duel_matchmaking_queue from anon, authenticated;
revoke all on table public.duel_runtime_matches from anon, authenticated;
revoke all on function public.claim_duel_matchmaking_pair(text, text, integer, integer, integer) from public, anon, authenticated;

drop policy if exists duel_player_sanctions_service_role_all on public.duel_player_sanctions;
create policy duel_player_sanctions_service_role_all
on public.duel_player_sanctions
for all
to service_role
using (true)
with check (true);

drop policy if exists duel_runtime_presence_service_role_all on public.duel_runtime_presence;
create policy duel_runtime_presence_service_role_all
on public.duel_runtime_presence
for all
to service_role
using (true)
with check (true);

drop policy if exists duel_matchmaking_queue_service_role_all on public.duel_matchmaking_queue;
create policy duel_matchmaking_queue_service_role_all
on public.duel_matchmaking_queue
for all
to service_role
using (true)
with check (true);

drop policy if exists duel_runtime_matches_service_role_all on public.duel_runtime_matches;
create policy duel_runtime_matches_service_role_all
on public.duel_runtime_matches
for all
to service_role
using (true)
with check (true);

grant execute on function public.claim_duel_matchmaking_pair(text, text, integer, integer, integer) to service_role;