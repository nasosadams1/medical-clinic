create table if not exists public.benchmark_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_report_id text not null,
  report_payload jsonb not null,
  goal text not null check (goal in ('interview_prep', 'class_improvement', 'skill_growth')),
  language text not null check (language in ('python', 'javascript', 'java', 'cpp')),
  role_level text not null check (role_level in ('beginner', 'intern', 'junior', 'general_practice')),
  overall_score integer not null check (overall_score >= 0 and overall_score <= 100),
  correct_answers integer not null check (correct_answers >= 0),
  total_questions integer not null check (total_questions > 0),
  source text not null default 'benchmark_v1',
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists benchmark_reports_user_client_uidx
  on public.benchmark_reports (user_id, client_report_id);
create index if not exists benchmark_reports_user_created_idx
  on public.benchmark_reports (user_id, created_at desc);
create index if not exists benchmark_reports_language_created_idx
  on public.benchmark_reports (language, created_at desc);

alter table public.benchmark_reports enable row level security;

drop policy if exists benchmark_reports_select_own on public.benchmark_reports;
create policy benchmark_reports_select_own
on public.benchmark_reports
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists benchmark_reports_insert_own on public.benchmark_reports;
create policy benchmark_reports_insert_own
on public.benchmark_reports
for insert
to authenticated
with check (auth.uid() = user_id);

grant select, insert on public.benchmark_reports to authenticated;

create table if not exists public.skill_teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null default '',
  use_case text not null default 'bootcamps' check (use_case in ('bootcamps', 'universities', 'coding-clubs', 'upskilling', 'general')),
  seat_limit integer not null default 25 check (seat_limit >= 1 and seat_limit <= 1000),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.skill_team_memberships (
  team_id uuid not null references public.skill_teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'learner' check (role in ('owner', 'admin', 'coach', 'learner')),
  status text not null default 'active' check (status in ('active', 'inactive')),
  joined_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (team_id, user_id)
);

create table if not exists public.skill_team_assignments (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.skill_teams(id) on delete cascade,
  title text not null,
  description text not null default '',
  assignment_type text not null default 'benchmark' check (assignment_type in ('benchmark', 'challenge_pack', 'roadmap')),
  benchmark_language text null check (benchmark_language in ('python', 'javascript', 'java', 'cpp')),
  track_id text null,
  due_at timestamptz null,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.skill_team_invites (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.skill_teams(id) on delete cascade,
  code text not null unique,
  label text not null default 'General learner access',
  email text null,
  role text not null default 'learner' check (role in ('admin', 'coach', 'learner')),
  max_uses integer not null default 25 check (max_uses >= 1 and max_uses <= 500),
  use_count integer not null default 0 check (use_count >= 0),
  status text not null default 'active' check (status in ('active', 'expired', 'revoked')),
  expires_at timestamptz null,
  last_used_at timestamptz null,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists skill_team_memberships_user_idx
  on public.skill_team_memberships (user_id, joined_at desc);
create index if not exists skill_team_memberships_team_idx
  on public.skill_team_memberships (team_id, joined_at desc);
create index if not exists skill_team_assignments_team_created_idx
  on public.skill_team_assignments (team_id, created_at desc);
create index if not exists skill_team_invites_team_created_idx
  on public.skill_team_invites (team_id, created_at desc);

create or replace function public.set_skill_workspace_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists skill_teams_set_updated_at on public.skill_teams;
create trigger skill_teams_set_updated_at
before update on public.skill_teams
for each row
execute function public.set_skill_workspace_updated_at();

drop trigger if exists skill_team_memberships_set_updated_at on public.skill_team_memberships;
create trigger skill_team_memberships_set_updated_at
before update on public.skill_team_memberships
for each row
execute function public.set_skill_workspace_updated_at();

drop trigger if exists skill_team_assignments_set_updated_at on public.skill_team_assignments;
create trigger skill_team_assignments_set_updated_at
before update on public.skill_team_assignments
for each row
execute function public.set_skill_workspace_updated_at();

drop trigger if exists skill_team_invites_set_updated_at on public.skill_team_invites;
create trigger skill_team_invites_set_updated_at
before update on public.skill_team_invites
for each row
execute function public.set_skill_workspace_updated_at();

alter table public.skill_teams enable row level security;
alter table public.skill_team_memberships enable row level security;
alter table public.skill_team_assignments enable row level security;
alter table public.skill_team_invites enable row level security;

revoke all on table public.skill_teams from anon, authenticated;
revoke all on table public.skill_team_memberships from anon, authenticated;
revoke all on table public.skill_team_assignments from anon, authenticated;
revoke all on table public.skill_team_invites from anon, authenticated;

drop policy if exists skill_teams_service_role_all on public.skill_teams;
create policy skill_teams_service_role_all
on public.skill_teams
for all
to service_role
using (true)
with check (true);

drop policy if exists skill_team_memberships_service_role_all on public.skill_team_memberships;
create policy skill_team_memberships_service_role_all
on public.skill_team_memberships
for all
to service_role
using (true)
with check (true);

drop policy if exists skill_team_assignments_service_role_all on public.skill_team_assignments;
create policy skill_team_assignments_service_role_all
on public.skill_team_assignments
for all
to service_role
using (true)
with check (true);

drop policy if exists skill_team_invites_service_role_all on public.skill_team_invites;
create policy skill_team_invites_service_role_all
on public.skill_team_invites
for all
to service_role
using (true)
with check (true);

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete set null,
  anonymous_id text null,
  session_id text null,
  event_name text not null,
  path text not null,
  properties jsonb not null default '{}'::jsonb,
  referrer text null,
  user_agent text null,
  occurred_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists analytics_events_name_occurred_idx
  on public.analytics_events (event_name, occurred_at desc);
create index if not exists analytics_events_user_occurred_idx
  on public.analytics_events (user_id, occurred_at desc);

alter table public.analytics_events enable row level security;
revoke all on table public.analytics_events from anon, authenticated;

drop policy if exists analytics_events_service_role_all on public.analytics_events;
create policy analytics_events_service_role_all
on public.analytics_events
for all
to service_role
using (true)
with check (true);
