alter table public.skill_teams
  add column if not exists join_mode text not null default 'open_code',
  add column if not exists allowed_email_domain text null;

alter table public.skill_teams
  drop constraint if exists skill_teams_join_mode_check;

alter table public.skill_teams
  add constraint skill_teams_join_mode_check
  check (join_mode in ('open_code', 'code_domain', 'code_approval', 'invite_only'));

create table if not exists public.skill_team_join_requests (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.skill_teams(id) on delete cascade,
  invite_id uuid null references public.skill_team_invites(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  requested_role text not null check (requested_role in ('admin', 'coach', 'learner')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied', 'cancelled')),
  note text not null default '',
  reviewed_by_user_id uuid null references auth.users(id) on delete set null,
  requested_at timestamptz not null default timezone('utc', now()),
  reviewed_at timestamptz null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists skill_team_join_requests_team_requested_idx
  on public.skill_team_join_requests (team_id, requested_at desc);

create index if not exists skill_team_join_requests_user_requested_idx
  on public.skill_team_join_requests (user_id, requested_at desc);

create unique index if not exists skill_team_join_requests_team_user_pending_uidx
  on public.skill_team_join_requests (team_id, user_id)
  where status = 'pending';

drop trigger if exists skill_team_join_requests_set_updated_at on public.skill_team_join_requests;
create trigger skill_team_join_requests_set_updated_at
before update on public.skill_team_join_requests
for each row
execute function public.set_skill_workspace_updated_at();

alter table public.skill_team_join_requests enable row level security;
revoke all on table public.skill_team_join_requests from anon, authenticated;

drop policy if exists skill_team_join_requests_service_role_all on public.skill_team_join_requests;
create policy skill_team_join_requests_service_role_all
on public.skill_team_join_requests
for all
to service_role
using (true)
with check (true);
