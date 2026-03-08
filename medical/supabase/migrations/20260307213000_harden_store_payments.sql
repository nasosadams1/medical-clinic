create extension if not exists pgcrypto;

create table if not exists public.store_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid null unique,
  stripe_payment_intent_id text null unique,
  source text not null check (source in ('coins', 'stripe')),
  item_id text not null,
  status text not null default 'completed' check (status in ('completed')),
  coin_delta integer not null default 0,
  coin_balance_after integer null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists store_transactions_user_created_idx
  on public.store_transactions (user_id, created_at desc);
create index if not exists store_transactions_item_created_idx
  on public.store_transactions (item_id, created_at desc);
create index if not exists store_transactions_source_created_idx
  on public.store_transactions (source, created_at desc);

alter table public.store_transactions enable row level security;

drop policy if exists store_transactions_select_own on public.store_transactions;
create policy store_transactions_select_own
on public.store_transactions
for select
to authenticated
using (auth.uid() = user_id);

create or replace function public.fulfill_store_coin_pack(
  p_user_id uuid,
  p_payment_intent_id text,
  p_item_id text,
  p_coins integer,
  p_amount_cents integer,
  p_currency text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_transaction_id uuid;
  v_profile public.user_profiles%rowtype;
begin
  if p_user_id is null then
    raise exception 'USER_ID_REQUIRED';
  end if;

  if p_payment_intent_id is null or length(trim(p_payment_intent_id)) = 0 then
    raise exception 'PAYMENT_INTENT_ID_REQUIRED';
  end if;

  if coalesce(p_coins, 0) <= 0 then
    raise exception 'INVALID_COIN_GRANT';
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
    p_item_id,
    p_coins,
    jsonb_build_object(
      'amount_cents', p_amount_cents,
      'currency', lower(coalesce(p_currency, 'usd'))
    )
  )
  on conflict (stripe_payment_intent_id) do nothing
  returning id into v_transaction_id;

  if v_transaction_id is null then
    select *
    into v_profile
    from public.user_profiles
    where id = p_user_id;

    return jsonb_build_object(
      'alreadyFulfilled', true,
      'coinsGranted', p_coins,
      'coins', coalesce(v_profile.coins, 0),
      'totalCoinsEarned', coalesce(v_profile.total_coins_earned, 0)
    );
  end if;

  update public.user_profiles
  set
    coins = coalesce(coins, 0) + p_coins,
    total_coins_earned = coalesce(total_coins_earned, 0) + p_coins
  where id = p_user_id
  returning * into v_profile;

  if not found then
    raise exception 'USER_PROFILE_NOT_FOUND';
  end if;

  update public.store_transactions
  set coin_balance_after = v_profile.coins
  where id = v_transaction_id;

  return jsonb_build_object(
    'alreadyFulfilled', false,
    'coinsGranted', p_coins,
    'coins', v_profile.coins,
    'totalCoinsEarned', v_profile.total_coins_earned
  );
end;
$$;

