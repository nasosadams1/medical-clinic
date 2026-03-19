create table if not exists public.skill_team_feedback (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.skill_teams(id) on delete cascade,
  member_user_id uuid not null references auth.users(id) on delete cascade,
  assignment_id uuid null references public.skill_team_assignments(id) on delete set null,
  author_user_id uuid null references auth.users(id) on delete set null,
  rubric_score integer null check (rubric_score >= 0 and rubric_score <= 100),
  status text not null default 'draft' check (status in ('draft', 'shared', 'resolved')),
  summary text not null default '',
  strengths text not null default '',
  focus_areas text not null default '',
  coach_notes text not null default '',
  shared_with_member boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists skill_team_feedback_team_updated_idx
  on public.skill_team_feedback (team_id, updated_at desc);

create index if not exists skill_team_feedback_member_idx
  on public.skill_team_feedback (member_user_id, updated_at desc);

drop trigger if exists skill_team_feedback_set_updated_at on public.skill_team_feedback;
create trigger skill_team_feedback_set_updated_at
before update on public.skill_team_feedback
for each row
execute function public.set_skill_workspace_updated_at();

alter table public.skill_team_feedback enable row level security;
revoke all on table public.skill_team_feedback from anon, authenticated;

drop policy if exists skill_team_feedback_service_role_all on public.skill_team_feedback;
create policy skill_team_feedback_service_role_all
on public.skill_team_feedback
for all
to service_role
using (true)
with check (true);
