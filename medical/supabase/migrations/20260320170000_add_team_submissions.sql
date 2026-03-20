create table if not exists public.skill_team_submissions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.skill_teams(id) on delete cascade,
  assignment_id uuid null references public.skill_team_assignments(id) on delete set null,
  member_user_id uuid not null references auth.users(id) on delete cascade,
  submitted_by_user_id uuid null references auth.users(id) on delete set null,
  submission_type text not null default 'written' check (submission_type in ('written', 'code', 'link')),
  title text not null,
  body text not null default '',
  external_url text null,
  code_language text null check (code_language in ('python', 'javascript', 'java', 'cpp')),
  status text not null default 'submitted' check (status in ('submitted', 'reviewed', 'needs_revision')),
  rubric_score integer null check (rubric_score >= 0 and rubric_score <= 100),
  metadata jsonb not null default '{}'::jsonb,
  attempt_number integer not null default 1 check (attempt_number >= 1),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists skill_team_submissions_team_updated_idx
  on public.skill_team_submissions (team_id, updated_at desc);

create index if not exists skill_team_submissions_member_assignment_idx
  on public.skill_team_submissions (member_user_id, assignment_id, created_at desc);

create index if not exists skill_team_submissions_assignment_idx
  on public.skill_team_submissions (assignment_id, created_at desc);

alter table public.skill_team_feedback
  add column if not exists submission_id uuid null references public.skill_team_submissions(id) on delete set null;

create index if not exists skill_team_feedback_submission_idx
  on public.skill_team_feedback (submission_id);

drop trigger if exists skill_team_submissions_set_updated_at on public.skill_team_submissions;
create trigger skill_team_submissions_set_updated_at
before update on public.skill_team_submissions
for each row
execute function public.set_skill_workspace_updated_at();

alter table public.skill_team_submissions enable row level security;
revoke all on table public.skill_team_submissions from anon, authenticated;

drop policy if exists skill_team_submissions_service_role_all on public.skill_team_submissions;
create policy skill_team_submissions_service_role_all
on public.skill_team_submissions
for all
to service_role
using (true)
with check (true);
