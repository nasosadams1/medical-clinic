alter table public.skill_teams
  add column if not exists is_public boolean not null default false,
  add column if not exists public_token text,
  add column if not exists public_shared_at timestamptz null;

create unique index if not exists skill_teams_public_token_uidx
  on public.skill_teams (public_token)
  where public_token is not null;

create index if not exists skill_teams_is_public_idx
  on public.skill_teams (is_public, public_shared_at desc);
