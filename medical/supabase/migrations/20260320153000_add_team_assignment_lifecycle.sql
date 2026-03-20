alter table public.skill_team_assignments
  add column if not exists archived_at timestamptz null,
  add column if not exists archived_by uuid null references auth.users(id) on delete set null;

create index if not exists skill_team_assignments_team_active_created_idx
  on public.skill_team_assignments (team_id, created_at desc)
  where archived_at is null;

create index if not exists skill_team_assignments_team_archived_due_idx
  on public.skill_team_assignments (team_id, archived_at desc, due_at asc, created_at desc);
