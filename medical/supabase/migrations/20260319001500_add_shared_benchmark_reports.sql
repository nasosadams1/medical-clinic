alter table public.benchmark_reports
  add column if not exists is_public boolean not null default false,
  add column if not exists public_token text unique,
  add column if not exists public_shared_at timestamptz null;

create index if not exists benchmark_reports_public_token_idx
  on public.benchmark_reports (public_token);

create index if not exists benchmark_reports_public_visibility_idx
  on public.benchmark_reports (is_public, public_shared_at desc);
