


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."apply_store_coin_purchase"("p_user_id" "uuid", "p_request_id" "uuid", "p_item_id" "text", "p_coin_cost" integer, "p_item_kind" "text", "p_duration_hours" integer DEFAULT NULL::integer, "p_multiplier" integer DEFAULT NULL::integer) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."apply_store_coin_purchase"("p_user_id" "uuid", "p_request_id" "uuid", "p_item_id" "text", "p_coin_cost" integer, "p_item_kind" "text", "p_duration_hours" integer, "p_multiplier" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."claim_duel_matchmaking_pair"("p_match_type" "text", "p_server_instance_id" "text", "p_base_range" integer DEFAULT 75, "p_max_range" integer DEFAULT 350, "p_range_grow_per_sec" integer DEFAULT 2) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_left public.duel_matchmaking_queue%rowtype;
  v_right public.duel_matchmaking_queue%rowtype;
  v_left_range integer;
begin
  if coalesce(trim(p_match_type), '') = '' then
    raise exception 'MATCH_TYPE_REQUIRED';
  end if;

  if coalesce(trim(p_server_instance_id), '') = '' then
    raise exception 'SERVER_INSTANCE_REQUIRED';
  end if;

  lock table public.duel_matchmaking_queue in share row exclusive mode;

  for v_left in
    select *
    from public.duel_matchmaking_queue
    where match_type = p_match_type
      and server_instance_id = p_server_instance_id
    order by rating asc, joined_at asc
  loop
    v_right := null;
    v_left_range := least(
      greatest(coalesce(p_max_range, 350), 1),
      greatest(coalesce(p_base_range, 75), 1) +
        greatest(0, floor(extract(epoch from (clock_timestamp() - v_left.joined_at)))::integer) * greatest(coalesce(p_range_grow_per_sec, 2), 0)
    );

    select candidate.*
    into v_right
    from public.duel_matchmaking_queue candidate
    where candidate.match_type = p_match_type
      and candidate.server_instance_id = p_server_instance_id
      and candidate.user_id <> v_left.user_id
      and abs(candidate.rating - v_left.rating) <= greatest(
        v_left_range,
        least(
          greatest(coalesce(p_max_range, 350), 1),
          greatest(coalesce(p_base_range, 75), 1) +
            greatest(0, floor(extract(epoch from (clock_timestamp() - candidate.joined_at)))::integer) * greatest(coalesce(p_range_grow_per_sec, 2), 0)
        )
      )
    order by abs(candidate.rating - v_left.rating) asc, candidate.joined_at asc
    limit 1;

    exit when v_right.user_id is not null;
  end loop;

  if v_left.user_id is null or v_right.user_id is null then
    return null;
  end if;

  delete from public.duel_matchmaking_queue
  where user_id in (v_left.user_id, v_right.user_id);

  return jsonb_build_object(
    'playerA', to_jsonb(v_left),
    'playerB', to_jsonb(v_right)
  );
end;
$$;


ALTER FUNCTION "public"."claim_duel_matchmaking_pair"("p_match_type" "text", "p_server_instance_id" "text", "p_base_range" integer, "p_max_range" integer, "p_range_grow_per_sec" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fulfill_plan_purchase"("p_user_id" "uuid", "p_payment_intent_id" "text", "p_item_id" "text", "p_plan_name" "text", "p_amount_cents" integer, "p_currency" "text", "p_duration_days" integer) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."fulfill_plan_purchase"("p_user_id" "uuid", "p_payment_intent_id" "text", "p_item_id" "text", "p_plan_name" "text", "p_amount_cents" integer, "p_currency" "text", "p_duration_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fulfill_store_coin_pack"("p_user_id" "uuid", "p_payment_intent_id" "text", "p_item_id" "text", "p_coins" integer, "p_amount_cents" integer, "p_currency" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."fulfill_store_coin_pack"("p_user_id" "uuid", "p_payment_intent_id" "text", "p_item_id" "text", "p_coins" integer, "p_amount_cents" integer, "p_currency" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_leaderboard_period_start"("p_period" "text") RETURNS timestamp with time zone
    LANGUAGE "sql" STABLE
    AS $$
  select case
    when p_period = 'week' then date_trunc('week', now())
    when p_period = 'month' then date_trunc('month', now())
    else null
  end;
$$;


ALTER FUNCTION "public"."get_leaderboard_period_start"("p_period" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_public_leaderboard_page"("p_limit" integer DEFAULT 100, "p_offset" integer DEFAULT 0, "p_period" "text" DEFAULT 'all'::"text", "p_sort" "text" DEFAULT 'elo'::"text") RETURNS TABLE("user_id" "uuid", "name" "text", "current_avatar" "text", "xp" integer, "total_lessons_completed" integer, "ranked_elo" integer, "current_streak" integer, "level" integer, "rank" bigint, "total_count" bigint)
    LANGUAGE "sql" STABLE
    AS $$
with bounds as (
  select public.get_leaderboard_period_start(p_period) as period_start
),
period_lessons as (
  select
    l.user_id,
    coalesce(sum(l.xp_earned), 0)::integer as xp,
    count(*)::integer as total_lessons_completed
  from public.lesson_completion_events l
  cross join bounds b
  where b.period_start is null or l.completed_at >= b.period_start
  group by l.user_id
),
period_elo_players as (
  select distinct m.player_a_id as user_id
  from public.matches m
  cross join bounds b
  where m.status = 'completed'
    and m.completed_at is not null
    and (b.period_start is null or m.completed_at >= b.period_start)
    and m.player_a_id is not null
  union
  select distinct m.player_b_id as user_id
  from public.matches m
  cross join bounds b
  where m.status = 'completed'
    and m.completed_at is not null
    and (b.period_start is null or m.completed_at >= b.period_start)
    and m.player_b_id is not null
),
base_all as (
  select
    up.id as user_id,
    up.name,
    up.current_avatar,
    coalesce(up.xp, 0)::integer as xp,
    coalesce(up.total_lessons_completed, 0)::integer as total_lessons_completed,
    coalesce(du.rating, 500)::integer as ranked_elo,
    coalesce(up.current_streak, 0)::integer as current_streak,
    coalesce(up.level, 1)::integer as level
  from public.user_profiles up
  left join public.duel_users du on du.id = up.id
),
base_period as (
  select
    up.id as user_id,
    up.name,
    up.current_avatar,
    coalesce(pl.xp, 0)::integer as xp,
    coalesce(pl.total_lessons_completed, 0)::integer as total_lessons_completed,
    coalesce(du.rating, 500)::integer as ranked_elo,
    coalesce(up.current_streak, 0)::integer as current_streak,
    coalesce(up.level, 1)::integer as level
  from public.user_profiles up
  left join period_lessons pl on pl.user_id = up.id
  left join public.duel_users du on du.id = up.id
  where (
    (p_sort = 'elo' and exists (select 1 from period_elo_players pep where pep.user_id = up.id))
    or (p_sort <> 'elo' and exists (select 1 from period_lessons pl2 where pl2.user_id = up.id))
  )
),
scoped as (
  select * from base_all where p_period = 'all'
  union all
  select * from base_period where p_period <> 'all'
),
ranked as (
  select
    s.*,
    row_number() over (
      order by
        case when p_sort = 'xp' then s.xp end desc nulls last,
        case when p_sort = 'lessons' then s.total_lessons_completed end desc nulls last,
        case when p_sort = 'elo' then s.ranked_elo end desc nulls last,
        s.xp desc,
        s.total_lessons_completed desc,
        s.ranked_elo desc,
        s.name asc
    ) as rank,
    count(*) over () as total_count
  from scoped s
)
select
  user_id,
  name,
  current_avatar,
  xp,
  total_lessons_completed,
  ranked_elo,
  current_streak,
  level,
  rank,
  total_count
from ranked
order by rank
offset greatest(p_offset, 0)
limit greatest(p_limit, 1);
$$;


ALTER FUNCTION "public"."get_public_leaderboard_page"("p_limit" integer, "p_offset" integer, "p_period" "text", "p_sort" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_public_leaderboard_rank"("p_user_id" "uuid", "p_period" "text" DEFAULT 'all'::"text", "p_sort" "text" DEFAULT 'elo'::"text") RETURNS integer
    LANGUAGE "sql" STABLE
    AS $$
with ranked as (
  select user_id, rank
  from public.get_public_leaderboard_page(1000000, 0, p_period, p_sort)
)
select coalesce((select rank::integer from ranked where user_id = p_user_id), 0);
$$;


ALTER FUNCTION "public"."get_public_leaderboard_rank"("p_user_id" "uuid", "p_period" "text", "p_sort" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_public_leaderboard_user_stats"("p_user_id" "uuid", "p_period" "text" DEFAULT 'all'::"text") RETURNS TABLE("user_id" "uuid", "name" "text", "current_avatar" "text", "xp" integer, "total_lessons_completed" integer, "ranked_elo" integer, "current_streak" integer, "level" integer)
    LANGUAGE "sql" STABLE
    AS $$
with bounds as (
  select public.get_leaderboard_period_start(p_period) as period_start
),
period_lessons as (
  select
    l.user_id,
    coalesce(sum(l.xp_earned), 0)::integer as xp,
    count(*)::integer as total_lessons_completed
  from public.lesson_completion_events l
  cross join bounds b
  where l.user_id = p_user_id
    and (b.period_start is null or l.completed_at >= b.period_start)
  group by l.user_id
)
select
  up.id as user_id,
  up.name,
  up.current_avatar,
  case when p_period = 'all' then coalesce(up.xp, 0)::integer else coalesce(pl.xp, 0)::integer end as xp,
  case when p_period = 'all' then coalesce(up.total_lessons_completed, 0)::integer else coalesce(pl.total_lessons_completed, 0)::integer end as total_lessons_completed,
  coalesce(du.rating, 500)::integer as ranked_elo,
  coalesce(up.current_streak, 0)::integer as current_streak,
  coalesce(up.level, 1)::integer as level
from public.user_profiles up
left join period_lessons pl on pl.user_id = up.id
left join public.duel_users du on du.id = up.id
where up.id = p_user_id;
$$;


ALTER FUNCTION "public"."get_public_leaderboard_user_stats"("p_user_id" "uuid", "p_period" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_anti_cheat_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;


ALTER FUNCTION "public"."set_anti_cheat_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_duel_runtime_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;


ALTER FUNCTION "public"."set_duel_runtime_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_feedback_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;


ALTER FUNCTION "public"."set_feedback_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_plan_entitlements_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;


ALTER FUNCTION "public"."set_plan_entitlements_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_sales_leads_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;


ALTER FUNCTION "public"."set_sales_leads_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_skill_workspace_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;


ALTER FUNCTION "public"."set_skill_workspace_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_duel_user_match_counts"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if new.total_matches is not null then
    new.matches_played := new.total_matches;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."sync_duel_user_match_counts"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."analytics_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "anonymous_id" "text",
    "session_id" "text",
    "event_name" "text" NOT NULL,
    "path" "text" NOT NULL,
    "properties" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "referrer" "text",
    "user_agent" "text",
    "occurred_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."analytics_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."anti_cheat_case_clusters" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fingerprint" "text" NOT NULL,
    "summary" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."anti_cheat_case_clusters" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."anti_cheat_case_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "case_id" "uuid" NOT NULL,
    "actor_user_id" "uuid",
    "action" "text" NOT NULL,
    "details" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."anti_cheat_case_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."anti_cheat_cases" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "match_id" "uuid" NOT NULL,
    "risk_score" numeric(5,2) DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'new'::"text" NOT NULL,
    "summary" "text" NOT NULL,
    "evidence" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "resolution_note" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "cluster_id" "uuid",
    CONSTRAINT "anti_cheat_cases_status_check" CHECK (("status" = ANY (ARRAY['new'::"text", 'in_review'::"text", 'resolved'::"text", 'dismissed'::"text"])))
);


ALTER TABLE "public"."anti_cheat_cases" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."benchmark_item_outcomes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "client_report_id" "text" NOT NULL,
    "question_id" "text" NOT NULL,
    "template_id" "text" NOT NULL,
    "pack_id" "text" NOT NULL,
    "language" "text" NOT NULL,
    "format" "text" NOT NULL,
    "evaluation_strategy" "text" NOT NULL,
    "calibration_state" "text" NOT NULL,
    "score_percent" integer NOT NULL,
    "is_correct" boolean DEFAULT false NOT NULL,
    "latency_ms" integer,
    "ability_without_item" numeric(6,2) DEFAULT 0 NOT NULL,
    "trust_score" integer NOT NULL,
    "confidence_percent" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "benchmark_item_outcomes_calibration_state_check" CHECK (("calibration_state" = ANY (ARRAY['draft'::"text", 'calibrating'::"text", 'validated'::"text"]))),
    CONSTRAINT "benchmark_item_outcomes_confidence_percent_check" CHECK ((("confidence_percent" >= 0) AND ("confidence_percent" <= 100))),
    CONSTRAINT "benchmark_item_outcomes_evaluation_strategy_check" CHECK (("evaluation_strategy" = ANY (ARRAY['choice'::"text", 'typing'::"text", 'execution'::"text"]))),
    CONSTRAINT "benchmark_item_outcomes_format_check" CHECK (("format" = ANY (ARRAY['quick'::"text", 'full'::"text", 'retake'::"text"]))),
    CONSTRAINT "benchmark_item_outcomes_language_check" CHECK (("language" = ANY (ARRAY['python'::"text", 'javascript'::"text", 'java'::"text", 'cpp'::"text"]))),
    CONSTRAINT "benchmark_item_outcomes_latency_ms_check" CHECK ((("latency_ms" IS NULL) OR ("latency_ms" >= 0))),
    CONSTRAINT "benchmark_item_outcomes_score_percent_check" CHECK ((("score_percent" >= 0) AND ("score_percent" <= 100))),
    CONSTRAINT "benchmark_item_outcomes_trust_score_check" CHECK ((("trust_score" >= 0) AND ("trust_score" <= 100)))
);


ALTER TABLE "public"."benchmark_item_outcomes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."benchmark_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "client_report_id" "text" NOT NULL,
    "report_payload" "jsonb" NOT NULL,
    "goal" "text" NOT NULL,
    "language" "text" NOT NULL,
    "role_level" "text" NOT NULL,
    "overall_score" integer NOT NULL,
    "correct_answers" integer NOT NULL,
    "total_questions" integer NOT NULL,
    "source" "text" DEFAULT 'benchmark_v1'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "is_public" boolean DEFAULT false NOT NULL,
    "public_token" "text",
    "public_shared_at" timestamp with time zone,
    CONSTRAINT "benchmark_reports_correct_answers_check" CHECK (("correct_answers" >= 0)),
    CONSTRAINT "benchmark_reports_goal_check" CHECK (("goal" = ANY (ARRAY['interview_prep'::"text", 'class_improvement'::"text", 'skill_growth'::"text"]))),
    CONSTRAINT "benchmark_reports_language_check" CHECK (("language" = ANY (ARRAY['python'::"text", 'javascript'::"text", 'java'::"text", 'cpp'::"text"]))),
    CONSTRAINT "benchmark_reports_overall_score_check" CHECK ((("overall_score" >= 0) AND ("overall_score" <= 100))),
    CONSTRAINT "benchmark_reports_role_level_check" CHECK (("role_level" = ANY (ARRAY['beginner'::"text", 'intern'::"text", 'junior'::"text", 'general_practice'::"text"]))),
    CONSTRAINT "benchmark_reports_total_questions_check" CHECK (("total_questions" > 0))
);


ALTER TABLE "public"."benchmark_reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."code_snapshots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "match_id" "uuid",
    "user_id" "uuid",
    "code" "text" DEFAULT ''::"text",
    "timestamp" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."code_snapshots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."duel_matches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "player1" "uuid",
    "player2" "uuid",
    "winner_id" "uuid",
    "problem_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."duel_matches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."duel_matchmaking_queue" (
    "user_id" "uuid" NOT NULL,
    "username" "text" NOT NULL,
    "rating" integer DEFAULT 500 NOT NULL,
    "socket_id" "text",
    "server_instance_id" "text" NOT NULL,
    "session_evidence" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "connection_risk_flags" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "match_type" "text" DEFAULT 'ranked'::"text" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "duel_matchmaking_queue_match_type_check" CHECK (("match_type" = ANY (ARRAY['ranked'::"text", 'casual'::"text"])))
);


ALTER TABLE "public"."duel_matchmaking_queue" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."duel_player_sanctions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "scope" "text" DEFAULT 'duels'::"text" NOT NULL,
    "action" "text" DEFAULT 'suspend'::"text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "reason" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "case_id" "uuid",
    "match_id" "uuid",
    "issued_by" "uuid",
    "issued_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "expires_at" timestamp with time zone,
    "lifted_by" "uuid",
    "lifted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "duel_player_sanctions_action_check" CHECK (("action" = ANY (ARRAY['suspend'::"text", 'review_hold'::"text", 'watch'::"text"]))),
    CONSTRAINT "duel_player_sanctions_scope_check" CHECK (("scope" = ANY (ARRAY['duels'::"text", 'progression'::"text", 'all'::"text"]))),
    CONSTRAINT "duel_player_sanctions_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'lifted'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."duel_player_sanctions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."duel_runtime_matches" (
    "match_id" "uuid" NOT NULL,
    "owner_instance_id" "text" NOT NULL,
    "status" "text" NOT NULL,
    "state" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "lease_expires_at" timestamp with time zone DEFAULT ("timezone"('utc'::"text", "now"()) + '00:00:30'::interval) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "player_a_user_id" "uuid",
    "player_b_user_id" "uuid",
    "match_type" "text",
    "difficulty" "text",
    "problem_id" "uuid"
);


ALTER TABLE "public"."duel_runtime_matches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."duel_runtime_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "target_instance_id" "text" NOT NULL,
    "target_user_id" "uuid",
    "message_type" "text" NOT NULL,
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "available_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "delivered_at" timestamp with time zone,
    "expires_at" timestamp with time zone DEFAULT ("timezone"('utc'::"text", "now"()) + '00:10:00'::interval) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."duel_runtime_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."duel_runtime_presence" (
    "user_id" "uuid" NOT NULL,
    "username" "text" NOT NULL,
    "socket_id" "text",
    "server_instance_id" "text" NOT NULL,
    "match_type" "text" DEFAULT 'ranked'::"text" NOT NULL,
    "rating" integer DEFAULT 500 NOT NULL,
    "session_evidence" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "connection_risk_flags" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "connected_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "active_match_id" "uuid",
    CONSTRAINT "duel_runtime_presence_match_type_check" CHECK (("match_type" = ANY (ARRAY['ranked'::"text", 'casual'::"text"])))
);


ALTER TABLE "public"."duel_runtime_presence" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."duel_submissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "match_id" "uuid",
    "user_id" "uuid",
    "code" "text",
    "passed_all" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."duel_submissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."duel_test_cases" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "problem_id" "uuid",
    "input" "text" NOT NULL,
    "expected_output" "text" NOT NULL,
    "is_sample" boolean DEFAULT false
);


ALTER TABLE "public"."duel_test_cases" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."duel_users" (
    "id" "uuid" NOT NULL,
    "username" "text" NOT NULL,
    "rating" integer DEFAULT 500,
    "wins" integer DEFAULT 0,
    "losses" integer DEFAULT 0,
    "draws" integer DEFAULT 0,
    "total_matches" integer DEFAULT 0,
    "win_streak" integer DEFAULT 0,
    "avatar_url" "text" DEFAULT ''::"text",
    "last_online" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "matches_played" integer DEFAULT 0,
    "easy_rating" integer DEFAULT 500,
    "medium_rating" integer DEFAULT 500,
    "hard_rating" integer DEFAULT 500,
    CONSTRAINT "duel_users_draws_check" CHECK (("draws" >= 0)),
    CONSTRAINT "duel_users_losses_check" CHECK (("losses" >= 0)),
    CONSTRAINT "duel_users_rating_check" CHECK (("rating" >= 0)),
    CONSTRAINT "duel_users_total_matches_check" CHECK (("total_matches" >= 0)),
    CONSTRAINT "duel_users_wins_check" CHECK (("wins" >= 0))
);


ALTER TABLE "public"."duel_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."feedback_attachments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "feedback_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "storage_bucket" "text" DEFAULT 'feedback-attachments'::"text" NOT NULL,
    "storage_path" "text" NOT NULL,
    "original_name" "text" NOT NULL,
    "content_type" "text" NOT NULL,
    "byte_size" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "feedback_attachments_byte_size_check" CHECK (("byte_size" > 0))
);


