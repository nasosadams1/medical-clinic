alter table public.skill_team_feedback
add column if not exists rubric_breakdown jsonb;
