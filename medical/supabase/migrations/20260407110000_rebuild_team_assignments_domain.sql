alter table public.skill_team_assignments
  add column if not exists audience_type text not null default 'team_wide',
  add column if not exists definition_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists completion_rule jsonb not null default '{}'::jsonb;

alter table public.skill_team_assignments
  drop constraint if exists skill_team_assignments_assignment_type_check;

update public.skill_team_assignments
set assignment_type = 'duel_activity'
where assignment_type = 'challenge_pack';

alter table public.skill_team_assignments
  add constraint skill_team_assignments_assignment_type_check
  check (assignment_type in ('benchmark', 'duel_activity', 'roadmap'));

alter table public.skill_team_assignments
  drop constraint if exists skill_team_assignments_audience_type_check;

alter table public.skill_team_assignments
  add constraint skill_team_assignments_audience_type_check
  check (audience_type in ('team_wide'));

create index if not exists skill_team_assignments_team_audience_created_idx
  on public.skill_team_assignments (team_id, audience_type, created_at desc);