ALTER TABLE "public"."feedback_attachments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."feedback_audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "feedback_id" "uuid" NOT NULL,
    "actor_user_id" "uuid",
    "action" "text" NOT NULL,
    "details" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."feedback_audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."feedback_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "status" "text" DEFAULT 'new'::"text" NOT NULL,
    "subject" "text" NOT NULL,
    "message" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "dedupe_hash" "text" NOT NULL,
    "attachments_count" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "resolved_at" timestamp with time zone,
    CONSTRAINT "feedback_entries_attachments_count_check" CHECK (("attachments_count" >= 0)),
    CONSTRAINT "feedback_entries_status_check" CHECK (("status" = ANY (ARRAY['new'::"text", 'in_review'::"text", 'resolved'::"text"]))),
    CONSTRAINT "feedback_entries_type_check" CHECK (("type" = ANY (ARRAY['bug_report'::"text", 'feature_request'::"text", 'general_feedback'::"text"])))
);


ALTER TABLE "public"."feedback_entries" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."leaderboard_entries" AS
 SELECT "id" AS "user_id",
    "username",
    "rating",
    "wins",
    "losses",
    "total_matches",
        CASE
            WHEN ("total_matches" > 0) THEN "round"(((("wins")::numeric / ("total_matches")::numeric) * (100)::numeric), 2)
            ELSE (0)::numeric
        END AS "win_rate",
    "row_number"() OVER (ORDER BY "rating" DESC, "wins" DESC) AS "rank"
   FROM "public"."duel_users"
  ORDER BY "rating" DESC, "wins" DESC;


