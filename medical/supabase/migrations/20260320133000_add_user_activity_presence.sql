create table if not exists public.user_activity_presence (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_seen_at timestamptz not null default timezone('utc', now()),
  last_active_at timestamptz null,
  active_session_expires_at timestamptz null,
  last_path text null,
  visibility_state text not null default 'visible',
  last_reason text null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists user_activity_presence_last_active_idx
  on public.user_activity_presence (last_active_at desc nulls last);

create index if not exists user_activity_presence_active_session_idx
  on public.user_activity_presence (active_session_expires_at desc nulls last);

alter table public.user_activity_presence enable row level security;

revoke all on public.user_activity_presence from anon, authenticated;

