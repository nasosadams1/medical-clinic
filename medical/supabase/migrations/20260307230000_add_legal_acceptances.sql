create extension if not exists pgcrypto;

create table if not exists public.legal_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_key text not null check (document_key in ('terms_of_service', 'privacy_policy', 'refund_policy')),
  version text not null,
  source text not null default 'account' check (source in ('signup', 'checkout', 'account')),
  accepted_at timestamptz not null default timezone('utc', now()),
  ip_address text null,
  user_agent text null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, document_key, version)
);

create index if not exists legal_acceptances_user_created_idx
  on public.legal_acceptances (user_id, created_at desc);

create index if not exists legal_acceptances_document_version_idx
  on public.legal_acceptances (document_key, version, created_at desc);

alter table public.legal_acceptances enable row level security;

drop policy if exists legal_acceptances_select_own on public.legal_acceptances;
create policy legal_acceptances_select_own
on public.legal_acceptances
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists legal_acceptances_insert_own on public.legal_acceptances;
create policy legal_acceptances_insert_own
on public.legal_acceptances
for insert
to authenticated
with check (auth.uid() = user_id);