ALTER VIEW "public"."leaderboard_entries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."legal_acceptances" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "document_key" "text" NOT NULL,
    "version" "text" NOT NULL,
    "source" "text" DEFAULT 'account'::"text" NOT NULL,
    "accepted_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "ip_address" "text",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "legal_acceptances_document_key_check" CHECK (("document_key" = ANY (ARRAY['terms_of_service'::"text", 'privacy_policy'::"text", 'refund_policy'::"text"]))),
    CONSTRAINT "legal_acceptances_source_check" CHECK (("source" = ANY (ARRAY['signup'::"text", 'checkout'::"text", 'account'::"text"])))
);


ALTER TABLE "public"."legal_acceptances" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lesson_completion_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "lesson_id" "text" NOT NULL,
    "xp_earned" integer DEFAULT 0 NOT NULL,
    "coins_earned" integer DEFAULT 0 NOT NULL,
    "completed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "lesson_completion_events_coins_earned_check" CHECK (("coins_earned" >= 0)),
    CONSTRAINT "lesson_completion_events_xp_earned_check" CHECK (("xp_earned" >= 0))
);


ALTER TABLE "public"."lesson_completion_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."match_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "match_id" "uuid",
    "event_type" "text" NOT NULL,
    "payload" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid"
);


ALTER TABLE "public"."match_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."match_replays" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "match_id" "uuid",
    "replay_data" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "events" "jsonb" DEFAULT '[]'::"jsonb",
    "player_a_timeline" "jsonb" DEFAULT '[]'::"jsonb",
    "player_b_timeline" "jsonb" DEFAULT '[]'::"jsonb"
);


ALTER TABLE "public"."match_replays" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."matches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "player_a_id" "uuid",
    "player_b_id" "uuid",
    "problem_id" "uuid" NOT NULL,
    "match_type" "text" DEFAULT 'ranked'::"text",
    "status" "text" DEFAULT 'WAITING'::"text",
    "winner_id" "uuid",
    "player_a_score" double precision DEFAULT 0,
    "player_b_score" double precision DEFAULT 0,
    "player_a_rating_before" integer,
    "player_b_rating_before" integer,
    "player_a_rating_after" integer,
    "player_b_rating_after" integer,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "start_time" timestamp with time zone,
    "end_time" timestamp with time zone,
    "duration_seconds" integer,
    "ranked" boolean DEFAULT true,
    "end_time_ms" bigint,
    "ended_at" timestamp with time zone,
    "player_a_rating_change" integer DEFAULT 0,
    "player_b_rating_change" integer DEFAULT 0,
    "reason" "text",
    "problem_difficulty" "text",
    "time_limit_seconds" integer,
    "duel_result_strength" "text",
    "player_a_partial_score" double precision,
    "player_b_partial_score" double precision,
    "player_a_wrong_submissions" integer DEFAULT 0,
    "player_b_wrong_submissions" integer DEFAULT 0,
    "integrity_status" "text" DEFAULT 'valid'::"text" NOT NULL,
    "invalidation_reason" "text",
    "invalidated_at" timestamp with time zone,
    "invalidated_by" "uuid",
    "rating_reverted_at" timestamp with time zone,
    "rating_reverted_by" "uuid",
    "moderation_note" "text",
    "player_a_subrating_field" "text",
    "player_b_subrating_field" "text",
    "player_a_subrating_before" integer,
    "player_b_subrating_before" integer,
    "player_a_subrating_after" integer,
    "player_b_subrating_after" integer,
    "player_a_subrating_change" integer,
    "player_b_subrating_change" integer,
    CONSTRAINT "matches_match_type_check" CHECK (("match_type" = ANY (ARRAY['ranked'::"text", 'casual'::"text"]))),
    CONSTRAINT "matches_player_a_score_check" CHECK (("player_a_score" >= (0)::double precision)),
    CONSTRAINT "matches_player_b_score_check" CHECK (("player_b_score" >= (0)::double precision)),
    CONSTRAINT "matches_problem_difficulty_check" CHECK ((("problem_difficulty" IS NULL) OR ("problem_difficulty" = ANY (ARRAY['easy'::"text", 'medium'::"text", 'hard'::"text"])))),
    CONSTRAINT "matches_status_check" CHECK (("upper"("status") = ANY (ARRAY['WAITING'::"text", 'ACTIVE'::"text", 'IN_PROGRESS'::"text", 'FINISHED'::"text", 'COMPLETED'::"text", 'CANCELLED'::"text", 'ABANDONED'::"text", 'ENDED'::"text"])))
);


ALTER TABLE "public"."matches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."plan_entitlements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "item_id" "text" NOT NULL,
    "plan_name" "text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "current_period_start" timestamp with time zone NOT NULL,
    "current_period_end" timestamp with time zone NOT NULL,
    "purchase_count" integer DEFAULT 1 NOT NULL,
    "last_payment_intent_id" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "plan_entitlements_purchase_count_check" CHECK (("purchase_count" >= 1)),
    CONSTRAINT "plan_entitlements_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'expired'::"text", 'cancelled'::"text", 'refunded'::"text"])))
);


ALTER TABLE "public"."plan_entitlements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."problems" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "statement" "text" NOT NULL,
    "difficulty" "text" NOT NULL,
    "time_limit_seconds" integer DEFAULT 900,
    "test_cases" "jsonb" NOT NULL,
    "starter_code" "jsonb" DEFAULT '{}'::"jsonb",
    "supported_languages" "text"[] DEFAULT ARRAY['javascript'::"text", 'python'::"text"],
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "short_story" "text",
    "input_format" "text",
    "output_format" "text",
    "constraints_text" "text",
    "solution_explanation" "text",
    "reference_solution_javascript" "text",
    "estimated_time_minutes" integer,
    "rating_weight" numeric(6,2),
    "tags" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "problem_statement" "text",
    "memory_limit_mb" integer DEFAULT 256,
    CONSTRAINT "problems_difficulty_check" CHECK (("difficulty" = ANY (ARRAY['easy'::"text", 'medium'::"text", 'hard'::"text"]))),
    CONSTRAINT "problems_memory_limit_mb_check" CHECK ((("memory_limit_mb" >= 32) AND ("memory_limit_mb" <= 4096))),
    CONSTRAINT "problems_time_limit_seconds_check" CHECK (("time_limit_seconds" > 0))
);


ALTER TABLE "public"."problems" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "coins" integer DEFAULT 100,
    "total_coins_earned" integer DEFAULT 100,
    "xp" integer DEFAULT 0,
    "completed_lessons" "text"[] DEFAULT '{}'::"text"[],
    "level" integer DEFAULT 1,
    "hearts" integer DEFAULT 5,
    "max_hearts" integer DEFAULT 5,
    "last_heart_reset" "text" DEFAULT (CURRENT_DATE)::"text",
    "current_avatar" "text" DEFAULT 'default'::"text",
    "owned_avatars" "text"[] DEFAULT ARRAY['default'::"text"],
    "unlocked_achievements" "text"[] DEFAULT '{}'::"text"[],
    "current_streak" integer DEFAULT 1,
    "last_login_date" "text" DEFAULT (CURRENT_DATE)::"text",
    "total_lessons_completed" integer DEFAULT 0,
    "email_verified" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "xp_boost_multiplier" integer DEFAULT 1,
    "xp_boost_expires_at" bigint DEFAULT 0,
    "unlimited_hearts_expires_at" bigint DEFAULT 0,
    "lifetime_completed_lessons" "text"[] DEFAULT '{}'::"text"[] NOT NULL
);


ALTER TABLE "public"."user_profiles" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."public_leaderboard" AS
 SELECT "up"."id",
    "up"."name",
    "up"."current_avatar",
    COALESCE("up"."xp", 0) AS "xp",
    COALESCE("up"."level", 1) AS "level",
    COALESCE("up"."total_lessons_completed", 0) AS "total_lessons_completed",
    COALESCE("up"."current_streak", 0) AS "current_streak",
    COALESCE("du"."rating", 500) AS "ranked_elo"
   FROM ("public"."user_profiles" "up"
     LEFT JOIN "public"."duel_users" "du" ON (("du"."id" = "up"."id")));


ALTER VIEW "public"."public_leaderboard" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sales_lead_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lead_id" "uuid" NOT NULL,
    "actor_user_id" "uuid",
    "action" "text" NOT NULL,
    "details" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."sales_lead_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sales_leads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "lead_type" "text" DEFAULT 'demo_request'::"text" NOT NULL,
    "source" "text" DEFAULT 'general'::"text" NOT NULL,
    "intent" "text" DEFAULT 'team_demo'::"text" NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "company" "text" NOT NULL,
    "team_size" "text" NOT NULL,
    "use_case" "text" NOT NULL,
    "objective" "text" NOT NULL,
    "status" "text" DEFAULT 'new'::"text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "priority" "text" DEFAULT 'medium'::"text" NOT NULL,
    "owner_user_id" "uuid",
    "last_contacted_at" timestamp with time zone,
    "next_step" "text",
    "qualification_notes" "text",
    CONSTRAINT "sales_leads_intent_check" CHECK (("intent" = ANY (ARRAY['team_demo'::"text", 'teams_growth'::"text", 'custom_plan'::"text", 'interview_sprint'::"text", 'pro_upgrade'::"text"]))),
    CONSTRAINT "sales_leads_lead_type_check" CHECK (("lead_type" = 'demo_request'::"text")),
    CONSTRAINT "sales_leads_priority_check" CHECK (("priority" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text"]))),
    CONSTRAINT "sales_leads_source_check" CHECK (("source" = ANY (ARRAY['teams_page'::"text", 'pricing_page'::"text", 'benchmark_report'::"text", 'general'::"text"]))),
    CONSTRAINT "sales_leads_status_check" CHECK (("status" = ANY (ARRAY['new'::"text", 'contacted'::"text", 'qualified'::"text", 'won'::"text", 'lost'::"text"])))
);


ALTER TABLE "public"."sales_leads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."skill_team_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "assignment_type" "text" DEFAULT 'benchmark'::"text" NOT NULL,
    "benchmark_language" "text",
    "track_id" "text",
    "due_at" timestamp with time zone,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "archived_at" timestamp with time zone,
    "archived_by" "uuid",
    CONSTRAINT "skill_team_assignments_assignment_type_check" CHECK (("assignment_type" = ANY (ARRAY['benchmark'::"text", 'challenge_pack'::"text", 'roadmap'::"text"]))),
    CONSTRAINT "skill_team_assignments_benchmark_language_check" CHECK (("benchmark_language" = ANY (ARRAY['python'::"text", 'javascript'::"text", 'java'::"text", 'cpp'::"text"])))
);