create or replace function public.apply_store_coin_purchase(
  p_user_id uuid,
  p_request_id uuid,
  p_item_id text,
  p_coin_cost integer,
  p_item_kind text,
  p_duration_hours integer default null,
  p_multiplier integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_transaction_id uuid;
  v_profile public.user_profiles%rowtype;
  v_now_ms bigint := floor(extract(epoch from clock_timestamp()) * 1000);
  v_duration_ms bigint := greatest(coalesce(p_duration_hours, 0), 0)::bigint * 3600000;
  v_target_xp_boost_expiry bigint;
  v_target_unlimited_hearts_expiry bigint;
begin
  if p_user_id is null then
    raise exception 'USER_ID_REQUIRED';
  end if;

  if p_request_id is null then
    raise exception 'REQUEST_ID_REQUIRED';
  end if;

  if p_coin_cost <= 0 then
    raise exception 'INVALID_COIN_COST';
  end if;

  select *
  into v_profile
  from public.user_profiles
  where id = p_user_id
  for update;

  if not found then
    raise exception 'USER_PROFILE_NOT_FOUND';
  end if;

  insert into public.store_transactions (
    user_id,
    request_id,
    source,
    item_id,
    coin_delta,
    metadata
  )
  values (
    p_user_id,
    p_request_id,
    'coins',
    p_item_id,
    -p_coin_cost,
    jsonb_build_object(
      'item_kind', p_item_kind,
      'duration_hours', p_duration_hours,
      'multiplier', p_multiplier
    )
  )
  on conflict (request_id) do nothing
  returning id into v_transaction_id;

  if v_transaction_id is null then
    return jsonb_build_object(
      'alreadyProcessed', true,
      'coins', coalesce(v_profile.coins, 0),
      'hearts', coalesce(v_profile.hearts, 0),
      'xpBoostMultiplier', coalesce(v_profile.xp_boost_multiplier, 1),
      'xpBoostExpiresAt', coalesce(v_profile.xp_boost_expires_at, 0),
      'unlimitedHeartsExpiresAt', coalesce(v_profile.unlimited_hearts_expires_at, 0)
    );
  end if;

  if coalesce(v_profile.coins, 0) < p_coin_cost then
    raise exception 'INSUFFICIENT_COINS';
  end if;

  if p_item_kind = 'heart_refill' then
    if coalesce(v_profile.hearts, 0) >= coalesce(v_profile.max_hearts, 5) then
      raise exception 'HEARTS_ALREADY_FULL';
    end if;

    update public.user_profiles
    set
      coins = coalesce(coins, 0) - p_coin_cost,
      hearts = coalesce(max_hearts, 5)
    where id = p_user_id
    returning * into v_profile;
  elsif p_item_kind = 'xp_boost' then
    if v_duration_ms <= 0 or coalesce(p_multiplier, 0) < 2 then
      raise exception 'INVALID_XP_BOOST';
    end if;

    if coalesce(v_profile.xp_boost_multiplier, 1) = p_multiplier
       and coalesce(v_profile.xp_boost_expires_at, 0)::bigint > v_now_ms then
      v_target_xp_boost_expiry := coalesce(v_profile.xp_boost_expires_at, 0)::bigint + v_duration_ms;
    else
      v_target_xp_boost_expiry := v_now_ms + v_duration_ms;
    end if;

    update public.user_profiles
    set
      coins = coalesce(coins, 0) - p_coin_cost,
      xp_boost_multiplier = p_multiplier,
      xp_boost_expires_at = v_target_xp_boost_expiry
    where id = p_user_id
    returning * into v_profile;
  elsif p_item_kind = 'unlimited_hearts' then
    if v_duration_ms <= 0 then
      raise exception 'INVALID_UNLIMITED_HEARTS';
    end if;

    if coalesce(v_profile.unlimited_hearts_expires_at, 0)::bigint > v_now_ms then
      v_target_unlimited_hearts_expiry := coalesce(v_profile.unlimited_hearts_expires_at, 0)::bigint + v_duration_ms;
    else
      v_target_unlimited_hearts_expiry := v_now_ms + v_duration_ms;
    end if;

    update public.user_profiles
    set
      coins = coalesce(coins, 0) - p_coin_cost,
      hearts = coalesce(max_hearts, 5),
      unlimited_hearts_expires_at = v_target_unlimited_hearts_expiry
    where id = p_user_id
    returning * into v_profile;
  else
    raise exception 'INVALID_ITEM_KIND';
  end if;

  update public.store_transactions
  set
    coin_balance_after = v_profile.coins,
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'xp_boost_multiplier', coalesce(v_profile.xp_boost_multiplier, 1),
      'xp_boost_expires_at', coalesce(v_profile.xp_boost_expires_at, 0),
      'unlimited_hearts_expires_at', coalesce(v_profile.unlimited_hearts_expires_at, 0),
      'hearts', coalesce(v_profile.hearts, 0)
    )
  where id = v_transaction_id;

  return jsonb_build_object(
    'alreadyProcessed', false,
    'coins', coalesce(v_profile.coins, 0),
    'hearts', coalesce(v_profile.hearts, 0),
    'xpBoostMultiplier', coalesce(v_profile.xp_boost_multiplier, 1),
    'xpBoostExpiresAt', coalesce(v_profile.xp_boost_expires_at, 0),
    'unlimitedHeartsExpiresAt', coalesce(v_profile.unlimited_hearts_expires_at, 0)
  );
end;
$$;

grant execute on function public.fulfill_store_coin_pack(uuid, text, text, integer, integer, text) to service_role;
grant execute on function public.apply_store_coin_purchase(uuid, uuid, text, integer, text, integer, integer) to service_role;
