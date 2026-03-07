create extension if not exists pgcrypto;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'feedback-attachments',
  'feedback-attachments',
  false,
  4194304,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf', 'text/plain']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.feedback_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('bug_report', 'feature_request', 'general_feedback')),
  status text not null default 'new' check (status in ('new', 'in_review', 'resolved')),
  subject text not null,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  dedupe_hash text not null,
  attachments_count integer not null default 0 check (attachments_count >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  resolved_at timestamptz null
);

create table if not exists public.feedback_attachments (
  id uuid primary key default gen_random_uuid(),
  feedback_id uuid not null references public.feedback_entries(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_bucket text not null default 'feedback-attachments',
  storage_path text not null unique,
  original_name text not null,
  content_type text not null,
  byte_size integer not null check (byte_size > 0),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.feedback_audit_logs (
  id uuid primary key default gen_random_uuid(),
  feedback_id uuid not null references public.feedback_entries(id) on delete cascade,
  actor_user_id uuid null references auth.users(id) on delete set null,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists feedback_entries_user_created_idx
  on public.feedback_entries (user_id, created_at desc);
create index if not exists feedback_entries_status_created_idx
  on public.feedback_entries (status, created_at desc);
create index if not exists feedback_entries_type_created_idx
  on public.feedback_entries (type, created_at desc);
create index if not exists feedback_entries_dedupe_user_idx
  on public.feedback_entries (user_id, dedupe_hash, created_at desc);
create index if not exists feedback_attachments_feedback_idx
  on public.feedback_attachments (feedback_id, created_at asc);
create index if not exists feedback_audit_logs_feedback_idx
  on public.feedback_audit_logs (feedback_id, created_at desc);

create or replace function public.set_feedback_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists feedback_entries_set_updated_at on public.feedback_entries;
create trigger feedback_entries_set_updated_at
before update on public.feedback_entries
for each row
execute function public.set_feedback_updated_at();

alter table public.feedback_entries enable row level security;
alter table public.feedback_attachments enable row level security;
alter table public.feedback_audit_logs enable row level security;

drop policy if exists feedback_entries_select_own on public.feedback_entries;
create policy feedback_entries_select_own
on public.feedback_entries
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists feedback_entries_insert_own on public.feedback_entries;
create policy feedback_entries_insert_own
on public.feedback_entries
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists feedback_attachments_select_own on public.feedback_attachments;
create policy feedback_attachments_select_own
on public.feedback_attachments
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists feedback_attachments_insert_own on public.feedback_attachments;
create policy feedback_attachments_insert_own
on public.feedback_attachments
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists feedback_audit_logs_select_none on public.feedback_audit_logs;
create policy feedback_audit_logs_select_none
on public.feedback_audit_logs
for select
to authenticated
using (false);