ALTER TABLE "public"."skill_team_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."skill_team_feedback" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_id" "uuid" NOT NULL,
    "member_user_id" "uuid" NOT NULL,
    "assignment_id" "uuid",
    "author_user_id" "uuid",
    "rubric_score" integer,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "summary" "text" DEFAULT ''::"text" NOT NULL,
    "strengths" "text" DEFAULT ''::"text" NOT NULL,
    "focus_areas" "text" DEFAULT ''::"text" NOT NULL,
    "coach_notes" "text" DEFAULT ''::"text" NOT NULL,
    "shared_with_member" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "submission_id" "uuid",
    "rubric_breakdown" "jsonb",
    CONSTRAINT "skill_team_feedback_rubric_score_check" CHECK ((("rubric_score" >= 0) AND ("rubric_score" <= 100))),
    CONSTRAINT "skill_team_feedback_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'shared'::"text", 'resolved'::"text"])))
);


ALTER TABLE "public"."skill_team_feedback" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."skill_team_invites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_id" "uuid" NOT NULL,
    "code" "text" NOT NULL,
    "label" "text" DEFAULT 'General learner access'::"text" NOT NULL,
    "email" "text",
    "role" "text" DEFAULT 'learner'::"text" NOT NULL,
    "max_uses" integer DEFAULT 25 NOT NULL,
    "use_count" integer DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "expires_at" timestamp with time zone,
    "last_used_at" timestamp with time zone,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "skill_team_invites_max_uses_check" CHECK ((("max_uses" >= 1) AND ("max_uses" <= 500))),
    CONSTRAINT "skill_team_invites_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'coach'::"text", 'learner'::"text"]))),
    CONSTRAINT "skill_team_invites_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'expired'::"text", 'revoked'::"text"]))),
    CONSTRAINT "skill_team_invites_use_count_check" CHECK (("use_count" >= 0))
);


ALTER TABLE "public"."skill_team_invites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."skill_team_join_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_id" "uuid" NOT NULL,
    "invite_id" "uuid",
    "user_id" "uuid" NOT NULL,
    "requested_role" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "note" "text" DEFAULT ''::"text" NOT NULL,
    "reviewed_by_user_id" "uuid",
    "requested_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "reviewed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "skill_team_join_requests_requested_role_check" CHECK (("requested_role" = ANY (ARRAY['admin'::"text", 'coach'::"text", 'learner'::"text"]))),
    CONSTRAINT "skill_team_join_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'denied'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."skill_team_join_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."skill_team_memberships" (
    "team_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'learner'::"text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "skill_team_memberships_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'coach'::"text", 'learner'::"text"]))),
    CONSTRAINT "skill_team_memberships_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text"])))
);


ALTER TABLE "public"."skill_team_memberships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."skill_team_submissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_id" "uuid" NOT NULL,
    "assignment_id" "uuid",
    "member_user_id" "uuid" NOT NULL,
    "submitted_by_user_id" "uuid",
    "submission_type" "text" DEFAULT 'written'::"text" NOT NULL,
    "title" "text" NOT NULL,
    "body" "text" DEFAULT ''::"text" NOT NULL,
    "external_url" "text",
    "code_language" "text",
    "status" "text" DEFAULT 'submitted'::"text" NOT NULL,
    "rubric_score" integer,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "attempt_number" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "skill_team_submissions_attempt_number_check" CHECK (("attempt_number" >= 1)),
    CONSTRAINT "skill_team_submissions_code_language_check" CHECK (("code_language" = ANY (ARRAY['python'::"text", 'javascript'::"text", 'java'::"text", 'cpp'::"text"]))),
    CONSTRAINT "skill_team_submissions_rubric_score_check" CHECK ((("rubric_score" >= 0) AND ("rubric_score" <= 100))),
    CONSTRAINT "skill_team_submissions_status_check" CHECK (("status" = ANY (ARRAY['submitted'::"text", 'reviewed'::"text", 'needs_revision'::"text"]))),
    CONSTRAINT "skill_team_submissions_submission_type_check" CHECK (("submission_type" = ANY (ARRAY['written'::"text", 'code'::"text", 'link'::"text"])))
);


ALTER TABLE "public"."skill_team_submissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."skill_teams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "use_case" "text" DEFAULT 'bootcamps'::"text" NOT NULL,
    "seat_limit" integer DEFAULT 25 NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "is_public" boolean DEFAULT false NOT NULL,
    "public_token" "text",
    "public_shared_at" timestamp with time zone,
    "join_mode" "text" DEFAULT 'open_code'::"text" NOT NULL,
    "allowed_email_domain" "text",
    CONSTRAINT "skill_teams_join_mode_check" CHECK (("join_mode" = ANY (ARRAY['open_code'::"text", 'code_domain'::"text", 'code_approval'::"text", 'invite_only'::"text"]))),
    CONSTRAINT "skill_teams_seat_limit_check" CHECK ((("seat_limit" >= 1) AND ("seat_limit" <= 1000))),
    CONSTRAINT "skill_teams_use_case_check" CHECK (("use_case" = ANY (ARRAY['bootcamps'::"text", 'universities'::"text", 'coding-clubs'::"text", 'upskilling'::"text", 'general'::"text"])))
);


ALTER TABLE "public"."skill_teams" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."store_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "request_id" "uuid",
    "stripe_payment_intent_id" "text",
    "source" "text" NOT NULL,
    "item_id" "text" NOT NULL,
    "status" "text" DEFAULT 'completed'::"text" NOT NULL,
    "coin_delta" integer DEFAULT 0 NOT NULL,
    "coin_balance_after" integer,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "store_transactions_source_check" CHECK (("source" = ANY (ARRAY['coins'::"text", 'stripe'::"text"]))),
    CONSTRAINT "store_transactions_status_check" CHECK (("status" = 'completed'::"text"))
);


ALTER TABLE "public"."store_transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."submissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "match_id" "uuid",
    "user_id" "uuid",
    "code" "text" NOT NULL,
    "language" "text" NOT NULL,
    "test_results" "jsonb" DEFAULT '[]'::"jsonb",
    "passed_tests" integer DEFAULT 0,
    "total_tests" integer DEFAULT 0,
    "execution_time_ms" integer DEFAULT 0,
    "submitted_at" timestamp with time zone DEFAULT "now"(),
    "result" "text" DEFAULT 'unknown'::"text",
    "score" integer DEFAULT 0,
    "runtime_ms" integer DEFAULT 0,
    "memory_kb" integer DEFAULT 0,
    "is_winning_submission" boolean DEFAULT false,
    "failed_count" integer DEFAULT 0,
    "verdict" "text" DEFAULT 'pending'::"text",
    "passed_count" integer DEFAULT 0,
    "total_count" integer DEFAULT 0,
    "code_hash" "text",
    "submission_sequence" integer DEFAULT 1,
    "compile_log" "text" DEFAULT ''::"text",
    "execution_log" "text" DEFAULT ''::"text",
    "test_summary" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "audit_metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "submission_kind" "text" DEFAULT 'manual'::"text" NOT NULL,
    CONSTRAINT "submissions_passed_tests_check" CHECK (("passed_tests" >= 0)),
    CONSTRAINT "submissions_total_tests_check" CHECK (("total_tests" >= 0))
);


