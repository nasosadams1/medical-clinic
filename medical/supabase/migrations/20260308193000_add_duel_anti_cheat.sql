alter table public.submissions
  add column if not exists code_hash text,
  add column if not exists submission_sequence integer default 1,
  add column if not exists compile_log text default '',
  add column if not exists execution_log text default '',
  add column if not exists test_summary jsonb not null default '{}'::jsonb,
  add column if not exists audit_metadata jsonb not null default '{}'::jsonb,
  add column if not exists submission_kind text not null default 'manual';

create table if not exists public.anti_cheat_cases (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  risk_score numeric(5,2) not null default 0,
  status text not null default 'new' check (status in ('new', 'in_review', 'resolved', 'dismissed')),
  summary text not null,
  evidence jsonb not null default '{}'::jsonb,
  reviewed_by uuid null references auth.users(id) on delete set null,
  reviewed_at timestamptz null,
  resolution_note text null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists anti_cheat_cases_match_uidx
  on public.anti_cheat_cases (match_id);
create index if not exists anti_cheat_cases_status_created_idx
  on public.anti_cheat_cases (status, created_at desc);
create index if not exists anti_cheat_cases_risk_created_idx
  on public.anti_cheat_cases (risk_score desc, created_at desc);

create table if not exists public.anti_cheat_case_events (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.anti_cheat_cases(id) on delete cascade,
  actor_user_id uuid null references auth.users(id) on delete set null,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists anti_cheat_case_events_case_created_idx
  on public.anti_cheat_case_events (case_id, created_at desc);

create or replace function public.set_anti_cheat_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists anti_cheat_cases_set_updated_at on public.anti_cheat_cases;
create trigger anti_cheat_cases_set_updated_at
before update on public.anti_cheat_cases
for each row
execute function public.set_anti_cheat_updated_at();

alter table public.anti_cheat_cases enable row level security;
alter table public.anti_cheat_case_events enable row level security;

drop policy if exists anti_cheat_cases_select_none on public.anti_cheat_cases;
create policy anti_cheat_cases_select_none
on public.anti_cheat_cases
for select
to authenticated
using (false);

drop policy if exists anti_cheat_case_events_select_none on public.anti_cheat_case_events;
create policy anti_cheat_case_events_select_none
on public.anti_cheat_case_events
for select
to authenticated
using (false);
