create table if not exists public.plan_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null,
  plan_name text not null,
  status text not null default 'active' check (status in ('active', 'expired', 'cancelled', 'refunded')),
  current_period_start timestamptz not null,
  current_period_end timestamptz not null,
  purchase_count integer not null default 1 check (purchase_count >= 1),
  last_payment_intent_id text null unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, item_id)
);

create index if not exists plan_entitlements_user_updated_idx
  on public.plan_entitlements (user_id, updated_at desc);
create index if not exists plan_entitlements_item_period_idx
  on public.plan_entitlements (item_id, current_period_end desc);

create or replace function public.set_plan_entitlements_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists plan_entitlements_set_updated_at on public.plan_entitlements;
create trigger plan_entitlements_set_updated_at
before update on public.plan_entitlements
for each row
execute function public.set_plan_entitlements_updated_at();

alter table public.plan_entitlements enable row level security;

revoke all on table public.plan_entitlements from anon, authenticated;
grant select on table public.plan_entitlements to authenticated;

drop policy if exists plan_entitlements_select_own on public.plan_entitlements;
create policy plan_entitlements_select_own
on public.plan_entitlements
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists plan_entitlements_service_role_all on public.plan_entitlements;
create policy plan_entitlements_service_role_all
on public.plan_entitlements
for all
to service_role
using (true)
with check (true);

create or replace function public.fulfill_plan_purchase(
  p_user_id uuid,
  p_payment_intent_id text,
  p_item_id text,
  p_plan_name text,
  p_amount_cents integer,
  p_currency text,
  p_duration_days integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_transaction_id uuid;
  v_existing public.plan_entitlements%rowtype;
  v_result public.plan_entitlements%rowtype;
  v_now timestamptz := timezone('utc', now());
  v_period_start timestamptz;
  v_period_end timestamptz;
begin
  if p_user_id is null then
    raise exception 'USER_ID_REQUIRED';
  end if;

  if p_payment_intent_id is null or length(trim(p_payment_intent_id)) = 0 then
    raise exception 'PAYMENT_INTENT_ID_REQUIRED';
  end if;

  if p_item_id is null or length(trim(p_item_id)) = 0 then
    raise exception 'ITEM_ID_REQUIRED';
  end if;

  if p_plan_name is null or length(trim(p_plan_name)) = 0 then
    raise exception 'PLAN_NAME_REQUIRED';
  end if;

  if coalesce(p_duration_days, 0) <= 0 then
    raise exception 'INVALID_PLAN_DURATION';
  end if;

  insert into public.store_transactions (
    user_id,
    stripe_payment_intent_id,
    source,
    item_id,
    coin_delta,
    metadata
  )
  values (
    p_user_id,
    trim(p_payment_intent_id),
    'stripe',
    trim(p_item_id),
    0,
    jsonb_build_object(
      'item_kind', 'plan',
      'plan_name', trim(p_plan_name),
      'amount_cents', p_amount_cents,
      'currency', lower(coalesce(p_currency, 'usd')),
      'duration_days', p_duration_days
    )
  )
  on conflict (stripe_payment_intent_id) do nothing
  returning id into v_transaction_id;

  if v_transaction_id is null then
    select *
    into v_result
    from public.plan_entitlements
    where user_id = p_user_id
      and item_id = trim(p_item_id);

    return jsonb_build_object(
      'alreadyFulfilled', true,
      'planId', trim(p_item_id),
      'planName', coalesce(v_result.plan_name, trim(p_plan_name)),
      'status', coalesce(v_result.status, 'active'),
      'currentPeriodStart', v_result.current_period_start,
      'currentPeriodEnd', v_result.current_period_end,
      'purchaseCount', coalesce(v_result.purchase_count, 0)
    );
  end if;

  select *
  into v_existing
  from public.plan_entitlements
  where user_id = p_user_id
    and item_id = trim(p_item_id)
  for update;

  if found and v_existing.status = 'active' and v_existing.current_period_end > v_now then
    v_period_start := v_existing.current_period_start;
    v_period_end := v_existing.current_period_end + make_interval(days => p_duration_days);

    update public.plan_entitlements
    set
      plan_name = trim(p_plan_name),
      status = 'active',
      current_period_start = v_period_start,
      current_period_end = v_period_end,
      purchase_count = coalesce(v_existing.purchase_count, 0) + 1,
      last_payment_intent_id = trim(p_payment_intent_id),
      metadata = coalesce(v_existing.metadata, '{}'::jsonb) || jsonb_build_object(
        'amount_cents', p_amount_cents,
        'currency', lower(coalesce(p_currency, 'usd')),
        'duration_days', p_duration_days,
        'latest_purchase_at', v_now
      )
    where id = v_existing.id
    returning * into v_result;
  elsif found then
    v_period_start := v_now;
    v_period_end := v_now + make_interval(days => p_duration_days);

    update public.plan_entitlements
    set
      plan_name = trim(p_plan_name),
      status = 'active',
      current_period_start = v_period_start,
      current_period_end = v_period_end,
      purchase_count = coalesce(v_existing.purchase_count, 0) + 1,
      last_payment_intent_id = trim(p_payment_intent_id),
      metadata = coalesce(v_existing.metadata, '{}'::jsonb) || jsonb_build_object(
        'amount_cents', p_amount_cents,
        'currency', lower(coalesce(p_currency, 'usd')),
        'duration_days', p_duration_days,
        'latest_purchase_at', v_now
      )
    where id = v_existing.id
    returning * into v_result;
  else
    v_period_start := v_now;
    v_period_end := v_now + make_interval(days => p_duration_days);

    insert into public.plan_entitlements (
      user_id,
      item_id,
      plan_name,
      status,
      current_period_start,
      current_period_end,
      purchase_count,
      last_payment_intent_id,
      metadata
    )
    values (
      p_user_id,
      trim(p_item_id),
      trim(p_plan_name),
      'active',
      v_period_start,
      v_period_end,
      1,
      trim(p_payment_intent_id),
      jsonb_build_object(
        'amount_cents', p_amount_cents,
        'currency', lower(coalesce(p_currency, 'usd')),
        'duration_days', p_duration_days,
        'latest_purchase_at', v_now
      )
    )
    returning * into v_result;
  end if;

  update public.store_transactions
  set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
    'plan_period_start', v_result.current_period_start,
    'plan_period_end', v_result.current_period_end,
    'purchase_count', v_result.purchase_count
  )
  where id = v_transaction_id;

  return jsonb_build_object(
    'alreadyFulfilled', false,
    'planId', v_result.item_id,
    'planName', v_result.plan_name,
    'status', v_result.status,
    'currentPeriodStart', v_result.current_period_start,
    'currentPeriodEnd', v_result.current_period_end,
    'purchaseCount', v_result.purchase_count
  );
end;
$$;

grant execute on function public.fulfill_plan_purchase(uuid, text, text, text, integer, text, integer) to service_role;