ALTER TABLE "public"."submissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_activity_presence" (
    "user_id" "uuid" NOT NULL,
    "last_seen_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "last_active_at" timestamp with time zone,
    "active_session_expires_at" timestamp with time zone,
    "last_path" "text",
    "visibility_state" "text" DEFAULT 'visible'::"text" NOT NULL,
    "last_reason" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."user_activity_presence" OWNER TO "postgres";


ALTER TABLE ONLY "public"."analytics_events"
    ADD CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."anti_cheat_case_clusters"
    ADD CONSTRAINT "anti_cheat_case_clusters_fingerprint_key" UNIQUE ("fingerprint");



ALTER TABLE ONLY "public"."anti_cheat_case_clusters"
    ADD CONSTRAINT "anti_cheat_case_clusters_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."anti_cheat_case_events"
    ADD CONSTRAINT "anti_cheat_case_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."anti_cheat_cases"
    ADD CONSTRAINT "anti_cheat_cases_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."benchmark_item_outcomes"
    ADD CONSTRAINT "benchmark_item_outcomes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."benchmark_reports"
    ADD CONSTRAINT "benchmark_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."benchmark_reports"
    ADD CONSTRAINT "benchmark_reports_public_token_key" UNIQUE ("public_token");



ALTER TABLE ONLY "public"."code_snapshots"
    ADD CONSTRAINT "code_snapshots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."duel_matches"
    ADD CONSTRAINT "duel_matches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."duel_matchmaking_queue"
    ADD CONSTRAINT "duel_matchmaking_queue_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."duel_player_sanctions"
    ADD CONSTRAINT "duel_player_sanctions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."duel_runtime_matches"
    ADD CONSTRAINT "duel_runtime_matches_pkey" PRIMARY KEY ("match_id");



ALTER TABLE ONLY "public"."duel_runtime_messages"
    ADD CONSTRAINT "duel_runtime_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."duel_runtime_presence"
    ADD CONSTRAINT "duel_runtime_presence_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."duel_submissions"
    ADD CONSTRAINT "duel_submissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."duel_test_cases"
    ADD CONSTRAINT "duel_test_cases_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."duel_users"
    ADD CONSTRAINT "duel_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."duel_users"
    ADD CONSTRAINT "duel_users_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."feedback_attachments"
    ADD CONSTRAINT "feedback_attachments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feedback_attachments"
    ADD CONSTRAINT "feedback_attachments_storage_path_key" UNIQUE ("storage_path");



ALTER TABLE ONLY "public"."feedback_audit_logs"
    ADD CONSTRAINT "feedback_audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feedback_entries"
    ADD CONSTRAINT "feedback_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."legal_acceptances"
    ADD CONSTRAINT "legal_acceptances_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lesson_completion_events"
    ADD CONSTRAINT "lesson_completion_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."match_events"
    ADD CONSTRAINT "match_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."match_replays"
    ADD CONSTRAINT "match_replays_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."plan_entitlements"
    ADD CONSTRAINT "plan_entitlements_last_payment_intent_id_key" UNIQUE ("last_payment_intent_id");



ALTER TABLE ONLY "public"."plan_entitlements"
    ADD CONSTRAINT "plan_entitlements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."plan_entitlements"
    ADD CONSTRAINT "plan_entitlements_user_id_item_id_key" UNIQUE ("user_id", "item_id");



ALTER TABLE ONLY "public"."problems"
    ADD CONSTRAINT "problems_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sales_lead_events"
    ADD CONSTRAINT "sales_lead_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sales_leads"
    ADD CONSTRAINT "sales_leads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."skill_team_assignments"
    ADD CONSTRAINT "skill_team_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."skill_team_feedback"
    ADD CONSTRAINT "skill_team_feedback_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."skill_team_invites"
    ADD CONSTRAINT "skill_team_invites_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."skill_team_invites"
    ADD CONSTRAINT "skill_team_invites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."skill_team_join_requests"
    ADD CONSTRAINT "skill_team_join_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."skill_team_memberships"
    ADD CONSTRAINT "skill_team_memberships_pkey" PRIMARY KEY ("team_id", "user_id");



ALTER TABLE ONLY "public"."skill_team_submissions"
    ADD CONSTRAINT "skill_team_submissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."skill_teams"
    ADD CONSTRAINT "skill_teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."skill_teams"
    ADD CONSTRAINT "skill_teams_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."store_transactions"
    ADD CONSTRAINT "store_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."store_transactions"
    ADD CONSTRAINT "store_transactions_request_id_key" UNIQUE ("request_id");



ALTER TABLE ONLY "public"."store_transactions"
    ADD CONSTRAINT "store_transactions_stripe_payment_intent_id_key" UNIQUE ("stripe_payment_intent_id");



ALTER TABLE ONLY "public"."submissions"
    ADD CONSTRAINT "submissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_activity_presence"
    ADD CONSTRAINT "user_activity_presence_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id");



CREATE INDEX "analytics_events_name_occurred_idx" ON "public"."analytics_events" USING "btree" ("event_name", "occurred_at" DESC);



CREATE INDEX "analytics_events_user_occurred_idx" ON "public"."analytics_events" USING "btree" ("user_id", "occurred_at" DESC);



CREATE INDEX "anti_cheat_case_events_case_created_idx" ON "public"."anti_cheat_case_events" USING "btree" ("case_id", "created_at" DESC);



CREATE INDEX "anti_cheat_cases_cluster_created_idx" ON "public"."anti_cheat_cases" USING "btree" ("cluster_id", "created_at" DESC);



CREATE UNIQUE INDEX "anti_cheat_cases_match_uidx" ON "public"."anti_cheat_cases" USING "btree" ("match_id");



CREATE INDEX "anti_cheat_cases_risk_created_idx" ON "public"."anti_cheat_cases" USING "btree" ("risk_score" DESC, "created_at" DESC);



CREATE INDEX "anti_cheat_cases_status_created_idx" ON "public"."anti_cheat_cases" USING "btree" ("status", "created_at" DESC);



CREATE INDEX "benchmark_item_outcomes_language_created_idx" ON "public"."benchmark_item_outcomes" USING "btree" ("language", "created_at" DESC);



CREATE INDEX "benchmark_item_outcomes_pack_created_idx" ON "public"."benchmark_item_outcomes" USING "btree" ("pack_id", "created_at" DESC);



CREATE INDEX "benchmark_item_outcomes_template_created_idx" ON "public"."benchmark_item_outcomes" USING "btree" ("template_id", "created_at" DESC);



CREATE UNIQUE INDEX "benchmark_item_outcomes_user_report_question_uidx" ON "public"."benchmark_item_outcomes" USING "btree" ("user_id", "client_report_id", "question_id");



CREATE INDEX "benchmark_reports_language_created_idx" ON "public"."benchmark_reports" USING "btree" ("language", "created_at" DESC);



CREATE INDEX "benchmark_reports_public_token_idx" ON "public"."benchmark_reports" USING "btree" ("public_token");



CREATE INDEX "benchmark_reports_public_visibility_idx" ON "public"."benchmark_reports" USING "btree" ("is_public", "public_shared_at" DESC);



CREATE UNIQUE INDEX "benchmark_reports_user_client_uidx" ON "public"."benchmark_reports" USING "btree" ("user_id", "client_report_id");



CREATE INDEX "benchmark_reports_user_created_idx" ON "public"."benchmark_reports" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "duel_matchmaking_queue_type_rating_idx" ON "public"."duel_matchmaking_queue" USING "btree" ("match_type", "rating", "joined_at");



CREATE INDEX "duel_matchmaking_queue_type_server_joined_idx" ON "public"."duel_matchmaking_queue" USING "btree" ("match_type", "server_instance_id", "joined_at");



CREATE INDEX "duel_player_sanctions_scope_status_idx" ON "public"."duel_player_sanctions" USING "btree" ("scope", "status", "issued_at" DESC);



CREATE INDEX "duel_player_sanctions_user_status_idx" ON "public"."duel_player_sanctions" USING "btree" ("user_id", "status", "issued_at" DESC);



CREATE INDEX "duel_runtime_matches_lease_idx" ON "public"."duel_runtime_matches" USING "btree" ("lease_expires_at");



CREATE INDEX "duel_runtime_matches_owner_updated_idx" ON "public"."duel_runtime_matches" USING "btree" ("owner_instance_id", "updated_at" DESC);



CREATE INDEX "duel_runtime_matches_player_a_idx" ON "public"."duel_runtime_matches" USING "btree" ("player_a_user_id", "updated_at" DESC);



CREATE INDEX "duel_runtime_matches_player_b_idx" ON "public"."duel_runtime_matches" USING "btree" ("player_b_user_id", "updated_at" DESC);



CREATE INDEX "duel_runtime_matches_players_idx" ON "public"."duel_runtime_matches" USING "btree" ("player_a_user_id", "player_b_user_id", "updated_at" DESC);



CREATE INDEX "duel_runtime_messages_expires_idx" ON "public"."duel_runtime_messages" USING "btree" ("expires_at");



CREATE INDEX "duel_runtime_messages_target_available_idx" ON "public"."duel_runtime_messages" USING "btree" ("target_instance_id", "delivered_at", "available_at");



CREATE INDEX "duel_runtime_presence_active_match_idx" ON "public"."duel_runtime_presence" USING "btree" ("active_match_id");



CREATE INDEX "duel_runtime_presence_server_updated_idx" ON "public"."duel_runtime_presence" USING "btree" ("server_instance_id", "updated_at" DESC);



CREATE INDEX "feedback_attachments_feedback_idx" ON "public"."feedback_attachments" USING "btree" ("feedback_id", "created_at");



CREATE INDEX "feedback_audit_logs_feedback_idx" ON "public"."feedback_audit_logs" USING "btree" ("feedback_id", "created_at" DESC);



CREATE INDEX "feedback_entries_dedupe_user_idx" ON "public"."feedback_entries" USING "btree" ("user_id", "dedupe_hash", "created_at" DESC);



CREATE INDEX "feedback_entries_status_created_idx" ON "public"."feedback_entries" USING "btree" ("status", "created_at" DESC);



CREATE INDEX "feedback_entries_type_created_idx" ON "public"."feedback_entries" USING "btree" ("type", "created_at" DESC);



CREATE INDEX "feedback_entries_user_created_idx" ON "public"."feedback_entries" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_code_snapshots_match_id" ON "public"."code_snapshots" USING "btree" ("match_id");



CREATE INDEX "idx_duel_users_easy_rating" ON "public"."duel_users" USING "btree" ("easy_rating" DESC);



CREATE INDEX "idx_duel_users_hard_rating" ON "public"."duel_users" USING "btree" ("hard_rating" DESC);



CREATE INDEX "idx_duel_users_last_online" ON "public"."duel_users" USING "btree" ("last_online" DESC);



CREATE INDEX "idx_duel_users_medium_rating" ON "public"."duel_users" USING "btree" ("medium_rating" DESC);



CREATE INDEX "idx_duel_users_rating" ON "public"."duel_users" USING "btree" ("rating" DESC);



CREATE INDEX "idx_lesson_completion_events_completed_at" ON "public"."lesson_completion_events" USING "btree" ("completed_at" DESC);



CREATE INDEX "idx_lesson_completion_events_user_id" ON "public"."lesson_completion_events" USING "btree" ("user_id");



CREATE INDEX "idx_lesson_completion_events_user_period" ON "public"."lesson_completion_events" USING "btree" ("user_id", "completed_at" DESC);



CREATE INDEX "idx_matches_created_at" ON "public"."matches" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_matches_player_a" ON "public"."matches" USING "btree" ("player_a_id");



CREATE INDEX "idx_matches_player_b" ON "public"."matches" USING "btree" ("player_b_id");



CREATE INDEX "idx_matches_status" ON "public"."matches" USING "btree" ("status");



CREATE INDEX "idx_submissions_match_id" ON "public"."submissions" USING "btree" ("match_id");



CREATE INDEX "idx_submissions_user_id" ON "public"."submissions" USING "btree" ("user_id");



CREATE INDEX "legal_acceptances_document_version_idx" ON "public"."legal_acceptances" USING "btree" ("document_key", "version", "created_at" DESC);



CREATE INDEX "legal_acceptances_user_created_idx" ON "public"."legal_acceptances" USING "btree" ("user_id", "created_at" DESC);



CREATE UNIQUE INDEX "legal_acceptances_user_document_version_uidx" ON "public"."legal_acceptances" USING "btree" ("user_id", "document_key", "version");



CREATE UNIQUE INDEX "lesson_completion_events_user_lesson_uidx" ON "public"."lesson_completion_events" USING "btree" ("user_id", "lesson_id");



CREATE INDEX "match_events_match_created_idx" ON "public"."match_events" USING "btree" ("match_id", "created_at");



