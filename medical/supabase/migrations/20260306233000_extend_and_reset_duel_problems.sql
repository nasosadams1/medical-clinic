/*
  Extend duel problems schema for richer authored content and clear all legacy 1v1 problem data.
*/

alter table public.problems
  add column if not exists short_story text,
  add column if not exists input_format text,
  add column if not exists output_format text,
  add column if not exists constraints_text text,
  add column if not exists solution_explanation text,
  add column if not exists reference_solution_javascript text,
  add column if not exists estimated_time_minutes integer,
  add column if not exists rating_weight numeric(6,2),
  add column if not exists tags text[] default '{}';

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'duel_test_cases') then
    execute 'delete from public.duel_test_cases';
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'test_cases') then
    execute 'delete from public.test_cases';
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'duel_problems') then
    execute 'delete from public.duel_problems';
  end if;
end
$$;

delete from public.problems;
