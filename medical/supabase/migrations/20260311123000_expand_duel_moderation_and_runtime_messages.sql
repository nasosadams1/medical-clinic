create table if not exists public.anti_cheat_case_clusters (
  id uuid primary key default gen_random_uuid(),
  fingerprint text not null unique,
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.anti_cheat_cases
  add column if not exists cluster_id uuid null references public.anti_cheat_case_clusters(id) on delete set null;

create index if not exists anti_cheat_cases_cluster_created_idx
  on public.anti_cheat_cases (cluster_id, created_at desc);

alter table public.duel_runtime_presence
  add column if not exists active_match_id uuid null references public.matches(id) on delete set null;

create index if not exists duel_runtime_presence_active_match_idx
  on public.duel_runtime_presence (active_match_id);

alter table public.duel_runtime_matches
  add column if not exists player_a_user_id uuid null references auth.users(id) on delete set null,
  add column if not exists player_b_user_id uuid null references auth.users(id) on delete set null,
  add column if not exists match_type text null,
  add column if not exists difficulty text null,
  add column if not exists problem_id uuid null references public.problems(id) on delete set null;

create index if not exists duel_runtime_matches_players_idx
  on public.duel_runtime_matches (player_a_user_id, player_b_user_id, updated_at desc);
create index if not exists duel_runtime_matches_player_a_idx
  on public.duel_runtime_matches (player_a_user_id, updated_at desc);
create index if not exists duel_runtime_matches_player_b_idx
  on public.duel_runtime_matches (player_b_user_id, updated_at desc);

create table if not exists public.duel_runtime_messages (
  id uuid primary key default gen_random_uuid(),
  target_instance_id text not null,
  target_user_id uuid null references auth.users(id) on delete cascade,
  message_type text not null,
  payload jsonb not null default '{}'::jsonb,
  available_at timestamptz not null default timezone('utc', now()),
  delivered_at timestamptz null,
  expires_at timestamptz not null default timezone('utc', now()) + interval '10 minutes',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists duel_runtime_messages_target_available_idx
  on public.duel_runtime_messages (target_instance_id, delivered_at, available_at asc);
create index if not exists duel_runtime_messages_expires_idx
  on public.duel_runtime_messages (expires_at asc);

alter table public.anti_cheat_case_clusters enable row level security;
alter table public.duel_runtime_messages enable row level security;

revoke all on table public.anti_cheat_case_clusters from anon, authenticated;
revoke all on table public.duel_runtime_messages from anon, authenticated;

drop policy if exists anti_cheat_case_clusters_service_role_all on public.anti_cheat_case_clusters;
drop policy if exists duel_runtime_messages_service_role_all on public.duel_runtime_messages;

create policy anti_cheat_case_clusters_service_role_all
on public.anti_cheat_case_clusters
for all
to service_role
using (true)
with check (true);

create policy duel_runtime_messages_service_role_all
on public.duel_runtime_messages
for all
to service_role
using (true)
with check (true);

drop trigger if exists anti_cheat_case_clusters_set_updated_at on public.anti_cheat_case_clusters;
create trigger anti_cheat_case_clusters_set_updated_at
before update on public.anti_cheat_case_clusters
for each row
execute function public.set_duel_runtime_updated_at();

drop trigger if exists duel_runtime_messages_set_updated_at on public.duel_runtime_messages;
create trigger duel_runtime_messages_set_updated_at
before update on public.duel_runtime_messages
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