CREATE INDEX "match_events_user_created_idx" ON "public"."match_events" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "match_replays_match_created_idx" ON "public"."match_replays" USING "btree" ("match_id", "created_at" DESC);



CREATE INDEX "plan_entitlements_item_period_idx" ON "public"."plan_entitlements" USING "btree" ("item_id", "current_period_end" DESC);



CREATE INDEX "plan_entitlements_user_updated_idx" ON "public"."plan_entitlements" USING "btree" ("user_id", "updated_at" DESC);



CREATE INDEX "sales_lead_events_lead_created_idx" ON "public"."sales_lead_events" USING "btree" ("lead_id", "created_at" DESC);



CREATE INDEX "sales_leads_created_idx" ON "public"."sales_leads" USING "btree" ("created_at" DESC);



CREATE INDEX "sales_leads_email_idx" ON "public"."sales_leads" USING "btree" ("email", "created_at" DESC);



CREATE INDEX "sales_leads_owner_updated_idx" ON "public"."sales_leads" USING "btree" ("owner_user_id", "updated_at" DESC);



CREATE INDEX "sales_leads_source_idx" ON "public"."sales_leads" USING "btree" ("source", "created_at" DESC);



CREATE INDEX "sales_leads_status_priority_idx" ON "public"."sales_leads" USING "btree" ("status", "priority", "updated_at" DESC);



CREATE INDEX "skill_team_assignments_team_active_created_idx" ON "public"."skill_team_assignments" USING "btree" ("team_id", "created_at" DESC) WHERE ("archived_at" IS NULL);



CREATE INDEX "skill_team_assignments_team_archived_due_idx" ON "public"."skill_team_assignments" USING "btree" ("team_id", "archived_at" DESC, "due_at", "created_at" DESC);



CREATE INDEX "skill_team_assignments_team_created_idx" ON "public"."skill_team_assignments" USING "btree" ("team_id", "created_at" DESC);



CREATE INDEX "skill_team_feedback_member_idx" ON "public"."skill_team_feedback" USING "btree" ("member_user_id", "updated_at" DESC);



CREATE INDEX "skill_team_feedback_submission_idx" ON "public"."skill_team_feedback" USING "btree" ("submission_id");



CREATE INDEX "skill_team_feedback_team_updated_idx" ON "public"."skill_team_feedback" USING "btree" ("team_id", "updated_at" DESC);



CREATE INDEX "skill_team_invites_team_created_idx" ON "public"."skill_team_invites" USING "btree" ("team_id", "created_at" DESC);



CREATE INDEX "skill_team_join_requests_team_requested_idx" ON "public"."skill_team_join_requests" USING "btree" ("team_id", "requested_at" DESC);



CREATE UNIQUE INDEX "skill_team_join_requests_team_user_pending_uidx" ON "public"."skill_team_join_requests" USING "btree" ("team_id", "user_id") WHERE ("status" = 'pending'::"text");



CREATE INDEX "skill_team_join_requests_user_requested_idx" ON "public"."skill_team_join_requests" USING "btree" ("user_id", "requested_at" DESC);



CREATE INDEX "skill_team_memberships_team_idx" ON "public"."skill_team_memberships" USING "btree" ("team_id", "joined_at" DESC);



CREATE INDEX "skill_team_memberships_user_idx" ON "public"."skill_team_memberships" USING "btree" ("user_id", "joined_at" DESC);



CREATE INDEX "skill_team_submissions_assignment_idx" ON "public"."skill_team_submissions" USING "btree" ("assignment_id", "created_at" DESC);



CREATE INDEX "skill_team_submissions_member_assignment_idx" ON "public"."skill_team_submissions" USING "btree" ("member_user_id", "assignment_id", "created_at" DESC);



CREATE INDEX "skill_team_submissions_team_updated_idx" ON "public"."skill_team_submissions" USING "btree" ("team_id", "updated_at" DESC);



CREATE INDEX "skill_teams_is_public_idx" ON "public"."skill_teams" USING "btree" ("is_public", "public_shared_at" DESC);



CREATE UNIQUE INDEX "skill_teams_public_token_uidx" ON "public"."skill_teams" USING "btree" ("public_token") WHERE ("public_token" IS NOT NULL);



CREATE INDEX "store_transactions_item_created_idx" ON "public"."store_transactions" USING "btree" ("item_id", "created_at" DESC);



CREATE INDEX "store_transactions_source_created_idx" ON "public"."store_transactions" USING "btree" ("source", "created_at" DESC);



CREATE INDEX "store_transactions_user_created_idx" ON "public"."store_transactions" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "user_activity_presence_active_session_idx" ON "public"."user_activity_presence" USING "btree" ("active_session_expires_at" DESC NULLS LAST);



CREATE INDEX "user_activity_presence_last_active_idx" ON "public"."user_activity_presence" USING "btree" ("last_active_at" DESC NULLS LAST);



CREATE OR REPLACE TRIGGER "anti_cheat_case_clusters_set_updated_at" BEFORE UPDATE ON "public"."anti_cheat_case_clusters" FOR EACH ROW EXECUTE FUNCTION "public"."set_duel_runtime_updated_at"();



CREATE OR REPLACE TRIGGER "anti_cheat_cases_set_updated_at" BEFORE UPDATE ON "public"."anti_cheat_cases" FOR EACH ROW EXECUTE FUNCTION "public"."set_anti_cheat_updated_at"();



CREATE OR REPLACE TRIGGER "duel_matchmaking_queue_set_updated_at" BEFORE UPDATE ON "public"."duel_matchmaking_queue" FOR EACH ROW EXECUTE FUNCTION "public"."set_duel_runtime_updated_at"();



CREATE OR REPLACE TRIGGER "duel_player_sanctions_set_updated_at" BEFORE UPDATE ON "public"."duel_player_sanctions" FOR EACH ROW EXECUTE FUNCTION "public"."set_duel_runtime_updated_at"();



CREATE OR REPLACE TRIGGER "duel_runtime_matches_set_updated_at" BEFORE UPDATE ON "public"."duel_runtime_matches" FOR EACH ROW EXECUTE FUNCTION "public"."set_duel_runtime_updated_at"();



CREATE OR REPLACE TRIGGER "duel_runtime_messages_set_updated_at" BEFORE UPDATE ON "public"."duel_runtime_messages" FOR EACH ROW EXECUTE FUNCTION "public"."set_duel_runtime_updated_at"();



CREATE OR REPLACE TRIGGER "duel_runtime_presence_set_updated_at" BEFORE UPDATE ON "public"."duel_runtime_presence" FOR EACH ROW EXECUTE FUNCTION "public"."set_duel_runtime_updated_at"();



CREATE OR REPLACE TRIGGER "feedback_entries_set_updated_at" BEFORE UPDATE ON "public"."feedback_entries" FOR EACH ROW EXECUTE FUNCTION "public"."set_feedback_updated_at"();



CREATE OR REPLACE TRIGGER "handle_user_profiles_updated_at" BEFORE UPDATE ON "public"."user_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "plan_entitlements_set_updated_at" BEFORE UPDATE ON "public"."plan_entitlements" FOR EACH ROW EXECUTE FUNCTION "public"."set_plan_entitlements_updated_at"();



CREATE OR REPLACE TRIGGER "sales_leads_set_updated_at" BEFORE UPDATE ON "public"."sales_leads" FOR EACH ROW EXECUTE FUNCTION "public"."set_sales_leads_updated_at"();



CREATE OR REPLACE TRIGGER "skill_team_assignments_set_updated_at" BEFORE UPDATE ON "public"."skill_team_assignments" FOR EACH ROW EXECUTE FUNCTION "public"."set_skill_workspace_updated_at"();



CREATE OR REPLACE TRIGGER "skill_team_feedback_set_updated_at" BEFORE UPDATE ON "public"."skill_team_feedback" FOR EACH ROW EXECUTE FUNCTION "public"."set_skill_workspace_updated_at"();



CREATE OR REPLACE TRIGGER "skill_team_invites_set_updated_at" BEFORE UPDATE ON "public"."skill_team_invites" FOR EACH ROW EXECUTE FUNCTION "public"."set_skill_workspace_updated_at"();



CREATE OR REPLACE TRIGGER "skill_team_join_requests_set_updated_at" BEFORE UPDATE ON "public"."skill_team_join_requests" FOR EACH ROW EXECUTE FUNCTION "public"."set_skill_workspace_updated_at"();



CREATE OR REPLACE TRIGGER "skill_team_memberships_set_updated_at" BEFORE UPDATE ON "public"."skill_team_memberships" FOR EACH ROW EXECUTE FUNCTION "public"."set_skill_workspace_updated_at"();



CREATE OR REPLACE TRIGGER "skill_team_submissions_set_updated_at" BEFORE UPDATE ON "public"."skill_team_submissions" FOR EACH ROW EXECUTE FUNCTION "public"."set_skill_workspace_updated_at"();



CREATE OR REPLACE TRIGGER "skill_teams_set_updated_at" BEFORE UPDATE ON "public"."skill_teams" FOR EACH ROW EXECUTE FUNCTION "public"."set_skill_workspace_updated_at"();



CREATE OR REPLACE TRIGGER "trg_sync_duel_user_match_counts" BEFORE INSERT OR UPDATE ON "public"."duel_users" FOR EACH ROW EXECUTE FUNCTION "public"."sync_duel_user_match_counts"();



ALTER TABLE ONLY "public"."analytics_events"
    ADD CONSTRAINT "analytics_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."anti_cheat_case_events"
    ADD CONSTRAINT "anti_cheat_case_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."anti_cheat_case_events"
    ADD CONSTRAINT "anti_cheat_case_events_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "public"."anti_cheat_cases"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."anti_cheat_cases"
    ADD CONSTRAINT "anti_cheat_cases_cluster_id_fkey" FOREIGN KEY ("cluster_id") REFERENCES "public"."anti_cheat_case_clusters"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."anti_cheat_cases"
    ADD CONSTRAINT "anti_cheat_cases_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."anti_cheat_cases"
    ADD CONSTRAINT "anti_cheat_cases_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."benchmark_item_outcomes"
    ADD CONSTRAINT "benchmark_item_outcomes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."benchmark_reports"
    ADD CONSTRAINT "benchmark_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."code_snapshots"
    ADD CONSTRAINT "code_snapshots_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."code_snapshots"
    ADD CONSTRAINT "code_snapshots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."duel_users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."duel_matches"
    ADD CONSTRAINT "duel_matches_player1_fkey" FOREIGN KEY ("player1") REFERENCES "public"."duel_users"("id");



ALTER TABLE ONLY "public"."duel_matches"
    ADD CONSTRAINT "duel_matches_player2_fkey" FOREIGN KEY ("player2") REFERENCES "public"."duel_users"("id");



