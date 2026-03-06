create table if not exists public.lesson_completion_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id text not null,
  xp_earned integer not null default 0 check (xp_earned >= 0),
  coins_earned integer not null default 0 check (coins_earned >= 0),
  completed_at timestamptz not null default now()
);

create index if not exists idx_lesson_completion_events_user_id on public.lesson_completion_events(user_id);
create index if not exists idx_lesson_completion_events_completed_at on public.lesson_completion_events(completed_at desc);
create index if not exists idx_lesson_completion_events_user_period on public.lesson_completion_events(user_id, completed_at desc);

alter table public.lesson_completion_events enable row level security;

drop policy if exists lesson_completion_events_select_own on public.lesson_completion_events;
create policy lesson_completion_events_select_own
on public.lesson_completion_events
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists lesson_completion_events_insert_own on public.lesson_completion_events;
create policy lesson_completion_events_insert_own
on public.lesson_completion_events
for insert
to authenticated
with check (auth.uid() = user_id);

create or replace function public.get_leaderboard_period_start(p_period text)
returns timestamptz
language sql
stable
as $$
  select case
    when p_period = 'week' then date_trunc('week', now())
    when p_period = 'month' then date_trunc('month', now())
    else null
  end;
$$;

create or replace function public.get_public_leaderboard_page(
  p_limit integer default 100,
  p_offset integer default 0,
  p_period text default 'all',
  p_sort text default 'elo'
)
returns table (
  user_id uuid,
  name text,
  current_avatar text,
  xp integer,
  total_lessons_completed integer,
  ranked_elo integer,
  current_streak integer,
  level integer,
  rank bigint,
  total_count bigint
)
language sql
stable
as $$
with bounds as (
  select public.get_leaderboard_period_start(p_period) as period_start
),
period_lessons as (
  select
    l.user_id,
    coalesce(sum(l.xp_earned), 0)::integer as xp,
    count(*)::integer as total_lessons_completed
  from public.lesson_completion_events l
  cross join bounds b
  where b.period_start is null or l.completed_at >= b.period_start
  group by l.user_id
),
period_elo_players as (
  select distinct m.player_a_id as user_id
  from public.matches m
  cross join bounds b
  where m.status = 'completed'
    and m.completed_at is not null
    and (b.period_start is null or m.completed_at >= b.period_start)
    and m.player_a_id is not null
  union
  select distinct m.player_b_id as user_id
  from public.matches m
  cross join bounds b
  where m.status = 'completed'
    and m.completed_at is not null
    and (b.period_start is null or m.completed_at >= b.period_start)
    and m.player_b_id is not null
),
base_all as (
  select
    up.id as user_id,
    up.name,
    up.current_avatar,
    coalesce(up.xp, 0)::integer as xp,
    coalesce(up.total_lessons_completed, 0)::integer as total_lessons_completed,
    coalesce(du.rating, 500)::integer as ranked_elo,
    coalesce(up.current_streak, 0)::integer as current_streak,
    coalesce(up.level, 1)::integer as level
  from public.user_profiles up
  left join public.duel_users du on du.id = up.id
),
base_period as (
  select
    up.id as user_id,
    up.name,
    up.current_avatar,
    coalesce(pl.xp, 0)::integer as xp,
    coalesce(pl.total_lessons_completed, 0)::integer as total_lessons_completed,
    coalesce(du.rating, 500)::integer as ranked_elo,
    coalesce(up.current_streak, 0)::integer as current_streak,
    coalesce(up.level, 1)::integer as level
  from public.user_profiles up
  left join period_lessons pl on pl.user_id = up.id
  left join public.duel_users du on du.id = up.id
  where (
    (p_sort = 'elo' and exists (select 1 from period_elo_players pep where pep.user_id = up.id))
    or (p_sort <> 'elo' and exists (select 1 from period_lessons pl2 where pl2.user_id = up.id))
  )
),
scoped as (
  select * from base_all where p_period = 'all'
  union all
  select * from base_period where p_period <> 'all'
),
ranked as (
  select
    s.*,
    row_number() over (
      order by
        case when p_sort = 'xp' then s.xp end desc nulls last,
        case when p_sort = 'lessons' then s.total_lessons_completed end desc nulls last,
        case when p_sort = 'elo' then s.ranked_elo end desc nulls last,
        s.xp desc,
        s.total_lessons_completed desc,
        s.ranked_elo desc,
        s.name asc
    ) as rank,
    count(*) over () as total_count
  from scoped s
)
select
  user_id,
  name,
  current_avatar,
  xp,
  total_lessons_completed,
  ranked_elo,
  current_streak,
  level,
  rank,
  total_count
from ranked
order by rank
offset greatest(p_offset, 0)
limit greatest(p_limit, 1);
$$;

create or replace function public.get_public_leaderboard_rank(
  p_user_id uuid,
  p_period text default 'all',
  p_sort text default 'elo'
)
returns integer
language sql
stable
as $$
with ranked as (
  select user_id, rank
  from public.get_public_leaderboard_page(1000000, 0, p_period, p_sort)
)
select coalesce((select rank::integer from ranked where user_id = p_user_id), 0);
$$;

create or replace function public.get_public_leaderboard_user_stats(
  p_user_id uuid,
  p_period text default 'all'
)
returns table (
  user_id uuid,
  name text,
  current_avatar text,
  xp integer,
  total_lessons_completed integer,
  ranked_elo integer,
  current_streak integer,
  level integer
)
language sql
stable
as $$
with bounds as (
  select public.get_leaderboard_period_start(p_period) as period_start
),
period_lessons as (
  select
    l.user_id,
    coalesce(sum(l.xp_earned), 0)::integer as xp,
    count(*)::integer as total_lessons_completed
  from public.lesson_completion_events l
  cross join bounds b
  where l.user_id = p_user_id
    and (b.period_start is null or l.completed_at >= b.period_start)
  group by l.user_id
)
select
  up.id as user_id,
  up.name,
  up.current_avatar,
  case when p_period = 'all' then coalesce(up.xp, 0)::integer else coalesce(pl.xp, 0)::integer end as xp,
  case when p_period = 'all' then coalesce(up.total_lessons_completed, 0)::integer else coalesce(pl.total_lessons_completed, 0)::integer end as total_lessons_completed,
  coalesce(du.rating, 500)::integer as ranked_elo,
  coalesce(up.current_streak, 0)::integer as current_streak,
  coalesce(up.level, 1)::integer as level
from public.user_profiles up
left join period_lessons pl on pl.user_id = up.id
left join public.duel_users du on du.id = up.id
where up.id = p_user_id;
$$;

grant select on public.lesson_completion_events to authenticated;
grant insert on public.lesson_completion_events to authenticated;
grant execute on function public.get_leaderboard_period_start(text) to authenticated;
grant execute on function public.get_public_leaderboard_page(integer, integer, text, text) to authenticated;
grant execute on function public.get_public_leaderboard_rank(uuid, text, text) to authenticated;
grant execute on function public.get_public_leaderboard_user_stats(uuid, text) to authenticated;
