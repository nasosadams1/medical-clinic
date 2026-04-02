create table if not exists public.benchmark_item_outcomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_report_id text not null,
  question_id text not null,
  template_id text not null,
  pack_id text not null,
  language text not null check (language in ('python', 'javascript', 'java', 'cpp')),
  format text not null check (format in ('quick', 'full', 'retake')),
  evaluation_strategy text not null check (evaluation_strategy in ('choice', 'typing', 'execution')),
  calibration_state text not null check (calibration_state in ('draft', 'calibrating', 'validated')),
  score_percent integer not null check (score_percent >= 0 and score_percent <= 100),
  is_correct boolean not null default false,
  latency_ms integer null check (latency_ms is null or latency_ms >= 0),
  ability_without_item numeric(6,2) not null default 0,
  trust_score integer not null check (trust_score >= 0 and trust_score <= 100),
  confidence_percent integer not null check (confidence_percent >= 0 and confidence_percent <= 100),
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists benchmark_item_outcomes_user_report_question_uidx
  on public.benchmark_item_outcomes (user_id, client_report_id, question_id);

create index if not exists benchmark_item_outcomes_template_created_idx
  on public.benchmark_item_outcomes (template_id, created_at desc);

create index if not exists benchmark_item_outcomes_pack_created_idx
  on public.benchmark_item_outcomes (pack_id, created_at desc);

create index if not exists benchmark_item_outcomes_language_created_idx
  on public.benchmark_item_outcomes (language, created_at desc);

alter table public.benchmark_item_outcomes enable row level security;
revoke all on table public.benchmark_item_outcomes from anon, authenticated;

drop policy if exists benchmark_item_outcomes_service_role_all on public.benchmark_item_outcomes;
create policy benchmark_item_outcomes_service_role_all
on public.benchmark_item_outcomes
for all
to service_role
using (true)
with check (true);