ALTER TABLE ONLY "public"."duel_matches"
    ADD CONSTRAINT "duel_matches_winner_id_fkey" FOREIGN KEY ("winner_id") REFERENCES "public"."duel_users"("id");



ALTER TABLE ONLY "public"."duel_matchmaking_queue"
    ADD CONSTRAINT "duel_matchmaking_queue_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."duel_player_sanctions"
    ADD CONSTRAINT "duel_player_sanctions_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "public"."anti_cheat_cases"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."duel_player_sanctions"
    ADD CONSTRAINT "duel_player_sanctions_issued_by_fkey" FOREIGN KEY ("issued_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."duel_player_sanctions"
    ADD CONSTRAINT "duel_player_sanctions_lifted_by_fkey" FOREIGN KEY ("lifted_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."duel_player_sanctions"
    ADD CONSTRAINT "duel_player_sanctions_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."duel_player_sanctions"
    ADD CONSTRAINT "duel_player_sanctions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."duel_runtime_matches"
    ADD CONSTRAINT "duel_runtime_matches_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."duel_runtime_matches"
    ADD CONSTRAINT "duel_runtime_matches_player_a_user_id_fkey" FOREIGN KEY ("player_a_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."duel_runtime_matches"
    ADD CONSTRAINT "duel_runtime_matches_player_b_user_id_fkey" FOREIGN KEY ("player_b_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."duel_runtime_matches"
    ADD CONSTRAINT "duel_runtime_matches_problem_id_fkey" FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."duel_runtime_messages"
    ADD CONSTRAINT "duel_runtime_messages_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."duel_runtime_presence"
    ADD CONSTRAINT "duel_runtime_presence_active_match_id_fkey" FOREIGN KEY ("active_match_id") REFERENCES "public"."matches"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."duel_runtime_presence"
    ADD CONSTRAINT "duel_runtime_presence_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."duel_submissions"
    ADD CONSTRAINT "duel_submissions_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."duel_matches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."duel_submissions"
    ADD CONSTRAINT "duel_submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."duel_users"("id");



ALTER TABLE ONLY "public"."duel_users"
    ADD CONSTRAINT "duel_users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."feedback_attachments"
    ADD CONSTRAINT "feedback_attachments_feedback_id_fkey" FOREIGN KEY ("feedback_id") REFERENCES "public"."feedback_entries"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."feedback_attachments"
    ADD CONSTRAINT "feedback_attachments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."feedback_audit_logs"
    ADD CONSTRAINT "feedback_audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."feedback_audit_logs"
    ADD CONSTRAINT "feedback_audit_logs_feedback_id_fkey" FOREIGN KEY ("feedback_id") REFERENCES "public"."feedback_entries"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."feedback_entries"
    ADD CONSTRAINT "feedback_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."legal_acceptances"
    ADD CONSTRAINT "legal_acceptances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lesson_completion_events"
    ADD CONSTRAINT "lesson_completion_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."match_events"
    ADD CONSTRAINT "match_events_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."match_replays"
    ADD CONSTRAINT "match_replays_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_invalidated_by_fkey" FOREIGN KEY ("invalidated_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_player_a_id_fkey" FOREIGN KEY ("player_a_id") REFERENCES "public"."duel_users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_player_b_id_fkey" FOREIGN KEY ("player_b_id") REFERENCES "public"."duel_users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_problem_id_fkey" FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_rating_reverted_by_fkey" FOREIGN KEY ("rating_reverted_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_winner_id_fkey" FOREIGN KEY ("winner_id") REFERENCES "public"."duel_users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."plan_entitlements"
    ADD CONSTRAINT "plan_entitlements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sales_lead_events"
    ADD CONSTRAINT "sales_lead_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sales_lead_events"
    ADD CONSTRAINT "sales_lead_events_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."sales_leads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sales_leads"
    ADD CONSTRAINT "sales_leads_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sales_leads"
    ADD CONSTRAINT "sales_leads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."skill_team_assignments"
    ADD CONSTRAINT "skill_team_assignments_archived_by_fkey" FOREIGN KEY ("archived_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."skill_team_assignments"
    ADD CONSTRAINT "skill_team_assignments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."skill_team_assignments"
    ADD CONSTRAINT "skill_team_assignments_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."skill_teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."skill_team_feedback"
    ADD CONSTRAINT "skill_team_feedback_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "public"."skill_team_assignments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."skill_team_feedback"
    ADD CONSTRAINT "skill_team_feedback_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."skill_team_feedback"
    ADD CONSTRAINT "skill_team_feedback_member_user_id_fkey" FOREIGN KEY ("member_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."skill_team_feedback"
    ADD CONSTRAINT "skill_team_feedback_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "public"."skill_team_submissions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."skill_team_feedback"
    ADD CONSTRAINT "skill_team_feedback_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."skill_teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."skill_team_invites"
    ADD CONSTRAINT "skill_team_invites_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."skill_team_invites"
    ADD CONSTRAINT "skill_team_invites_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."skill_teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."skill_team_join_requests"
    ADD CONSTRAINT "skill_team_join_requests_invite_id_fkey" FOREIGN KEY ("invite_id") REFERENCES "public"."skill_team_invites"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."skill_team_join_requests"
    ADD CONSTRAINT "skill_team_join_requests_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."skill_team_join_requests"
    ADD CONSTRAINT "skill_team_join_requests_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."skill_teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."skill_team_join_requests"
    ADD CONSTRAINT "skill_team_join_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."skill_team_memberships"
    ADD CONSTRAINT "skill_team_memberships_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."skill_teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."skill_team_memberships"
    ADD CONSTRAINT "skill_team_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."skill_team_submissions"
    ADD CONSTRAINT "skill_team_submissions_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "public"."skill_team_assignments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."skill_team_submissions"
    ADD CONSTRAINT "skill_team_submissions_member_user_id_fkey" FOREIGN KEY ("member_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."skill_team_submissions"
    ADD CONSTRAINT "skill_team_submissions_submitted_by_user_id_fkey" FOREIGN KEY ("submitted_by_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."skill_team_submissions"
    ADD CONSTRAINT "skill_team_submissions_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."skill_teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."skill_teams"
    ADD CONSTRAINT "skill_teams_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."store_transactions"
    ADD CONSTRAINT "store_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."submissions"
    ADD CONSTRAINT "submissions_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."submissions"
    ADD CONSTRAINT "submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."duel_users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_activity_presence"
    ADD CONSTRAINT "user_activity_presence_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Leaderboard can read all user_profiles" ON "public"."user_profiles" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Users can insert own duel profile" ON "public"."duel_users" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can insert own profile" ON "public"."user_profiles" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own duel profile" ON "public"."duel_users" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own profile" ON "public"."user_profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view all duel profiles" ON "public"."duel_users" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users can view own profile" ON "public"."user_profiles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));



ALTER TABLE "public"."analytics_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "analytics_events_service_role_all" ON "public"."analytics_events" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."anti_cheat_case_clusters" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "anti_cheat_case_clusters_service_role_all" ON "public"."anti_cheat_case_clusters" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."anti_cheat_case_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "anti_cheat_case_events_select_none" ON "public"."anti_cheat_case_events" FOR SELECT TO "authenticated" USING (false);



ALTER TABLE "public"."anti_cheat_cases" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "anti_cheat_cases_select_none" ON "public"."anti_cheat_cases" FOR SELECT TO "authenticated" USING (false);



ALTER TABLE "public"."benchmark_item_outcomes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "benchmark_item_outcomes_service_role_all" ON "public"."benchmark_item_outcomes" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."benchmark_reports" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "benchmark_reports_insert_own" ON "public"."benchmark_reports" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "benchmark_reports_select_own" ON "public"."benchmark_reports" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."code_snapshots" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "code_snapshots_service_role_all" ON "public"."code_snapshots" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."duel_matches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."duel_matchmaking_queue" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "duel_matchmaking_queue_service_role_all" ON "public"."duel_matchmaking_queue" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."duel_player_sanctions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "duel_player_sanctions_service_role_all" ON "public"."duel_player_sanctions" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."duel_runtime_matches" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "duel_runtime_matches_service_role_all" ON "public"."duel_runtime_matches" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."duel_runtime_messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "duel_runtime_messages_service_role_all" ON "public"."duel_runtime_messages" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."duel_runtime_presence" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "duel_runtime_presence_service_role_all" ON "public"."duel_runtime_presence" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."duel_submissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."duel_test_cases" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."duel_users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "duel_users_insert_own" ON "public"."duel_users" FOR INSERT TO "authenticated" WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "duel_users_select_own" ON "public"."duel_users" FOR SELECT TO "authenticated" USING (("id" = "auth"."uid"()));



CREATE POLICY "duel_users_service_role_all" ON "public"."duel_users" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "duel_users_update_own" ON "public"."duel_users" FOR UPDATE TO "authenticated" USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));



ALTER TABLE "public"."feedback_attachments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "feedback_attachments_insert_own" ON "public"."feedback_attachments" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "feedback_attachments_select_own" ON "public"."feedback_attachments" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."feedback_audit_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "feedback_audit_logs_select_none" ON "public"."feedback_audit_logs" FOR SELECT TO "authenticated" USING (false);



ALTER TABLE "public"."feedback_entries" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "feedback_entries_insert_own" ON "public"."feedback_entries" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "feedback_entries_select_own" ON "public"."feedback_entries" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."legal_acceptances" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "legal_acceptances_insert_own" ON "public"."legal_acceptances" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "legal_acceptances_select_own" ON "public"."legal_acceptances" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."lesson_completion_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "lesson_completion_events_select_own" ON "public"."lesson_completion_events" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."match_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "match_events_service_role_all" ON "public"."match_events" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."match_replays" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "match_replays_service_role_all" ON "public"."match_replays" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."matches" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "matches_authenticated_select_own" ON "public"."matches" FOR SELECT TO "authenticated" USING ((("player_a_id" = "auth"."uid"()) OR ("player_b_id" = "auth"."uid"())));



CREATE POLICY "matches_service_role_all" ON "public"."matches" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."plan_entitlements" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "plan_entitlements_select_own" ON "public"."plan_entitlements" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "plan_entitlements_service_role_all" ON "public"."plan_entitlements" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."problems" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "problems_service_role_all" ON "public"."problems" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."sales_lead_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sales_lead_events_service_role_all" ON "public"."sales_lead_events" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."sales_leads" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sales_leads_service_role_all" ON "public"."sales_leads" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."skill_team_assignments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "skill_team_assignments_service_role_all" ON "public"."skill_team_assignments" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."skill_team_feedback" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "skill_team_feedback_service_role_all" ON "public"."skill_team_feedback" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."skill_team_invites" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "skill_team_invites_service_role_all" ON "public"."skill_team_invites" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."skill_team_join_requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "skill_team_join_requests_service_role_all" ON "public"."skill_team_join_requests" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."skill_team_memberships" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "skill_team_memberships_service_role_all" ON "public"."skill_team_memberships" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."skill_team_submissions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "skill_team_submissions_service_role_all" ON "public"."skill_team_submissions" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."skill_teams" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "skill_teams_service_role_all" ON "public"."skill_teams" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."store_transactions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "store_transactions_select_own" ON "public"."store_transactions" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."submissions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "submissions_service_role_all" ON "public"."submissions" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."user_activity_presence" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_profiles_service_role_all" ON "public"."user_profiles" TO "service_role" USING (true) WITH CHECK (true);





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."apply_store_coin_purchase"("p_user_id" "uuid", "p_request_id" "uuid", "p_item_id" "text", "p_coin_cost" integer, "p_item_kind" "text", "p_duration_hours" integer, "p_multiplier" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."apply_store_coin_purchase"("p_user_id" "uuid", "p_request_id" "uuid", "p_item_id" "text", "p_coin_cost" integer, "p_item_kind" "text", "p_duration_hours" integer, "p_multiplier" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."apply_store_coin_purchase"("p_user_id" "uuid", "p_request_id" "uuid", "p_item_id" "text", "p_coin_cost" integer, "p_item_kind" "text", "p_duration_hours" integer, "p_multiplier" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."claim_duel_matchmaking_pair"("p_match_type" "text", "p_server_instance_id" "text", "p_base_range" integer, "p_max_range" integer, "p_range_grow_per_sec" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."claim_duel_matchmaking_pair"("p_match_type" "text", "p_server_instance_id" "text", "p_base_range" integer, "p_max_range" integer, "p_range_grow_per_sec" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."fulfill_plan_purchase"("p_user_id" "uuid", "p_payment_intent_id" "text", "p_item_id" "text", "p_plan_name" "text", "p_amount_cents" integer, "p_currency" "text", "p_duration_days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fulfill_plan_purchase"("p_user_id" "uuid", "p_payment_intent_id" "text", "p_item_id" "text", "p_plan_name" "text", "p_amount_cents" integer, "p_currency" "text", "p_duration_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fulfill_plan_purchase"("p_user_id" "uuid", "p_payment_intent_id" "text", "p_item_id" "text", "p_plan_name" "text", "p_amount_cents" integer, "p_currency" "text", "p_duration_days" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."fulfill_store_coin_pack"("p_user_id" "uuid", "p_payment_intent_id" "text", "p_item_id" "text", "p_coins" integer, "p_amount_cents" integer, "p_currency" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fulfill_store_coin_pack"("p_user_id" "uuid", "p_payment_intent_id" "text", "p_item_id" "text", "p_coins" integer, "p_amount_cents" integer, "p_currency" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fulfill_store_coin_pack"("p_user_id" "uuid", "p_payment_intent_id" "text", "p_item_id" "text", "p_coins" integer, "p_amount_cents" integer, "p_currency" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_leaderboard_period_start"("p_period" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_leaderboard_period_start"("p_period" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_leaderboard_period_start"("p_period" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_public_leaderboard_page"("p_limit" integer, "p_offset" integer, "p_period" "text", "p_sort" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_public_leaderboard_page"("p_limit" integer, "p_offset" integer, "p_period" "text", "p_sort" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_public_leaderboard_page"("p_limit" integer, "p_offset" integer, "p_period" "text", "p_sort" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_public_leaderboard_rank"("p_user_id" "uuid", "p_period" "text", "p_sort" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_public_leaderboard_rank"("p_user_id" "uuid", "p_period" "text", "p_sort" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_public_leaderboard_rank"("p_user_id" "uuid", "p_period" "text", "p_sort" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_public_leaderboard_user_stats"("p_user_id" "uuid", "p_period" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_public_leaderboard_user_stats"("p_user_id" "uuid", "p_period" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_public_leaderboard_user_stats"("p_user_id" "uuid", "p_period" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_anti_cheat_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_anti_cheat_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_anti_cheat_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_duel_runtime_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_duel_runtime_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_duel_runtime_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_feedback_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_feedback_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_feedback_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_plan_entitlements_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_plan_entitlements_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_plan_entitlements_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_sales_leads_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_sales_leads_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_sales_leads_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_skill_workspace_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_skill_workspace_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_skill_workspace_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_duel_user_match_counts"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_duel_user_match_counts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_duel_user_match_counts"() TO "service_role";


















GRANT ALL ON TABLE "public"."analytics_events" TO "service_role";



GRANT ALL ON TABLE "public"."anti_cheat_case_clusters" TO "service_role";



GRANT ALL ON TABLE "public"."anti_cheat_case_events" TO "anon";
GRANT ALL ON TABLE "public"."anti_cheat_case_events" TO "authenticated";
GRANT ALL ON TABLE "public"."anti_cheat_case_events" TO "service_role";



GRANT ALL ON TABLE "public"."anti_cheat_cases" TO "anon";
GRANT ALL ON TABLE "public"."anti_cheat_cases" TO "authenticated";
GRANT ALL ON TABLE "public"."anti_cheat_cases" TO "service_role";



GRANT ALL ON TABLE "public"."benchmark_item_outcomes" TO "service_role";



GRANT ALL ON TABLE "public"."benchmark_reports" TO "anon";
GRANT ALL ON TABLE "public"."benchmark_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."benchmark_reports" TO "service_role";



GRANT ALL ON TABLE "public"."code_snapshots" TO "anon";
GRANT ALL ON TABLE "public"."code_snapshots" TO "authenticated";
GRANT ALL ON TABLE "public"."code_snapshots" TO "service_role";



GRANT ALL ON TABLE "public"."duel_matches" TO "anon";
GRANT ALL ON TABLE "public"."duel_matches" TO "authenticated";
GRANT ALL ON TABLE "public"."duel_matches" TO "service_role";



GRANT ALL ON TABLE "public"."duel_matchmaking_queue" TO "service_role";



GRANT ALL ON TABLE "public"."duel_player_sanctions" TO "service_role";



GRANT ALL ON TABLE "public"."duel_runtime_matches" TO "service_role";



GRANT ALL ON TABLE "public"."duel_runtime_messages" TO "service_role";



GRANT ALL ON TABLE "public"."duel_runtime_presence" TO "service_role";



GRANT ALL ON TABLE "public"."duel_submissions" TO "anon";
GRANT ALL ON TABLE "public"."duel_submissions" TO "authenticated";
GRANT ALL ON TABLE "public"."duel_submissions" TO "service_role";



GRANT ALL ON TABLE "public"."duel_test_cases" TO "anon";
GRANT ALL ON TABLE "public"."duel_test_cases" TO "authenticated";
GRANT ALL ON TABLE "public"."duel_test_cases" TO "service_role";



GRANT ALL ON TABLE "public"."duel_users" TO "anon";
GRANT ALL ON TABLE "public"."duel_users" TO "authenticated";
GRANT ALL ON TABLE "public"."duel_users" TO "service_role";



GRANT ALL ON TABLE "public"."feedback_attachments" TO "anon";
GRANT ALL ON TABLE "public"."feedback_attachments" TO "authenticated";
GRANT ALL ON TABLE "public"."feedback_attachments" TO "service_role";



GRANT ALL ON TABLE "public"."feedback_audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."feedback_audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."feedback_audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."feedback_entries" TO "anon";
GRANT ALL ON TABLE "public"."feedback_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."feedback_entries" TO "service_role";



GRANT ALL ON TABLE "public"."leaderboard_entries" TO "anon";
GRANT ALL ON TABLE "public"."leaderboard_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."leaderboard_entries" TO "service_role";



GRANT ALL ON TABLE "public"."legal_acceptances" TO "anon";
GRANT ALL ON TABLE "public"."legal_acceptances" TO "authenticated";
GRANT ALL ON TABLE "public"."legal_acceptances" TO "service_role";



GRANT ALL ON TABLE "public"."lesson_completion_events" TO "anon";
GRANT SELECT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."lesson_completion_events" TO "authenticated";
GRANT ALL ON TABLE "public"."lesson_completion_events" TO "service_role";



GRANT ALL ON TABLE "public"."match_events" TO "service_role";



GRANT ALL ON TABLE "public"."match_replays" TO "service_role";



GRANT ALL ON TABLE "public"."matches" TO "anon";
GRANT ALL ON TABLE "public"."matches" TO "authenticated";
GRANT ALL ON TABLE "public"."matches" TO "service_role";



GRANT ALL ON TABLE "public"."plan_entitlements" TO "service_role";
GRANT SELECT ON TABLE "public"."plan_entitlements" TO "authenticated";



GRANT ALL ON TABLE "public"."problems" TO "anon";
GRANT ALL ON TABLE "public"."problems" TO "authenticated";
GRANT ALL ON TABLE "public"."problems" TO "service_role";



GRANT ALL ON TABLE "public"."user_profiles" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";



GRANT UPDATE("name") ON TABLE "public"."user_profiles" TO "authenticated";



GRANT UPDATE("updated_at") ON TABLE "public"."user_profiles" TO "authenticated";



GRANT ALL ON TABLE "public"."public_leaderboard" TO "anon";
GRANT ALL ON TABLE "public"."public_leaderboard" TO "authenticated";
GRANT ALL ON TABLE "public"."public_leaderboard" TO "service_role";



GRANT ALL ON TABLE "public"."sales_lead_events" TO "service_role";



GRANT ALL ON TABLE "public"."sales_leads" TO "service_role";



GRANT ALL ON TABLE "public"."skill_team_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."skill_team_feedback" TO "service_role";



GRANT ALL ON TABLE "public"."skill_team_invites" TO "service_role";



GRANT ALL ON TABLE "public"."skill_team_join_requests" TO "service_role";



GRANT ALL ON TABLE "public"."skill_team_memberships" TO "service_role";



GRANT ALL ON TABLE "public"."skill_team_submissions" TO "service_role";



GRANT ALL ON TABLE "public"."skill_teams" TO "service_role";



GRANT ALL ON TABLE "public"."store_transactions" TO "anon";
GRANT ALL ON TABLE "public"."store_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."store_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."submissions" TO "anon";
GRANT ALL ON TABLE "public"."submissions" TO "authenticated";
GRANT ALL ON TABLE "public"."submissions" TO "service_role";



GRANT ALL ON TABLE "public"."user_activity_presence" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";



































