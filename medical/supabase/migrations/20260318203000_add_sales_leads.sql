create table if not exists public.sales_leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete set null,
  lead_type text not null default 'demo_request' check (lead_type in ('demo_request')),
  source text not null default 'general' check (source in ('teams_page', 'pricing_page', 'benchmark_report', 'general')),
  intent text not null default 'team_demo' check (intent in ('team_demo', 'teams_growth', 'custom_plan', 'interview_sprint', 'pro_upgrade')),
  name text not null,
  email text not null,
  company text not null,
  team_size text not null,
  use_case text not null,
  objective text not null,
  status text not null default 'new' check (status in ('new', 'contacted', 'qualified', 'won', 'lost')),
  metadata jsonb not null default '{}'::jsonb,
  user_agent text null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists sales_leads_created_idx
  on public.sales_leads (created_at desc);

create index if not exists sales_leads_email_idx
  on public.sales_leads (email, created_at desc);

create index if not exists sales_leads_source_idx
  on public.sales_leads (source, created_at desc);

create or replace function public.set_sales_leads_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists sales_leads_set_updated_at on public.sales_leads;
create trigger sales_leads_set_updated_at
before update on public.sales_leads
for each row
execute function public.set_sales_leads_updated_at();

alter table public.sales_leads enable row level security;
revoke all on table public.sales_leads from anon, authenticated;

drop policy if exists sales_leads_service_role_all on public.sales_leads;
create policy sales_leads_service_role_all
on public.sales_leads
for all
to service_role
using (true)
with check (true);
