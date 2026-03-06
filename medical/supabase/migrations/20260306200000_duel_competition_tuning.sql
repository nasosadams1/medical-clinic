/*
  Duel competition tuning:
  - difficulty-specific subratings
  - match metadata for weighted results and timeout resolution
*/

alter table public.duel_users
  add column if not exists easy_rating integer,
  add column if not exists medium_rating integer,
  add column if not exists hard_rating integer;

update public.duel_users
set
  easy_rating = coalesce(easy_rating, rating, 500),
  medium_rating = coalesce(medium_rating, rating, 500),
  hard_rating = coalesce(hard_rating, rating, 500)
where easy_rating is null or medium_rating is null or hard_rating is null;

alter table public.duel_users
  alter column easy_rating set default 500;
alter table public.duel_users
  alter column medium_rating set default 500;
alter table public.duel_users
  alter column hard_rating set default 500;

create index if not exists idx_duel_users_easy_rating on public.duel_users(easy_rating desc);
create index if not exists idx_duel_users_medium_rating on public.duel_users(medium_rating desc);
create index if not exists idx_duel_users_hard_rating on public.duel_users(hard_rating desc);

alter table public.matches
  add column if not exists problem_difficulty text,
  add column if not exists time_limit_seconds integer,
  add column if not exists duel_result_strength text,
  add column if not exists player_a_partial_score double precision,
  add column if not exists player_b_partial_score double precision,
  add column if not exists player_a_wrong_submissions integer default 0,
  add column if not exists player_b_wrong_submissions integer default 0;

update public.matches m
set
  problem_difficulty = coalesce(m.problem_difficulty, p.difficulty),
  time_limit_seconds = coalesce(m.time_limit_seconds, p.time_limit_seconds)
from public.problems p
where m.problem_id = p.id
  and (m.problem_difficulty is null or m.time_limit_seconds is null);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'matches_problem_difficulty_check'
  ) then
    alter table public.matches
      add constraint matches_problem_difficulty_check
      check (problem_difficulty is null or problem_difficulty in ('easy', 'medium', 'hard')) not valid;
  end if;
end
$$;

alter table public.matches validate constraint matches_problem_difficulty_check;

