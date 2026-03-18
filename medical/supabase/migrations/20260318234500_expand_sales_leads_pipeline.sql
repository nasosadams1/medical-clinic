alter table public.sales_leads
  add column if not exists priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  add column if not exists owner_user_id uuid null references auth.users(id) on delete set null,
  add column if not exists last_contacted_at timestamptz null,
  add column if not exists next_step text null,
  add column if not exists qualification_notes text null;

create index if not exists sales_leads_status_priority_idx
  on public.sales_leads (status, priority, updated_at desc);

create index if not exists sales_leads_owner_updated_idx
  on public.sales_leads (owner_user_id, updated_at desc);

create table if not exists public.sales_lead_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.sales_leads(id) on delete cascade,
  actor_user_id uuid null references auth.users(id) on delete set null,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists sales_lead_events_lead_created_idx
  on public.sales_lead_events (lead_id, created_at desc);

alter table public.sales_lead_events enable row level security;
revoke all on table public.sales_lead_events from anon, authenticated;

drop policy if exists sales_lead_events_service_role_all on public.sales_lead_events;
create policy sales_lead_events_service_role_all
on public.sales_lead_events
for all
to service_role
using (true)
with check (true);
