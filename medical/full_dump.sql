--
-- PostgreSQL database dump
--

\restrict q6LATO5nWdBhEgfoE2cZnw9z15ovdhxw8F8DDwdCo1dyXzlfHAR0z8BBe45XNRN

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: auth; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA auth;


ALTER SCHEMA auth OWNER TO supabase_admin;

--
-- Name: extensions; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA extensions;


ALTER SCHEMA extensions OWNER TO postgres;

--
-- Name: graphql; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA graphql;


ALTER SCHEMA graphql OWNER TO supabase_admin;

--
-- Name: graphql_public; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA graphql_public;


ALTER SCHEMA graphql_public OWNER TO supabase_admin;

--
-- Name: pgbouncer; Type: SCHEMA; Schema: -; Owner: pgbouncer
--

CREATE SCHEMA pgbouncer;


ALTER SCHEMA pgbouncer OWNER TO pgbouncer;

--
-- Name: realtime; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA realtime;


ALTER SCHEMA realtime OWNER TO supabase_admin;

--
-- Name: storage; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA storage;


ALTER SCHEMA storage OWNER TO supabase_admin;

--
-- Name: vault; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA vault;


ALTER SCHEMA vault OWNER TO supabase_admin;

--
-- Name: pg_graphql; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_graphql WITH SCHEMA graphql;


--
-- Name: EXTENSION pg_graphql; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_graphql IS 'pg_graphql: GraphQL support';


--
-- Name: pg_stat_statements; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;


--
-- Name: EXTENSION pg_stat_statements; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_stat_statements IS 'track planning and execution statistics of all SQL statements executed';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: supabase_vault; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;


--
-- Name: EXTENSION supabase_vault; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION supabase_vault IS 'Supabase Vault Extension';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: aal_level; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.aal_level AS ENUM (
    'aal1',
    'aal2',
    'aal3'
);


ALTER TYPE auth.aal_level OWNER TO supabase_auth_admin;

--
-- Name: code_challenge_method; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.code_challenge_method AS ENUM (
    's256',
    'plain'
);


ALTER TYPE auth.code_challenge_method OWNER TO supabase_auth_admin;

--
-- Name: factor_status; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.factor_status AS ENUM (
    'unverified',
    'verified'
);


ALTER TYPE auth.factor_status OWNER TO supabase_auth_admin;

--
-- Name: factor_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.factor_type AS ENUM (
    'totp',
    'webauthn',
    'phone'
);


ALTER TYPE auth.factor_type OWNER TO supabase_auth_admin;

--
-- Name: oauth_authorization_status; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.oauth_authorization_status AS ENUM (
    'pending',
    'approved',
    'denied',
    'expired'
);


ALTER TYPE auth.oauth_authorization_status OWNER TO supabase_auth_admin;

--
-- Name: oauth_client_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.oauth_client_type AS ENUM (
    'public',
    'confidential'
);


ALTER TYPE auth.oauth_client_type OWNER TO supabase_auth_admin;

--
-- Name: oauth_registration_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.oauth_registration_type AS ENUM (
    'dynamic',
    'manual'
);


ALTER TYPE auth.oauth_registration_type OWNER TO supabase_auth_admin;

--
-- Name: oauth_response_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.oauth_response_type AS ENUM (
    'code'
);


ALTER TYPE auth.oauth_response_type OWNER TO supabase_auth_admin;

--
-- Name: one_time_token_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.one_time_token_type AS ENUM (
    'confirmation_token',
    'reauthentication_token',
    'recovery_token',
    'email_change_token_new',
    'email_change_token_current',
    'phone_change_token'
);


ALTER TYPE auth.one_time_token_type OWNER TO supabase_auth_admin;

--
-- Name: action; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE realtime.action AS ENUM (
    'INSERT',
    'UPDATE',
    'DELETE',
    'TRUNCATE',
    'ERROR'
);


ALTER TYPE realtime.action OWNER TO supabase_admin;

--
-- Name: equality_op; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE realtime.equality_op AS ENUM (
    'eq',
    'neq',
    'lt',
    'lte',
    'gt',
    'gte',
    'in'
);


ALTER TYPE realtime.equality_op OWNER TO supabase_admin;

--
-- Name: user_defined_filter; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE realtime.user_defined_filter AS (
	column_name text,
	op realtime.equality_op,
	value text
);


ALTER TYPE realtime.user_defined_filter OWNER TO supabase_admin;

--
-- Name: wal_column; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE realtime.wal_column AS (
	name text,
	type_name text,
	type_oid oid,
	value jsonb,
	is_pkey boolean,
	is_selectable boolean
);


ALTER TYPE realtime.wal_column OWNER TO supabase_admin;

--
-- Name: wal_rls; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE realtime.wal_rls AS (
	wal jsonb,
	is_rls_enabled boolean,
	subscription_ids uuid[],
	errors text[]
);


ALTER TYPE realtime.wal_rls OWNER TO supabase_admin;

--
-- Name: buckettype; Type: TYPE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TYPE storage.buckettype AS ENUM (
    'STANDARD',
    'ANALYTICS',
    'VECTOR'
);


ALTER TYPE storage.buckettype OWNER TO supabase_storage_admin;

--
-- Name: email(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION auth.email() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  )::text
$$;


ALTER FUNCTION auth.email() OWNER TO supabase_auth_admin;

--
-- Name: FUNCTION email(); Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON FUNCTION auth.email() IS 'Deprecated. Use auth.jwt() -> ''email'' instead.';


--
-- Name: jwt(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION auth.jwt() RETURNS jsonb
    LANGUAGE sql STABLE
    AS $$
  select 
    coalesce(
        nullif(current_setting('request.jwt.claim', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
$$;


ALTER FUNCTION auth.jwt() OWNER TO supabase_auth_admin;

--
-- Name: role(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION auth.role() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;


ALTER FUNCTION auth.role() OWNER TO supabase_auth_admin;

--
-- Name: FUNCTION role(); Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON FUNCTION auth.role() IS 'Deprecated. Use auth.jwt() -> ''role'' instead.';


--
-- Name: uid(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;


ALTER FUNCTION auth.uid() OWNER TO supabase_auth_admin;

--
-- Name: FUNCTION uid(); Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON FUNCTION auth.uid() IS 'Deprecated. Use auth.jwt() -> ''sub'' instead.';


--
-- Name: grant_pg_cron_access(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.grant_pg_cron_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_cron'
  )
  THEN
    grant usage on schema cron to postgres with grant option;

    alter default privileges in schema cron grant all on tables to postgres with grant option;
    alter default privileges in schema cron grant all on functions to postgres with grant option;
    alter default privileges in schema cron grant all on sequences to postgres with grant option;

    alter default privileges for user supabase_admin in schema cron grant all
        on sequences to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on tables to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on functions to postgres with grant option;

    grant all privileges on all tables in schema cron to postgres with grant option;
    revoke all on table cron.job from postgres;
    grant select on table cron.job to postgres with grant option;
  END IF;
END;
$$;


ALTER FUNCTION extensions.grant_pg_cron_access() OWNER TO supabase_admin;

--
-- Name: FUNCTION grant_pg_cron_access(); Type: COMMENT; Schema: extensions; Owner: supabase_admin
--

COMMENT ON FUNCTION extensions.grant_pg_cron_access() IS 'Grants access to pg_cron';


--
-- Name: grant_pg_graphql_access(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.grant_pg_graphql_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $_$
DECLARE
    func_is_graphql_resolve bool;
BEGIN
    func_is_graphql_resolve = (
        SELECT n.proname = 'resolve'
        FROM pg_event_trigger_ddl_commands() AS ev
        LEFT JOIN pg_catalog.pg_proc AS n
        ON ev.objid = n.oid
    );

    IF func_is_graphql_resolve
    THEN
        -- Update public wrapper to pass all arguments through to the pg_graphql resolve func
        DROP FUNCTION IF EXISTS graphql_public.graphql;
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language sql
        as $$
            select graphql.resolve(
                query := query,
                variables := coalesce(variables, '{}'),
                "operationName" := "operationName",
                extensions := extensions
            );
        $$;

        -- This hook executes when `graphql.resolve` is created. That is not necessarily the last
        -- function in the extension so we need to grant permissions on existing entities AND
        -- update default permissions to any others that are created after `graphql.resolve`
        grant usage on schema graphql to postgres, anon, authenticated, service_role;
        grant select on all tables in schema graphql to postgres, anon, authenticated, service_role;
        grant execute on all functions in schema graphql to postgres, anon, authenticated, service_role;
        grant all on all sequences in schema graphql to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on tables to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on functions to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on sequences to postgres, anon, authenticated, service_role;

        -- Allow postgres role to allow granting usage on graphql and graphql_public schemas to custom roles
        grant usage on schema graphql_public to postgres with grant option;
        grant usage on schema graphql to postgres with grant option;
    END IF;

END;
$_$;


ALTER FUNCTION extensions.grant_pg_graphql_access() OWNER TO supabase_admin;

--
-- Name: FUNCTION grant_pg_graphql_access(); Type: COMMENT; Schema: extensions; Owner: supabase_admin
--

COMMENT ON FUNCTION extensions.grant_pg_graphql_access() IS 'Grants access to pg_graphql';


--
-- Name: grant_pg_net_access(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.grant_pg_net_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_net'
  )
  THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_roles
      WHERE rolname = 'supabase_functions_admin'
    )
    THEN
      CREATE USER supabase_functions_admin NOINHERIT CREATEROLE LOGIN NOREPLICATION;
    END IF;

    GRANT USAGE ON SCHEMA net TO supabase_functions_admin, postgres, anon, authenticated, service_role;

    IF EXISTS (
      SELECT FROM pg_extension
      WHERE extname = 'pg_net'
      -- all versions in use on existing projects as of 2025-02-20
      -- version 0.12.0 onwards don't need these applied
      AND extversion IN ('0.2', '0.6', '0.7', '0.7.1', '0.8', '0.10.0', '0.11.0')
    ) THEN
      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;

      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;

      REVOKE ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;
      REVOKE ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;

      GRANT EXECUTE ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
      GRANT EXECUTE ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
    END IF;
  END IF;
END;
$$;


ALTER FUNCTION extensions.grant_pg_net_access() OWNER TO supabase_admin;

--
-- Name: FUNCTION grant_pg_net_access(); Type: COMMENT; Schema: extensions; Owner: supabase_admin
--

COMMENT ON FUNCTION extensions.grant_pg_net_access() IS 'Grants access to pg_net';


--
-- Name: pgrst_ddl_watch(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.pgrst_ddl_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN SELECT * FROM pg_event_trigger_ddl_commands()
  LOOP
    IF cmd.command_tag IN (
      'CREATE SCHEMA', 'ALTER SCHEMA'
    , 'CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO', 'ALTER TABLE'
    , 'CREATE FOREIGN TABLE', 'ALTER FOREIGN TABLE'
    , 'CREATE VIEW', 'ALTER VIEW'
    , 'CREATE MATERIALIZED VIEW', 'ALTER MATERIALIZED VIEW'
    , 'CREATE FUNCTION', 'ALTER FUNCTION'
    , 'CREATE TRIGGER'
    , 'CREATE TYPE', 'ALTER TYPE'
    , 'CREATE RULE'
    , 'COMMENT'
    )
    -- don't notify in case of CREATE TEMP table or other objects created on pg_temp
    AND cmd.schema_name is distinct from 'pg_temp'
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


ALTER FUNCTION extensions.pgrst_ddl_watch() OWNER TO supabase_admin;

--
-- Name: pgrst_drop_watch(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.pgrst_drop_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  obj record;
BEGIN
  FOR obj IN SELECT * FROM pg_event_trigger_dropped_objects()
  LOOP
    IF obj.object_type IN (
      'schema'
    , 'table'
    , 'foreign table'
    , 'view'
    , 'materialized view'
    , 'function'
    , 'trigger'
    , 'type'
    , 'rule'
    )
    AND obj.is_temporary IS false -- no pg_temp objects
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


ALTER FUNCTION extensions.pgrst_drop_watch() OWNER TO supabase_admin;

--
-- Name: set_graphql_placeholder(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.set_graphql_placeholder() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $_$
    DECLARE
    graphql_is_dropped bool;
    BEGIN
    graphql_is_dropped = (
        SELECT ev.schema_name = 'graphql_public'
        FROM pg_event_trigger_dropped_objects() AS ev
        WHERE ev.schema_name = 'graphql_public'
    );

    IF graphql_is_dropped
    THEN
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language plpgsql
        as $$
            DECLARE
                server_version float;
            BEGIN
                server_version = (SELECT (SPLIT_PART((select version()), ' ', 2))::float);

                IF server_version >= 14 THEN
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql extension is not enabled.'
                            )
                        )
                    );
                ELSE
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql is only available on projects running Postgres 14 onwards.'
                            )
                        )
                    );
                END IF;
            END;
        $$;
    END IF;

    END;
$_$;


ALTER FUNCTION extensions.set_graphql_placeholder() OWNER TO supabase_admin;

--
-- Name: FUNCTION set_graphql_placeholder(); Type: COMMENT; Schema: extensions; Owner: supabase_admin
--

COMMENT ON FUNCTION extensions.set_graphql_placeholder() IS 'Reintroduces placeholder function for graphql_public.graphql';


--
-- Name: get_auth(text); Type: FUNCTION; Schema: pgbouncer; Owner: supabase_admin
--

CREATE FUNCTION pgbouncer.get_auth(p_usename text) RETURNS TABLE(username text, password text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $_$
  BEGIN
      RAISE DEBUG 'PgBouncer auth request: %', p_usename;

      RETURN QUERY
      SELECT
          rolname::text,
          CASE WHEN rolvaliduntil < now()
              THEN null
              ELSE rolpassword::text
          END
      FROM pg_authid
      WHERE rolname=$1 and rolcanlogin;
  END;
  $_$;


ALTER FUNCTION pgbouncer.get_auth(p_usename text) OWNER TO supabase_admin;

--
-- Name: apply_store_coin_purchase(uuid, uuid, text, integer, text, integer, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.apply_store_coin_purchase(p_user_id uuid, p_request_id uuid, p_item_id text, p_coin_cost integer, p_item_kind text, p_duration_hours integer DEFAULT NULL::integer, p_multiplier integer DEFAULT NULL::integer) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


ALTER FUNCTION public.apply_store_coin_purchase(p_user_id uuid, p_request_id uuid, p_item_id text, p_coin_cost integer, p_item_kind text, p_duration_hours integer, p_multiplier integer) OWNER TO postgres;

--
-- Name: fulfill_store_coin_pack(uuid, text, text, integer, integer, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fulfill_store_coin_pack(p_user_id uuid, p_payment_intent_id text, p_item_id text, p_coins integer, p_amount_cents integer, p_currency text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


ALTER FUNCTION public.fulfill_store_coin_pack(p_user_id uuid, p_payment_intent_id text, p_item_id text, p_coins integer, p_amount_cents integer, p_currency text) OWNER TO postgres;

--
-- Name: get_leaderboard_period_start(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_leaderboard_period_start(p_period text) RETURNS timestamp with time zone
    LANGUAGE sql STABLE
    AS $$
  select case
    when p_period = 'week' then date_trunc('week', now())
    when p_period = 'month' then date_trunc('month', now())
    else null
  end;
$$;


ALTER FUNCTION public.get_leaderboard_period_start(p_period text) OWNER TO postgres;

--
-- Name: get_public_leaderboard_page(integer, integer, text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_public_leaderboard_page(p_limit integer DEFAULT 100, p_offset integer DEFAULT 0, p_period text DEFAULT 'all'::text, p_sort text DEFAULT 'elo'::text) RETURNS TABLE(user_id uuid, name text, current_avatar text, xp integer, total_lessons_completed integer, ranked_elo integer, current_streak integer, level integer, rank bigint, total_count bigint)
    LANGUAGE sql STABLE
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


ALTER FUNCTION public.get_public_leaderboard_page(p_limit integer, p_offset integer, p_period text, p_sort text) OWNER TO postgres;

--
-- Name: get_public_leaderboard_rank(uuid, text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_public_leaderboard_rank(p_user_id uuid, p_period text DEFAULT 'all'::text, p_sort text DEFAULT 'elo'::text) RETURNS integer
    LANGUAGE sql STABLE
    AS $$
with ranked as (
  select user_id, rank
  from public.get_public_leaderboard_page(1000000, 0, p_period, p_sort)
)
select coalesce((select rank::integer from ranked where user_id = p_user_id), 0);
$$;


ALTER FUNCTION public.get_public_leaderboard_rank(p_user_id uuid, p_period text, p_sort text) OWNER TO postgres;

--
-- Name: get_public_leaderboard_user_stats(uuid, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_public_leaderboard_user_stats(p_user_id uuid, p_period text DEFAULT 'all'::text) RETURNS TABLE(user_id uuid, name text, current_avatar text, xp integer, total_lessons_completed integer, ranked_elo integer, current_streak integer, level integer)
    LANGUAGE sql STABLE
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


ALTER FUNCTION public.get_public_leaderboard_user_stats(p_user_id uuid, p_period text) OWNER TO postgres;

--
-- Name: handle_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.handle_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.handle_updated_at() OWNER TO postgres;

--
-- Name: rls_auto_enable(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.rls_auto_enable() RETURNS event_trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
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


ALTER FUNCTION public.rls_auto_enable() OWNER TO postgres;

--
-- Name: set_anti_cheat_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_anti_cheat_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;


ALTER FUNCTION public.set_anti_cheat_updated_at() OWNER TO postgres;

--
-- Name: set_feedback_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_feedback_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;


ALTER FUNCTION public.set_feedback_updated_at() OWNER TO postgres;

--
-- Name: sync_duel_user_match_counts(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.sync_duel_user_match_counts() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  if new.total_matches is not null then
    new.matches_played := new.total_matches;
  end if;
  return new;
end;
$$;


ALTER FUNCTION public.sync_duel_user_match_counts() OWNER TO postgres;

--
-- Name: apply_rls(jsonb, integer); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer DEFAULT (1024 * 1024)) RETURNS SETOF realtime.wal_rls
    LANGUAGE plpgsql
    AS $$
declare
-- Regclass of the table e.g. public.notes
entity_ regclass = (quote_ident(wal ->> 'schema') || '.' || quote_ident(wal ->> 'table'))::regclass;

-- I, U, D, T: insert, update ...
action realtime.action = (
    case wal ->> 'action'
        when 'I' then 'INSERT'
        when 'U' then 'UPDATE'
        when 'D' then 'DELETE'
        else 'ERROR'
    end
);

-- Is row level security enabled for the table
is_rls_enabled bool = relrowsecurity from pg_class where oid = entity_;

subscriptions realtime.subscription[] = array_agg(subs)
    from
        realtime.subscription subs
    where
        subs.entity = entity_
        -- Filter by action early - only get subscriptions interested in this action
        -- action_filter column can be: '*' (all), 'INSERT', 'UPDATE', or 'DELETE'
        and (subs.action_filter = '*' or subs.action_filter = action::text);

-- Subscription vars
roles regrole[] = array_agg(distinct us.claims_role::text)
    from
        unnest(subscriptions) us;

working_role regrole;
claimed_role regrole;
claims jsonb;

subscription_id uuid;
subscription_has_access bool;
visible_to_subscription_ids uuid[] = '{}';

-- structured info for wal's columns
columns realtime.wal_column[];
-- previous identity values for update/delete
old_columns realtime.wal_column[];

error_record_exceeds_max_size boolean = octet_length(wal::text) > max_record_bytes;

-- Primary jsonb output for record
output jsonb;

begin
perform set_config('role', null, true);

columns =
    array_agg(
        (
            x->>'name',
            x->>'type',
            x->>'typeoid',
            realtime.cast(
                (x->'value') #>> '{}',
                coalesce(
                    (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                    (x->>'type')::regtype
                )
            ),
            (pks ->> 'name') is not null,
            true
        )::realtime.wal_column
    )
    from
        jsonb_array_elements(wal -> 'columns') x
        left join jsonb_array_elements(wal -> 'pk') pks
            on (x ->> 'name') = (pks ->> 'name');

old_columns =
    array_agg(
        (
            x->>'name',
            x->>'type',
            x->>'typeoid',
            realtime.cast(
                (x->'value') #>> '{}',
                coalesce(
                    (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                    (x->>'type')::regtype
                )
            ),
            (pks ->> 'name') is not null,
            true
        )::realtime.wal_column
    )
    from
        jsonb_array_elements(wal -> 'identity') x
        left join jsonb_array_elements(wal -> 'pk') pks
            on (x ->> 'name') = (pks ->> 'name');

for working_role in select * from unnest(roles) loop

    -- Update `is_selectable` for columns and old_columns
    columns =
        array_agg(
            (
                c.name,
                c.type_name,
                c.type_oid,
                c.value,
                c.is_pkey,
                pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
            )::realtime.wal_column
        )
        from
            unnest(columns) c;

    old_columns =
            array_agg(
                (
                    c.name,
                    c.type_name,
                    c.type_oid,
                    c.value,
                    c.is_pkey,
                    pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
                )::realtime.wal_column
            )
            from
                unnest(old_columns) c;

    if action <> 'DELETE' and count(1) = 0 from unnest(columns) c where c.is_pkey then
        return next (
            jsonb_build_object(
                'schema', wal ->> 'schema',
                'table', wal ->> 'table',
                'type', action
            ),
            is_rls_enabled,
            -- subscriptions is already filtered by entity
            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),
            array['Error 400: Bad Request, no primary key']
        )::realtime.wal_rls;

    -- The claims role does not have SELECT permission to the primary key of entity
    elsif action <> 'DELETE' and sum(c.is_selectable::int) <> count(1) from unnest(columns) c where c.is_pkey then
        return next (
            jsonb_build_object(
                'schema', wal ->> 'schema',
                'table', wal ->> 'table',
                'type', action
            ),
            is_rls_enabled,
            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),
            array['Error 401: Unauthorized']
        )::realtime.wal_rls;

    else
        output = jsonb_build_object(
            'schema', wal ->> 'schema',
            'table', wal ->> 'table',
            'type', action,
            'commit_timestamp', to_char(
                ((wal ->> 'timestamp')::timestamptz at time zone 'utc'),
                'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
            ),
            'columns', (
                select
                    jsonb_agg(
                        jsonb_build_object(
                            'name', pa.attname,
                            'type', pt.typname
                        )
                        order by pa.attnum asc
                    )
                from
                    pg_attribute pa
                    join pg_type pt
                        on pa.atttypid = pt.oid
                where
                    attrelid = entity_
                    and attnum > 0
                    and pg_catalog.has_column_privilege(working_role, entity_, pa.attname, 'SELECT')
            )
        )
        -- Add "record" key for insert and update
        || case
            when action in ('INSERT', 'UPDATE') then
                jsonb_build_object(
                    'record',
                    (
                        select
                            jsonb_object_agg(
                                -- if unchanged toast, get column name and value from old record
                                coalesce((c).name, (oc).name),
                                case
                                    when (c).name is null then (oc).value
                                    else (c).value
                                end
                            )
                        from
                            unnest(columns) c
                            full outer join unnest(old_columns) oc
                                on (c).name = (oc).name
                        where
                            coalesce((c).is_selectable, (oc).is_selectable)
                            and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                    )
                )
            else '{}'::jsonb
        end
        -- Add "old_record" key for update and delete
        || case
            when action = 'UPDATE' then
                jsonb_build_object(
                        'old_record',
                        (
                            select jsonb_object_agg((c).name, (c).value)
                            from unnest(old_columns) c
                            where
                                (c).is_selectable
                                and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                        )
                    )
            when action = 'DELETE' then
                jsonb_build_object(
                    'old_record',
                    (
                        select jsonb_object_agg((c).name, (c).value)
                        from unnest(old_columns) c
                        where
                            (c).is_selectable
                            and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                            and ( not is_rls_enabled or (c).is_pkey ) -- if RLS enabled, we can't secure deletes so filter to pkey
                    )
                )
            else '{}'::jsonb
        end;

        -- Create the prepared statement
        if is_rls_enabled and action <> 'DELETE' then
            if (select 1 from pg_prepared_statements where name = 'walrus_rls_stmt' limit 1) > 0 then
                deallocate walrus_rls_stmt;
            end if;
            execute realtime.build_prepared_statement_sql('walrus_rls_stmt', entity_, columns);
        end if;

        visible_to_subscription_ids = '{}';

        for subscription_id, claims in (
                select
                    subs.subscription_id,
                    subs.claims
                from
                    unnest(subscriptions) subs
                where
                    subs.entity = entity_
                    and subs.claims_role = working_role
                    and (
                        realtime.is_visible_through_filters(columns, subs.filters)
                        or (
                          action = 'DELETE'
                          and realtime.is_visible_through_filters(old_columns, subs.filters)
                        )
                    )
        ) loop

            if not is_rls_enabled or action = 'DELETE' then
                visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;
            else
                -- Check if RLS allows the role to see the record
                perform
                    -- Trim leading and trailing quotes from working_role because set_config
                    -- doesn't recognize the role as valid if they are included
                    set_config('role', trim(both '"' from working_role::text), true),
                    set_config('request.jwt.claims', claims::text, true);

                execute 'execute walrus_rls_stmt' into subscription_has_access;

                if subscription_has_access then
                    visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;
                end if;
            end if;
        end loop;

        perform set_config('role', null, true);

        return next (
            output,
            is_rls_enabled,
            visible_to_subscription_ids,
            case
                when error_record_exceeds_max_size then array['Error 413: Payload Too Large']
                else '{}'
            end
        )::realtime.wal_rls;

    end if;
end loop;

perform set_config('role', null, true);
end;
$$;


ALTER FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) OWNER TO supabase_admin;

--
-- Name: broadcast_changes(text, text, text, text, text, record, record, text); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text DEFAULT 'ROW'::text) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    -- Declare a variable to hold the JSONB representation of the row
    row_data jsonb := '{}'::jsonb;
BEGIN
    IF level = 'STATEMENT' THEN
        RAISE EXCEPTION 'function can only be triggered for each row, not for each statement';
    END IF;
    -- Check the operation type and handle accordingly
    IF operation = 'INSERT' OR operation = 'UPDATE' OR operation = 'DELETE' THEN
        row_data := jsonb_build_object('old_record', OLD, 'record', NEW, 'operation', operation, 'table', table_name, 'schema', table_schema);
        PERFORM realtime.send (row_data, event_name, topic_name);
    ELSE
        RAISE EXCEPTION 'Unexpected operation type: %', operation;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to process the row: %', SQLERRM;
END;

$$;


ALTER FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text) OWNER TO supabase_admin;

--
-- Name: build_prepared_statement_sql(text, regclass, realtime.wal_column[]); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) RETURNS text
    LANGUAGE sql
    AS $$
      /*
      Builds a sql string that, if executed, creates a prepared statement to
      tests retrive a row from *entity* by its primary key columns.
      Example
          select realtime.build_prepared_statement_sql('public.notes', '{"id"}'::text[], '{"bigint"}'::text[])
      */
          select
      'prepare ' || prepared_statement_name || ' as
          select
              exists(
                  select
                      1
                  from
                      ' || entity || '
                  where
                      ' || string_agg(quote_ident(pkc.name) || '=' || quote_nullable(pkc.value #>> '{}') , ' and ') || '
              )'
          from
              unnest(columns) pkc
          where
              pkc.is_pkey
          group by
              entity
      $$;


ALTER FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) OWNER TO supabase_admin;

--
-- Name: cast(text, regtype); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime."cast"(val text, type_ regtype) RETURNS jsonb
    LANGUAGE plpgsql IMMUTABLE
    AS $$
declare
  res jsonb;
begin
  if type_::text = 'bytea' then
    return to_jsonb(val);
  end if;
  execute format('select to_jsonb(%L::'|| type_::text || ')', val) into res;
  return res;
end
$$;


ALTER FUNCTION realtime."cast"(val text, type_ regtype) OWNER TO supabase_admin;

--
-- Name: check_equality_op(realtime.equality_op, regtype, text, text); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) RETURNS boolean
    LANGUAGE plpgsql IMMUTABLE
    AS $$
      /*
      Casts *val_1* and *val_2* as type *type_* and check the *op* condition for truthiness
      */
      declare
          op_symbol text = (
              case
                  when op = 'eq' then '='
                  when op = 'neq' then '!='
                  when op = 'lt' then '<'
                  when op = 'lte' then '<='
                  when op = 'gt' then '>'
                  when op = 'gte' then '>='
                  when op = 'in' then '= any'
                  else 'UNKNOWN OP'
              end
          );
          res boolean;
      begin
          execute format(
              'select %L::'|| type_::text || ' ' || op_symbol
              || ' ( %L::'
              || (
                  case
                      when op = 'in' then type_::text || '[]'
                      else type_::text end
              )
              || ')', val_1, val_2) into res;
          return res;
      end;
      $$;


ALTER FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) OWNER TO supabase_admin;

--
-- Name: is_visible_through_filters(realtime.wal_column[], realtime.user_defined_filter[]); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) RETURNS boolean
    LANGUAGE sql IMMUTABLE
    AS $_$
    /*
    Should the record be visible (true) or filtered out (false) after *filters* are applied
    */
        select
            -- Default to allowed when no filters present
            $2 is null -- no filters. this should not happen because subscriptions has a default
            or array_length($2, 1) is null -- array length of an empty array is null
            or bool_and(
                coalesce(
                    realtime.check_equality_op(
                        op:=f.op,
                        type_:=coalesce(
                            col.type_oid::regtype, -- null when wal2json version <= 2.4
                            col.type_name::regtype
                        ),
                        -- cast jsonb to text
                        val_1:=col.value #>> '{}',
                        val_2:=f.value
                    ),
                    false -- if null, filter does not match
                )
            )
        from
            unnest(filters) f
            join unnest(columns) col
                on f.column_name = col.name;
    $_$;


ALTER FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) OWNER TO supabase_admin;

--
-- Name: list_changes(name, name, integer, integer); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) RETURNS SETOF realtime.wal_rls
    LANGUAGE sql
    SET log_min_messages TO 'fatal'
    AS $$
      with pub as (
        select
          concat_ws(
            ',',
            case when bool_or(pubinsert) then 'insert' else null end,
            case when bool_or(pubupdate) then 'update' else null end,
            case when bool_or(pubdelete) then 'delete' else null end
          ) as w2j_actions,
          coalesce(
            string_agg(
              realtime.quote_wal2json(format('%I.%I', schemaname, tablename)::regclass),
              ','
            ) filter (where ppt.tablename is not null and ppt.tablename not like '% %'),
            ''
          ) w2j_add_tables
        from
          pg_publication pp
          left join pg_publication_tables ppt
            on pp.pubname = ppt.pubname
        where
          pp.pubname = publication
        group by
          pp.pubname
        limit 1
      ),
      w2j as (
        select
          x.*, pub.w2j_add_tables
        from
          pub,
          pg_logical_slot_get_changes(
            slot_name, null, max_changes,
            'include-pk', 'true',
            'include-transaction', 'false',
            'include-timestamp', 'true',
            'include-type-oids', 'true',
            'format-version', '2',
            'actions', pub.w2j_actions,
            'add-tables', pub.w2j_add_tables
          ) x
      )
      select
        xyz.wal,
        xyz.is_rls_enabled,
        xyz.subscription_ids,
        xyz.errors
      from
        w2j,
        realtime.apply_rls(
          wal := w2j.data::jsonb,
          max_record_bytes := max_record_bytes
        ) xyz(wal, is_rls_enabled, subscription_ids, errors)
      where
        w2j.w2j_add_tables <> ''
        and xyz.subscription_ids[1] is not null
    $$;


ALTER FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) OWNER TO supabase_admin;

--
-- Name: quote_wal2json(regclass); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.quote_wal2json(entity regclass) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT
    AS $$
      select
        (
          select string_agg('' || ch,'')
          from unnest(string_to_array(nsp.nspname::text, null)) with ordinality x(ch, idx)
          where
            not (x.idx = 1 and x.ch = '"')
            and not (
              x.idx = array_length(string_to_array(nsp.nspname::text, null), 1)
              and x.ch = '"'
            )
        )
        || '.'
        || (
          select string_agg('' || ch,'')
          from unnest(string_to_array(pc.relname::text, null)) with ordinality x(ch, idx)
          where
            not (x.idx = 1 and x.ch = '"')
            and not (
              x.idx = array_length(string_to_array(nsp.nspname::text, null), 1)
              and x.ch = '"'
            )
          )
      from
        pg_class pc
        join pg_namespace nsp
          on pc.relnamespace = nsp.oid
      where
        pc.oid = entity
    $$;


ALTER FUNCTION realtime.quote_wal2json(entity regclass) OWNER TO supabase_admin;

--
-- Name: send(jsonb, text, text, boolean); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean DEFAULT true) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  generated_id uuid;
  final_payload jsonb;
BEGIN
  BEGIN
    -- Generate a new UUID for the id
    generated_id := gen_random_uuid();

    -- Check if payload has an 'id' key, if not, add the generated UUID
    IF payload ? 'id' THEN
      final_payload := payload;
    ELSE
      final_payload := jsonb_set(payload, '{id}', to_jsonb(generated_id));
    END IF;

    -- Set the topic configuration
    EXECUTE format('SET LOCAL realtime.topic TO %L', topic);

    -- Attempt to insert the message
    INSERT INTO realtime.messages (id, payload, event, topic, private, extension)
    VALUES (generated_id, final_payload, event, topic, private, 'broadcast');
  EXCEPTION
    WHEN OTHERS THEN
      -- Capture and notify the error
      RAISE WARNING 'ErrorSendingBroadcastMessage: %', SQLERRM;
  END;
END;
$$;


ALTER FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean) OWNER TO supabase_admin;

--
-- Name: subscription_check_filters(); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.subscription_check_filters() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    /*
    Validates that the user defined filters for a subscription:
    - refer to valid columns that the claimed role may access
    - values are coercable to the correct column type
    */
    declare
        col_names text[] = coalesce(
                array_agg(c.column_name order by c.ordinal_position),
                '{}'::text[]
            )
            from
                information_schema.columns c
            where
                format('%I.%I', c.table_schema, c.table_name)::regclass = new.entity
                and pg_catalog.has_column_privilege(
                    (new.claims ->> 'role'),
                    format('%I.%I', c.table_schema, c.table_name)::regclass,
                    c.column_name,
                    'SELECT'
                );
        filter realtime.user_defined_filter;
        col_type regtype;

        in_val jsonb;
    begin
        for filter in select * from unnest(new.filters) loop
            -- Filtered column is valid
            if not filter.column_name = any(col_names) then
                raise exception 'invalid column for filter %', filter.column_name;
            end if;

            -- Type is sanitized and safe for string interpolation
            col_type = (
                select atttypid::regtype
                from pg_catalog.pg_attribute
                where attrelid = new.entity
                      and attname = filter.column_name
            );
            if col_type is null then
                raise exception 'failed to lookup type for column %', filter.column_name;
            end if;

            -- Set maximum number of entries for in filter
            if filter.op = 'in'::realtime.equality_op then
                in_val = realtime.cast(filter.value, (col_type::text || '[]')::regtype);
                if coalesce(jsonb_array_length(in_val), 0) > 100 then
                    raise exception 'too many values for `in` filter. Maximum 100';
                end if;
            else
                -- raises an exception if value is not coercable to type
                perform realtime.cast(filter.value, col_type);
            end if;

        end loop;

        -- Apply consistent order to filters so the unique constraint on
        -- (subscription_id, entity, filters) can't be tricked by a different filter order
        new.filters = coalesce(
            array_agg(f order by f.column_name, f.op, f.value),
            '{}'
        ) from unnest(new.filters) f;

        return new;
    end;
    $$;


ALTER FUNCTION realtime.subscription_check_filters() OWNER TO supabase_admin;

--
-- Name: to_regrole(text); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.to_regrole(role_name text) RETURNS regrole
    LANGUAGE sql IMMUTABLE
    AS $$ select role_name::regrole $$;


ALTER FUNCTION realtime.to_regrole(role_name text) OWNER TO supabase_admin;

--
-- Name: topic(); Type: FUNCTION; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE FUNCTION realtime.topic() RETURNS text
    LANGUAGE sql STABLE
    AS $$
select nullif(current_setting('realtime.topic', true), '')::text;
$$;


ALTER FUNCTION realtime.topic() OWNER TO supabase_realtime_admin;

--
-- Name: can_insert_object(text, text, uuid, jsonb); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO "storage"."objects" ("bucket_id", "name", "owner", "metadata") VALUES (bucketid, name, owner, metadata);
  -- hack to rollback the successful insert
  RAISE sqlstate 'PT200' using
  message = 'ROLLBACK',
  detail = 'rollback successful insert';
END
$$;


ALTER FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb) OWNER TO supabase_storage_admin;

--
-- Name: enforce_bucket_name_length(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.enforce_bucket_name_length() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
    if length(new.name) > 100 then
        raise exception 'bucket name "%" is too long (% characters). Max is 100.', new.name, length(new.name);
    end if;
    return new;
end;
$$;


ALTER FUNCTION storage.enforce_bucket_name_length() OWNER TO supabase_storage_admin;

--
-- Name: extension(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.extension(name text) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
_parts text[];
_filename text;
BEGIN
	select string_to_array(name, '/') into _parts;
	select _parts[array_length(_parts,1)] into _filename;
	-- @todo return the last part instead of 2
	return reverse(split_part(reverse(_filename), '.', 1));
END
$$;


ALTER FUNCTION storage.extension(name text) OWNER TO supabase_storage_admin;

--
-- Name: filename(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.filename(name text) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[array_length(_parts,1)];
END
$$;


ALTER FUNCTION storage.filename(name text) OWNER TO supabase_storage_admin;

--
-- Name: foldername(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.foldername(name text) RETURNS text[]
    LANGUAGE plpgsql
    AS $$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[1:array_length(_parts,1)-1];
END
$$;


ALTER FUNCTION storage.foldername(name text) OWNER TO supabase_storage_admin;

--
-- Name: get_common_prefix(text, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.get_common_prefix(p_key text, p_prefix text, p_delimiter text) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$
SELECT CASE
    WHEN position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1)) > 0
    THEN left(p_key, length(p_prefix) + position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1)))
    ELSE NULL
END;
$$;


ALTER FUNCTION storage.get_common_prefix(p_key text, p_prefix text, p_delimiter text) OWNER TO supabase_storage_admin;

--
-- Name: get_size_by_bucket(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.get_size_by_bucket() RETURNS TABLE(size bigint, bucket_id text)
    LANGUAGE plpgsql
    AS $$
BEGIN
    return query
        select sum((metadata->>'size')::int) as size, obj.bucket_id
        from "storage".objects as obj
        group by obj.bucket_id;
END
$$;


ALTER FUNCTION storage.get_size_by_bucket() OWNER TO supabase_storage_admin;

--
-- Name: list_multipart_uploads_with_delimiter(text, text, text, integer, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, next_key_token text DEFAULT ''::text, next_upload_token text DEFAULT ''::text) RETURNS TABLE(key text, id text, created_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(key COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                        substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1)))
                    ELSE
                        key
                END AS key, id, created_at
            FROM
                storage.s3_multipart_uploads
            WHERE
                bucket_id = $5 AND
                key ILIKE $1 || ''%'' AND
                CASE
                    WHEN $4 != '''' AND $6 = '''' THEN
                        CASE
                            WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                                substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                key COLLATE "C" > $4
                            END
                    ELSE
                        true
                END AND
                CASE
                    WHEN $6 != '''' THEN
                        id COLLATE "C" > $6
                    ELSE
                        true
                    END
            ORDER BY
                key COLLATE "C" ASC, created_at ASC) as e order by key COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_key_token, bucket_id, next_upload_token;
END;
$_$;


ALTER FUNCTION storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer, next_key_token text, next_upload_token text) OWNER TO supabase_storage_admin;

--
-- Name: list_objects_with_delimiter(text, text, text, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.list_objects_with_delimiter(_bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, start_after text DEFAULT ''::text, next_token text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, metadata jsonb, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    v_peek_name TEXT;
    v_current RECORD;
    v_common_prefix TEXT;

    -- Configuration
    v_is_asc BOOLEAN;
    v_prefix TEXT;
    v_start TEXT;
    v_upper_bound TEXT;
    v_file_batch_size INT;

    -- Seek state
    v_next_seek TEXT;
    v_count INT := 0;

    -- Dynamic SQL for batch query only
    v_batch_query TEXT;

BEGIN
    -- ========================================================================
    -- INITIALIZATION
    -- ========================================================================
    v_is_asc := lower(coalesce(sort_order, 'asc')) = 'asc';
    v_prefix := coalesce(prefix_param, '');
    v_start := CASE WHEN coalesce(next_token, '') <> '' THEN next_token ELSE coalesce(start_after, '') END;
    v_file_batch_size := LEAST(GREATEST(max_keys * 2, 100), 1000);

    -- Calculate upper bound for prefix filtering (bytewise, using COLLATE "C")
    IF v_prefix = '' THEN
        v_upper_bound := NULL;
    ELSIF right(v_prefix, 1) = delimiter_param THEN
        v_upper_bound := left(v_prefix, -1) || chr(ascii(delimiter_param) + 1);
    ELSE
        v_upper_bound := left(v_prefix, -1) || chr(ascii(right(v_prefix, 1)) + 1);
    END IF;

    -- Build batch query (dynamic SQL - called infrequently, amortized over many rows)
    IF v_is_asc THEN
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" >= $2 ' ||
                'AND o.name COLLATE "C" < $3 ORDER BY o.name COLLATE "C" ASC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" >= $2 ' ||
                'ORDER BY o.name COLLATE "C" ASC LIMIT $4';
        END IF;
    ELSE
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" < $2 ' ||
                'AND o.name COLLATE "C" >= $3 ORDER BY o.name COLLATE "C" DESC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" < $2 ' ||
                'ORDER BY o.name COLLATE "C" DESC LIMIT $4';
        END IF;
    END IF;

    -- ========================================================================
    -- SEEK INITIALIZATION: Determine starting position
    -- ========================================================================
    IF v_start = '' THEN
        IF v_is_asc THEN
            v_next_seek := v_prefix;
        ELSE
            -- DESC without cursor: find the last item in range
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_prefix AND o.name COLLATE "C" < v_upper_bound
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix <> '' THEN
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            END IF;

            IF v_next_seek IS NOT NULL THEN
                v_next_seek := v_next_seek || delimiter_param;
            ELSE
                RETURN;
            END IF;
        END IF;
    ELSE
        -- Cursor provided: determine if it refers to a folder or leaf
        IF EXISTS (
            SELECT 1 FROM storage.objects o
            WHERE o.bucket_id = _bucket_id
              AND o.name COLLATE "C" LIKE v_start || delimiter_param || '%'
            LIMIT 1
        ) THEN
            -- Cursor refers to a folder
            IF v_is_asc THEN
                v_next_seek := v_start || chr(ascii(delimiter_param) + 1);
            ELSE
                v_next_seek := v_start || delimiter_param;
            END IF;
        ELSE
            -- Cursor refers to a leaf object
            IF v_is_asc THEN
                v_next_seek := v_start || delimiter_param;
            ELSE
                v_next_seek := v_start;
            END IF;
        END IF;
    END IF;

    -- ========================================================================
    -- MAIN LOOP: Hybrid peek-then-batch algorithm
    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch
    -- ========================================================================
    LOOP
        EXIT WHEN v_count >= max_keys;

        -- STEP 1: PEEK using STATIC SQL (plan cached, very fast)
        IF v_is_asc THEN
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_next_seek AND o.name COLLATE "C" < v_upper_bound
                ORDER BY o.name COLLATE "C" ASC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_next_seek
                ORDER BY o.name COLLATE "C" ASC LIMIT 1;
            END IF;
        ELSE
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix <> '' THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            END IF;
        END IF;

        EXIT WHEN v_peek_name IS NULL;

        -- STEP 2: Check if this is a FOLDER or FILE
        v_common_prefix := storage.get_common_prefix(v_peek_name, v_prefix, delimiter_param);

        IF v_common_prefix IS NOT NULL THEN
            -- FOLDER: Emit and skip to next folder (no heap access needed)
            name := rtrim(v_common_prefix, delimiter_param);
            id := NULL;
            updated_at := NULL;
            created_at := NULL;
            last_accessed_at := NULL;
            metadata := NULL;
            RETURN NEXT;
            v_count := v_count + 1;

            -- Advance seek past the folder range
            IF v_is_asc THEN
                v_next_seek := left(v_common_prefix, -1) || chr(ascii(delimiter_param) + 1);
            ELSE
                v_next_seek := v_common_prefix;
            END IF;
        ELSE
            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)
            -- For ASC: upper_bound is the exclusive upper limit (< condition)
            -- For DESC: prefix is the inclusive lower limit (>= condition)
            FOR v_current IN EXECUTE v_batch_query USING _bucket_id, v_next_seek,
                CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix) ELSE v_prefix END, v_file_batch_size
            LOOP
                v_common_prefix := storage.get_common_prefix(v_current.name, v_prefix, delimiter_param);

                IF v_common_prefix IS NOT NULL THEN
                    -- Hit a folder: exit batch, let peek handle it
                    v_next_seek := v_current.name;
                    EXIT;
                END IF;

                -- Emit file
                name := v_current.name;
                id := v_current.id;
                updated_at := v_current.updated_at;
                created_at := v_current.created_at;
                last_accessed_at := v_current.last_accessed_at;
                metadata := v_current.metadata;
                RETURN NEXT;
                v_count := v_count + 1;

                -- Advance seek past this file
                IF v_is_asc THEN
                    v_next_seek := v_current.name || delimiter_param;
                ELSE
                    v_next_seek := v_current.name;
                END IF;

                EXIT WHEN v_count >= max_keys;
            END LOOP;
        END IF;
    END LOOP;
END;
$_$;


ALTER FUNCTION storage.list_objects_with_delimiter(_bucket_id text, prefix_param text, delimiter_param text, max_keys integer, start_after text, next_token text, sort_order text) OWNER TO supabase_storage_admin;

--
-- Name: operation(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.operation() RETURNS text
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN current_setting('storage.operation', true);
END;
$$;


ALTER FUNCTION storage.operation() OWNER TO supabase_storage_admin;

--
-- Name: protect_delete(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.protect_delete() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Check if storage.allow_delete_query is set to 'true'
    IF COALESCE(current_setting('storage.allow_delete_query', true), 'false') != 'true' THEN
        RAISE EXCEPTION 'Direct deletion from storage tables is not allowed. Use the Storage API instead.'
            USING HINT = 'This prevents accidental data loss from orphaned objects.',
                  ERRCODE = '42501';
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION storage.protect_delete() OWNER TO supabase_storage_admin;

--
-- Name: search(text, text, integer, integer, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.search(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    v_peek_name TEXT;
    v_current RECORD;
    v_common_prefix TEXT;
    v_delimiter CONSTANT TEXT := '/';

    -- Configuration
    v_limit INT;
    v_prefix TEXT;
    v_prefix_lower TEXT;
    v_is_asc BOOLEAN;
    v_order_by TEXT;
    v_sort_order TEXT;
    v_upper_bound TEXT;
    v_file_batch_size INT;

    -- Dynamic SQL for batch query only
    v_batch_query TEXT;

    -- Seek state
    v_next_seek TEXT;
    v_count INT := 0;
    v_skipped INT := 0;
BEGIN
    -- ========================================================================
    -- INITIALIZATION
    -- ========================================================================
    v_limit := LEAST(coalesce(limits, 100), 1500);
    v_prefix := coalesce(prefix, '') || coalesce(search, '');
    v_prefix_lower := lower(v_prefix);
    v_is_asc := lower(coalesce(sortorder, 'asc')) = 'asc';
    v_file_batch_size := LEAST(GREATEST(v_limit * 2, 100), 1000);

    -- Validate sort column
    CASE lower(coalesce(sortcolumn, 'name'))
        WHEN 'name' THEN v_order_by := 'name';
        WHEN 'updated_at' THEN v_order_by := 'updated_at';
        WHEN 'created_at' THEN v_order_by := 'created_at';
        WHEN 'last_accessed_at' THEN v_order_by := 'last_accessed_at';
        ELSE v_order_by := 'name';
    END CASE;

    v_sort_order := CASE WHEN v_is_asc THEN 'asc' ELSE 'desc' END;

    -- ========================================================================
    -- NON-NAME SORTING: Use path_tokens approach (unchanged)
    -- ========================================================================
    IF v_order_by != 'name' THEN
        RETURN QUERY EXECUTE format(
            $sql$
            WITH folders AS (
                SELECT path_tokens[$1] AS folder
                FROM storage.objects
                WHERE objects.name ILIKE $2 || '%%'
                  AND bucket_id = $3
                  AND array_length(objects.path_tokens, 1) <> $1
                GROUP BY folder
                ORDER BY folder %s
            )
            (SELECT folder AS "name",
                   NULL::uuid AS id,
                   NULL::timestamptz AS updated_at,
                   NULL::timestamptz AS created_at,
                   NULL::timestamptz AS last_accessed_at,
                   NULL::jsonb AS metadata FROM folders)
            UNION ALL
            (SELECT path_tokens[$1] AS "name",
                   id, updated_at, created_at, last_accessed_at, metadata
             FROM storage.objects
             WHERE objects.name ILIKE $2 || '%%'
               AND bucket_id = $3
               AND array_length(objects.path_tokens, 1) = $1
             ORDER BY %I %s)
            LIMIT $4 OFFSET $5
            $sql$, v_sort_order, v_order_by, v_sort_order
        ) USING levels, v_prefix, bucketname, v_limit, offsets;
        RETURN;
    END IF;

    -- ========================================================================
    -- NAME SORTING: Hybrid skip-scan with batch optimization
    -- ========================================================================

    -- Calculate upper bound for prefix filtering
    IF v_prefix_lower = '' THEN
        v_upper_bound := NULL;
    ELSIF right(v_prefix_lower, 1) = v_delimiter THEN
        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(v_delimiter) + 1);
    ELSE
        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(right(v_prefix_lower, 1)) + 1);
    END IF;

    -- Build batch query (dynamic SQL - called infrequently, amortized over many rows)
    IF v_is_asc THEN
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" >= $2 ' ||
                'AND lower(o.name) COLLATE "C" < $3 ORDER BY lower(o.name) COLLATE "C" ASC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" >= $2 ' ||
                'ORDER BY lower(o.name) COLLATE "C" ASC LIMIT $4';
        END IF;
    ELSE
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" < $2 ' ||
                'AND lower(o.name) COLLATE "C" >= $3 ORDER BY lower(o.name) COLLATE "C" DESC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" < $2 ' ||
                'ORDER BY lower(o.name) COLLATE "C" DESC LIMIT $4';
        END IF;
    END IF;

    -- Initialize seek position
    IF v_is_asc THEN
        v_next_seek := v_prefix_lower;
    ELSE
        -- DESC: find the last item in range first (static SQL)
        IF v_upper_bound IS NOT NULL THEN
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_prefix_lower AND lower(o.name) COLLATE "C" < v_upper_bound
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        ELSIF v_prefix_lower <> '' THEN
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_prefix_lower
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        ELSE
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        END IF;

        IF v_peek_name IS NOT NULL THEN
            v_next_seek := lower(v_peek_name) || v_delimiter;
        ELSE
            RETURN;
        END IF;
    END IF;

    -- ========================================================================
    -- MAIN LOOP: Hybrid peek-then-batch algorithm
    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch
    -- ========================================================================
    LOOP
        EXIT WHEN v_count >= v_limit;

        -- STEP 1: PEEK using STATIC SQL (plan cached, very fast)
        IF v_is_asc THEN
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek AND lower(o.name) COLLATE "C" < v_upper_bound
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            END IF;
        ELSE
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek AND lower(o.name) COLLATE "C" >= v_prefix_lower
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix_lower <> '' THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek AND lower(o.name) COLLATE "C" >= v_prefix_lower
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            END IF;
        END IF;

        EXIT WHEN v_peek_name IS NULL;

        -- STEP 2: Check if this is a FOLDER or FILE
        v_common_prefix := storage.get_common_prefix(lower(v_peek_name), v_prefix_lower, v_delimiter);

        IF v_common_prefix IS NOT NULL THEN
            -- FOLDER: Handle offset, emit if needed, skip to next folder
            IF v_skipped < offsets THEN
                v_skipped := v_skipped + 1;
            ELSE
                name := split_part(rtrim(storage.get_common_prefix(v_peek_name, v_prefix, v_delimiter), v_delimiter), v_delimiter, levels);
                id := NULL;
                updated_at := NULL;
                created_at := NULL;
                last_accessed_at := NULL;
                metadata := NULL;
                RETURN NEXT;
                v_count := v_count + 1;
            END IF;

            -- Advance seek past the folder range
            IF v_is_asc THEN
                v_next_seek := lower(left(v_common_prefix, -1)) || chr(ascii(v_delimiter) + 1);
            ELSE
                v_next_seek := lower(v_common_prefix);
            END IF;
        ELSE
            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)
            -- For ASC: upper_bound is the exclusive upper limit (< condition)
            -- For DESC: prefix_lower is the inclusive lower limit (>= condition)
            FOR v_current IN EXECUTE v_batch_query
                USING bucketname, v_next_seek,
                    CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix_lower) ELSE v_prefix_lower END, v_file_batch_size
            LOOP
                v_common_prefix := storage.get_common_prefix(lower(v_current.name), v_prefix_lower, v_delimiter);

                IF v_common_prefix IS NOT NULL THEN
                    -- Hit a folder: exit batch, let peek handle it
                    v_next_seek := lower(v_current.name);
                    EXIT;
                END IF;

                -- Handle offset skipping
                IF v_skipped < offsets THEN
                    v_skipped := v_skipped + 1;
                ELSE
                    -- Emit file
                    name := split_part(v_current.name, v_delimiter, levels);
                    id := v_current.id;
                    updated_at := v_current.updated_at;
                    created_at := v_current.created_at;
                    last_accessed_at := v_current.last_accessed_at;
                    metadata := v_current.metadata;
                    RETURN NEXT;
                    v_count := v_count + 1;
                END IF;

                -- Advance seek past this file
                IF v_is_asc THEN
                    v_next_seek := lower(v_current.name) || v_delimiter;
                ELSE
                    v_next_seek := lower(v_current.name);
                END IF;

                EXIT WHEN v_count >= v_limit;
            END LOOP;
        END IF;
    END LOOP;
END;
$_$;


ALTER FUNCTION storage.search(prefix text, bucketname text, limits integer, levels integer, offsets integer, search text, sortcolumn text, sortorder text) OWNER TO supabase_storage_admin;

--
-- Name: search_by_timestamp(text, text, integer, integer, text, text, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.search_by_timestamp(p_prefix text, p_bucket_id text, p_limit integer, p_level integer, p_start_after text, p_sort_order text, p_sort_column text, p_sort_column_after text) RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    v_cursor_op text;
    v_query text;
    v_prefix text;
BEGIN
    v_prefix := coalesce(p_prefix, '');

    IF p_sort_order = 'asc' THEN
        v_cursor_op := '>';
    ELSE
        v_cursor_op := '<';
    END IF;

    v_query := format($sql$
        WITH raw_objects AS (
            SELECT
                o.name AS obj_name,
                o.id AS obj_id,
                o.updated_at AS obj_updated_at,
                o.created_at AS obj_created_at,
                o.last_accessed_at AS obj_last_accessed_at,
                o.metadata AS obj_metadata,
                storage.get_common_prefix(o.name, $1, '/') AS common_prefix
            FROM storage.objects o
            WHERE o.bucket_id = $2
              AND o.name COLLATE "C" LIKE $1 || '%%'
        ),
        -- Aggregate common prefixes (folders)
        -- Both created_at and updated_at use MIN(obj_created_at) to match the old prefixes table behavior
        aggregated_prefixes AS (
            SELECT
                rtrim(common_prefix, '/') AS name,
                NULL::uuid AS id,
                MIN(obj_created_at) AS updated_at,
                MIN(obj_created_at) AS created_at,
                NULL::timestamptz AS last_accessed_at,
                NULL::jsonb AS metadata,
                TRUE AS is_prefix
            FROM raw_objects
            WHERE common_prefix IS NOT NULL
            GROUP BY common_prefix
        ),
        leaf_objects AS (
            SELECT
                obj_name AS name,
                obj_id AS id,
                obj_updated_at AS updated_at,
                obj_created_at AS created_at,
                obj_last_accessed_at AS last_accessed_at,
                obj_metadata AS metadata,
                FALSE AS is_prefix
            FROM raw_objects
            WHERE common_prefix IS NULL
        ),
        combined AS (
            SELECT * FROM aggregated_prefixes
            UNION ALL
            SELECT * FROM leaf_objects
        ),
        filtered AS (
            SELECT *
            FROM combined
            WHERE (
                $5 = ''
                OR ROW(
                    date_trunc('milliseconds', %I),
                    name COLLATE "C"
                ) %s ROW(
                    COALESCE(NULLIF($6, '')::timestamptz, 'epoch'::timestamptz),
                    $5
                )
            )
        )
        SELECT
            split_part(name, '/', $3) AS key,
            name,
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
        FROM filtered
        ORDER BY
            COALESCE(date_trunc('milliseconds', %I), 'epoch'::timestamptz) %s,
            name COLLATE "C" %s
        LIMIT $4
    $sql$,
        p_sort_column,
        v_cursor_op,
        p_sort_column,
        p_sort_order,
        p_sort_order
    );

    RETURN QUERY EXECUTE v_query
    USING v_prefix, p_bucket_id, p_level, p_limit, p_start_after, p_sort_column_after;
END;
$_$;


ALTER FUNCTION storage.search_by_timestamp(p_prefix text, p_bucket_id text, p_limit integer, p_level integer, p_start_after text, p_sort_order text, p_sort_column text, p_sort_column_after text) OWNER TO supabase_storage_admin;

--
-- Name: search_v2(text, text, integer, integer, text, text, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.search_v2(prefix text, bucket_name text, limits integer DEFAULT 100, levels integer DEFAULT 1, start_after text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text, sort_column text DEFAULT 'name'::text, sort_column_after text DEFAULT ''::text) RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
    v_sort_col text;
    v_sort_ord text;
    v_limit int;
BEGIN
    -- Cap limit to maximum of 1500 records
    v_limit := LEAST(coalesce(limits, 100), 1500);

    -- Validate and normalize sort_order
    v_sort_ord := lower(coalesce(sort_order, 'asc'));
    IF v_sort_ord NOT IN ('asc', 'desc') THEN
        v_sort_ord := 'asc';
    END IF;

    -- Validate and normalize sort_column
    v_sort_col := lower(coalesce(sort_column, 'name'));
    IF v_sort_col NOT IN ('name', 'updated_at', 'created_at') THEN
        v_sort_col := 'name';
    END IF;

    -- Route to appropriate implementation
    IF v_sort_col = 'name' THEN
        -- Use list_objects_with_delimiter for name sorting (most efficient: O(k * log n))
        RETURN QUERY
        SELECT
            split_part(l.name, '/', levels) AS key,
            l.name AS name,
            l.id,
            l.updated_at,
            l.created_at,
            l.last_accessed_at,
            l.metadata
        FROM storage.list_objects_with_delimiter(
            bucket_name,
            coalesce(prefix, ''),
            '/',
            v_limit,
            start_after,
            '',
            v_sort_ord
        ) l;
    ELSE
        -- Use aggregation approach for timestamp sorting
        -- Not efficient for large datasets but supports correct pagination
        RETURN QUERY SELECT * FROM storage.search_by_timestamp(
            prefix, bucket_name, v_limit, levels, start_after,
            v_sort_ord, v_sort_col, sort_column_after
        );
    END IF;
END;
$$;


ALTER FUNCTION storage.search_v2(prefix text, bucket_name text, limits integer, levels integer, start_after text, sort_order text, sort_column text, sort_column_after text) OWNER TO supabase_storage_admin;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$;


ALTER FUNCTION storage.update_updated_at_column() OWNER TO supabase_storage_admin;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_log_entries; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.audit_log_entries (
    instance_id uuid,
    id uuid NOT NULL,
    payload json,
    created_at timestamp with time zone,
    ip_address character varying(64) DEFAULT ''::character varying NOT NULL
);


ALTER TABLE auth.audit_log_entries OWNER TO supabase_auth_admin;

--
-- Name: TABLE audit_log_entries; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.audit_log_entries IS 'Auth: Audit trail for user actions.';


--
-- Name: flow_state; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.flow_state (
    id uuid NOT NULL,
    user_id uuid,
    auth_code text,
    code_challenge_method auth.code_challenge_method,
    code_challenge text,
    provider_type text NOT NULL,
    provider_access_token text,
    provider_refresh_token text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    authentication_method text NOT NULL,
    auth_code_issued_at timestamp with time zone,
    invite_token text,
    referrer text,
    oauth_client_state_id uuid,
    linking_target_id uuid,
    email_optional boolean DEFAULT false NOT NULL
);


ALTER TABLE auth.flow_state OWNER TO supabase_auth_admin;

--
-- Name: TABLE flow_state; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.flow_state IS 'Stores metadata for all OAuth/SSO login flows';


--
-- Name: identities; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.identities (
    provider_id text NOT NULL,
    user_id uuid NOT NULL,
    identity_data jsonb NOT NULL,
    provider text NOT NULL,
    last_sign_in_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    email text GENERATED ALWAYS AS (lower((identity_data ->> 'email'::text))) STORED,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE auth.identities OWNER TO supabase_auth_admin;

--
-- Name: TABLE identities; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.identities IS 'Auth: Stores identities associated to a user.';


--
-- Name: COLUMN identities.email; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.identities.email IS 'Auth: Email is a generated column that references the optional email property in the identity_data';


--
-- Name: instances; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.instances (
    id uuid NOT NULL,
    uuid uuid,
    raw_base_config text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE auth.instances OWNER TO supabase_auth_admin;

--
-- Name: TABLE instances; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.instances IS 'Auth: Manages users across multiple sites.';


--
-- Name: mfa_amr_claims; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.mfa_amr_claims (
    session_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    authentication_method text NOT NULL,
    id uuid NOT NULL
);


ALTER TABLE auth.mfa_amr_claims OWNER TO supabase_auth_admin;

--
-- Name: TABLE mfa_amr_claims; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.mfa_amr_claims IS 'auth: stores authenticator method reference claims for multi factor authentication';


--
-- Name: mfa_challenges; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.mfa_challenges (
    id uuid NOT NULL,
    factor_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    verified_at timestamp with time zone,
    ip_address inet NOT NULL,
    otp_code text,
    web_authn_session_data jsonb
);


ALTER TABLE auth.mfa_challenges OWNER TO supabase_auth_admin;

--
-- Name: TABLE mfa_challenges; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.mfa_challenges IS 'auth: stores metadata about challenge requests made';


--
-- Name: mfa_factors; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.mfa_factors (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    friendly_name text,
    factor_type auth.factor_type NOT NULL,
    status auth.factor_status NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    secret text,
    phone text,
    last_challenged_at timestamp with time zone,
    web_authn_credential jsonb,
    web_authn_aaguid uuid,
    last_webauthn_challenge_data jsonb
);


ALTER TABLE auth.mfa_factors OWNER TO supabase_auth_admin;

--
-- Name: TABLE mfa_factors; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.mfa_factors IS 'auth: stores metadata about factors';


--
-- Name: COLUMN mfa_factors.last_webauthn_challenge_data; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.mfa_factors.last_webauthn_challenge_data IS 'Stores the latest WebAuthn challenge data including attestation/assertion for customer verification';


--
-- Name: oauth_authorizations; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.oauth_authorizations (
    id uuid NOT NULL,
    authorization_id text NOT NULL,
    client_id uuid NOT NULL,
    user_id uuid,
    redirect_uri text NOT NULL,
    scope text NOT NULL,
    state text,
    resource text,
    code_challenge text,
    code_challenge_method auth.code_challenge_method,
    response_type auth.oauth_response_type DEFAULT 'code'::auth.oauth_response_type NOT NULL,
    status auth.oauth_authorization_status DEFAULT 'pending'::auth.oauth_authorization_status NOT NULL,
    authorization_code text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '00:03:00'::interval) NOT NULL,
    approved_at timestamp with time zone,
    nonce text,
    CONSTRAINT oauth_authorizations_authorization_code_length CHECK ((char_length(authorization_code) <= 255)),
    CONSTRAINT oauth_authorizations_code_challenge_length CHECK ((char_length(code_challenge) <= 128)),
    CONSTRAINT oauth_authorizations_expires_at_future CHECK ((expires_at > created_at)),
    CONSTRAINT oauth_authorizations_nonce_length CHECK ((char_length(nonce) <= 255)),
    CONSTRAINT oauth_authorizations_redirect_uri_length CHECK ((char_length(redirect_uri) <= 2048)),
    CONSTRAINT oauth_authorizations_resource_length CHECK ((char_length(resource) <= 2048)),
    CONSTRAINT oauth_authorizations_scope_length CHECK ((char_length(scope) <= 4096)),
    CONSTRAINT oauth_authorizations_state_length CHECK ((char_length(state) <= 4096))
);


ALTER TABLE auth.oauth_authorizations OWNER TO supabase_auth_admin;

--
-- Name: oauth_client_states; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.oauth_client_states (
    id uuid NOT NULL,
    provider_type text NOT NULL,
    code_verifier text,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE auth.oauth_client_states OWNER TO supabase_auth_admin;

--
-- Name: TABLE oauth_client_states; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.oauth_client_states IS 'Stores OAuth states for third-party provider authentication flows where Supabase acts as the OAuth client.';


--
-- Name: oauth_clients; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.oauth_clients (
    id uuid NOT NULL,
    client_secret_hash text,
    registration_type auth.oauth_registration_type NOT NULL,
    redirect_uris text NOT NULL,
    grant_types text NOT NULL,
    client_name text,
    client_uri text,
    logo_uri text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    client_type auth.oauth_client_type DEFAULT 'confidential'::auth.oauth_client_type NOT NULL,
    token_endpoint_auth_method text NOT NULL,
    CONSTRAINT oauth_clients_client_name_length CHECK ((char_length(client_name) <= 1024)),
    CONSTRAINT oauth_clients_client_uri_length CHECK ((char_length(client_uri) <= 2048)),
    CONSTRAINT oauth_clients_logo_uri_length CHECK ((char_length(logo_uri) <= 2048)),
    CONSTRAINT oauth_clients_token_endpoint_auth_method_check CHECK ((token_endpoint_auth_method = ANY (ARRAY['client_secret_basic'::text, 'client_secret_post'::text, 'none'::text])))
);


ALTER TABLE auth.oauth_clients OWNER TO supabase_auth_admin;

--
-- Name: oauth_consents; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.oauth_consents (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    client_id uuid NOT NULL,
    scopes text NOT NULL,
    granted_at timestamp with time zone DEFAULT now() NOT NULL,
    revoked_at timestamp with time zone,
    CONSTRAINT oauth_consents_revoked_after_granted CHECK (((revoked_at IS NULL) OR (revoked_at >= granted_at))),
    CONSTRAINT oauth_consents_scopes_length CHECK ((char_length(scopes) <= 2048)),
    CONSTRAINT oauth_consents_scopes_not_empty CHECK ((char_length(TRIM(BOTH FROM scopes)) > 0))
);


ALTER TABLE auth.oauth_consents OWNER TO supabase_auth_admin;

--
-- Name: one_time_tokens; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.one_time_tokens (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    token_type auth.one_time_token_type NOT NULL,
    token_hash text NOT NULL,
    relates_to text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT one_time_tokens_token_hash_check CHECK ((char_length(token_hash) > 0))
);


ALTER TABLE auth.one_time_tokens OWNER TO supabase_auth_admin;

--
-- Name: refresh_tokens; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.refresh_tokens (
    instance_id uuid,
    id bigint NOT NULL,
    token character varying(255),
    user_id character varying(255),
    revoked boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    parent character varying(255),
    session_id uuid
);


ALTER TABLE auth.refresh_tokens OWNER TO supabase_auth_admin;

--
-- Name: TABLE refresh_tokens; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.refresh_tokens IS 'Auth: Store of tokens used to refresh JWT tokens once they expire.';


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: auth; Owner: supabase_auth_admin
--

CREATE SEQUENCE auth.refresh_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE auth.refresh_tokens_id_seq OWNER TO supabase_auth_admin;

--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: auth; Owner: supabase_auth_admin
--

ALTER SEQUENCE auth.refresh_tokens_id_seq OWNED BY auth.refresh_tokens.id;


--
-- Name: saml_providers; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.saml_providers (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    entity_id text NOT NULL,
    metadata_xml text NOT NULL,
    metadata_url text,
    attribute_mapping jsonb,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    name_id_format text,
    CONSTRAINT "entity_id not empty" CHECK ((char_length(entity_id) > 0)),
    CONSTRAINT "metadata_url not empty" CHECK (((metadata_url = NULL::text) OR (char_length(metadata_url) > 0))),
    CONSTRAINT "metadata_xml not empty" CHECK ((char_length(metadata_xml) > 0))
);


ALTER TABLE auth.saml_providers OWNER TO supabase_auth_admin;

--
-- Name: TABLE saml_providers; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.saml_providers IS 'Auth: Manages SAML Identity Provider connections.';


--
-- Name: saml_relay_states; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.saml_relay_states (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    request_id text NOT NULL,
    for_email text,
    redirect_to text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    flow_state_id uuid,
    CONSTRAINT "request_id not empty" CHECK ((char_length(request_id) > 0))
);


ALTER TABLE auth.saml_relay_states OWNER TO supabase_auth_admin;

--
-- Name: TABLE saml_relay_states; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.saml_relay_states IS 'Auth: Contains SAML Relay State information for each Service Provider initiated login.';


--
-- Name: schema_migrations; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.schema_migrations (
    version character varying(255) NOT NULL
);


ALTER TABLE auth.schema_migrations OWNER TO supabase_auth_admin;

--
-- Name: TABLE schema_migrations; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.schema_migrations IS 'Auth: Manages updates to the auth system.';


--
-- Name: sessions; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.sessions (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    factor_id uuid,
    aal auth.aal_level,
    not_after timestamp with time zone,
    refreshed_at timestamp without time zone,
    user_agent text,
    ip inet,
    tag text,
    oauth_client_id uuid,
    refresh_token_hmac_key text,
    refresh_token_counter bigint,
    scopes text,
    CONSTRAINT sessions_scopes_length CHECK ((char_length(scopes) <= 4096))
);


ALTER TABLE auth.sessions OWNER TO supabase_auth_admin;

--
-- Name: TABLE sessions; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.sessions IS 'Auth: Stores session data associated to a user.';


--
-- Name: COLUMN sessions.not_after; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.sessions.not_after IS 'Auth: Not after is a nullable column that contains a timestamp after which the session should be regarded as expired.';


--
-- Name: COLUMN sessions.refresh_token_hmac_key; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.sessions.refresh_token_hmac_key IS 'Holds a HMAC-SHA256 key used to sign refresh tokens for this session.';


--
-- Name: COLUMN sessions.refresh_token_counter; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.sessions.refresh_token_counter IS 'Holds the ID (counter) of the last issued refresh token.';


--
-- Name: sso_domains; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.sso_domains (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    domain text NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT "domain not empty" CHECK ((char_length(domain) > 0))
);


ALTER TABLE auth.sso_domains OWNER TO supabase_auth_admin;

--
-- Name: TABLE sso_domains; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.sso_domains IS 'Auth: Manages SSO email address domain mapping to an SSO Identity Provider.';


--
-- Name: sso_providers; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.sso_providers (
    id uuid NOT NULL,
    resource_id text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    disabled boolean,
    CONSTRAINT "resource_id not empty" CHECK (((resource_id = NULL::text) OR (char_length(resource_id) > 0)))
);


ALTER TABLE auth.sso_providers OWNER TO supabase_auth_admin;

--
-- Name: TABLE sso_providers; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.sso_providers IS 'Auth: Manages SSO identity provider information; see saml_providers for SAML.';


--
-- Name: COLUMN sso_providers.resource_id; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.sso_providers.resource_id IS 'Auth: Uniquely identifies a SSO provider according to a user-chosen resource ID (case insensitive), useful in infrastructure as code.';


--
-- Name: users; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.users (
    instance_id uuid,
    id uuid NOT NULL,
    aud character varying(255),
    role character varying(255),
    email character varying(255),
    encrypted_password character varying(255),
    email_confirmed_at timestamp with time zone,
    invited_at timestamp with time zone,
    confirmation_token character varying(255),
    confirmation_sent_at timestamp with time zone,
    recovery_token character varying(255),
    recovery_sent_at timestamp with time zone,
    email_change_token_new character varying(255),
    email_change character varying(255),
    email_change_sent_at timestamp with time zone,
    last_sign_in_at timestamp with time zone,
    raw_app_meta_data jsonb,
    raw_user_meta_data jsonb,
    is_super_admin boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    phone text DEFAULT NULL::character varying,
    phone_confirmed_at timestamp with time zone,
    phone_change text DEFAULT ''::character varying,
    phone_change_token character varying(255) DEFAULT ''::character varying,
    phone_change_sent_at timestamp with time zone,
    confirmed_at timestamp with time zone GENERATED ALWAYS AS (LEAST(email_confirmed_at, phone_confirmed_at)) STORED,
    email_change_token_current character varying(255) DEFAULT ''::character varying,
    email_change_confirm_status smallint DEFAULT 0,
    banned_until timestamp with time zone,
    reauthentication_token character varying(255) DEFAULT ''::character varying,
    reauthentication_sent_at timestamp with time zone,
    is_sso_user boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone,
    is_anonymous boolean DEFAULT false NOT NULL,
    CONSTRAINT users_email_change_confirm_status_check CHECK (((email_change_confirm_status >= 0) AND (email_change_confirm_status <= 2)))
);


ALTER TABLE auth.users OWNER TO supabase_auth_admin;

--
-- Name: TABLE users; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.users IS 'Auth: Stores user login data within a secure schema.';


--
-- Name: COLUMN users.is_sso_user; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.users.is_sso_user IS 'Auth: Set this column to true when the account comes from SSO. These accounts can have duplicate emails.';


--
-- Name: anti_cheat_case_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.anti_cheat_case_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    case_id uuid NOT NULL,
    actor_user_id uuid,
    action text NOT NULL,
    details jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


ALTER TABLE public.anti_cheat_case_events OWNER TO postgres;

--
-- Name: anti_cheat_cases; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.anti_cheat_cases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    match_id uuid NOT NULL,
    risk_score numeric(5,2) DEFAULT 0 NOT NULL,
    status text DEFAULT 'new'::text NOT NULL,
    summary text NOT NULL,
    evidence jsonb DEFAULT '{}'::jsonb NOT NULL,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    resolution_note text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT anti_cheat_cases_status_check CHECK ((status = ANY (ARRAY['new'::text, 'in_review'::text, 'resolved'::text, 'dismissed'::text])))
);


ALTER TABLE public.anti_cheat_cases OWNER TO postgres;

--
-- Name: code_snapshots; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.code_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    match_id uuid,
    user_id uuid,
    code text DEFAULT ''::text,
    "timestamp" timestamp with time zone DEFAULT now()
);


ALTER TABLE public.code_snapshots OWNER TO postgres;

--
-- Name: duel_matches; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.duel_matches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    player1 uuid,
    player2 uuid,
    winner_id uuid,
    problem_id uuid,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.duel_matches OWNER TO postgres;

--
-- Name: duel_submissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.duel_submissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    match_id uuid,
    user_id uuid,
    code text,
    passed_all boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.duel_submissions OWNER TO postgres;

--
-- Name: duel_test_cases; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.duel_test_cases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    problem_id uuid,
    input text NOT NULL,
    expected_output text NOT NULL,
    is_sample boolean DEFAULT false
);


ALTER TABLE public.duel_test_cases OWNER TO postgres;

--
-- Name: duel_users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.duel_users (
    id uuid NOT NULL,
    username text NOT NULL,
    rating integer DEFAULT 500,
    wins integer DEFAULT 0,
    losses integer DEFAULT 0,
    draws integer DEFAULT 0,
    total_matches integer DEFAULT 0,
    win_streak integer DEFAULT 0,
    avatar_url text DEFAULT ''::text,
    last_online timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    matches_played integer DEFAULT 0,
    easy_rating integer DEFAULT 500,
    medium_rating integer DEFAULT 500,
    hard_rating integer DEFAULT 500,
    CONSTRAINT duel_users_draws_check CHECK ((draws >= 0)),
    CONSTRAINT duel_users_losses_check CHECK ((losses >= 0)),
    CONSTRAINT duel_users_rating_check CHECK ((rating >= 0)),
    CONSTRAINT duel_users_total_matches_check CHECK ((total_matches >= 0)),
    CONSTRAINT duel_users_wins_check CHECK ((wins >= 0))
);


ALTER TABLE public.duel_users OWNER TO postgres;

--
-- Name: feedback_attachments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.feedback_attachments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    feedback_id uuid NOT NULL,
    user_id uuid NOT NULL,
    storage_bucket text DEFAULT 'feedback-attachments'::text NOT NULL,
    storage_path text NOT NULL,
    original_name text NOT NULL,
    content_type text NOT NULL,
    byte_size integer NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT feedback_attachments_byte_size_check CHECK ((byte_size > 0))
);


ALTER TABLE public.feedback_attachments OWNER TO postgres;

--
-- Name: feedback_audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.feedback_audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    feedback_id uuid NOT NULL,
    actor_user_id uuid,
    action text NOT NULL,
    details jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


ALTER TABLE public.feedback_audit_logs OWNER TO postgres;

--
-- Name: feedback_entries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.feedback_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type text NOT NULL,
    status text DEFAULT 'new'::text NOT NULL,
    subject text NOT NULL,
    message text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    dedupe_hash text NOT NULL,
    attachments_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    resolved_at timestamp with time zone,
    CONSTRAINT feedback_entries_attachments_count_check CHECK ((attachments_count >= 0)),
    CONSTRAINT feedback_entries_status_check CHECK ((status = ANY (ARRAY['new'::text, 'in_review'::text, 'resolved'::text]))),
    CONSTRAINT feedback_entries_type_check CHECK ((type = ANY (ARRAY['bug_report'::text, 'feature_request'::text, 'general_feedback'::text])))
);


ALTER TABLE public.feedback_entries OWNER TO postgres;

--
-- Name: leaderboard_entries; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.leaderboard_entries AS
 SELECT id AS user_id,
    username,
    rating,
    wins,
    losses,
    total_matches,
        CASE
            WHEN (total_matches > 0) THEN round((((wins)::numeric / (total_matches)::numeric) * (100)::numeric), 2)
            ELSE (0)::numeric
        END AS win_rate,
    row_number() OVER (ORDER BY rating DESC, wins DESC) AS rank
   FROM public.duel_users
  ORDER BY rating DESC, wins DESC;


ALTER VIEW public.leaderboard_entries OWNER TO postgres;

--
-- Name: legal_acceptances; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.legal_acceptances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    document_key text NOT NULL,
    version text NOT NULL,
    source text DEFAULT 'account'::text NOT NULL,
    accepted_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    ip_address text,
    user_agent text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT legal_acceptances_document_key_check CHECK ((document_key = ANY (ARRAY['terms_of_service'::text, 'privacy_policy'::text, 'refund_policy'::text]))),
    CONSTRAINT legal_acceptances_source_check CHECK ((source = ANY (ARRAY['signup'::text, 'checkout'::text, 'account'::text])))
);


ALTER TABLE public.legal_acceptances OWNER TO postgres;

--
-- Name: lesson_completion_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lesson_completion_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    lesson_id text NOT NULL,
    xp_earned integer DEFAULT 0 NOT NULL,
    coins_earned integer DEFAULT 0 NOT NULL,
    completed_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT lesson_completion_events_coins_earned_check CHECK ((coins_earned >= 0)),
    CONSTRAINT lesson_completion_events_xp_earned_check CHECK ((xp_earned >= 0))
);


ALTER TABLE public.lesson_completion_events OWNER TO postgres;

--
-- Name: match_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.match_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    match_id uuid,
    event_type text NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    user_id uuid
);


ALTER TABLE public.match_events OWNER TO postgres;

--
-- Name: match_replays; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.match_replays (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    match_id uuid,
    replay_data jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    events jsonb DEFAULT '[]'::jsonb,
    player_a_timeline jsonb DEFAULT '[]'::jsonb,
    player_b_timeline jsonb DEFAULT '[]'::jsonb
);


ALTER TABLE public.match_replays OWNER TO postgres;

--
-- Name: matches; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.matches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    player_a_id uuid,
    player_b_id uuid,
    problem_id uuid NOT NULL,
    match_type text DEFAULT 'ranked'::text,
    status text DEFAULT 'waiting'::text,
    winner_id uuid,
    player_a_score double precision DEFAULT 0,
    player_b_score double precision DEFAULT 0,
    player_a_rating_before integer,
    player_b_rating_before integer,
    player_a_rating_after integer,
    player_b_rating_after integer,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    start_time timestamp with time zone,
    end_time timestamp with time zone,
    duration_seconds integer,
    ranked boolean DEFAULT true,
    end_time_ms bigint,
    ended_at timestamp with time zone,
    player_a_rating_change integer DEFAULT 0,
    player_b_rating_change integer DEFAULT 0,
    reason text,
    problem_difficulty text,
    time_limit_seconds integer,
    duel_result_strength text,
    player_a_partial_score double precision,
    player_b_partial_score double precision,
    player_a_wrong_submissions integer DEFAULT 0,
    player_b_wrong_submissions integer DEFAULT 0,
    CONSTRAINT matches_match_type_check CHECK ((match_type = ANY (ARRAY['ranked'::text, 'casual'::text]))),
    CONSTRAINT matches_player_a_score_check CHECK ((player_a_score >= (0)::double precision)),
    CONSTRAINT matches_player_b_score_check CHECK ((player_b_score >= (0)::double precision)),
    CONSTRAINT matches_problem_difficulty_check CHECK (((problem_difficulty IS NULL) OR (problem_difficulty = ANY (ARRAY['easy'::text, 'medium'::text, 'hard'::text])))),
    CONSTRAINT matches_status_check CHECK ((upper(status) = ANY (ARRAY['WAITING'::text, 'ACTIVE'::text, 'IN_PROGRESS'::text, 'FINISHED'::text, 'COMPLETED'::text, 'CANCELLED'::text, 'ABANDONED'::text, 'ENDED'::text])))
);


ALTER TABLE public.matches OWNER TO postgres;

--
-- Name: problems; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.problems (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    statement text NOT NULL,
    difficulty text NOT NULL,
    time_limit_seconds integer DEFAULT 900,
    test_cases jsonb NOT NULL,
    starter_code jsonb DEFAULT '{}'::jsonb,
    supported_languages text[] DEFAULT ARRAY['javascript'::text, 'python'::text],
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    short_story text,
    input_format text,
    output_format text,
    constraints_text text,
    solution_explanation text,
    reference_solution_javascript text,
    estimated_time_minutes integer,
    rating_weight numeric(6,2),
    tags text[] DEFAULT '{}'::text[] NOT NULL,
    problem_statement text,
    CONSTRAINT problems_difficulty_check CHECK ((difficulty = ANY (ARRAY['easy'::text, 'medium'::text, 'hard'::text]))),
    CONSTRAINT problems_time_limit_seconds_check CHECK ((time_limit_seconds > 0))
);


ALTER TABLE public.problems OWNER TO postgres;

--
-- Name: user_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_profiles (
    id uuid NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    coins integer DEFAULT 100,
    total_coins_earned integer DEFAULT 100,
    xp integer DEFAULT 0,
    completed_lessons text[] DEFAULT '{}'::text[],
    level integer DEFAULT 1,
    hearts integer DEFAULT 5,
    max_hearts integer DEFAULT 5,
    last_heart_reset text DEFAULT (CURRENT_DATE)::text,
    current_avatar text DEFAULT 'default'::text,
    owned_avatars text[] DEFAULT ARRAY['default'::text],
    unlocked_achievements text[] DEFAULT '{}'::text[],
    current_streak integer DEFAULT 1,
    last_login_date text DEFAULT (CURRENT_DATE)::text,
    total_lessons_completed integer DEFAULT 0,
    email_verified boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    xp_boost_multiplier integer DEFAULT 1,
    xp_boost_expires_at bigint DEFAULT 0,
    unlimited_hearts_expires_at bigint DEFAULT 0,
    lifetime_completed_lessons text[] DEFAULT '{}'::text[] NOT NULL
);


ALTER TABLE public.user_profiles OWNER TO postgres;

--
-- Name: public_leaderboard; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.public_leaderboard AS
 SELECT up.id,
    up.name,
    up.current_avatar,
    COALESCE(up.xp, 0) AS xp,
    COALESCE(up.level, 1) AS level,
    COALESCE(up.total_lessons_completed, 0) AS total_lessons_completed,
    COALESCE(up.current_streak, 0) AS current_streak,
    COALESCE(du.rating, 500) AS ranked_elo
   FROM (public.user_profiles up
     LEFT JOIN public.duel_users du ON ((du.id = up.id)));


ALTER VIEW public.public_leaderboard OWNER TO postgres;

--
-- Name: store_transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.store_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    request_id uuid,
    stripe_payment_intent_id text,
    source text NOT NULL,
    item_id text NOT NULL,
    status text DEFAULT 'completed'::text NOT NULL,
    coin_delta integer DEFAULT 0 NOT NULL,
    coin_balance_after integer,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT store_transactions_source_check CHECK ((source = ANY (ARRAY['coins'::text, 'stripe'::text]))),
    CONSTRAINT store_transactions_status_check CHECK ((status = 'completed'::text))
);


ALTER TABLE public.store_transactions OWNER TO postgres;

--
-- Name: submissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.submissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    match_id uuid,
    user_id uuid,
    code text NOT NULL,
    language text NOT NULL,
    test_results jsonb DEFAULT '[]'::jsonb,
    passed_tests integer DEFAULT 0,
    total_tests integer DEFAULT 0,
    execution_time_ms integer DEFAULT 0,
    submitted_at timestamp with time zone DEFAULT now(),
    result text DEFAULT 'unknown'::text,
    score integer DEFAULT 0,
    runtime_ms integer DEFAULT 0,
    memory_kb integer DEFAULT 0,
    is_winning_submission boolean DEFAULT false,
    failed_count integer DEFAULT 0,
    verdict text DEFAULT 'pending'::text,
    passed_count integer DEFAULT 0,
    total_count integer DEFAULT 0,
    code_hash text,
    submission_sequence integer DEFAULT 1,
    compile_log text DEFAULT ''::text,
    execution_log text DEFAULT ''::text,
    test_summary jsonb DEFAULT '{}'::jsonb NOT NULL,
    audit_metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    submission_kind text DEFAULT 'manual'::text NOT NULL,
    CONSTRAINT submissions_passed_tests_check CHECK ((passed_tests >= 0)),
    CONSTRAINT submissions_total_tests_check CHECK ((total_tests >= 0))
);


ALTER TABLE public.submissions OWNER TO postgres;

--
-- Name: messages; Type: TABLE; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE TABLE realtime.messages (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
)
PARTITION BY RANGE (inserted_at);


ALTER TABLE realtime.messages OWNER TO supabase_realtime_admin;

--
-- Name: messages_2026_03_05; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.messages_2026_03_05 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE realtime.messages_2026_03_05 OWNER TO supabase_admin;

--
-- Name: messages_2026_03_06; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.messages_2026_03_06 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE realtime.messages_2026_03_06 OWNER TO supabase_admin;

--
-- Name: messages_2026_03_07; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.messages_2026_03_07 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE realtime.messages_2026_03_07 OWNER TO supabase_admin;

--
-- Name: messages_2026_03_08; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.messages_2026_03_08 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE realtime.messages_2026_03_08 OWNER TO supabase_admin;

--
-- Name: messages_2026_03_09; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.messages_2026_03_09 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE realtime.messages_2026_03_09 OWNER TO supabase_admin;

--
-- Name: messages_2026_03_10; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.messages_2026_03_10 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE realtime.messages_2026_03_10 OWNER TO supabase_admin;

--
-- Name: messages_2026_03_11; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.messages_2026_03_11 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE realtime.messages_2026_03_11 OWNER TO supabase_admin;

--
-- Name: schema_migrations; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.schema_migrations (
    version bigint NOT NULL,
    inserted_at timestamp(0) without time zone
);


ALTER TABLE realtime.schema_migrations OWNER TO supabase_admin;

--
-- Name: subscription; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.subscription (
    id bigint NOT NULL,
    subscription_id uuid NOT NULL,
    entity regclass NOT NULL,
    filters realtime.user_defined_filter[] DEFAULT '{}'::realtime.user_defined_filter[] NOT NULL,
    claims jsonb NOT NULL,
    claims_role regrole GENERATED ALWAYS AS (realtime.to_regrole((claims ->> 'role'::text))) STORED NOT NULL,
    created_at timestamp without time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    action_filter text DEFAULT '*'::text,
    CONSTRAINT subscription_action_filter_check CHECK ((action_filter = ANY (ARRAY['*'::text, 'INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


ALTER TABLE realtime.subscription OWNER TO supabase_admin;

--
-- Name: subscription_id_seq; Type: SEQUENCE; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE realtime.subscription ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME realtime.subscription_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: buckets; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.buckets (
    id text NOT NULL,
    name text NOT NULL,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    public boolean DEFAULT false,
    avif_autodetection boolean DEFAULT false,
    file_size_limit bigint,
    allowed_mime_types text[],
    owner_id text,
    type storage.buckettype DEFAULT 'STANDARD'::storage.buckettype NOT NULL
);


ALTER TABLE storage.buckets OWNER TO supabase_storage_admin;

--
-- Name: COLUMN buckets.owner; Type: COMMENT; Schema: storage; Owner: supabase_storage_admin
--

COMMENT ON COLUMN storage.buckets.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: buckets_analytics; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.buckets_analytics (
    name text NOT NULL,
    type storage.buckettype DEFAULT 'ANALYTICS'::storage.buckettype NOT NULL,
    format text DEFAULT 'ICEBERG'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE storage.buckets_analytics OWNER TO supabase_storage_admin;

--
-- Name: buckets_vectors; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.buckets_vectors (
    id text NOT NULL,
    type storage.buckettype DEFAULT 'VECTOR'::storage.buckettype NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE storage.buckets_vectors OWNER TO supabase_storage_admin;

--
-- Name: migrations; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.migrations (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    hash character varying(40) NOT NULL,
    executed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE storage.migrations OWNER TO supabase_storage_admin;

--
-- Name: objects; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.objects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bucket_id text,
    name text,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_accessed_at timestamp with time zone DEFAULT now(),
    metadata jsonb,
    path_tokens text[] GENERATED ALWAYS AS (string_to_array(name, '/'::text)) STORED,
    version text,
    owner_id text,
    user_metadata jsonb
);


ALTER TABLE storage.objects OWNER TO supabase_storage_admin;

--
-- Name: COLUMN objects.owner; Type: COMMENT; Schema: storage; Owner: supabase_storage_admin
--

COMMENT ON COLUMN storage.objects.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: s3_multipart_uploads; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.s3_multipart_uploads (
    id text NOT NULL,
    in_progress_size bigint DEFAULT 0 NOT NULL,
    upload_signature text NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    version text NOT NULL,
    owner_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_metadata jsonb
);


ALTER TABLE storage.s3_multipart_uploads OWNER TO supabase_storage_admin;

--
-- Name: s3_multipart_uploads_parts; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.s3_multipart_uploads_parts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    upload_id text NOT NULL,
    size bigint DEFAULT 0 NOT NULL,
    part_number integer NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    etag text NOT NULL,
    owner_id text,
    version text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE storage.s3_multipart_uploads_parts OWNER TO supabase_storage_admin;

--
-- Name: vector_indexes; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.vector_indexes (
    id text DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL COLLATE pg_catalog."C",
    bucket_id text NOT NULL,
    data_type text NOT NULL,
    dimension integer NOT NULL,
    distance_metric text NOT NULL,
    metadata_configuration jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE storage.vector_indexes OWNER TO supabase_storage_admin;

--
-- Name: messages_2026_03_05; Type: TABLE ATTACH; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_03_05 FOR VALUES FROM ('2026-03-05 00:00:00') TO ('2026-03-06 00:00:00');


--
-- Name: messages_2026_03_06; Type: TABLE ATTACH; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_03_06 FOR VALUES FROM ('2026-03-06 00:00:00') TO ('2026-03-07 00:00:00');


--
-- Name: messages_2026_03_07; Type: TABLE ATTACH; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_03_07 FOR VALUES FROM ('2026-03-07 00:00:00') TO ('2026-03-08 00:00:00');


--
-- Name: messages_2026_03_08; Type: TABLE ATTACH; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_03_08 FOR VALUES FROM ('2026-03-08 00:00:00') TO ('2026-03-09 00:00:00');


--
-- Name: messages_2026_03_09; Type: TABLE ATTACH; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_03_09 FOR VALUES FROM ('2026-03-09 00:00:00') TO ('2026-03-10 00:00:00');


--
-- Name: messages_2026_03_10; Type: TABLE ATTACH; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_03_10 FOR VALUES FROM ('2026-03-10 00:00:00') TO ('2026-03-11 00:00:00');


--
-- Name: messages_2026_03_11; Type: TABLE ATTACH; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_03_11 FOR VALUES FROM ('2026-03-11 00:00:00') TO ('2026-03-12 00:00:00');


--
-- Name: refresh_tokens id; Type: DEFAULT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('auth.refresh_tokens_id_seq'::regclass);


--
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.audit_log_entries (instance_id, id, payload, created_at, ip_address) FROM stdin;
\.


--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.flow_state (id, user_id, auth_code, code_challenge_method, code_challenge, provider_type, provider_access_token, provider_refresh_token, created_at, updated_at, authentication_method, auth_code_issued_at, invite_token, referrer, oauth_client_state_id, linking_target_id, email_optional) FROM stdin;
b12f93e2-5c5f-46ae-8768-80bfa24f1d48	bee320f9-25e2-4bff-9f0e-e295dd9504a2	0625ca90-bbab-41d0-aa7f-b53516cb8e68	s256	shEthaJXYzw7r7lsFzpJJCBscUqrb1O_w2k7PqZJ5i8	email			2026-03-02 02:52:57.920616+00	2026-03-02 02:53:10.100203+00	email/signup	2026-03-02 02:53:10.100147+00	\N	\N	\N	\N	f
b303b6e4-fad3-4cc8-8812-e3549973c436	34e76391-0302-4440-a930-2dd60837f11b	7014974f-ebc3-4a85-90a1-961ceaf2fe5d	s256	HaUkTB7pi3CfnYhRb9vUQ8nius6qd2suSOYB4V8zcVw	recovery			2026-03-06 11:27:27.335432+00	2026-03-06 11:27:27.335432+00	recovery	\N	\N	\N	\N	\N	f
afdc2ecd-2c34-44e8-9dc3-4bed51917864	34e76391-0302-4440-a930-2dd60837f11b	c311e66d-3b24-418e-837f-3112ef2765cc	s256	A8wqDYViFluJWI7QaQdY-A_sExmpKm-4b7gq6u56KJ0	recovery			2026-03-06 19:12:26.315542+00	2026-03-06 19:12:26.315542+00	recovery	\N	\N	\N	\N	\N	f
f1ab0c0e-6626-4357-84b1-3385289fd431	34e76391-0302-4440-a930-2dd60837f11b	150c7798-2d3e-46d4-9ab0-304bcfa1bbc6	s256	59foHsGGWKzRGemibpg0im1nY0uoZeRQgWHtAIi9tG0	recovery			2026-03-06 19:45:27.9095+00	2026-03-06 19:45:27.9095+00	recovery	\N	\N	\N	\N	\N	f
4c0e0f99-57b9-46f3-ab8b-b8c42265f36e	34e76391-0302-4440-a930-2dd60837f11b	1a8a9d8a-545b-455f-925b-e8131464e0a1	s256	lB3kzBdE83xRLQYmEUxldwgf75x16QddBkrr_mlQlAM	recovery			2026-03-06 19:46:23.904155+00	2026-03-06 19:46:23.904155+00	recovery	\N	\N	\N	\N	\N	f
9e779211-b28d-4de6-9e2e-eb74d9c372cb	34e76391-0302-4440-a930-2dd60837f11b	124323ba-bd11-4352-8d56-787aefc0f43e	s256	EXHasHq7n1JJcSnU29zPL2tToFTvCc4S277m00JDHkc	recovery			2026-03-06 19:59:07.391309+00	2026-03-06 19:59:07.391309+00	recovery	\N	\N	\N	\N	\N	f
4826f2bc-538d-4406-9ceb-e8debe3aeedd	34e76391-0302-4440-a930-2dd60837f11b	f415f091-4130-4634-be1c-3971e8956ac6	s256	hL3QSQBIhnOS-Q50cNwlTaF6c5H0dZ0NAei_Pwf8Auk	recovery			2026-03-06 19:59:13.026147+00	2026-03-06 19:59:13.026147+00	recovery	\N	\N	\N	\N	\N	f
636a494a-6b9c-4776-a53c-ff467da370e7	34e76391-0302-4440-a930-2dd60837f11b	f38eeda7-ea91-4685-9767-b9d4c466f2d0	s256	A0XZTHgxmpa6hUoRUU1iPQ9OIfw05ejuFxXBd0vwBac	recovery			2026-03-07 14:38:31.452462+00	2026-03-07 14:38:31.452462+00	recovery	\N	\N	\N	\N	\N	f
f190f93e-f40f-43a7-ba91-8e53b449495e	34e76391-0302-4440-a930-2dd60837f11b	0c7b8025-f2a4-41c2-a836-c4fb89475619	s256	i42M9i2jNBHZ3Y3JysNYDPP7TJF7-n0CRBLBPZGDQZI	recovery			2026-03-07 14:38:38.696693+00	2026-03-07 14:38:38.696693+00	recovery	\N	\N	\N	\N	\N	f
88373bab-9378-424a-bbff-86d74fa255cf	34e76391-0302-4440-a930-2dd60837f11b	31bff6ff-7caf-4520-af95-5e08264f9540	s256	NV0DrkNmr6JrhTdVz1y5vOjVeZKf-AxgubgGIeeUxLE	recovery			2026-03-07 14:39:08.873553+00	2026-03-07 14:39:08.873553+00	recovery	\N	\N	\N	\N	\N	f
22923ad3-0608-4021-a613-1ef56a4b2366	34e76391-0302-4440-a930-2dd60837f11b	74f27498-1023-48a5-ab29-a3e2397aa436	s256	Kxgct4J2qwHtfMPDldbo_gf_Ktg7fm2-JWwCNYPZr9k	recovery			2026-03-07 14:40:37.269578+00	2026-03-07 14:40:37.269578+00	recovery	\N	\N	\N	\N	\N	f
d0ba433f-368b-4a50-bfc7-f430b0e73b97	34e76391-0302-4440-a930-2dd60837f11b	a03df848-debc-4007-b545-7c92d4ec8eac	s256	zJdu2JDxSAiLCDY27AX_ufjzEl11WKLiHihTeQo9gdg	recovery			2026-03-07 14:40:43.807094+00	2026-03-07 14:40:43.807094+00	recovery	\N	\N	\N	\N	\N	f
09f43449-0f89-4f1c-be46-10b4c1e25ad2	34e76391-0302-4440-a930-2dd60837f11b	a4daa195-bdff-4f00-a7f6-7ec59526e6c6	s256	Pf0kRF-Rr_c7Q988ksP6wtWYTZvuvWwEUlUnhgVHxFg	recovery			2026-03-07 14:44:12.931645+00	2026-03-07 14:44:12.931645+00	recovery	\N	\N	\N	\N	\N	f
923b3b3d-0459-44b0-95de-0aae6f64ffac	34e76391-0302-4440-a930-2dd60837f11b	50552f21-67c0-4b4e-948c-8f98184d6c6b	s256	mntv5ohQySCS91hn2GLAECSfj8AVD0fztI0KeHz0aSc	recovery			2026-03-07 14:45:13.31865+00	2026-03-07 14:45:13.31865+00	recovery	\N	\N	\N	\N	\N	f
7b547471-4570-46c4-af47-4f0c86b7570e	34e76391-0302-4440-a930-2dd60837f11b	8090a926-919c-493e-a53f-8e4ec7d40bac	s256	roCQtPs8UD3QJfptLfJLt7CJh1iEcVpNtbFqbdAQReY	recovery			2026-03-07 14:45:25.227175+00	2026-03-07 14:45:25.227175+00	recovery	\N	\N	\N	\N	\N	f
97c0d46b-8705-4f8b-a29d-f99914d07680	34e76391-0302-4440-a930-2dd60837f11b	bd285d39-cd5d-47e5-8a66-54aeb46f520d	s256	3daTp5FxFJLvpwhdXqZmfZfAEvC20beZGr1H0XniLJc	recovery			2026-03-07 15:11:08.863266+00	2026-03-07 15:11:08.863266+00	recovery	\N	\N	\N	\N	\N	f
7c9305b3-82ea-4096-ad0e-edd986218a23	34e76391-0302-4440-a930-2dd60837f11b	4e03e485-e26a-4a1e-bc06-6c312f8411da	s256	m83eVdGZBddFqNFtG_tWeKMP4tswD4IYAazxY1-S2gY	recovery			2026-03-07 15:27:58.848848+00	2026-03-07 15:27:58.848848+00	recovery	\N	\N	\N	\N	\N	f
6cba4f13-febd-4c5b-8166-242e7c79bf63	4cf297da-2a0a-4bfc-87b1-388ef7528570	fefc96ce-21bc-4b0f-b2ed-e184a8b8d130	s256	Dw2m4GB56INQFzYi5Wc-6Us00srm-SDbpuu5dqrQp1E	email			2026-03-07 15:34:05.997107+00	2026-03-07 15:34:05.997107+00	email/signup	\N	\N	\N	\N	\N	f
e077f368-7ac5-47b3-8a10-1a2294a91859	7c343925-d7e2-46ba-8ebb-c88417d49f82	207467b9-cf1f-430d-8ef0-cdd484193f4f	s256	tigW7ts1npFB9Wlb9C29lcpqmMYl3tfNyKXnzz54WpE	recovery			2026-03-07 15:55:01.063311+00	2026-03-07 15:55:01.063311+00	recovery	\N	\N	\N	\N	\N	f
682f0a2b-439f-449f-b928-73c466f9f012	7c343925-d7e2-46ba-8ebb-c88417d49f82	036de971-5fd2-4977-b003-d8ab041b1c5e	s256	kbFfxoZweP_Uua0_SWDEtzDu-XCkhqLIUGwWSOHXP4U	recovery			2026-03-07 15:55:36.834292+00	2026-03-07 15:57:57.013721+00	recovery	2026-03-07 15:57:57.013665+00	\N	\N	\N	\N	f
\.


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, id) FROM stdin;
34e76391-0302-4440-a930-2dd60837f11b	34e76391-0302-4440-a930-2dd60837f11b	{"sub": "34e76391-0302-4440-a930-2dd60837f11b", "name": "adam", "email": "nasoosadamopoylos@gmail.com", "username": "adam", "full_name": "adam", "display_name": "adam", "email_verified": true, "phone_verified": false}	email	2026-02-28 15:12:33.653754+00	2026-02-28 15:12:33.653809+00	2026-02-28 15:12:33.653809+00	7e2b49b9-7763-4b3b-a61a-2823f9b8ee67
bee320f9-25e2-4bff-9f0e-e295dd9504a2	bee320f9-25e2-4bff-9f0e-e295dd9504a2	{"sub": "bee320f9-25e2-4bff-9f0e-e295dd9504a2", "name": "nasosadamop", "email": "nasosadamopoylos@gmail.com", "username": "nasosadamop", "full_name": "nasosadamop", "display_name": "nasosadamop", "email_verified": true, "phone_verified": false}	email	2026-03-02 02:52:57.909924+00	2026-03-02 02:52:57.909976+00	2026-03-02 02:52:57.909976+00	4bef1476-64e5-42e7-8c22-b3ab2cd44599
0e0085f4-1207-4e7b-815d-a5a58183a9ce	0e0085f4-1207-4e7b-815d-a5a58183a9ce	{"sub": "0e0085f4-1207-4e7b-815d-a5a58183a9ce", "name": "nasosadams", "email": "mpeliskoshbas@gmail.com", "username": "nasosadams", "full_name": "nasosadams", "display_name": "nasosadams", "email_verified": true, "phone_verified": false}	email	2026-03-06 01:44:30.791565+00	2026-03-06 01:44:30.791631+00	2026-03-06 01:44:30.791631+00	d1480be4-8ecb-4b86-9609-3f756b2219a8
7c343925-d7e2-46ba-8ebb-c88417d49f82	7c343925-d7e2-46ba-8ebb-c88417d49f82	{"sub": "7c343925-d7e2-46ba-8ebb-c88417d49f82", "name": "codhak", "email": "codhakapp@gmail.com", "username": "codhak", "full_name": "codhak", "display_name": "codhak", "email_verified": true, "phone_verified": false}	email	2026-03-07 15:53:49.29308+00	2026-03-07 15:53:49.293151+00	2026-03-07 15:53:49.293151+00	d9fd8ba7-38ae-4f64-a6f0-d21c8e205f46
\.


--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.instances (id, uuid, raw_base_config, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.mfa_amr_claims (session_id, created_at, updated_at, authentication_method, id) FROM stdin;
2889fc76-4daa-474a-8eaf-d1149c72cf4f	2026-03-06 00:45:52.343877+00	2026-03-06 00:45:52.343877+00	password	39d4b42d-1c0e-4a77-93d0-90993c71bb5b
a02cda3d-90c3-41a5-a66d-599607c345ef	2026-03-06 01:06:34.054869+00	2026-03-06 01:06:34.054869+00	password	8ded4cbe-aa33-410b-9288-aac25aa20abd
f1d914a3-fc35-4f1f-883f-3f49243be34a	2026-03-06 01:06:40.159345+00	2026-03-06 01:06:40.159345+00	password	9f3618a5-bbf0-40c2-93f3-f271815130ea
14821a98-8b31-41f2-a91d-fc2ddd355cbc	2026-03-06 01:07:05.875676+00	2026-03-06 01:07:05.875676+00	password	9ebc5939-ead8-473e-9ac3-08f047dab9ae
747af788-07be-476e-909b-5f4f1a657eb2	2026-03-06 01:10:36.955588+00	2026-03-06 01:10:36.955588+00	password	36ea6c7a-4907-48aa-b535-69ab164767bf
60d712a6-e14a-49df-98cc-10b682c805c2	2026-03-06 01:13:43.537561+00	2026-03-06 01:13:43.537561+00	password	c629f8c2-4a50-4ef9-8ab2-c860ac568685
ae806f7c-8d14-4588-a02c-f2dca17e4abc	2026-03-06 01:13:50.081701+00	2026-03-06 01:13:50.081701+00	password	4d298309-1009-46dd-af30-777795a8a5c3
70cafe06-7a64-4812-9ce9-2f6629ebabb0	2026-03-06 01:15:41.144246+00	2026-03-06 01:15:41.144246+00	password	aad0ebf5-3895-422b-aa62-7669fc7065c8
7b0e403b-9ad5-4b99-99a0-b9fe020a808d	2026-03-06 01:26:03.077743+00	2026-03-06 01:26:03.077743+00	password	dbe0c4ce-3b15-4531-a6d0-7a639894bc3d
9420a16d-083c-4982-bc99-460c9b12739d	2026-03-06 01:38:19.878692+00	2026-03-06 01:38:19.878692+00	password	d6862e28-3e77-48d5-a3d0-17a086621d52
9da1e962-51da-4c06-8511-212209eed732	2026-03-06 01:45:31.600575+00	2026-03-06 01:45:31.600575+00	email/signup	22b5f9db-033c-4932-9154-321403e1c06a
9669d941-b9ee-493c-a84c-78184c57c147	2026-03-06 01:46:26.016933+00	2026-03-06 01:46:26.016933+00	password	1208879a-bcb6-4a64-aadd-06148fe3f392
67f61d2f-7c08-4c1e-bb54-b24c95c083cc	2026-03-06 11:51:53.149166+00	2026-03-06 11:51:53.149166+00	password	26cb9d67-7ef9-4b6f-be48-256d7ebe9ea5
4c242684-a4e0-472d-8dd1-3594215780d8	2026-03-06 13:31:58.58509+00	2026-03-06 13:31:58.58509+00	password	2c63ed43-99e6-4c9b-8cde-16e83623b51e
d753a5e3-5f3e-4a25-8333-fb4a57e7019a	2026-03-06 17:47:26.536711+00	2026-03-06 17:47:26.536711+00	password	bcfde0ac-af42-4037-84ed-03a25b25e51f
e4271c84-ac76-4791-9572-f61660db4c6f	2026-03-06 18:02:24.579974+00	2026-03-06 18:02:24.579974+00	password	c43c7401-6f0b-4c75-9d08-aa95e8c77cfd
abefed42-12b9-4189-8ff5-ac0518f6bafc	2026-03-06 18:02:58.171957+00	2026-03-06 18:02:58.171957+00	password	fb0e6734-fade-406b-b047-a533b876aadc
b809bf99-7908-4f7e-b40d-9cec21bf46a9	2026-03-06 18:11:06.382562+00	2026-03-06 18:11:06.382562+00	password	7d7dccf3-7154-4c56-b3cc-0fb3d8bd61f2
b2cd1d88-269b-4a1a-bb4f-f340833648da	2026-03-06 18:31:13.604623+00	2026-03-06 18:31:13.604623+00	password	17a25e87-e0fe-4d2c-aeb8-df8438708288
e07e72d0-1b72-4f26-a193-d9ccf0104e5b	2026-03-06 18:38:55.131415+00	2026-03-06 18:38:55.131415+00	password	b8a81f45-ffbf-4b5d-b5f7-528bb4d51b86
cfbd67a7-cb5b-4685-943a-007db6c2678b	2026-03-06 18:39:08.511936+00	2026-03-06 18:39:08.511936+00	password	1df5359d-7dbb-46a3-a239-bbc16df05830
81acb721-a797-420d-ac19-2b9550feee08	2026-03-06 18:39:21.452406+00	2026-03-06 18:39:21.452406+00	password	660ff242-29a0-4cee-bb4e-0169870fcefb
db06dc56-c988-417b-9d4c-c94fdfab3f17	2026-03-06 18:40:29.552931+00	2026-03-06 18:40:29.552931+00	password	dcfdfce0-270a-47a0-a3d4-f66a9fa8354c
d89d0638-1611-4003-a47b-e4da5b3d83f6	2026-03-06 19:35:25.215887+00	2026-03-06 19:35:25.215887+00	recovery	858efe86-881e-44fb-a495-b1e593900e8e
65d4dea9-7b7f-4615-92fb-0fc74e449bf5	2026-03-06 19:39:35.423218+00	2026-03-06 19:39:35.423218+00	password	804312c2-3d89-4adc-a71d-0591e8bea1fc
07891ae9-c9cf-49c9-bbe3-b93161d2888a	2026-03-07 14:46:17.223112+00	2026-03-07 14:46:17.223112+00	password	466f42f7-1dba-44aa-83fa-0938f16fcf46
1e568276-6629-4161-856e-7b584dd110b8	2026-03-07 14:46:33.732018+00	2026-03-07 14:46:33.732018+00	password	7e143ddf-a64e-4419-85f4-c87a3c58e70c
1065b3e1-cfe0-43bd-a7e9-01ace7ae7cb2	2026-03-07 15:54:00.952619+00	2026-03-07 15:54:00.952619+00	email/signup	03368610-957b-463f-aaf3-eb1381390044
4d84fd1e-d68c-4e7b-bbc0-90e7eacf73f9	2026-03-07 15:58:45.443127+00	2026-03-07 15:58:45.443127+00	password	c644e012-5e17-4492-80b5-fb1a33be528a
9c9dd891-bf59-4264-a9ff-b3a7566dcc88	2026-03-07 15:59:03.026471+00	2026-03-07 15:59:03.026471+00	password	9812b86f-7748-459e-aac6-ceb53c38bdb5
6ac55cef-7daa-48f6-a100-0196bca0b516	2026-03-07 16:37:42.134696+00	2026-03-07 16:37:42.134696+00	password	e756fce7-f350-43b8-8fdc-a9965ff6e2a7
949bb796-6929-4efe-950f-6db7640f1fe8	2026-03-07 16:41:25.730018+00	2026-03-07 16:41:25.730018+00	password	a7cd494d-42f5-4b89-b099-827e42829f48
2d8a5877-45cd-49ad-9c72-5d74b7507826	2026-03-07 16:42:14.006188+00	2026-03-07 16:42:14.006188+00	password	ae78f1df-a8c0-4625-9b17-8de8bcd3489c
53dc5d52-7fc2-4acd-a2b3-13251897a378	2026-03-07 17:20:51.977998+00	2026-03-07 17:20:51.977998+00	password	9257f338-db6e-4175-b697-5adef70203cc
6cc32db1-883a-4ebf-8325-d1f589e8a272	2026-03-07 17:47:14.637974+00	2026-03-07 17:47:14.637974+00	password	62175717-239b-44e0-82aa-4ce32ce895fd
dacd897d-3eb3-4c9d-a032-ca79ab82a1e1	2026-03-08 19:11:55.547815+00	2026-03-08 19:11:55.547815+00	password	9a9c6d0c-ac44-47d0-812c-0286591c6633
\.


--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.mfa_challenges (id, factor_id, created_at, verified_at, ip_address, otp_code, web_authn_session_data) FROM stdin;
\.


--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at, secret, phone, last_challenged_at, web_authn_credential, web_authn_aaguid, last_webauthn_challenge_data) FROM stdin;
\.


--
-- Data for Name: oauth_authorizations; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.oauth_authorizations (id, authorization_id, client_id, user_id, redirect_uri, scope, state, resource, code_challenge, code_challenge_method, response_type, status, authorization_code, created_at, expires_at, approved_at, nonce) FROM stdin;
\.


--
-- Data for Name: oauth_client_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.oauth_client_states (id, provider_type, code_verifier, created_at) FROM stdin;
\.


--
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.oauth_clients (id, client_secret_hash, registration_type, redirect_uris, grant_types, client_name, client_uri, logo_uri, created_at, updated_at, deleted_at, client_type, token_endpoint_auth_method) FROM stdin;
\.


--
-- Data for Name: oauth_consents; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.oauth_consents (id, user_id, client_id, scopes, granted_at, revoked_at) FROM stdin;
\.


--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.one_time_tokens (id, user_id, token_type, token_hash, relates_to, created_at, updated_at) FROM stdin;
f33bff01-4bf0-408c-9f6b-384a22f659ec	34e76391-0302-4440-a930-2dd60837f11b	recovery_token	pkce_78cd15d6f6e53dbe1e60b2309f06d9c217f8d30a8e53ce807494dee6	nasoosadamopoylos@gmail.com	2026-03-06 19:12:27.041657	2026-03-06 19:12:27.041657
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.refresh_tokens (instance_id, id, token, user_id, revoked, created_at, updated_at, parent, session_id) FROM stdin;
00000000-0000-0000-0000-000000000000	112	dogoozxcd7io	0e0085f4-1207-4e7b-815d-a5a58183a9ce	f	2026-03-06 13:31:58.554948+00	2026-03-06 13:31:58.554948+00	\N	4c242684-a4e0-472d-8dd1-3594215780d8
00000000-0000-0000-0000-000000000000	111	jwias5a7n2jq	bee320f9-25e2-4bff-9f0e-e295dd9504a2	t	2026-03-06 12:50:47.813885+00	2026-03-06 13:53:39.567419+00	bvzvwkqomj6i	67f61d2f-7c08-4c1e-bb54-b24c95c083cc
00000000-0000-0000-0000-000000000000	114	dea2t3xijnqd	bee320f9-25e2-4bff-9f0e-e295dd9504a2	f	2026-03-06 17:40:36.609173+00	2026-03-06 17:40:36.609173+00	4g7auiblp57y	67f61d2f-7c08-4c1e-bb54-b24c95c083cc
00000000-0000-0000-0000-000000000000	116	ri5ynhvjsbdc	bee320f9-25e2-4bff-9f0e-e295dd9504a2	f	2026-03-06 18:02:24.565038+00	2026-03-06 18:02:24.565038+00	\N	e4271c84-ac76-4791-9572-f61660db4c6f
00000000-0000-0000-0000-000000000000	117	3cejhpsxwhm5	34e76391-0302-4440-a930-2dd60837f11b	f	2026-03-06 18:02:58.167876+00	2026-03-06 18:02:58.167876+00	\N	abefed42-12b9-4189-8ff5-ac0518f6bafc
00000000-0000-0000-0000-000000000000	119	xnmbmwl34civ	0e0085f4-1207-4e7b-815d-a5a58183a9ce	f	2026-03-06 18:31:13.578218+00	2026-03-06 18:31:13.578218+00	\N	b2cd1d88-269b-4a1a-bb4f-f340833648da
00000000-0000-0000-0000-000000000000	124	s2dv6xmqlkto	bee320f9-25e2-4bff-9f0e-e295dd9504a2	f	2026-03-06 19:35:25.187645+00	2026-03-06 19:35:25.187645+00	\N	d89d0638-1611-4003-a47b-e4da5b3d83f6
00000000-0000-0000-0000-000000000000	126	d6lpowevyjpv	0e0085f4-1207-4e7b-815d-a5a58183a9ce	f	2026-03-06 19:43:52.264794+00	2026-03-06 19:43:52.264794+00	qkkxttqjsxts	cfbd67a7-cb5b-4685-943a-007db6c2678b
00000000-0000-0000-0000-000000000000	128	gy5uisrxsnzw	34e76391-0302-4440-a930-2dd60837f11b	f	2026-03-07 14:46:17.206961+00	2026-03-07 14:46:17.206961+00	\N	07891ae9-c9cf-49c9-bbe3-b93161d2888a
00000000-0000-0000-0000-000000000000	129	hldrwqef3sb4	0e0085f4-1207-4e7b-815d-a5a58183a9ce	t	2026-03-07 14:46:33.730767+00	2026-03-07 15:44:52.618553+00	\N	1e568276-6629-4161-856e-7b584dd110b8
00000000-0000-0000-0000-000000000000	134	xkz7nb3hoc5q	7c343925-d7e2-46ba-8ebb-c88417d49f82	f	2026-03-07 15:54:00.944984+00	2026-03-07 15:54:00.944984+00	\N	1065b3e1-cfe0-43bd-a7e9-01ace7ae7cb2
00000000-0000-0000-0000-000000000000	137	yfatsqgadhy3	34e76391-0302-4440-a930-2dd60837f11b	f	2026-03-07 16:37:42.100348+00	2026-03-07 16:37:42.100348+00	\N	6ac55cef-7daa-48f6-a100-0196bca0b516
00000000-0000-0000-0000-000000000000	140	oms3zupt4b5n	34e76391-0302-4440-a930-2dd60837f11b	f	2026-03-07 17:20:51.958851+00	2026-03-07 17:20:51.958851+00	\N	53dc5d52-7fc2-4acd-a2b3-13251897a378
00000000-0000-0000-0000-000000000000	97	7mrgye4xlees	34e76391-0302-4440-a930-2dd60837f11b	f	2026-03-06 00:45:52.312972+00	2026-03-06 00:45:52.312972+00	\N	2889fc76-4daa-474a-8eaf-d1149c72cf4f
00000000-0000-0000-0000-000000000000	101	zf45jqr7hgoe	34e76391-0302-4440-a930-2dd60837f11b	f	2026-03-06 01:10:36.953487+00	2026-03-06 01:10:36.953487+00	\N	747af788-07be-476e-909b-5f4f1a657eb2
00000000-0000-0000-0000-000000000000	104	snscduqrr3jb	34e76391-0302-4440-a930-2dd60837f11b	f	2026-03-06 01:15:41.142105+00	2026-03-06 01:15:41.142105+00	\N	70cafe06-7a64-4812-9ce9-2f6629ebabb0
00000000-0000-0000-0000-000000000000	106	m4wmeojxiqdm	34e76391-0302-4440-a930-2dd60837f11b	f	2026-03-06 01:38:19.850224+00	2026-03-06 01:38:19.850224+00	\N	9420a16d-083c-4982-bc99-460c9b12739d
00000000-0000-0000-0000-000000000000	109	lqwflzbwct3y	34e76391-0302-4440-a930-2dd60837f11b	f	2026-03-06 11:12:41.025474+00	2026-03-06 11:12:41.025474+00	irnyj64fj2b3	9669d941-b9ee-493c-a84c-78184c57c147
00000000-0000-0000-0000-000000000000	142	rmw32fco2exn	bee320f9-25e2-4bff-9f0e-e295dd9504a2	t	2026-03-07 19:23:03.705251+00	2026-03-08 00:52:05.738303+00	qlgl46gsmdfm	6cc32db1-883a-4ebf-8325-d1f589e8a272
00000000-0000-0000-0000-000000000000	144	4zvky7i2ffi3	34e76391-0302-4440-a930-2dd60837f11b	f	2026-03-08 19:11:38.604054+00	2026-03-08 19:11:38.604054+00	q7xnxsheklxy	949bb796-6929-4efe-950f-6db7640f1fe8
00000000-0000-0000-0000-000000000000	145	tdq5yiu6jjel	0e0085f4-1207-4e7b-815d-a5a58183a9ce	f	2026-03-08 19:11:55.544982+00	2026-03-08 19:11:55.544982+00	\N	dacd897d-3eb3-4c9d-a032-ca79ab82a1e1
00000000-0000-0000-0000-000000000000	113	4g7auiblp57y	bee320f9-25e2-4bff-9f0e-e295dd9504a2	t	2026-03-06 13:53:39.589221+00	2026-03-06 17:40:36.589665+00	jwias5a7n2jq	67f61d2f-7c08-4c1e-bb54-b24c95c083cc
00000000-0000-0000-0000-000000000000	115	4yigmesv6jr7	0e0085f4-1207-4e7b-815d-a5a58183a9ce	f	2026-03-06 17:47:26.518999+00	2026-03-06 17:47:26.518999+00	\N	d753a5e3-5f3e-4a25-8333-fb4a57e7019a
00000000-0000-0000-0000-000000000000	118	y3fw53j74cy2	0e0085f4-1207-4e7b-815d-a5a58183a9ce	f	2026-03-06 18:11:06.348563+00	2026-03-06 18:11:06.348563+00	\N	b809bf99-7908-4f7e-b40d-9cec21bf46a9
00000000-0000-0000-0000-000000000000	120	i4wfygjmshfb	34e76391-0302-4440-a930-2dd60837f11b	f	2026-03-06 18:38:55.111493+00	2026-03-06 18:38:55.111493+00	\N	e07e72d0-1b72-4f26-a193-d9ccf0104e5b
00000000-0000-0000-0000-000000000000	122	o6xisdrnmlno	34e76391-0302-4440-a930-2dd60837f11b	f	2026-03-06 18:39:21.451245+00	2026-03-06 18:39:21.451245+00	\N	81acb721-a797-420d-ac19-2b9550feee08
00000000-0000-0000-0000-000000000000	123	guqldu5jq7zt	34e76391-0302-4440-a930-2dd60837f11b	f	2026-03-06 18:40:29.529344+00	2026-03-06 18:40:29.529344+00	\N	db06dc56-c988-417b-9d4c-c94fdfab3f17
00000000-0000-0000-0000-000000000000	121	qkkxttqjsxts	0e0085f4-1207-4e7b-815d-a5a58183a9ce	t	2026-03-06 18:39:08.51067+00	2026-03-06 19:43:52.255116+00	\N	cfbd67a7-cb5b-4685-943a-007db6c2678b
00000000-0000-0000-0000-000000000000	125	len4iushergt	34e76391-0302-4440-a930-2dd60837f11b	t	2026-03-06 19:39:35.416543+00	2026-03-07 14:38:05.971579+00	\N	65d4dea9-7b7f-4615-92fb-0fc74e449bf5
00000000-0000-0000-0000-000000000000	127	tnwoo4pv74qt	34e76391-0302-4440-a930-2dd60837f11b	f	2026-03-07 14:38:05.983447+00	2026-03-07 14:38:05.983447+00	len4iushergt	65d4dea9-7b7f-4615-92fb-0fc74e449bf5
00000000-0000-0000-0000-000000000000	133	agmxoty73kkr	0e0085f4-1207-4e7b-815d-a5a58183a9ce	f	2026-03-07 15:44:52.622572+00	2026-03-07 15:44:52.622572+00	hldrwqef3sb4	1e568276-6629-4161-856e-7b584dd110b8
00000000-0000-0000-0000-000000000000	135	g24tm5f5cn2g	7c343925-d7e2-46ba-8ebb-c88417d49f82	f	2026-03-07 15:58:45.439151+00	2026-03-07 15:58:45.439151+00	\N	4d84fd1e-d68c-4e7b-bbc0-90e7eacf73f9
00000000-0000-0000-0000-000000000000	136	j5s46qtj7k3h	0e0085f4-1207-4e7b-815d-a5a58183a9ce	f	2026-03-07 15:59:03.025193+00	2026-03-07 15:59:03.025193+00	\N	9c9dd891-bf59-4264-a9ff-b3a7566dcc88
00000000-0000-0000-0000-000000000000	139	rjo4fnsq3e4n	bee320f9-25e2-4bff-9f0e-e295dd9504a2	f	2026-03-07 16:42:14.003404+00	2026-03-07 16:42:14.003404+00	\N	2d8a5877-45cd-49ad-9c72-5d74b7507826
00000000-0000-0000-0000-000000000000	141	qlgl46gsmdfm	bee320f9-25e2-4bff-9f0e-e295dd9504a2	t	2026-03-07 17:47:14.618845+00	2026-03-07 19:23:03.676563+00	\N	6cc32db1-883a-4ebf-8325-d1f589e8a272
00000000-0000-0000-0000-000000000000	143	ivusyyud55dc	bee320f9-25e2-4bff-9f0e-e295dd9504a2	f	2026-03-08 00:52:05.752877+00	2026-03-08 00:52:05.752877+00	rmw32fco2exn	6cc32db1-883a-4ebf-8325-d1f589e8a272
00000000-0000-0000-0000-000000000000	98	vp2grzk2es2s	34e76391-0302-4440-a930-2dd60837f11b	f	2026-03-06 01:06:34.039342+00	2026-03-06 01:06:34.039342+00	\N	a02cda3d-90c3-41a5-a66d-599607c345ef
00000000-0000-0000-0000-000000000000	99	bz5s47zi26sr	34e76391-0302-4440-a930-2dd60837f11b	f	2026-03-06 01:06:40.156888+00	2026-03-06 01:06:40.156888+00	\N	f1d914a3-fc35-4f1f-883f-3f49243be34a
00000000-0000-0000-0000-000000000000	100	356u7qpc4zt5	34e76391-0302-4440-a930-2dd60837f11b	f	2026-03-06 01:07:05.873796+00	2026-03-06 01:07:05.873796+00	\N	14821a98-8b31-41f2-a91d-fc2ddd355cbc
00000000-0000-0000-0000-000000000000	102	tb3s4tqpvx4e	34e76391-0302-4440-a930-2dd60837f11b	f	2026-03-06 01:13:43.530162+00	2026-03-06 01:13:43.530162+00	\N	60d712a6-e14a-49df-98cc-10b682c805c2
00000000-0000-0000-0000-000000000000	103	3ccjjyg3y5o3	34e76391-0302-4440-a930-2dd60837f11b	f	2026-03-06 01:13:50.079282+00	2026-03-06 01:13:50.079282+00	\N	ae806f7c-8d14-4588-a02c-f2dca17e4abc
00000000-0000-0000-0000-000000000000	105	qhezb6i5kxgm	34e76391-0302-4440-a930-2dd60837f11b	f	2026-03-06 01:26:03.053166+00	2026-03-06 01:26:03.053166+00	\N	7b0e403b-9ad5-4b99-99a0-b9fe020a808d
00000000-0000-0000-0000-000000000000	107	kjloq72tmliv	0e0085f4-1207-4e7b-815d-a5a58183a9ce	f	2026-03-06 01:45:31.580212+00	2026-03-06 01:45:31.580212+00	\N	9da1e962-51da-4c06-8511-212209eed732
00000000-0000-0000-0000-000000000000	138	q7xnxsheklxy	34e76391-0302-4440-a930-2dd60837f11b	t	2026-03-07 16:41:25.66903+00	2026-03-08 19:11:38.574254+00	\N	949bb796-6929-4efe-950f-6db7640f1fe8
00000000-0000-0000-0000-000000000000	108	irnyj64fj2b3	34e76391-0302-4440-a930-2dd60837f11b	t	2026-03-06 01:46:26.015719+00	2026-03-06 11:12:40.995283+00	\N	9669d941-b9ee-493c-a84c-78184c57c147
00000000-0000-0000-0000-000000000000	110	bvzvwkqomj6i	bee320f9-25e2-4bff-9f0e-e295dd9504a2	t	2026-03-06 11:51:53.132194+00	2026-03-06 12:50:47.788668+00	\N	67f61d2f-7c08-4c1e-bb54-b24c95c083cc
\.


--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.saml_providers (id, sso_provider_id, entity_id, metadata_xml, metadata_url, attribute_mapping, created_at, updated_at, name_id_format) FROM stdin;
\.


--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.saml_relay_states (id, sso_provider_id, request_id, for_email, redirect_to, created_at, updated_at, flow_state_id) FROM stdin;
\.


--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.schema_migrations (version) FROM stdin;
20171026211738
20171026211808
20171026211834
20180103212743
20180108183307
20180119214651
20180125194653
00
20210710035447
20210722035447
20210730183235
20210909172000
20210927181326
20211122151130
20211124214934
20211202183645
20220114185221
20220114185340
20220224000811
20220323170000
20220429102000
20220531120530
20220614074223
20220811173540
20221003041349
20221003041400
20221011041400
20221020193600
20221021073300
20221021082433
20221027105023
20221114143122
20221114143410
20221125140132
20221208132122
20221215195500
20221215195800
20221215195900
20230116124310
20230116124412
20230131181311
20230322519590
20230402418590
20230411005111
20230508135423
20230523124323
20230818113222
20230914180801
20231027141322
20231114161723
20231117164230
20240115144230
20240214120130
20240306115329
20240314092811
20240427152123
20240612123726
20240729123726
20240802193726
20240806073726
20241009103726
20250717082212
20250731150234
20250804100000
20250901200500
20250903112500
20250904133000
20250925093508
20251007112900
20251104100000
20251111201300
20251201000000
20260115000000
20260121000000
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.sessions (id, user_id, created_at, updated_at, factor_id, aal, not_after, refreshed_at, user_agent, ip, tag, oauth_client_id, refresh_token_hmac_key, refresh_token_counter, scopes) FROM stdin;
2d8a5877-45cd-49ad-9c72-5d74b7507826	bee320f9-25e2-4bff-9f0e-e295dd9504a2	2026-03-07 16:42:14.002323+00	2026-03-07 16:42:14.002323+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	109.242.232.106	\N	\N	\N	\N	\N
2889fc76-4daa-474a-8eaf-d1149c72cf4f	34e76391-0302-4440-a930-2dd60837f11b	2026-03-06 00:45:52.276136+00	2026-03-06 00:45:52.276136+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	109.242.91.65	\N	\N	\N	\N	\N
747af788-07be-476e-909b-5f4f1a657eb2	34e76391-0302-4440-a930-2dd60837f11b	2026-03-06 01:10:36.951028+00	2026-03-06 01:10:36.951028+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	109.242.91.65	\N	\N	\N	\N	\N
70cafe06-7a64-4812-9ce9-2f6629ebabb0	34e76391-0302-4440-a930-2dd60837f11b	2026-03-06 01:15:41.139694+00	2026-03-06 01:15:41.139694+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	109.242.91.65	\N	\N	\N	\N	\N
9420a16d-083c-4982-bc99-460c9b12739d	34e76391-0302-4440-a930-2dd60837f11b	2026-03-06 01:38:19.822474+00	2026-03-06 01:38:19.822474+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	188.73.233.18	\N	\N	\N	\N	\N
67f61d2f-7c08-4c1e-bb54-b24c95c083cc	bee320f9-25e2-4bff-9f0e-e295dd9504a2	2026-03-06 11:51:53.112433+00	2026-03-06 17:40:36.64758+00	\N	aal1	\N	2026-03-06 17:40:36.647456	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	188.73.233.18	\N	\N	\N	\N	\N
d753a5e3-5f3e-4a25-8333-fb4a57e7019a	0e0085f4-1207-4e7b-815d-a5a58183a9ce	2026-03-06 17:47:26.50748+00	2026-03-06 17:47:26.50748+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	188.73.233.18	\N	\N	\N	\N	\N
b809bf99-7908-4f7e-b40d-9cec21bf46a9	0e0085f4-1207-4e7b-815d-a5a58183a9ce	2026-03-06 18:11:06.309269+00	2026-03-06 18:11:06.309269+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	188.73.233.18	\N	\N	\N	\N	\N
e07e72d0-1b72-4f26-a193-d9ccf0104e5b	34e76391-0302-4440-a930-2dd60837f11b	2026-03-06 18:38:55.09116+00	2026-03-06 18:38:55.09116+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	188.73.233.18	\N	\N	\N	\N	\N
81acb721-a797-420d-ac19-2b9550feee08	34e76391-0302-4440-a930-2dd60837f11b	2026-03-06 18:39:21.450029+00	2026-03-06 18:39:21.450029+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	188.73.233.18	\N	\N	\N	\N	\N
db06dc56-c988-417b-9d4c-c94fdfab3f17	34e76391-0302-4440-a930-2dd60837f11b	2026-03-06 18:40:29.488242+00	2026-03-06 18:40:29.488242+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	188.73.233.18	\N	\N	\N	\N	\N
cfbd67a7-cb5b-4685-943a-007db6c2678b	0e0085f4-1207-4e7b-815d-a5a58183a9ce	2026-03-06 18:39:08.508705+00	2026-03-06 19:43:52.276655+00	\N	aal1	\N	2026-03-06 19:43:52.276562	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	188.73.233.18	\N	\N	\N	\N	\N
65d4dea9-7b7f-4615-92fb-0fc74e449bf5	34e76391-0302-4440-a930-2dd60837f11b	2026-03-06 19:39:35.404404+00	2026-03-07 14:38:06.010645+00	\N	aal1	\N	2026-03-07 14:38:06.008771	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	188.73.232.42	\N	\N	\N	\N	\N
4d84fd1e-d68c-4e7b-bbc0-90e7eacf73f9	7c343925-d7e2-46ba-8ebb-c88417d49f82	2026-03-07 15:58:45.435425+00	2026-03-07 15:58:45.435425+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	188.73.232.42	\N	\N	\N	\N	\N
9c9dd891-bf59-4264-a9ff-b3a7566dcc88	0e0085f4-1207-4e7b-815d-a5a58183a9ce	2026-03-07 15:59:03.024217+00	2026-03-07 15:59:03.024217+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	109.242.232.106	\N	\N	\N	\N	\N
6cc32db1-883a-4ebf-8325-d1f589e8a272	bee320f9-25e2-4bff-9f0e-e295dd9504a2	2026-03-07 17:47:14.59965+00	2026-03-08 00:52:05.937442+00	\N	aal1	\N	2026-03-08 00:52:05.93674	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	188.73.232.42	\N	\N	\N	\N	\N
949bb796-6929-4efe-950f-6db7640f1fe8	34e76391-0302-4440-a930-2dd60837f11b	2026-03-07 16:41:25.603477+00	2026-03-08 19:11:38.6522+00	\N	aal1	\N	2026-03-08 19:11:38.652088	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	109.242.91.120	\N	\N	\N	\N	\N
a02cda3d-90c3-41a5-a66d-599607c345ef	34e76391-0302-4440-a930-2dd60837f11b	2026-03-06 01:06:34.017264+00	2026-03-06 01:06:34.017264+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	109.242.91.65	\N	\N	\N	\N	\N
f1d914a3-fc35-4f1f-883f-3f49243be34a	34e76391-0302-4440-a930-2dd60837f11b	2026-03-06 01:06:40.153587+00	2026-03-06 01:06:40.153587+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	109.242.91.65	\N	\N	\N	\N	\N
14821a98-8b31-41f2-a91d-fc2ddd355cbc	34e76391-0302-4440-a930-2dd60837f11b	2026-03-06 01:07:05.872611+00	2026-03-06 01:07:05.872611+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	109.242.91.65	\N	\N	\N	\N	\N
60d712a6-e14a-49df-98cc-10b682c805c2	34e76391-0302-4440-a930-2dd60837f11b	2026-03-06 01:13:43.521117+00	2026-03-06 01:13:43.521117+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	109.242.91.65	\N	\N	\N	\N	\N
ae806f7c-8d14-4588-a02c-f2dca17e4abc	34e76391-0302-4440-a930-2dd60837f11b	2026-03-06 01:13:50.077647+00	2026-03-06 01:13:50.077647+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	109.242.91.65	\N	\N	\N	\N	\N
7b0e403b-9ad5-4b99-99a0-b9fe020a808d	34e76391-0302-4440-a930-2dd60837f11b	2026-03-06 01:26:03.03187+00	2026-03-06 01:26:03.03187+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	188.73.233.18	\N	\N	\N	\N	\N
9da1e962-51da-4c06-8511-212209eed732	0e0085f4-1207-4e7b-815d-a5a58183a9ce	2026-03-06 01:45:31.565942+00	2026-03-06 01:45:31.565942+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	188.73.233.18	\N	\N	\N	\N	\N
9669d941-b9ee-493c-a84c-78184c57c147	34e76391-0302-4440-a930-2dd60837f11b	2026-03-06 01:46:26.012293+00	2026-03-06 11:12:41.068687+00	\N	aal1	\N	2026-03-06 11:12:41.068581	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	188.73.233.18	\N	\N	\N	\N	\N
4c242684-a4e0-472d-8dd1-3594215780d8	0e0085f4-1207-4e7b-815d-a5a58183a9ce	2026-03-06 13:31:58.521036+00	2026-03-06 13:31:58.521036+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	109.242.88.192	\N	\N	\N	\N	\N
e4271c84-ac76-4791-9572-f61660db4c6f	bee320f9-25e2-4bff-9f0e-e295dd9504a2	2026-03-06 18:02:24.538416+00	2026-03-06 18:02:24.538416+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	109.242.88.192	\N	\N	\N	\N	\N
abefed42-12b9-4189-8ff5-ac0518f6bafc	34e76391-0302-4440-a930-2dd60837f11b	2026-03-06 18:02:58.16106+00	2026-03-06 18:02:58.16106+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	109.242.88.192	\N	\N	\N	\N	\N
b2cd1d88-269b-4a1a-bb4f-f340833648da	0e0085f4-1207-4e7b-815d-a5a58183a9ce	2026-03-06 18:31:13.558273+00	2026-03-06 18:31:13.558273+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	109.242.88.192	\N	\N	\N	\N	\N
d89d0638-1611-4003-a47b-e4da5b3d83f6	bee320f9-25e2-4bff-9f0e-e295dd9504a2	2026-03-06 19:35:25.172912+00	2026-03-06 19:35:25.172912+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	109.242.88.192	\N	\N	\N	\N	\N
07891ae9-c9cf-49c9-bbe3-b93161d2888a	34e76391-0302-4440-a930-2dd60837f11b	2026-03-07 14:46:17.194146+00	2026-03-07 14:46:17.194146+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	109.242.232.106	\N	\N	\N	\N	\N
1e568276-6629-4161-856e-7b584dd110b8	0e0085f4-1207-4e7b-815d-a5a58183a9ce	2026-03-07 14:46:33.729046+00	2026-03-07 15:44:52.630283+00	\N	aal1	\N	2026-03-07 15:44:52.630188	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	109.242.232.106	\N	\N	\N	\N	\N
1065b3e1-cfe0-43bd-a7e9-01ace7ae7cb2	7c343925-d7e2-46ba-8ebb-c88417d49f82	2026-03-07 15:54:00.939413+00	2026-03-07 15:54:00.939413+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	109.242.232.106	\N	\N	\N	\N	\N
6ac55cef-7daa-48f6-a100-0196bca0b516	34e76391-0302-4440-a930-2dd60837f11b	2026-03-07 16:37:42.062725+00	2026-03-07 16:37:42.062725+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	188.73.232.42	\N	\N	\N	\N	\N
53dc5d52-7fc2-4acd-a2b3-13251897a378	34e76391-0302-4440-a930-2dd60837f11b	2026-03-07 17:20:51.931783+00	2026-03-07 17:20:51.931783+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	109.242.232.106	\N	\N	\N	\N	\N
dacd897d-3eb3-4c9d-a032-ca79ab82a1e1	0e0085f4-1207-4e7b-815d-a5a58183a9ce	2026-03-08 19:11:55.527941+00	2026-03-08 19:11:55.527941+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	188.73.232.42	\N	\N	\N	\N	\N
\.


--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.sso_domains (id, sso_provider_id, domain, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.sso_providers (id, resource_id, created_at, updated_at, disabled) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, invited_at, confirmation_token, confirmation_sent_at, recovery_token, recovery_sent_at, email_change_token_new, email_change, email_change_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at, phone, phone_confirmed_at, phone_change, phone_change_token, phone_change_sent_at, email_change_token_current, email_change_confirm_status, banned_until, reauthentication_token, reauthentication_sent_at, is_sso_user, deleted_at, is_anonymous) FROM stdin;
00000000-0000-0000-0000-000000000000	bee320f9-25e2-4bff-9f0e-e295dd9504a2	authenticated	authenticated	nasosadamopoylos@gmail.com	$2a$10$W/IOJTsA3uGU6pjOVGjH4uLAm5Mhh9lrQepLwpB.6NU1EI16ireGe	2026-03-02 02:53:10.090147+00	\N		2026-03-02 02:52:57.936685+00		2026-03-06 19:35:18.987006+00			\N	2026-03-07 17:47:14.596667+00	{"provider": "email", "providers": ["email"]}	{"sub": "bee320f9-25e2-4bff-9f0e-e295dd9504a2", "name": "nasosadamop", "email": "nasosadamopoylos@gmail.com", "username": "nasosadamop", "full_name": "nasosadamop", "display_name": "nasosadamop", "email_verified": true, "phone_verified": false}	\N	2026-03-02 02:52:57.882111+00	2026-03-08 00:52:05.763978+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	34e76391-0302-4440-a930-2dd60837f11b	authenticated	authenticated	nasoosadamopoylos@gmail.com	$2a$10$yiNzNWRYTywgu.R8xU.LIePwL29TZNqhPivnP1nktV/9XmuWkt/gK	2026-02-28 15:12:47.896164+00	\N		2026-02-28 15:12:33.697742+00	pkce_78cd15d6f6e53dbe1e60b2309f06d9c217f8d30a8e53ce807494dee6	2026-03-06 19:12:26.35172+00			\N	2026-03-07 17:20:51.928916+00	{"provider": "email", "providers": ["email"]}	{"sub": "34e76391-0302-4440-a930-2dd60837f11b", "name": "adam", "email": "nasoosadamopoylos@gmail.com", "username": "adam", "full_name": "adam", "display_name": "adam", "email_verified": true, "phone_verified": false}	\N	2026-02-28 15:12:33.591778+00	2026-03-08 19:11:38.626033+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	0e0085f4-1207-4e7b-815d-a5a58183a9ce	authenticated	authenticated	mpeliskoshbas@gmail.com	$2a$10$OfhtVJK806Tjw1r9r.JA2eKcjQyDPxfnUescp88SC5090rmhueuoe	2026-03-06 01:45:31.247425+00	\N		2026-03-06 01:44:30.837298+00		\N			\N	2026-03-08 19:11:55.527822+00	{"provider": "email", "providers": ["email"]}	{"sub": "0e0085f4-1207-4e7b-815d-a5a58183a9ce", "name": "nasosadams", "email": "mpeliskoshbas@gmail.com", "username": "nasosadams", "full_name": "nasosadams", "display_name": "nasosadams", "email_verified": true, "phone_verified": false}	\N	2026-03-06 01:44:30.752541+00	2026-03-08 19:11:55.547385+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	7c343925-d7e2-46ba-8ebb-c88417d49f82	authenticated	authenticated	codhakapp@gmail.com	$2a$10$1k9Aj7uaIYS/fM3Tc4SP/O1KclQqZOdwJvL..1kE0vY8WvjDWoabS	2026-03-07 15:54:00.61206+00	\N		\N		\N			\N	2026-03-07 15:58:45.435325+00	{"provider": "email", "providers": ["email"]}	{"sub": "7c343925-d7e2-46ba-8ebb-c88417d49f82", "name": "codhak", "email": "codhakapp@gmail.com", "username": "codhak", "full_name": "codhak", "display_name": "codhak", "email_verified": true, "phone_verified": false}	\N	2026-03-07 15:53:49.273046+00	2026-03-07 15:58:45.442617+00	\N	\N			\N		0	\N		\N	f	\N	f
\.


--
-- Data for Name: anti_cheat_case_events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.anti_cheat_case_events (id, case_id, actor_user_id, action, details, created_at) FROM stdin;
\.


--
-- Data for Name: anti_cheat_cases; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.anti_cheat_cases (id, match_id, risk_score, status, summary, evidence, reviewed_by, reviewed_at, resolution_note, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: code_snapshots; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.code_snapshots (id, match_id, user_id, code, "timestamp") FROM stdin;
d0504524-51b4-427a-8dfe-b0f7134e170d	51af14bb-7ded-4009-8788-8061637bb11c	0e0085f4-1207-4e7b-815d-a5a58183a9ce	// Write your solution here\nfunction solution(input) {\n  \n}	2026-03-06 17:48:07.877+00
49a10a9f-6f0f-4bab-8db4-b6df5269d22b	51af14bb-7ded-4009-8788-8061637bb11c	bee320f9-25e2-4bff-9f0e-e295dd9504a2	// Write your solution here\nfunction solution(input) {\n  const n = input.n;\n  \n  if (n === 0) return 0;\n  \n  return 1 + (n - 1) % 9;\n}	2026-03-06 17:48:28.976+00
2cdbdb2b-77dd-4c85-a111-89897379202c	51af14bb-7ded-4009-8788-8061637bb11c	0e0085f4-1207-4e7b-815d-a5a58183a9ce	// Write your solution here\nfunction solution(input) {\n  \n}	2026-03-06 17:48:37.871+00
0d82ddc6-0528-4811-8bb7-a48eb5287d7b	9548c717-f72c-4ff3-95da-e504eeefc5cc	0e0085f4-1207-4e7b-815d-a5a58183a9ce	// Write your solution here\nfunction solution(input) {\n  const noise = input.noise;\n  const k = input.k;\n  const limit = input.limit;\n  \n  let sum = 0;\n  for (let i = 0; i < k; i++) {\n    sum += noise[i];\n  }\n  \n  let count = 0;\n  if (sum <= limit * k) count++;\n  \n  for (let i = k; i < noise.length; i++) {\n    sum += noise[i] - noise[i - k];\n    if (sum <= limit * k) count++;\n  }\n  \n  return count;\n}	2026-03-06 18:22:46.437+00
00d60ca8-2149-4283-b783-7c08e4fdf555	1a34576b-3f37-4f00-be0f-d7f85463b0a8	34e76391-0302-4440-a930-2dd60837f11b	// Write your solution here\nfunction solution(input) {\n  \n}	2026-03-06 18:41:29.396+00
87e8b36e-0277-4ba7-af87-f637fb5f87f1	155ae058-aec8-4337-a80f-132358d196d7	0e0085f4-1207-4e7b-815d-a5a58183a9ce	// Write your solution here\nfunction solution(input) {\n  \n}	2026-03-06 18:54:29.34+00
d5ff4860-ac9f-4e08-89a1-829f10be4c80	155ae058-aec8-4337-a80f-132358d196d7	34e76391-0302-4440-a930-2dd60837f11b	// Write your solution here\nfunction solution(input) {\n  \n}	2026-03-06 18:54:29.347+00
979fb052-e9d6-4660-afdb-412cd4e0b50b	155ae058-aec8-4337-a80f-132358d196d7	34e76391-0302-4440-a930-2dd60837f11b	// Write your solution here\nfunction solution(input) {\n  \n}	2026-03-06 18:54:59.343+00
eb28e15b-d311-4fa5-8167-0f18b06303d0	155ae058-aec8-4337-a80f-132358d196d7	0e0085f4-1207-4e7b-815d-a5a58183a9ce	// Write your solution here\nfunction solution(input) {\n  \n}	2026-03-06 18:54:59.346+00
\.


--
-- Data for Name: duel_matches; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.duel_matches (id, player1, player2, winner_id, problem_id, created_at) FROM stdin;
\.


--
-- Data for Name: duel_submissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.duel_submissions (id, match_id, user_id, code, passed_all, created_at) FROM stdin;
\.


--
-- Data for Name: duel_test_cases; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.duel_test_cases (id, problem_id, input, expected_output, is_sample) FROM stdin;
\.


--
-- Data for Name: duel_users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.duel_users (id, username, rating, wins, losses, draws, total_matches, win_streak, avatar_url, last_online, created_at, updated_at, matches_played, easy_rating, medium_rating, hard_rating) FROM stdin;
bee320f9-25e2-4bff-9f0e-e295dd9504a2	nasosadamop	500	21	27	3	51	0		2026-03-02 02:53:43.919715+00	2026-03-02 02:53:43.919715+00	2026-03-06 18:23:19.315+00	51	500	500	500
7c343925-d7e2-46ba-8ebb-c88417d49f82	codhak	478	3	11	0	14	0		2026-03-07 15:54:49.897402+00	2026-03-07 15:54:49.897402+00	2026-03-07 16:26:12.928+00	14	478	478	478
0e0085f4-1207-4e7b-815d-a5a58183a9ce	nasosadams	563	18	11	2	31	0		2026-03-06 01:46:06.438399+00	2026-03-06 01:46:06.438399+00	2026-03-08 19:22:44.458+00	31	535	573	544
34e76391-0302-4440-a930-2dd60837f11b	nasoosadamopoylos	481	31	23	5	59	0		2026-02-28 15:13:55.695205+00	2026-02-28 15:13:55.695205+00	2026-03-08 19:22:44.458+00	59	509	471	500
\.


--
-- Data for Name: feedback_attachments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.feedback_attachments (id, feedback_id, user_id, storage_bucket, storage_path, original_name, content_type, byte_size, created_at) FROM stdin;
\.


--
-- Data for Name: feedback_audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.feedback_audit_logs (id, feedback_id, actor_user_id, action, details, created_at) FROM stdin;
1fdceae9-2c1b-4548-9140-edf502705cf2	c1a66458-4dd9-46f9-af12-629d1e136fb0	34e76391-0302-4440-a930-2dd60837f11b	submitted	{"type": "bug_report", "includeMetadata": true, "attachmentsCount": 0}	2026-03-07 17:08:55.036647+00
7bd0ed8b-2869-47f7-af3f-cce4dad569a8	c1a66458-4dd9-46f9-af12-629d1e136fb0	34e76391-0302-4440-a930-2dd60837f11b	status_changed	{"note": null, "status": "in_review"}	2026-03-07 17:46:54.542741+00
\.


--
-- Data for Name: feedback_entries; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.feedback_entries (id, user_id, type, status, subject, message, metadata, dedupe_hash, attachments_count, created_at, updated_at, resolved_at) FROM stdin;
c1a66458-4dd9-46f9-af12-629d1e136fb0	34e76391-0302-4440-a930-2dd60837f11b	bug_report	in_review	sdadasd	sadasdasdasdasdasdsadas	{"page": "/", "locale": "en-GB", "screen": {"width": 1920, "height": 1080, "pixelRatio": 0.8999999761581421}, "language": "en-GB", "platform": "Win32", "timezone": "Europe/Athens", "viewport": {"width": 1061, "height": 1011}, "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36", "appVersion": "unknown", "environment": "development"}	3cb3c720bfed15b17b8a20352cdaeb726497e8bfbe34321b49512053386007d8	0	2026-03-07 17:08:54.752291+00	2026-03-07 17:46:54.400128+00	\N
\.


--
-- Data for Name: legal_acceptances; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.legal_acceptances (id, user_id, document_key, version, source, accepted_at, ip_address, user_agent, created_at) FROM stdin;
\.


--
-- Data for Name: lesson_completion_events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.lesson_completion_events (id, user_id, lesson_id, xp_earned, coins_earned, completed_at) FROM stdin;
70539ca0-bfa2-4304-90f8-955997be5607	bee320f9-25e2-4bff-9f0e-e295dd9504a2	python-comparison-operators	183	0	2026-03-06 13:39:18.86647+00
28a2166e-9588-422d-bc53-ab66e1672f1a	34e76391-0302-4440-a930-2dd60837f11b	python-variables-1	59	0	2026-03-06 19:25:24.255609+00
e2b5eeb5-6534-41f5-9c1b-daa7ae99e897	34e76391-0302-4440-a930-2dd60837f11b	python-variables-2	59	0	2026-03-06 19:25:33.73157+00
08713528-825b-442f-b4c1-509656581bb7	34e76391-0302-4440-a930-2dd60837f11b	python-type-casting	60	0	2026-03-06 19:25:43.69284+00
5826360c-9959-4806-b562-d17de2fb2050	34e76391-0302-4440-a930-2dd60837f11b	python-comparison-operators	60	0	2026-03-06 19:25:57.541218+00
01f85d01-4432-4ce4-ae16-236fa114c059	34e76391-0302-4440-a930-2dd60837f11b	python-logical-operators	61	0	2026-03-06 19:26:13.020321+00
541cec40-c5c8-4f03-a489-d9afc34accec	34e76391-0302-4440-a930-2dd60837f11b	python-if-statements	61	0	2026-03-06 19:26:30.189216+00
75da24a0-3c4b-4b54-b20a-43b093a49290	34e76391-0302-4440-a930-2dd60837f11b	python-string-methods	62	0	2026-03-06 19:26:42.44458+00
ad565377-b87c-4908-ae86-6a5f7dbe08ac	34e76391-0302-4440-a930-2dd60837f11b	python-while-loops-conditions	62	0	2026-03-06 19:26:56.600698+00
eae9aa7a-9878-4ae2-a535-1eb05a4d6b42	34e76391-0302-4440-a930-2dd60837f11b	python-dictionaries	121	0	2026-03-06 19:27:08.63464+00
91246c8b-14df-461a-a07d-ab0e7495c9e6	34e76391-0302-4440-a930-2dd60837f11b	python-if-else	128	0	2026-03-06 19:27:21.94731+00
7b9cc589-8b72-4a9e-b93b-1210cb651f37	34e76391-0302-4440-a930-2dd60837f11b	python-match	131	0	2026-03-06 19:27:46.23893+00
98c0ffb9-b99c-4014-b6bc-36c1d16777c1	34e76391-0302-4440-a930-2dd60837f11b	python-operators	44	0	2026-03-07 15:22:38.520328+00
\.


--
-- Data for Name: match_events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.match_events (id, match_id, event_type, payload, created_at, user_id) FROM stdin;
232ec869-bcd7-4f2b-aa01-af5e09aecb6b	51af14bb-7ded-4009-8788-8061637bb11c	match_start	{"match_type": "ranked", "problem_id": "eab95847-eaba-4f09-8adf-2f249cad2e75", "player_a_id": "0e0085f4-1207-4e7b-815d-a5a58183a9ce", "player_b_id": "bee320f9-25e2-4bff-9f0e-e295dd9504a2", "time_limit_seconds": 300}	2026-03-06 17:47:37.256197+00	0e0085f4-1207-4e7b-815d-a5a58183a9ce
5b52b58c-c347-4b52-b63b-8a92bad416f4	51af14bb-7ded-4009-8788-8061637bb11c	submission	{"score": 0, "total": 5, "passed": 0, "verdict": "Runtime Error", "runtime_ms": 2589, "submission_id": "0cc158fe-6075-445c-a048-048a876ce132"}	2026-03-06 17:48:03.976006+00	bee320f9-25e2-4bff-9f0e-e295dd9504a2
a4ef3276-4d38-4e4d-9df5-321001529197	51af14bb-7ded-4009-8788-8061637bb11c	submission	{"score": 0, "total": 5, "passed": 0, "verdict": "Runtime Error", "runtime_ms": 1025, "submission_id": "703252af-216a-4f2b-bbcc-f4947b55972a"}	2026-03-06 17:48:13.777011+00	bee320f9-25e2-4bff-9f0e-e295dd9504a2
3f51a252-d011-4326-8e58-7e215cc360c7	51af14bb-7ded-4009-8788-8061637bb11c	submission	{"score": 0, "total": 5, "passed": 0, "verdict": "Runtime Error", "runtime_ms": 1298, "submission_id": "894a185b-608e-45af-8711-9ec95a32f709"}	2026-03-06 17:49:46.869879+00	0e0085f4-1207-4e7b-815d-a5a58183a9ce
54784209-215a-4952-be94-489d26c5f8c9	51af14bb-7ded-4009-8788-8061637bb11c	submission	{"score": 0, "total": 5, "passed": 0, "verdict": "Runtime Error", "runtime_ms": 1157, "submission_id": "6028c745-3c3b-4955-8f47-3f4dcd93bda6"}	2026-03-06 17:49:51.459195+00	0e0085f4-1207-4e7b-815d-a5a58183a9ce
d677068b-bafc-418b-9460-4a95e09af0f0	51af14bb-7ded-4009-8788-8061637bb11c	disconnect	{"reason": "forfeit_disconnect"}	2026-03-06 17:50:27.144397+00	0e0085f4-1207-4e7b-815d-a5a58183a9ce
f478255a-6727-4efc-920a-543ee2fcefca	51af14bb-7ded-4009-8788-8061637bb11c	match_end	{"reason": "forfeit_disconnect", "winner_id": "bee320f9-25e2-4bff-9f0e-e295dd9504a2", "duration_seconds": 170}	2026-03-06 17:50:27.969462+00	bee320f9-25e2-4bff-9f0e-e295dd9504a2
239fd5d3-d4d9-4a0f-9c1f-3e4fe103b317	9548c717-f72c-4ff3-95da-e504eeefc5cc	match_start	{"match_type": "ranked", "problem_id": "f31cf86d-e6ae-46e3-b881-5de7b532098f", "player_a_id": "bee320f9-25e2-4bff-9f0e-e295dd9504a2", "player_b_id": "0e0085f4-1207-4e7b-815d-a5a58183a9ce", "time_limit_seconds": 300}	2026-03-06 18:22:01.580183+00	bee320f9-25e2-4bff-9f0e-e295dd9504a2
afc64d3a-a40b-441c-9395-b6359f804420	9548c717-f72c-4ff3-95da-e504eeefc5cc	submission	{"score": 0, "total": 5, "passed": 0, "verdict": "Runtime Error", "duel_score": 0, "runtime_ms": 1113, "submission_id": "1deeeb67-c2b6-4e9f-a5fe-032897ef8f33", "wrong_submissions": 1}	2026-03-06 18:22:18.536004+00	0e0085f4-1207-4e7b-815d-a5a58183a9ce
18e493aa-8899-427e-bac8-3b12cd2bd8f9	9548c717-f72c-4ff3-95da-e504eeefc5cc	disconnect	{"reason": "forfeit_disconnect"}	2026-03-06 18:23:18.251358+00	0e0085f4-1207-4e7b-815d-a5a58183a9ce
7c2735b2-80ec-4df9-85ad-9e1072e33038	9548c717-f72c-4ff3-95da-e504eeefc5cc	disconnect	{"reason": "forfeit_disconnect"}	2026-03-06 18:23:18.536977+00	bee320f9-25e2-4bff-9f0e-e295dd9504a2
52fa8cba-d53b-49c8-9e3e-2c26bbd80ddf	9548c717-f72c-4ff3-95da-e504eeefc5cc	match_end	{"reason": "forfeit_disconnect", "winner_id": "bee320f9-25e2-4bff-9f0e-e295dd9504a2", "difficulty": "easy", "result_strength": "draw", "duration_seconds": 77, "player_a_actual_score": 0.5, "player_b_actual_score": 0.5}	2026-03-06 18:23:19.721224+00	bee320f9-25e2-4bff-9f0e-e295dd9504a2
9702f84c-d870-4777-a352-3da694e4f41c	ffd6d14a-c00e-47c4-a12a-e8233281f771	match_start	{"match_type": "ranked", "problem_id": "dd95e812-5179-484c-bf7b-2a7f20394ea8", "player_a_id": "0e0085f4-1207-4e7b-815d-a5a58183a9ce", "player_b_id": "34e76391-0302-4440-a930-2dd60837f11b", "time_limit_seconds": 300}	2026-03-06 18:39:09.035956+00	0e0085f4-1207-4e7b-815d-a5a58183a9ce
c0353b5f-9106-4897-8b77-c160a50d2d04	a1a18197-b6b6-4ebc-b085-e6c7d6b5ed3c	match_start	{"match_type": "ranked", "problem_id": "aa1fb101-79c7-4879-b046-a44789ea3ed1", "player_a_id": "0e0085f4-1207-4e7b-815d-a5a58183a9ce", "player_b_id": "34e76391-0302-4440-a930-2dd60837f11b", "time_limit_seconds": 300}	2026-03-06 18:39:34.212422+00	0e0085f4-1207-4e7b-815d-a5a58183a9ce
83484d1d-a17a-4d74-981f-87a8ea9f8f24	a1a18197-b6b6-4ebc-b085-e6c7d6b5ed3c	submission	{"score": 100, "total": 5, "passed": 5, "verdict": "Accepted", "duel_score": 146.9, "runtime_ms": 89, "submission_id": "0e3926df-beab-459e-9c61-cd50ca67c8f6", "wrong_submissions": 0}	2026-03-06 18:39:52.602305+00	0e0085f4-1207-4e7b-815d-a5a58183a9ce
e643c2a9-57f1-43c5-886a-315692f6e686	a1a18197-b6b6-4ebc-b085-e6c7d6b5ed3c	match_end	{"reason": "accepted_first", "winner_id": "0e0085f4-1207-4e7b-815d-a5a58183a9ce", "difficulty": "easy", "result_strength": "clear", "duration_seconds": 18, "player_a_actual_score": 1, "player_b_actual_score": 0}	2026-03-06 18:39:53.587828+00	0e0085f4-1207-4e7b-815d-a5a58183a9ce
a433cffd-808b-4e46-b875-2c51dadb5103	56cb5d28-4d23-4bb0-bb18-ce9f4f197afa	match_start	{"match_type": "ranked", "problem_id": "57f93e31-8146-42c0-b6d3-5fdddb37f0a2", "player_a_id": "34e76391-0302-4440-a930-2dd60837f11b", "player_b_id": "0e0085f4-1207-4e7b-815d-a5a58183a9ce", "time_limit_seconds": 300}	2026-03-06 18:40:20.012844+00	34e76391-0302-4440-a930-2dd60837f11b
c7646c8d-ac3c-459f-801c-3084904c7dca	ffd6d14a-c00e-47c4-a12a-e8233281f771	disconnect	{"reason": "forfeit_disconnect"}	2026-03-06 18:40:39.966746+00	34e76391-0302-4440-a930-2dd60837f11b
6940c002-2097-431b-b2c8-9f0b58ada29c	ffd6d14a-c00e-47c4-a12a-e8233281f771	match_end	{"reason": "forfeit_disconnect", "winner_id": "0e0085f4-1207-4e7b-815d-a5a58183a9ce", "difficulty": "easy", "result_strength": "draw", "duration_seconds": 91, "player_a_actual_score": 0.5, "player_b_actual_score": 0.5}	2026-03-06 18:40:41.06971+00	0e0085f4-1207-4e7b-815d-a5a58183a9ce
7704efc3-3419-4573-af37-d304703f4f9b	2955c371-e4ad-4acc-8d8b-6a60c04d9235	match_start	{"match_type": "ranked", "problem_id": "eddb8cca-ef33-4d91-90da-9cf87afa9729", "player_a_id": "34e76391-0302-4440-a930-2dd60837f11b", "player_b_id": "0e0085f4-1207-4e7b-815d-a5a58183a9ce", "time_limit_seconds": 300}	2026-03-06 18:40:42.236748+00	34e76391-0302-4440-a930-2dd60837f11b
eaa9f206-dc32-4fdf-9b16-a74060cb0174	1a34576b-3f37-4f00-be0f-d7f85463b0a8	match_start	{"match_type": "ranked", "problem_id": "aa1fb101-79c7-4879-b046-a44789ea3ed1", "player_a_id": "34e76391-0302-4440-a930-2dd60837f11b", "player_b_id": "0e0085f4-1207-4e7b-815d-a5a58183a9ce", "time_limit_seconds": 300}	2026-03-06 18:40:58.431607+00	34e76391-0302-4440-a930-2dd60837f11b
8cedf130-2ddd-47c3-92a1-050ee736cbc0	56cb5d28-4d23-4bb0-bb18-ce9f4f197afa	disconnect	{"reason": "forfeit_disconnect"}	2026-03-06 18:41:28.880402+00	0e0085f4-1207-4e7b-815d-a5a58183a9ce
9f28bae7-308b-4463-85b4-7e577f82a213	56cb5d28-4d23-4bb0-bb18-ce9f4f197afa	match_end	{"reason": "forfeit_disconnect", "winner_id": "34e76391-0302-4440-a930-2dd60837f11b", "difficulty": "easy", "result_strength": "draw", "duration_seconds": 69, "player_a_actual_score": 0.5, "player_b_actual_score": 0.5}	2026-03-06 18:41:29.788453+00	34e76391-0302-4440-a930-2dd60837f11b
1f49805e-11fb-44c8-81fa-7ad1506d1892	2955c371-e4ad-4acc-8d8b-6a60c04d9235	match_end	{"reason": "draw_no_submissions", "winner_id": null, "difficulty": "easy", "result_strength": "draw", "duration_seconds": 300, "player_a_actual_score": 0.5, "player_b_actual_score": 0.5}	2026-03-06 18:45:43.734817+00	\N
532fde30-b085-4e0c-abe2-c9a1b627e342	1a34576b-3f37-4f00-be0f-d7f85463b0a8	match_end	{"reason": "draw_no_submissions", "winner_id": null, "difficulty": "easy", "result_strength": "draw", "duration_seconds": 300, "player_a_actual_score": 0.5, "player_b_actual_score": 0.5}	2026-03-06 18:45:59.656146+00	\N
4aa02422-b86c-4ba3-8748-2a54052650d3	155ae058-aec8-4337-a80f-132358d196d7	match_start	{"match_type": "casual", "problem_id": "7a98ca7b-9605-40b4-9218-0cd68c3b405a", "player_a_id": "34e76391-0302-4440-a930-2dd60837f11b", "player_b_id": "0e0085f4-1207-4e7b-815d-a5a58183a9ce", "time_limit_seconds": 600}	2026-03-06 18:53:58.716677+00	34e76391-0302-4440-a930-2dd60837f11b
9eafedae-9f65-4681-95c6-8da12ea629e2	155ae058-aec8-4337-a80f-132358d196d7	disconnect	{"reason": "forfeit_disconnect"}	2026-03-06 18:55:36.539098+00	34e76391-0302-4440-a930-2dd60837f11b
91bd8348-d90c-4f67-a0be-9de13bddd8a2	155ae058-aec8-4337-a80f-132358d196d7	disconnect	{"reason": "forfeit_disconnect"}	2026-03-06 18:55:36.541251+00	0e0085f4-1207-4e7b-815d-a5a58183a9ce
d0ededc4-be8d-455f-bc40-10c47d9461f2	155ae058-aec8-4337-a80f-132358d196d7	match_end	{"reason": "forfeit_disconnect", "winner_id": "0e0085f4-1207-4e7b-815d-a5a58183a9ce", "difficulty": "medium", "result_strength": "draw", "duration_seconds": 98, "player_a_actual_score": 0.5, "player_b_actual_score": 0.5}	2026-03-06 18:55:37.256708+00	0e0085f4-1207-4e7b-815d-a5a58183a9ce
727f9867-35ed-4a32-92c3-5a372450bbb2	cd39dff5-3116-45a9-a163-84e3ec6d6767	match_start	{"match_type": "casual", "problem_id": "4f2b6129-3aa5-479a-9afc-e0f26ee94a24", "player_a_id": "34e76391-0302-4440-a930-2dd60837f11b", "player_b_id": "0e0085f4-1207-4e7b-815d-a5a58183a9ce", "time_limit_seconds": 300}	2026-03-06 19:44:01.68619+00	34e76391-0302-4440-a930-2dd60837f11b
36eeb9ef-a8fb-4ca3-a78b-213253c4a703	6b1eaa66-73f6-4468-91d2-e02429ebd0ae	match_start	{"match_type": "casual", "problem_id": "8a7e5d8a-78e6-4f1c-a378-454400a81fbd", "player_a_id": "34e76391-0302-4440-a930-2dd60837f11b", "player_b_id": "0e0085f4-1207-4e7b-815d-a5a58183a9ce", "time_limit_seconds": 1200}	2026-03-06 19:44:36.926699+00	34e76391-0302-4440-a930-2dd60837f11b
e5ea0988-ae41-4133-9e49-f65c6e54307e	cd39dff5-3116-45a9-a163-84e3ec6d6767	disconnect	{"reason": "forfeit_disconnect"}	2026-03-06 19:44:42.495421+00	0e0085f4-1207-4e7b-815d-a5a58183a9ce
488b12ff-011a-472c-ad76-e2dee6121e6f	cd39dff5-3116-45a9-a163-84e3ec6d6767	disconnect	{"reason": "forfeit_disconnect"}	2026-03-06 19:44:42.57029+00	34e76391-0302-4440-a930-2dd60837f11b
81796e66-45e2-4be0-be87-7c6afd120879	cd39dff5-3116-45a9-a163-84e3ec6d6767	match_end	{"reason": "forfeit_disconnect", "winner_id": "34e76391-0302-4440-a930-2dd60837f11b", "difficulty": "easy", "result_strength": "draw", "duration_seconds": 41, "player_a_actual_score": 0.5, "player_b_actual_score": 0.5}	2026-03-06 19:44:43.859701+00	34e76391-0302-4440-a930-2dd60837f11b
c7114e95-97bd-439d-9afb-215fe91cc16e	6b1eaa66-73f6-4468-91d2-e02429ebd0ae	disconnect	{"reason": "forfeit_disconnect"}	2026-03-06 19:45:31.786253+00	34e76391-0302-4440-a930-2dd60837f11b
4c8dd507-a49f-4d4f-b7ca-b1dad61cd2d8	6b1eaa66-73f6-4468-91d2-e02429ebd0ae	match_end	{"reason": "forfeit_disconnect", "winner_id": "0e0085f4-1207-4e7b-815d-a5a58183a9ce", "difficulty": "hard", "result_strength": "draw", "duration_seconds": 55, "player_a_actual_score": 0.5, "player_b_actual_score": 0.5}	2026-03-06 19:45:32.823737+00	0e0085f4-1207-4e7b-815d-a5a58183a9ce
5f68c319-8a8a-4046-9604-40c6eb4cc200	f8cfb6df-e079-47a9-a9f0-c96379a24031	match_start	{"match_type": "ranked", "problem_id": "eab95847-eaba-4f09-8adf-2f249cad2e75", "player_a_id": "34e76391-0302-4440-a930-2dd60837f11b", "player_b_id": "0e0085f4-1207-4e7b-815d-a5a58183a9ce", "time_limit_seconds": 300}	2026-03-06 20:06:49.454963+00	34e76391-0302-4440-a930-2dd60837f11b
6212dfd7-fe4a-4fad-8261-a4dfae2089f9	f8cfb6df-e079-47a9-a9f0-c96379a24031	disconnect	{"reason": "forfeit_disconnect"}	2026-03-06 20:09:09.102133+00	0e0085f4-1207-4e7b-815d-a5a58183a9ce
25ef3f92-6389-406e-919a-6deca8647f23	f8cfb6df-e079-47a9-a9f0-c96379a24031	match_end	{"reason": "forfeit_disconnect", "winner_id": "34e76391-0302-4440-a930-2dd60837f11b", "difficulty": "easy", "result_strength": "draw", "duration_seconds": 140, "player_a_actual_score": 0.5, "player_b_actual_score": 0.5}	2026-03-06 20:09:10.235392+00	34e76391-0302-4440-a930-2dd60837f11b
e0e57d38-25e8-4c2e-b74a-5c3474abb370	57302769-9d6a-4a40-b07d-755937304941	match_start	{"match_type": "ranked", "problem_id": "10377315-66f0-4fe5-86e1-bf8c0f6d46db", "player_a_id": "34e76391-0302-4440-a930-2dd60837f11b", "player_b_id": "0e0085f4-1207-4e7b-815d-a5a58183a9ce", "time_limit_seconds": 300}	2026-03-07 14:46:49.194678+00	34e76391-0302-4440-a930-2dd60837f11b
c08f7f0b-b672-4625-a5ff-5b706c71be7c	57302769-9d6a-4a40-b07d-755937304941	match_end	{"reason": "forfeit_disconnect", "winner_id": "34e76391-0302-4440-a930-2dd60837f11b", "difficulty": "easy", "result_strength": "draw", "duration_seconds": 5, "player_a_actual_score": 0.5, "player_b_actual_score": 0.5}	2026-03-07 14:46:55.08069+00	34e76391-0302-4440-a930-2dd60837f11b
01fe0fed-cc41-4b3d-9df7-5db793b8c360	50e1afc0-9465-40f3-987f-162e388518ab	match_end	{"reason": "forfeit_disconnect", "winner_id": "0e0085f4-1207-4e7b-815d-a5a58183a9ce", "difficulty": "easy", "result_strength": "draw", "duration_seconds": 2, "player_a_actual_score": 0.5, "player_b_actual_score": 0.5}	2026-03-07 15:59:16.092535+00	0e0085f4-1207-4e7b-815d-a5a58183a9ce
fd79d9f6-4bda-4771-a613-890d5362b2dc	9f479d49-21ef-4bc6-819c-5e8c40df3f44	match_start	{"match_type": "ranked", "problem_id": "eab95847-eaba-4f09-8adf-2f249cad2e75", "player_a_id": "7c343925-d7e2-46ba-8ebb-c88417d49f82", "player_b_id": "0e0085f4-1207-4e7b-815d-a5a58183a9ce", "time_limit_seconds": 300}	2026-03-07 16:00:11.618889+00	7c343925-d7e2-46ba-8ebb-c88417d49f82
563c59fb-6a62-4182-b860-fddddc97a3eb	9f479d49-21ef-4bc6-819c-5e8c40df3f44	match_end	{"reason": "forfeit_disconnect", "winner_id": "0e0085f4-1207-4e7b-815d-a5a58183a9ce", "difficulty": "easy", "result_strength": "draw", "duration_seconds": 1, "player_a_actual_score": 0.5, "player_b_actual_score": 0.5}	2026-03-07 16:00:14.339481+00	0e0085f4-1207-4e7b-815d-a5a58183a9ce
9816a5ff-d1ef-4ab8-9992-806a27e6c584	9161b87a-b65a-406f-8aec-03d4441db415	match_end	{"reason": "forfeit_disconnect", "winner_id": "0e0085f4-1207-4e7b-815d-a5a58183a9ce", "difficulty": "easy", "result_strength": "draw", "duration_seconds": 2, "player_a_actual_score": 0.5, "player_b_actual_score": 0.5}	2026-03-07 16:01:06.117093+00	0e0085f4-1207-4e7b-815d-a5a58183a9ce
b312678d-e3b1-4668-8138-7a7a9364b018	95869d38-d75d-43f5-879d-bdd890d3b5cd	match_start	{"match_type": "ranked", "problem_id": "c57e2fd5-b83b-45e8-ab29-39c12b16fedc", "player_a_id": "7c343925-d7e2-46ba-8ebb-c88417d49f82", "player_b_id": "0e0085f4-1207-4e7b-815d-a5a58183a9ce", "time_limit_seconds": 600}	2026-03-07 16:01:18.064177+00	7c343925-d7e2-46ba-8ebb-c88417d49f82
c963d952-65ec-4f83-896b-7ac7c37fc960	95869d38-d75d-43f5-879d-bdd890d3b5cd	match_end	{"reason": "forfeit_disconnect", "winner_id": "7c343925-d7e2-46ba-8ebb-c88417d49f82", "difficulty": "medium", "result_strength": "draw", "duration_seconds": 1, "player_a_actual_score": 0.5, "player_b_actual_score": 0.5}	2026-03-07 16:01:19.66236+00	7c343925-d7e2-46ba-8ebb-c88417d49f82
e211c984-604e-4358-8472-fe771bd3e6aa	a4b4b7f5-bdff-45bf-8f90-4aaab7559f93	match_start	{"match_type": "ranked", "problem_id": "57f93e31-8146-42c0-b6d3-5fdddb37f0a2", "player_a_id": "7c343925-d7e2-46ba-8ebb-c88417d49f82", "player_b_id": "0e0085f4-1207-4e7b-815d-a5a58183a9ce", "time_limit_seconds": 300}	2026-03-07 16:08:47.000854+00	7c343925-d7e2-46ba-8ebb-c88417d49f82
ecd910f9-8982-4c51-ac5f-31fac4a406ca	a4b4b7f5-bdff-45bf-8f90-4aaab7559f93	match_end	{"reason": "forfeit_disconnect", "winner_id": "7c343925-d7e2-46ba-8ebb-c88417d49f82", "difficulty": "easy", "result_strength": "draw", "duration_seconds": 2, "player_a_actual_score": 0.5, "player_b_actual_score": 0.5}	2026-03-07 16:08:49.518958+00	7c343925-d7e2-46ba-8ebb-c88417d49f82
bc5dfddf-508d-4cd9-b63d-bb7c804c5d8f	d38f32d6-1653-440a-b039-d6351537caf7	match_end	{"reason": "forfeit_disconnect", "winner_id": "0e0085f4-1207-4e7b-815d-a5a58183a9ce", "difficulty": "medium", "result_strength": "draw", "duration_seconds": 0, "player_a_actual_score": 0.5, "player_b_actual_score": 0.5}	2026-03-07 16:09:07.407213+00	0e0085f4-1207-4e7b-815d-a5a58183a9ce
a78279ec-9c39-4c81-8f87-e6bc1c4d3186	7d46fde9-d5cf-4e77-81f9-fa56fee56b91	match_end	{"reason": "disconnect_before_start", "winner_id": "0e0085f4-1207-4e7b-815d-a5a58183a9ce", "difficulty": "medium", "result_strength": "countdown_forfeit", "duration_seconds": 1, "player_a_actual_score": 0, "player_b_actual_score": 1}	2026-03-07 16:12:49.373942+00	0e0085f4-1207-4e7b-815d-a5a58183a9ce
1acef0b4-2fff-493a-91d5-e01d06fa3be7	4e5107da-d3c9-4607-b803-e35269adbd01	match_start	{"match_type": "ranked", "problem_id": "8a7e5d8a-78e6-4f1c-a378-454400a81fbd", "player_a_id": "7c343925-d7e2-46ba-8ebb-c88417d49f82", "player_b_id": "0e0085f4-1207-4e7b-815d-a5a58183a9ce", "time_limit_seconds": 1200}	2026-03-07 16:13:02.372356+00	7c343925-d7e2-46ba-8ebb-c88417d49f82
26c45d6c-f7bc-475d-8ae8-38a481dd73c8	4e5107da-d3c9-4607-b803-e35269adbd01	match_end	{"reason": "disconnect_during_match", "winner_id": "0e0085f4-1207-4e7b-815d-a5a58183a9ce", "difficulty": "hard", "result_strength": "clear", "duration_seconds": 1, "player_a_actual_score": 0, "player_b_actual_score": 1}	2026-03-07 16:13:04.87518+00	0e0085f4-1207-4e7b-815d-a5a58183a9ce
482abf5f-ec6d-4a8c-ab95-ad319f6b76fc	6377f13a-d2da-475e-9a56-4e61f9e2294e	match_end	{"reason": "disconnect_before_start", "winner_id": "0e0085f4-1207-4e7b-815d-a5a58183a9ce", "difficulty": "easy", "result_strength": "countdown_forfeit", "duration_seconds": 1, "player_a_actual_score": 0, "player_b_actual_score": 1}	2026-03-07 16:17:29.485485+00	0e0085f4-1207-4e7b-815d-a5a58183a9ce
cf6f3d15-0de7-4ffd-9061-6abf1b54c5e5	3af4dd06-db51-45d2-ab3b-4c4869ff0dc1	match_start	{"match_type": "ranked", "problem_id": "c5a9e19c-37f8-4477-a8ec-cefccf9586d5", "player_a_id": "7c343925-d7e2-46ba-8ebb-c88417d49f82", "player_b_id": "0e0085f4-1207-4e7b-815d-a5a58183a9ce", "time_limit_seconds": 300}	2026-03-07 16:17:47.68546+00	7c343925-d7e2-46ba-8ebb-c88417d49f82
ce54ec52-47ff-43d8-aa9f-45da522aabbb	3af4dd06-db51-45d2-ab3b-4c4869ff0dc1	match_end	{"reason": "disconnect_during_match", "winner_id": "0e0085f4-1207-4e7b-815d-a5a58183a9ce", "difficulty": "easy", "result_strength": "clear", "duration_seconds": 3, "player_a_actual_score": 0, "player_b_actual_score": 1}	2026-03-07 16:17:51.186499+00	0e0085f4-1207-4e7b-815d-a5a58183a9ce
48b4e214-ae6f-4fae-937b-30f282910e5b	ff444d6f-b7c8-4b0b-8ce3-d1c9c0836909	match_end	{"reason": "disconnect_before_start", "winner_id": "0e0085f4-1207-4e7b-815d-a5a58183a9ce", "difficulty": "medium", "result_strength": "countdown_forfeit", "duration_seconds": 1, "player_a_actual_score": 0, "player_b_actual_score": 1}	2026-03-07 16:20:09.885123+00	0e0085f4-1207-4e7b-815d-a5a58183a9ce
7efd835c-356a-419a-b963-fc68ded78121	04999f77-4e02-4411-a1d8-3de7f4e34dab	match_start	{"match_type": "ranked", "problem_id": "4f2b6129-3aa5-479a-9afc-e0f26ee94a24", "player_a_id": "7c343925-d7e2-46ba-8ebb-c88417d49f82", "player_b_id": "0e0085f4-1207-4e7b-815d-a5a58183a9ce", "time_limit_seconds": 300}	2026-03-07 16:20:20.377425+00	7c343925-d7e2-46ba-8ebb-c88417d49f82
93a2eba9-8501-4491-8442-467425d62714	04999f77-4e02-4411-a1d8-3de7f4e34dab	match_end	{"reason": "disconnect_during_match", "winner_id": "0e0085f4-1207-4e7b-815d-a5a58183a9ce", "difficulty": "easy", "result_strength": "clear", "duration_seconds": 1, "player_a_actual_score": 0, "player_b_actual_score": 1}	2026-03-07 16:20:22.312298+00	0e0085f4-1207-4e7b-815d-a5a58183a9ce
1027f22f-8a36-4700-bf9b-48fcadee5e1c	43c17fe2-d755-4e86-ad08-a36d38884812	match_start	{"match_type": "ranked", "problem_id": "5fa29b3c-a9b6-4bd6-8548-babd03fc6c6b", "player_a_id": "7c343925-d7e2-46ba-8ebb-c88417d49f82", "player_b_id": "0e0085f4-1207-4e7b-815d-a5a58183a9ce", "time_limit_seconds": 1200}	2026-03-07 16:25:26.774111+00	7c343925-d7e2-46ba-8ebb-c88417d49f82
b318d825-97b0-4412-b60b-95db4ce5c941	43c17fe2-d755-4e86-ad08-a36d38884812	match_end	{"reason": "disconnect_during_match", "winner_id": "0e0085f4-1207-4e7b-815d-a5a58183a9ce", "difficulty": "hard", "result_strength": "clear", "duration_seconds": 1, "player_a_actual_score": 0, "player_b_actual_score": 1}	2026-03-07 16:25:28.641124+00	0e0085f4-1207-4e7b-815d-a5a58183a9ce
b845a400-61e0-4d54-b26e-372928d4dedf	921e1920-c5a9-401c-b9b6-4a8adee2027b	match_start	{"match_type": "ranked", "problem_id": "2d89c183-1ed2-4b7d-b0cb-03289594a43b", "player_a_id": "7c343925-d7e2-46ba-8ebb-c88417d49f82", "player_b_id": "0e0085f4-1207-4e7b-815d-a5a58183a9ce", "time_limit_seconds": 1200}	2026-03-07 16:26:09.655513+00	7c343925-d7e2-46ba-8ebb-c88417d49f82
e13f8031-6672-443d-9f4c-8a1adcca81cf	921e1920-c5a9-401c-b9b6-4a8adee2027b	match_end	{"reason": "disconnect_during_match", "winner_id": "7c343925-d7e2-46ba-8ebb-c88417d49f82", "difficulty": "hard", "result_strength": "clear", "duration_seconds": 3, "player_a_actual_score": 1, "player_b_actual_score": 0}	2026-03-07 16:26:13.245585+00	7c343925-d7e2-46ba-8ebb-c88417d49f82
e2e129c3-441e-499a-b0b7-9dfba9e3c571	31a5efd8-87b3-4aef-9dce-4df222f7b3a0	match_start	{"match_type": "ranked", "problem_id": "e0ed3fcd-214d-42f4-b0cd-8f6369cf8c15", "player_a_id": "34e76391-0302-4440-a930-2dd60837f11b", "player_b_id": "0e0085f4-1207-4e7b-815d-a5a58183a9ce", "time_limit_seconds": 600}	2026-03-08 19:12:20.008943+00	34e76391-0302-4440-a930-2dd60837f11b
add4a6d7-33e2-4e91-b630-2e8ced86bb8e	31a5efd8-87b3-4aef-9dce-4df222f7b3a0	submission	{"score": 100, "total": 5, "passed": 5, "verdict": "Accepted", "duel_score": 183.2, "runtime_ms": 1514, "submission_id": null, "wrong_submissions": 0}	2026-03-08 19:13:01.872731+00	0e0085f4-1207-4e7b-815d-a5a58183a9ce
c0d5f5f2-e311-46ce-9489-e42d19e50c26	31a5efd8-87b3-4aef-9dce-4df222f7b3a0	match_end	{"reason": "accepted_first", "winner_id": "0e0085f4-1207-4e7b-815d-a5a58183a9ce", "difficulty": "medium", "result_strength": "clear", "duration_seconds": 42, "player_a_actual_score": 0, "player_b_actual_score": 1}	2026-03-08 19:13:02.557133+00	0e0085f4-1207-4e7b-815d-a5a58183a9ce
decbbc4e-e4e3-46ee-abcf-71867e2ed47c	ee22900d-6f44-46cb-9810-d99c274ab1b5	match_start	{"match_type": "ranked", "problem_id": "b0665d9c-d9e7-44d9-b9e3-4bba5793a5ec", "player_a_id": "34e76391-0302-4440-a930-2dd60837f11b", "player_b_id": "0e0085f4-1207-4e7b-815d-a5a58183a9ce", "time_limit_seconds": 600}	2026-03-08 19:13:20.038359+00	34e76391-0302-4440-a930-2dd60837f11b
3c8f2062-f86d-478d-8d6f-402a393b24e2	ee22900d-6f44-46cb-9810-d99c274ab1b5	submission	{"score": 100, "total": 5, "passed": 5, "verdict": "Accepted", "duel_score": 185.9, "runtime_ms": 4, "submission_id": null, "wrong_submissions": 0}	2026-03-08 19:13:35.672935+00	0e0085f4-1207-4e7b-815d-a5a58183a9ce
c6547dd0-85bb-47b1-90a1-c101150ef57c	ee22900d-6f44-46cb-9810-d99c274ab1b5	match_end	{"reason": "accepted_first", "winner_id": "0e0085f4-1207-4e7b-815d-a5a58183a9ce", "difficulty": "medium", "result_strength": "clear", "duration_seconds": 15, "player_a_actual_score": 0, "player_b_actual_score": 1}	2026-03-08 19:13:36.22923+00	0e0085f4-1207-4e7b-815d-a5a58183a9ce
4810f958-0c91-4bba-9f74-605476ed91cb	c64ddc6e-167f-40a4-b385-a9a5ec943ecd	match_start	{"match_type": "ranked", "problem_id": "82652db9-9214-4e64-98ff-1bd096810a80", "player_a_id": "34e76391-0302-4440-a930-2dd60837f11b", "player_b_id": "0e0085f4-1207-4e7b-815d-a5a58183a9ce", "time_limit_seconds": 600}	2026-03-08 19:13:48.508548+00	34e76391-0302-4440-a930-2dd60837f11b
37e678cd-d4ef-4575-87fd-8a1ae60fa1cb	c64ddc6e-167f-40a4-b385-a9a5ec943ecd	submission	{"score": 100, "total": 5, "passed": 5, "verdict": "Accepted", "duel_score": 184.7, "runtime_ms": 4, "submission_id": null, "wrong_submissions": 0}	2026-03-08 19:14:15.338234+00	0e0085f4-1207-4e7b-815d-a5a58183a9ce
275d81b5-f414-4124-86c1-61ec3a239c82	c64ddc6e-167f-40a4-b385-a9a5ec943ecd	match_end	{"reason": "accepted_first", "winner_id": "0e0085f4-1207-4e7b-815d-a5a58183a9ce", "difficulty": "medium", "result_strength": "clear", "duration_seconds": 27, "player_a_actual_score": 0, "player_b_actual_score": 1}	2026-03-08 19:14:16.263002+00	0e0085f4-1207-4e7b-815d-a5a58183a9ce
d3ac229d-a0f8-4511-bfbb-718e137393bf	4f4e9da2-1192-431e-a7a8-3730a87f9192	match_start	{"match_type": "ranked", "problem_id": "dd95e812-5179-484c-bf7b-2a7f20394ea8", "player_a_id": "34e76391-0302-4440-a930-2dd60837f11b", "player_b_id": "0e0085f4-1207-4e7b-815d-a5a58183a9ce", "time_limit_seconds": 300}	2026-03-08 19:21:03.354945+00	34e76391-0302-4440-a930-2dd60837f11b
e1a72645-9e7a-4815-b6d8-ea8ab9a95e8f	4f4e9da2-1192-431e-a7a8-3730a87f9192	match_end	{"reason": "disconnect_during_match", "winner_id": "34e76391-0302-4440-a930-2dd60837f11b", "difficulty": "easy", "result_strength": "clear", "duration_seconds": 100, "player_a_actual_score": 1, "player_b_actual_score": 0}	2026-03-08 19:22:44.875385+00	34e76391-0302-4440-a930-2dd60837f11b
\.


--
-- Data for Name: match_replays; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.match_replays (id, match_id, replay_data, created_at, events, player_a_timeline, player_b_timeline) FROM stdin;
3b7c06a9-437f-4c5a-b977-1ac759bd35e8	4f4e9da2-1192-431e-a7a8-3730a87f9192	{"status": "FINISHED", "matchId": "4f4e9da2-1192-431e-a7a8-3730a87f9192", "playerA": {"userId": "34e76391-0302-4440-a930-2dd60837f11b", "username": "nasoosadamopoylos", "sessionEvidence": {"socketId": "JuYu0tnHeY9MqiX1AAAF", "ipAddress": "127.0.0.1", "transport": "websocket", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36", "clientMeta": {"origin": "http://localhost:5173", "screen": {"width": 1920, "height": 1080}, "language": "en-GB", "platform": "Win32", "timezone": "Europe/Athens", "viewport": {"width": 1277, "height": 1213}, "deviceClusterId": "e02021c2-fa14-47c2-bf93-f3b4c09f4b71", "hardwareConcurrency": 12}, "connectedAt": "2026-03-08T19:20:46.972Z", "deviceClusterId": "e02021c2-fa14-47c2-bf93-f3b4c09f4b71"}, "connectionRiskFlags": ["shared_ip_live"]}, "playerB": {"userId": "0e0085f4-1207-4e7b-815d-a5a58183a9ce", "username": "nasosadams", "sessionEvidence": {"socketId": "Bsrdy-SEIb-jDqvkAAAH", "ipAddress": "127.0.0.1", "transport": "websocket", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36", "clientMeta": {"origin": "http://localhost:5173", "screen": {"width": 1920, "height": 1080}, "language": "en-GB", "platform": "Win32", "timezone": "Europe/Athens", "viewport": {"width": 1277, "height": 1213}, "deviceClusterId": "c1c24786-fae0-4455-b948-cd938a090d24", "hardwareConcurrency": 12}, "connectedAt": "2026-03-08T19:20:45.315Z", "deviceClusterId": "c1c24786-fae0-4455-b948-cd938a090d24"}, "connectionRiskFlags": []}, "problem": {"id": "dd95e812-5179-484c-bf7b-2a7f20394ea8", "title": "Berners-Lee's Safe Brackets", "timeLimit": 300, "difficulty": "easy"}, "winnerId": "34e76391-0302-4440-a930-2dd60837f11b", "matchType": "ranked", "difficulty": "easy", "generatedAt": "2026-03-08T19:22:45.242Z", "startTimeMs": 1772997663099, "timeLimitSec": 300, "resultStrength": "clear", "finalSubmissions": {"playerA": null, "playerB": null}, "securityEventCount": 0, "persistedSubmissionCount": 0}	2026-03-08 19:22:45.398264+00	[{"id": "d3ac229d-a0f8-4511-bfbb-718e137393bf", "type": "match_start", "userId": "34e76391-0302-4440-a930-2dd60837f11b", "payload": {"match_type": "ranked", "problem_id": "dd95e812-5179-484c-bf7b-2a7f20394ea8", "player_a_id": "34e76391-0302-4440-a930-2dd60837f11b", "player_b_id": "0e0085f4-1207-4e7b-815d-a5a58183a9ce", "time_limit_seconds": 300}, "timestamp": "2026-03-08T19:21:03.354945+00:00"}, {"id": "e1a72645-9e7a-4815-b6d8-ea8ab9a95e8f", "type": "match_end", "userId": "34e76391-0302-4440-a930-2dd60837f11b", "payload": {"reason": "disconnect_during_match", "winner_id": "34e76391-0302-4440-a930-2dd60837f11b", "difficulty": "easy", "result_strength": "clear", "duration_seconds": 100, "player_a_actual_score": 1, "player_b_actual_score": 0}, "timestamp": "2026-03-08T19:22:44.875385+00:00"}]	[]	[]
fefacbee-4de1-46ae-a2a1-a95d12e88b4e	51af14bb-7ded-4009-8788-8061637bb11c	{}	2026-03-06 17:50:28.360288+00	[{"type": "submission", "score": 0, "result": "Runtime Error", "userId": "0e0085f4-1207-4e7b-815d-a5a58183a9ce", "timestamp": 1772819391140}, {"type": "submission", "score": 0, "result": "Runtime Error", "userId": "bee320f9-25e2-4bff-9f0e-e295dd9504a2", "timestamp": 1772819293449}]	[{"code": "// Write your solution here\\nfunction solution(input) {\\n  \\n}", "timestamp": "2026-03-06T17:48:07.877+00:00"}, {"code": "// Write your solution here\\nfunction solution(input) {\\n  \\n}", "timestamp": "2026-03-06T17:48:37.871+00:00"}]	[{"code": "// Write your solution here\\nfunction solution(input) {\\n  const n = input.n;\\n  \\n  if (n === 0) return 0;\\n  \\n  return 1 + (n - 1) % 9;\\n}", "timestamp": "2026-03-06T17:48:28.976+00:00"}]
0aeb5db4-7669-4ac2-90e9-d8a92b32e538	9548c717-f72c-4ff3-95da-e504eeefc5cc	{}	2026-03-06 18:23:20.208513+00	[{"type": "submission", "score": 0, "result": "Runtime Error", "userId": "0e0085f4-1207-4e7b-815d-a5a58183a9ce", "timestamp": 1772821338203}]	[]	[{"code": "// Write your solution here\\nfunction solution(input) {\\n  const noise = input.noise;\\n  const k = input.k;\\n  const limit = input.limit;\\n  \\n  let sum = 0;\\n  for (let i = 0; i < k; i++) {\\n    sum += noise[i];\\n  }\\n  \\n  let count = 0;\\n  if (sum <= limit * k) count++;\\n  \\n  for (let i = k; i < noise.length; i++) {\\n    sum += noise[i] - noise[i - k];\\n    if (sum <= limit * k) count++;\\n  }\\n  \\n  return count;\\n}", "timestamp": "2026-03-06T18:22:46.437+00:00"}]
fec5adf7-2c59-4fcf-894c-f738133aa0e8	a1a18197-b6b6-4ebc-b085-e6c7d6b5ed3c	{}	2026-03-06 18:39:53.953917+00	[{"type": "submission", "score": 100, "result": "Accepted", "userId": "0e0085f4-1207-4e7b-815d-a5a58183a9ce", "timestamp": 1772822392261}]	[]	[]
46bb190a-1172-4cf4-9827-9708f88cd35a	ffd6d14a-c00e-47c4-a12a-e8233281f771	{}	2026-03-06 18:40:41.491412+00	[]	[]	[]
dd19705d-728a-481a-84f7-cbe026497364	56cb5d28-4d23-4bb0-bb18-ce9f4f197afa	{}	2026-03-06 18:41:30.206349+00	[]	[]	[]
ea15379c-83e1-4bdc-80ac-0c4ec227835f	2955c371-e4ad-4acc-8d8b-6a60c04d9235	{}	2026-03-06 18:45:44.144815+00	[]	[]	[]
8dad5712-c302-4e91-9097-b5645c24e5c7	1a34576b-3f37-4f00-be0f-d7f85463b0a8	{}	2026-03-06 18:46:00.049702+00	[]	[{"code": "// Write your solution here\\nfunction solution(input) {\\n  \\n}", "timestamp": "2026-03-06T18:41:29.396+00:00"}]	[]
f2a8313a-8356-4302-9bfd-cd19de4c2ca5	155ae058-aec8-4337-a80f-132358d196d7	{}	2026-03-06 18:55:38.241526+00	[]	[{"code": "// Write your solution here\\nfunction solution(input) {\\n  \\n}", "timestamp": "2026-03-06T18:54:29.347+00:00"}, {"code": "// Write your solution here\\nfunction solution(input) {\\n  \\n}", "timestamp": "2026-03-06T18:54:59.343+00:00"}]	[{"code": "// Write your solution here\\nfunction solution(input) {\\n  \\n}", "timestamp": "2026-03-06T18:54:29.34+00:00"}, {"code": "// Write your solution here\\nfunction solution(input) {\\n  \\n}", "timestamp": "2026-03-06T18:54:59.346+00:00"}]
656ddcb0-cc4d-4bd5-8670-b8ca9932c78b	cd39dff5-3116-45a9-a163-84e3ec6d6767	{}	2026-03-06 19:44:44.330339+00	[]	[]	[]
5011b475-879c-4123-aafe-970497a08b77	6b1eaa66-73f6-4468-91d2-e02429ebd0ae	{}	2026-03-06 19:45:33.19024+00	[]	[]	[]
c6c696bf-d23a-4d6d-96a2-41aac71e7046	f8cfb6df-e079-47a9-a9f0-c96379a24031	{}	2026-03-06 20:09:10.992081+00	[]	[]	[]
f6df739a-d68b-4d77-89e4-b25cbb5bc12d	57302769-9d6a-4a40-b07d-755937304941	{}	2026-03-07 14:46:55.43477+00	[]	[]	[]
32f1565c-4971-4199-9027-041de688426e	50e1afc0-9465-40f3-987f-162e388518ab	{}	2026-03-07 15:59:16.474956+00	[]	[]	[]
bb664d37-cda4-401a-83b9-f05430a415ae	9f479d49-21ef-4bc6-819c-5e8c40df3f44	{}	2026-03-07 16:00:14.729422+00	[]	[]	[]
d1e4a226-95ec-4945-8549-d79d77951bbf	9161b87a-b65a-406f-8aec-03d4441db415	{}	2026-03-07 16:01:06.515334+00	[]	[]	[]
0e9d4539-7699-4f29-b066-20c5adb2d7b5	95869d38-d75d-43f5-879d-bdd890d3b5cd	{}	2026-03-07 16:01:20.032463+00	[]	[]	[]
1a96c396-6610-441f-a6aa-2defbae5f853	a4b4b7f5-bdff-45bf-8f90-4aaab7559f93	{}	2026-03-07 16:08:49.913164+00	[]	[]	[]
a76bc538-b974-491d-a90a-2af085ea6e8f	d38f32d6-1653-440a-b039-d6351537caf7	{}	2026-03-07 16:09:07.80965+00	[]	[]	[]
fd02fad4-944d-429d-9bee-b75becd38285	7d46fde9-d5cf-4e77-81f9-fa56fee56b91	{}	2026-03-07 16:12:49.776522+00	[]	[]	[]
8948814b-3086-4784-82af-e48b5e4bc436	4e5107da-d3c9-4607-b803-e35269adbd01	{}	2026-03-07 16:13:05.261205+00	[]	[]	[]
0c7afe13-aa76-4918-8335-e75e9a1b80ad	6377f13a-d2da-475e-9a56-4e61f9e2294e	{}	2026-03-07 16:17:29.859718+00	[]	[]	[]
4c8c152b-3896-4bb5-9617-beb8f22bd6ef	3af4dd06-db51-45d2-ab3b-4c4869ff0dc1	{}	2026-03-07 16:17:51.559857+00	[]	[]	[]
8b3d4e57-d877-4ccd-bb05-b94a32dcdec8	ff444d6f-b7c8-4b0b-8ce3-d1c9c0836909	{}	2026-03-07 16:20:10.291543+00	[]	[]	[]
e7091d5d-ad57-4b97-812a-780c96be73fe	04999f77-4e02-4411-a1d8-3de7f4e34dab	{}	2026-03-07 16:20:22.706284+00	[]	[]	[]
cddc7e09-c21b-4f3d-a268-9bfa3e01f59a	43c17fe2-d755-4e86-ad08-a36d38884812	{}	2026-03-07 16:25:29.041903+00	[]	[]	[]
6be6259f-3fac-4044-8fae-a353c70f83e7	921e1920-c5a9-401c-b9b6-4a8adee2027b	{}	2026-03-07 16:26:13.622742+00	[]	[]	[]
fee37fa0-369f-40c6-bc4f-6d4a7af7fa7a	31a5efd8-87b3-4aef-9dce-4df222f7b3a0	{"status": "FINISHED", "matchId": "31a5efd8-87b3-4aef-9dce-4df222f7b3a0", "playerA": {"userId": "34e76391-0302-4440-a930-2dd60837f11b", "username": "nasoosadamopoylos", "sessionEvidence": {"socketId": "_B2EzJvzM0617i6VAAAB", "ipAddress": "127.0.0.1", "transport": "websocket", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36", "clientMeta": {"origin": "http://localhost:5173", "screen": {"width": 1920, "height": 1080}, "language": "en-GB", "platform": "Win32", "timezone": "Europe/Athens", "viewport": {"width": 1277, "height": 1213}, "deviceClusterId": "e02021c2-fa14-47c2-bf93-f3b4c09f4b71", "hardwareConcurrency": 12}, "connectedAt": "2026-03-08T19:12:16.030Z", "deviceClusterId": "e02021c2-fa14-47c2-bf93-f3b4c09f4b71"}, "connectionRiskFlags": ["shared_ip_live"]}, "playerB": {"userId": "0e0085f4-1207-4e7b-815d-a5a58183a9ce", "username": "nasosadams", "sessionEvidence": {"socketId": "_ra7_HE2ZeenARpUAAAD", "ipAddress": "127.0.0.1", "transport": "websocket", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36", "clientMeta": {"origin": "http://localhost:5173", "screen": {"width": 1920, "height": 1080}, "language": "en-GB", "platform": "Win32", "timezone": "Europe/Athens", "viewport": {"width": 1277, "height": 1213}, "deviceClusterId": "c1c24786-fae0-4455-b948-cd938a090d24", "hardwareConcurrency": 12}, "connectedAt": "2026-03-08T19:12:08.958Z", "deviceClusterId": "c1c24786-fae0-4455-b948-cd938a090d24"}, "connectionRiskFlags": []}, "problem": {"id": "e0ed3fcd-214d-42f4-b0cd-8f6369cf8c15", "title": "Maxwell's Circular Watch", "timeLimit": 600, "difficulty": "medium"}, "winnerId": "0e0085f4-1207-4e7b-815d-a5a58183a9ce", "matchType": "ranked", "difficulty": "medium", "generatedAt": "2026-03-08T19:13:02.934Z", "startTimeMs": 1772997139764, "timeLimitSec": 600, "resultStrength": "clear", "finalSubmissions": {"playerA": null, "playerB": {"score": 100, "verdict": "Accepted", "attempts": 1, "codeHash": "26071f3a29a1e5919d69104569dbc2446182104070d993f830659c397430157e", "duelScore": 183.2, "elapsedMs": 41737, "submittedAtMs": 1772997181501, "wrongSubmissions": 0}}, "securityEventCount": 0, "persistedSubmissionCount": 0}	2026-03-08 19:13:03.053351+00	[{"id": "e2e129c3-441e-499a-b0b7-9dfba9e3c571", "type": "match_start", "userId": "34e76391-0302-4440-a930-2dd60837f11b", "payload": {"match_type": "ranked", "problem_id": "e0ed3fcd-214d-42f4-b0cd-8f6369cf8c15", "player_a_id": "34e76391-0302-4440-a930-2dd60837f11b", "player_b_id": "0e0085f4-1207-4e7b-815d-a5a58183a9ce", "time_limit_seconds": 600}, "timestamp": "2026-03-08T19:12:20.008943+00:00"}, {"id": "add4a6d7-33e2-4e91-b630-2e8ced86bb8e", "type": "submission", "userId": "0e0085f4-1207-4e7b-815d-a5a58183a9ce", "payload": {"score": 100, "total": 5, "passed": 5, "verdict": "Accepted", "duel_score": 183.2, "runtime_ms": 1514, "submission_id": null, "wrong_submissions": 0}, "timestamp": "2026-03-08T19:13:01.872731+00:00"}, {"id": "c0d5f5f2-e311-46ce-9489-e42d19e50c26", "type": "match_end", "userId": "0e0085f4-1207-4e7b-815d-a5a58183a9ce", "payload": {"reason": "accepted_first", "winner_id": "0e0085f4-1207-4e7b-815d-a5a58183a9ce", "difficulty": "medium", "result_strength": "clear", "duration_seconds": 42, "player_a_actual_score": 0, "player_b_actual_score": 1}, "timestamp": "2026-03-08T19:13:02.557133+00:00"}]	[]	[]
9ee3731f-bee5-4a5d-869d-95b10f555890	ee22900d-6f44-46cb-9810-d99c274ab1b5	{"status": "FINISHED", "matchId": "ee22900d-6f44-46cb-9810-d99c274ab1b5", "playerA": {"userId": "34e76391-0302-4440-a930-2dd60837f11b", "username": "nasoosadamopoylos", "sessionEvidence": {"socketId": "_B2EzJvzM0617i6VAAAB", "ipAddress": "127.0.0.1", "transport": "websocket", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36", "clientMeta": {"origin": "http://localhost:5173", "screen": {"width": 1920, "height": 1080}, "language": "en-GB", "platform": "Win32", "timezone": "Europe/Athens", "viewport": {"width": 1277, "height": 1213}, "deviceClusterId": "e02021c2-fa14-47c2-bf93-f3b4c09f4b71", "hardwareConcurrency": 12}, "connectedAt": "2026-03-08T19:13:16.120Z", "deviceClusterId": "e02021c2-fa14-47c2-bf93-f3b4c09f4b71"}, "connectionRiskFlags": ["shared_ip_live"]}, "playerB": {"userId": "0e0085f4-1207-4e7b-815d-a5a58183a9ce", "username": "nasosadams", "sessionEvidence": {"socketId": "_ra7_HE2ZeenARpUAAAD", "ipAddress": "127.0.0.1", "transport": "websocket", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36", "clientMeta": {"origin": "http://localhost:5173", "screen": {"width": 1920, "height": 1080}, "language": "en-GB", "platform": "Win32", "timezone": "Europe/Athens", "viewport": {"width": 1277, "height": 1213}, "deviceClusterId": "c1c24786-fae0-4455-b948-cd938a090d24", "hardwareConcurrency": 12}, "connectedAt": "2026-03-08T19:13:07.241Z", "deviceClusterId": "c1c24786-fae0-4455-b948-cd938a090d24"}, "connectionRiskFlags": ["shared_ip_live"]}, "problem": {"id": "b0665d9c-d9e7-44d9-b9e3-4bba5793a5ec", "title": "Moser's Rescue Boats", "timeLimit": 600, "difficulty": "medium"}, "winnerId": "0e0085f4-1207-4e7b-815d-a5a58183a9ce", "matchType": "ranked", "difficulty": "medium", "generatedAt": "2026-03-08T19:13:36.516Z", "startTimeMs": 1772997199780, "timeLimitSec": 600, "resultStrength": "clear", "finalSubmissions": {"playerA": null, "playerB": {"score": 100, "verdict": "Accepted", "attempts": 1, "codeHash": "0584e07f613cdd4779682dc358dc13dfb8d1d451475de2f4835d86f109fcc965", "duelScore": 185.9, "elapsedMs": 15481, "submittedAtMs": 1772997215261, "wrongSubmissions": 0}}, "securityEventCount": 0, "persistedSubmissionCount": 0}	2026-03-08 19:13:36.647461+00	[{"id": "decbbc4e-e4e3-46ee-abcf-71867e2ed47c", "type": "match_start", "userId": "34e76391-0302-4440-a930-2dd60837f11b", "payload": {"match_type": "ranked", "problem_id": "b0665d9c-d9e7-44d9-b9e3-4bba5793a5ec", "player_a_id": "34e76391-0302-4440-a930-2dd60837f11b", "player_b_id": "0e0085f4-1207-4e7b-815d-a5a58183a9ce", "time_limit_seconds": 600}, "timestamp": "2026-03-08T19:13:20.038359+00:00"}, {"id": "3c8f2062-f86d-478d-8d6f-402a393b24e2", "type": "submission", "userId": "0e0085f4-1207-4e7b-815d-a5a58183a9ce", "payload": {"score": 100, "total": 5, "passed": 5, "verdict": "Accepted", "duel_score": 185.9, "runtime_ms": 4, "submission_id": null, "wrong_submissions": 0}, "timestamp": "2026-03-08T19:13:35.672935+00:00"}, {"id": "c6547dd0-85bb-47b1-90a1-c101150ef57c", "type": "match_end", "userId": "0e0085f4-1207-4e7b-815d-a5a58183a9ce", "payload": {"reason": "accepted_first", "winner_id": "0e0085f4-1207-4e7b-815d-a5a58183a9ce", "difficulty": "medium", "result_strength": "clear", "duration_seconds": 15, "player_a_actual_score": 0, "player_b_actual_score": 1}, "timestamp": "2026-03-08T19:13:36.22923+00:00"}]	[]	[]
82812479-fa52-4e48-9a99-e28bce7ac908	c64ddc6e-167f-40a4-b385-a9a5ec943ecd	{"status": "FINISHED", "matchId": "c64ddc6e-167f-40a4-b385-a9a5ec943ecd", "playerA": {"userId": "34e76391-0302-4440-a930-2dd60837f11b", "username": "nasoosadamopoylos", "sessionEvidence": {"socketId": "_B2EzJvzM0617i6VAAAB", "ipAddress": "127.0.0.1", "transport": "websocket", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36", "clientMeta": {"origin": "http://localhost:5173", "screen": {"width": 1920, "height": 1080}, "language": "en-GB", "platform": "Win32", "timezone": "Europe/Athens", "viewport": {"width": 1277, "height": 1213}, "deviceClusterId": "e02021c2-fa14-47c2-bf93-f3b4c09f4b71", "hardwareConcurrency": 12}, "connectedAt": "2026-03-08T19:13:41.636Z", "deviceClusterId": "e02021c2-fa14-47c2-bf93-f3b4c09f4b71"}, "connectionRiskFlags": ["shared_ip_live"]}, "playerB": {"userId": "0e0085f4-1207-4e7b-815d-a5a58183a9ce", "username": "nasosadams", "sessionEvidence": {"socketId": "_ra7_HE2ZeenARpUAAAD", "ipAddress": "127.0.0.1", "transport": "websocket", "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36", "clientMeta": {"origin": "http://localhost:5173", "screen": {"width": 1920, "height": 1080}, "language": "en-GB", "platform": "Win32", "timezone": "Europe/Athens", "viewport": {"width": 1277, "height": 1213}, "deviceClusterId": "c1c24786-fae0-4455-b948-cd938a090d24", "hardwareConcurrency": 12}, "connectedAt": "2026-03-08T19:13:38.968Z", "deviceClusterId": "c1c24786-fae0-4455-b948-cd938a090d24"}, "connectionRiskFlags": ["shared_ip_live"]}, "problem": {"id": "82652db9-9214-4e64-98ff-1bd096810a80", "title": "Ride's Nested Archive", "timeLimit": 600, "difficulty": "medium"}, "winnerId": "0e0085f4-1207-4e7b-815d-a5a58183a9ce", "matchType": "ranked", "difficulty": "medium", "generatedAt": "2026-03-08T19:14:16.551Z", "startTimeMs": 1772997228293, "timeLimitSec": 600, "resultStrength": "clear", "finalSubmissions": {"playerA": null, "playerB": {"score": 100, "verdict": "Accepted", "attempts": 1, "codeHash": "19e9caa9350e20f7f0eb3d49cd8645a98266b0c79abf4c408e959dcf9eb38ec8", "duelScore": 184.7, "elapsedMs": 26615, "submittedAtMs": 1772997254908, "wrongSubmissions": 0}}, "securityEventCount": 0, "persistedSubmissionCount": 0}	2026-03-08 19:14:16.665934+00	[{"id": "4810f958-0c91-4bba-9f74-605476ed91cb", "type": "match_start", "userId": "34e76391-0302-4440-a930-2dd60837f11b", "payload": {"match_type": "ranked", "problem_id": "82652db9-9214-4e64-98ff-1bd096810a80", "player_a_id": "34e76391-0302-4440-a930-2dd60837f11b", "player_b_id": "0e0085f4-1207-4e7b-815d-a5a58183a9ce", "time_limit_seconds": 600}, "timestamp": "2026-03-08T19:13:48.508548+00:00"}, {"id": "37e678cd-d4ef-4575-87fd-8a1ae60fa1cb", "type": "submission", "userId": "0e0085f4-1207-4e7b-815d-a5a58183a9ce", "payload": {"score": 100, "total": 5, "passed": 5, "verdict": "Accepted", "duel_score": 184.7, "runtime_ms": 4, "submission_id": null, "wrong_submissions": 0}, "timestamp": "2026-03-08T19:14:15.338234+00:00"}, {"id": "275d81b5-f414-4124-86c1-61ec3a239c82", "type": "match_end", "userId": "0e0085f4-1207-4e7b-815d-a5a58183a9ce", "payload": {"reason": "accepted_first", "winner_id": "0e0085f4-1207-4e7b-815d-a5a58183a9ce", "difficulty": "medium", "result_strength": "clear", "duration_seconds": 27, "player_a_actual_score": 0, "player_b_actual_score": 1}, "timestamp": "2026-03-08T19:14:16.263002+00:00"}]	[]	[]
\.


--
-- Data for Name: matches; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.matches (id, player_a_id, player_b_id, problem_id, match_type, status, winner_id, player_a_score, player_b_score, player_a_rating_before, player_b_rating_before, player_a_rating_after, player_b_rating_after, started_at, completed_at, created_at, start_time, end_time, duration_seconds, ranked, end_time_ms, ended_at, player_a_rating_change, player_b_rating_change, reason, problem_difficulty, time_limit_seconds, duel_result_strength, player_a_partial_score, player_b_partial_score, player_a_wrong_submissions, player_b_wrong_submissions) FROM stdin;
51af14bb-7ded-4009-8788-8061637bb11c	0e0085f4-1207-4e7b-815d-a5a58183a9ce	bee320f9-25e2-4bff-9f0e-e295dd9504a2	eab95847-eaba-4f09-8adf-2f249cad2e75	ranked	FINISHED	bee320f9-25e2-4bff-9f0e-e295dd9504a2	0	0	500	500	500	500	2026-03-06 17:47:36.968+00	2026-03-06 17:50:27.482+00	2026-03-06 17:47:33.653533+00	2026-03-06 17:47:36.968+00	2026-03-06 17:50:27.482+00	170	t	\N	2026-03-06 17:50:27.482+00	0	0	forfeit_disconnect	easy	300	\N	\N	\N	0	0
b2339e08-a28a-47d9-8dc1-a3ab7be90fe8	34e76391-0302-4440-a930-2dd60837f11b	bee320f9-25e2-4bff-9f0e-e295dd9504a2	b67be331-5b6b-436a-93c6-b53011c0ce3a	ranked	WAITING	\N	0	0	500	500	\N	\N	\N	\N	2026-03-06 18:03:18.126651+00	\N	\N	\N	t	\N	\N	0	0	\N	easy	300	\N	\N	\N	0	0
5dfe582d-5a78-4221-a11b-7985e3356c06	34e76391-0302-4440-a930-2dd60837f11b	bee320f9-25e2-4bff-9f0e-e295dd9504a2	f31cf86d-e6ae-46e3-b881-5de7b532098f	ranked	WAITING	\N	0	0	500	500	\N	\N	\N	\N	2026-03-06 18:04:35.509811+00	\N	\N	\N	t	\N	\N	0	0	\N	easy	300	\N	\N	\N	0	0
02ca3831-30ae-41b2-b3ae-eacb8ab8730a	bee320f9-25e2-4bff-9f0e-e295dd9504a2	34e76391-0302-4440-a930-2dd60837f11b	c5a9e19c-37f8-4477-a8ec-cefccf9586d5	ranked	WAITING	\N	0	0	500	500	\N	\N	\N	\N	2026-03-06 18:08:11.303375+00	\N	\N	\N	t	\N	\N	0	0	\N	easy	300	\N	\N	\N	0	0
66322c49-9ad5-4405-92c9-eb5a325d5756	bee320f9-25e2-4bff-9f0e-e295dd9504a2	0e0085f4-1207-4e7b-815d-a5a58183a9ce	4f2b6129-3aa5-479a-9afc-e0f26ee94a24	ranked	WAITING	\N	0	0	500	500	\N	\N	\N	\N	2026-03-06 18:11:13.431932+00	\N	\N	\N	t	\N	\N	0	0	\N	easy	300	\N	\N	\N	0	0
e9ed6e09-25a2-402a-abea-494df142f243	bee320f9-25e2-4bff-9f0e-e295dd9504a2	0e0085f4-1207-4e7b-815d-a5a58183a9ce	5fc6e5a2-b97d-4d52-8bc2-d8db1db0f528	ranked	WAITING	\N	0	0	500	500	\N	\N	\N	\N	2026-03-06 18:12:15.632974+00	\N	\N	\N	t	\N	\N	0	0	\N	easy	300	\N	\N	\N	0	0
9548c717-f72c-4ff3-95da-e504eeefc5cc	bee320f9-25e2-4bff-9f0e-e295dd9504a2	0e0085f4-1207-4e7b-815d-a5a58183a9ce	f31cf86d-e6ae-46e3-b881-5de7b532098f	ranked	FINISHED	bee320f9-25e2-4bff-9f0e-e295dd9504a2	0	0	500	500	500	500	2026-03-06 18:22:01.268+00	2026-03-06 18:23:19.026+00	2026-03-06 18:21:57.995763+00	2026-03-06 18:22:01.268+00	2026-03-06 18:23:19.026+00	77	t	\N	2026-03-06 18:23:19.026+00	0	0	forfeit_disconnect	easy	300	draw	0	0	0	1
a1a18197-b6b6-4ebc-b085-e6c7d6b5ed3c	0e0085f4-1207-4e7b-815d-a5a58183a9ce	34e76391-0302-4440-a930-2dd60837f11b	aa1fb101-79c7-4879-b046-a44789ea3ed1	ranked	ACTIVE	\N	0	0	500	500	\N	\N	2026-03-06 18:39:33.909+00	\N	2026-03-06 18:39:30.596251+00	2026-03-06 18:39:33.91+00	\N	\N	t	\N	\N	0	0	\N	easy	300	\N	\N	\N	0	0
ffd6d14a-c00e-47c4-a12a-e8233281f771	0e0085f4-1207-4e7b-815d-a5a58183a9ce	34e76391-0302-4440-a930-2dd60837f11b	dd95e812-5179-484c-bf7b-2a7f20394ea8	ranked	FINISHED	0e0085f4-1207-4e7b-815d-a5a58183a9ce	0	0	500	500	519	500	2026-03-06 18:39:08.717+00	2026-03-06 18:40:40.386+00	2026-03-06 18:39:05.07281+00	2026-03-06 18:39:08.717+00	2026-03-06 18:40:40.386+00	91	t	\N	2026-03-06 18:40:40.386+00	-1	0	forfeit_disconnect	easy	300	draw	0	0	0	0
56cb5d28-4d23-4bb0-bb18-ce9f4f197afa	34e76391-0302-4440-a930-2dd60837f11b	0e0085f4-1207-4e7b-815d-a5a58183a9ce	57f93e31-8146-42c0-b6d3-5fdddb37f0a2	ranked	FINISHED	34e76391-0302-4440-a930-2dd60837f11b	0	0	500	520	500	518	2026-03-06 18:40:19.717+00	2026-03-06 18:41:29.236+00	2026-03-06 18:40:16.421461+00	2026-03-06 18:40:19.717+00	2026-03-06 18:41:29.236+00	69	t	\N	2026-03-06 18:41:29.236+00	0	-1	forfeit_disconnect	easy	300	draw	0	0	0	0
2955c371-e4ad-4acc-8d8b-6a60c04d9235	34e76391-0302-4440-a930-2dd60837f11b	0e0085f4-1207-4e7b-815d-a5a58183a9ce	eddb8cca-ef33-4d91-90da-9cf87afa9729	ranked	FINISHED	\N	0	0	500	520	500	517	2026-03-06 18:40:41.563+00	2026-03-06 18:45:42.784+00	2026-03-06 18:40:38.177506+00	2026-03-06 18:40:41.563+00	2026-03-06 18:45:42.784+00	300	t	\N	2026-03-06 18:45:42.784+00	0	-1	draw_no_submissions	easy	300	draw	0	0	0	0
1a34576b-3f37-4f00-be0f-d7f85463b0a8	34e76391-0302-4440-a930-2dd60837f11b	0e0085f4-1207-4e7b-815d-a5a58183a9ce	aa1fb101-79c7-4879-b046-a44789ea3ed1	ranked	FINISHED	\N	0	0	500	519	500	516	2026-03-06 18:40:58.119+00	2026-03-06 18:45:59.136+00	2026-03-06 18:40:54.796168+00	2026-03-06 18:40:58.119+00	2026-03-06 18:45:59.136+00	300	t	\N	2026-03-06 18:45:59.136+00	0	-1	draw_no_submissions	easy	300	draw	0	0	0	0
155ae058-aec8-4337-a80f-132358d196d7	34e76391-0302-4440-a930-2dd60837f11b	0e0085f4-1207-4e7b-815d-a5a58183a9ce	7a98ca7b-9605-40b4-9218-0cd68c3b405a	casual	FINISHED	0e0085f4-1207-4e7b-815d-a5a58183a9ce	0	0	500	516	500	516	2026-03-06 18:53:58.357+00	2026-03-06 18:55:36.895+00	2026-03-06 18:53:55.008329+00	2026-03-06 18:53:58.357+00	2026-03-06 18:55:36.895+00	98	f	\N	2026-03-06 18:55:36.895+00	0	0	forfeit_disconnect	medium	600	draw	0	0	0	0
cd39dff5-3116-45a9-a163-84e3ec6d6767	34e76391-0302-4440-a930-2dd60837f11b	0e0085f4-1207-4e7b-815d-a5a58183a9ce	4f2b6129-3aa5-479a-9afc-e0f26ee94a24	casual	FINISHED	34e76391-0302-4440-a930-2dd60837f11b	0	0	500	516	500	516	2026-03-06 19:44:01.391+00	2026-03-06 19:44:43.199+00	2026-03-06 19:43:58.088856+00	2026-03-06 19:44:01.391+00	2026-03-06 19:44:43.199+00	41	f	\N	2026-03-06 19:44:43.199+00	0	0	forfeit_disconnect	easy	300	draw	0	0	0	0
6b1eaa66-73f6-4468-91d2-e02429ebd0ae	34e76391-0302-4440-a930-2dd60837f11b	0e0085f4-1207-4e7b-815d-a5a58183a9ce	8a7e5d8a-78e6-4f1c-a378-454400a81fbd	casual	FINISHED	0e0085f4-1207-4e7b-815d-a5a58183a9ce	0	0	500	516	500	516	2026-03-06 19:44:36.602+00	2026-03-06 19:45:32.518+00	2026-03-06 19:44:33.203555+00	2026-03-06 19:44:36.602+00	2026-03-06 19:45:32.518+00	55	f	\N	2026-03-06 19:45:32.518+00	0	0	forfeit_disconnect	hard	1200	draw	0	0	0	0
f8cfb6df-e079-47a9-a9f0-c96379a24031	34e76391-0302-4440-a930-2dd60837f11b	0e0085f4-1207-4e7b-815d-a5a58183a9ce	eab95847-eaba-4f09-8adf-2f249cad2e75	ranked	FINISHED	34e76391-0302-4440-a930-2dd60837f11b	0	0	500	516	500	515	2026-03-06 20:06:49.146+00	2026-03-06 20:09:09.712+00	2026-03-06 20:06:45.789814+00	2026-03-06 20:06:49.146+00	2026-03-06 20:09:09.712+00	140	t	\N	2026-03-06 20:09:09.712+00	0	-1	forfeit_disconnect	easy	300	draw	0	0	0	0
57302769-9d6a-4a40-b07d-755937304941	34e76391-0302-4440-a930-2dd60837f11b	0e0085f4-1207-4e7b-815d-a5a58183a9ce	10377315-66f0-4fe5-86e1-bf8c0f6d46db	ranked	FINISHED	34e76391-0302-4440-a930-2dd60837f11b	0	0	500	515	500	514	2026-03-07 14:46:48.621+00	2026-03-07 14:46:54.609+00	2026-03-07 14:46:45.351433+00	2026-03-07 14:46:48.621+00	2026-03-07 14:46:54.609+00	5	t	\N	2026-03-07 14:46:54.609+00	0	-1	forfeit_disconnect	easy	300	draw	0	0	0	0
50e1afc0-9465-40f3-987f-162e388518ab	7c343925-d7e2-46ba-8ebb-c88417d49f82	0e0085f4-1207-4e7b-815d-a5a58183a9ce	5fc6e5a2-b97d-4d52-8bc2-d8db1db0f528	ranked	FINISHED	0e0085f4-1207-4e7b-815d-a5a58183a9ce	0	0	500	531	502	529	\N	2026-03-07 15:59:15.597+00	2026-03-07 15:59:12.426135+00	\N	2026-03-07 15:59:15.597+00	2	t	\N	2026-03-07 15:59:15.597+00	2	-2	forfeit_disconnect	easy	300	draw	0	0	0	0
9f479d49-21ef-4bc6-819c-5e8c40df3f44	7c343925-d7e2-46ba-8ebb-c88417d49f82	0e0085f4-1207-4e7b-815d-a5a58183a9ce	eab95847-eaba-4f09-8adf-2f249cad2e75	ranked	FINISHED	0e0085f4-1207-4e7b-815d-a5a58183a9ce	0	0	502	529	504	527	2026-03-07 16:00:11.319+00	2026-03-07 16:00:13.226+00	2026-03-07 16:00:08.035488+00	2026-03-07 16:00:11.319+00	2026-03-07 16:00:13.226+00	1	t	\N	2026-03-07 16:00:13.226+00	2	-2	forfeit_disconnect	easy	300	draw	0	0	0	0
9161b87a-b65a-406f-8aec-03d4441db415	7c343925-d7e2-46ba-8ebb-c88417d49f82	0e0085f4-1207-4e7b-815d-a5a58183a9ce	aa1fb101-79c7-4879-b046-a44789ea3ed1	ranked	FINISHED	0e0085f4-1207-4e7b-815d-a5a58183a9ce	0	0	504	527	505	526	\N	2026-03-07 16:01:05.62+00	2026-03-07 16:01:03.271057+00	\N	2026-03-07 16:01:05.62+00	2	t	\N	2026-03-07 16:01:05.62+00	1	-1	forfeit_disconnect	easy	300	draw	0	0	0	0
95869d38-d75d-43f5-879d-bdd890d3b5cd	7c343925-d7e2-46ba-8ebb-c88417d49f82	0e0085f4-1207-4e7b-815d-a5a58183a9ce	c57e2fd5-b83b-45e8-ab29-39c12b16fedc	ranked	FINISHED	7c343925-d7e2-46ba-8ebb-c88417d49f82	0	0	505	526	506	525	2026-03-07 16:01:17.799+00	2026-03-07 16:01:19.176+00	2026-03-07 16:01:14.51003+00	2026-03-07 16:01:17.799+00	2026-03-07 16:01:19.176+00	1	t	\N	2026-03-07 16:01:19.176+00	1	-1	forfeit_disconnect	medium	600	draw	0	0	0	0
a4b4b7f5-bdff-45bf-8f90-4aaab7559f93	7c343925-d7e2-46ba-8ebb-c88417d49f82	0e0085f4-1207-4e7b-815d-a5a58183a9ce	57f93e31-8146-42c0-b6d3-5fdddb37f0a2	ranked	FINISHED	7c343925-d7e2-46ba-8ebb-c88417d49f82	0	0	506	525	507	525	2026-03-07 16:08:46.705+00	2026-03-07 16:08:49.027+00	2026-03-07 16:08:43.398224+00	2026-03-07 16:08:46.705+00	2026-03-07 16:08:49.027+00	2	t	\N	2026-03-07 16:08:49.027+00	1	0	forfeit_disconnect	easy	300	draw	0	0	0	0
d38f32d6-1653-440a-b039-d6351537caf7	7c343925-d7e2-46ba-8ebb-c88417d49f82	0e0085f4-1207-4e7b-815d-a5a58183a9ce	8f0b84cc-f510-4d62-a4ac-b26c7f5a4033	ranked	FINISHED	0e0085f4-1207-4e7b-815d-a5a58183a9ce	0	0	507	525	508	524	\N	2026-03-07 16:09:06.896+00	2026-03-07 16:09:05.325554+00	\N	2026-03-07 16:09:06.896+00	0	t	\N	2026-03-07 16:09:06.896+00	1	-1	forfeit_disconnect	medium	600	draw	0	0	0	0
7d46fde9-d5cf-4e77-81f9-fa56fee56b91	7c343925-d7e2-46ba-8ebb-c88417d49f82	0e0085f4-1207-4e7b-815d-a5a58183a9ce	b0665d9c-d9e7-44d9-b9e3-4bba5793a5ec	ranked	FINISHED	0e0085f4-1207-4e7b-815d-a5a58183a9ce	0	0	508	524	500	524	\N	2026-03-07 16:12:48.816+00	2026-03-07 16:12:46.80231+00	\N	2026-03-07 16:12:48.816+00	1	t	\N	2026-03-07 16:12:48.816+00	-8	0	disconnect_before_start	medium	600	countdown_forfeit	0	0	0	0
4e5107da-d3c9-4607-b803-e35269adbd01	7c343925-d7e2-46ba-8ebb-c88417d49f82	0e0085f4-1207-4e7b-815d-a5a58183a9ce	8a7e5d8a-78e6-4f1c-a378-454400a81fbd	ranked	FINISHED	0e0085f4-1207-4e7b-815d-a5a58183a9ce	0	0	500	524	500	539	2026-03-07 16:13:02.073+00	2026-03-07 16:13:03.97+00	2026-03-07 16:12:58.785589+00	2026-03-07 16:13:02.073+00	2026-03-07 16:13:03.97+00	1	t	\N	2026-03-07 16:13:03.97+00	-19	15	disconnect_during_match	hard	1200	clear	0	0	0	0
6377f13a-d2da-475e-9a56-4e61f9e2294e	7c343925-d7e2-46ba-8ebb-c88417d49f82	0e0085f4-1207-4e7b-815d-a5a58183a9ce	5079cc77-fa8b-4e44-892a-508eb2e9e13a	ranked	FINISHED	0e0085f4-1207-4e7b-815d-a5a58183a9ce	0	0	500	539	500	539	\N	2026-03-07 16:17:28.965+00	2026-03-07 16:17:26.922015+00	\N	2026-03-07 16:17:28.965+00	1	t	\N	2026-03-07 16:17:28.965+00	0	0	disconnect_before_start	easy	300	countdown_forfeit	0	0	0	0
3af4dd06-db51-45d2-ab3b-4c4869ff0dc1	7c343925-d7e2-46ba-8ebb-c88417d49f82	0e0085f4-1207-4e7b-815d-a5a58183a9ce	c5a9e19c-37f8-4477-a8ec-cefccf9586d5	ranked	FINISHED	0e0085f4-1207-4e7b-815d-a5a58183a9ce	0	0	500	539	500	546	2026-03-07 16:17:47.41+00	2026-03-07 16:17:50.688+00	2026-03-07 16:17:44.105868+00	2026-03-07 16:17:47.41+00	2026-03-07 16:17:50.688+00	3	t	\N	2026-03-07 16:17:50.688+00	-18	7	disconnect_during_match	easy	300	clear	0	0	0	0
ff444d6f-b7c8-4b0b-8ce3-d1c9c0836909	7c343925-d7e2-46ba-8ebb-c88417d49f82	0e0085f4-1207-4e7b-815d-a5a58183a9ce	7a98ca7b-9605-40b4-9218-0cd68c3b405a	ranked	FINISHED	0e0085f4-1207-4e7b-815d-a5a58183a9ce	0	0	500	546	483	546	\N	2026-03-07 16:20:09.062+00	2026-03-07 16:20:07.62398+00	\N	2026-03-07 16:20:09.062+00	1	t	\N	2026-03-07 16:20:09.062+00	-17	0	disconnect_before_start	medium	600	countdown_forfeit	0	0	0	0
04999f77-4e02-4411-a1d8-3de7f4e34dab	7c343925-d7e2-46ba-8ebb-c88417d49f82	0e0085f4-1207-4e7b-815d-a5a58183a9ce	4f2b6129-3aa5-479a-9afc-e0f26ee94a24	ranked	FINISHED	0e0085f4-1207-4e7b-815d-a5a58183a9ce	0	0	483	546	467	553	2026-03-07 16:20:20.094+00	2026-03-07 16:20:21.808+00	2026-03-07 16:20:16.794788+00	2026-03-07 16:20:20.094+00	2026-03-07 16:20:21.808+00	1	t	\N	2026-03-07 16:20:21.808+00	-16	7	disconnect_during_match	easy	300	clear	0	0	0	0
43c17fe2-d755-4e86-ad08-a36d38884812	7c343925-d7e2-46ba-8ebb-c88417d49f82	0e0085f4-1207-4e7b-815d-a5a58183a9ce	5fa29b3c-a9b6-4bd6-8548-babd03fc6c6b	ranked	FINISHED	0e0085f4-1207-4e7b-815d-a5a58183a9ce	0	0	467	553	452	565	2026-03-07 16:25:26.469+00	2026-03-07 16:25:28.114+00	2026-03-07 16:25:23.15358+00	2026-03-07 16:25:26.469+00	2026-03-07 16:25:28.114+00	1	t	\N	2026-03-07 16:25:28.114+00	-15	12	disconnect_during_match	hard	1200	clear	0	0	0	0
921e1920-c5a9-401c-b9b6-4a8adee2027b	7c343925-d7e2-46ba-8ebb-c88417d49f82	0e0085f4-1207-4e7b-815d-a5a58183a9ce	2d89c183-1ed2-4b7d-b0cb-03289594a43b	ranked	FINISHED	7c343925-d7e2-46ba-8ebb-c88417d49f82	0	0	452	565	478	544	2026-03-07 16:26:09.379+00	2026-03-07 16:26:12.732+00	2026-03-07 16:26:06.103473+00	2026-03-07 16:26:09.379+00	2026-03-07 16:26:12.732+00	3	t	\N	2026-03-07 16:26:12.732+00	26	-21	disconnect_during_match	hard	1200	clear	0	0	0	0
31a5efd8-87b3-4aef-9dce-4df222f7b3a0	34e76391-0302-4440-a930-2dd60837f11b	0e0085f4-1207-4e7b-815d-a5a58183a9ce	e0ed3fcd-214d-42f4-b0cd-8f6369cf8c15	ranked	ACTIVE	\N	0	0	500	544	\N	\N	2026-03-08 19:12:19.764+00	\N	2026-03-08 19:12:16.609699+00	2026-03-08 19:12:19.764+00	\N	\N	t	\N	\N	0	0	\N	medium	600	\N	\N	\N	0	0
ee22900d-6f44-46cb-9810-d99c274ab1b5	34e76391-0302-4440-a930-2dd60837f11b	0e0085f4-1207-4e7b-815d-a5a58183a9ce	b0665d9c-d9e7-44d9-b9e3-4bba5793a5ec	ranked	ACTIVE	\N	0	0	490	554	\N	\N	2026-03-08 19:13:19.78+00	\N	2026-03-08 19:13:16.634833+00	2026-03-08 19:13:19.78+00	\N	\N	t	\N	\N	0	0	\N	medium	600	\N	\N	\N	0	0
c64ddc6e-167f-40a4-b385-a9a5ec943ecd	34e76391-0302-4440-a930-2dd60837f11b	0e0085f4-1207-4e7b-815d-a5a58183a9ce	82652db9-9214-4e64-98ff-1bd096810a80	ranked	ACTIVE	\N	0	0	480	564	\N	\N	2026-03-08 19:13:48.293+00	\N	2026-03-08 19:13:45.126619+00	2026-03-08 19:13:48.293+00	\N	\N	t	\N	\N	0	0	\N	medium	600	\N	\N	\N	0	0
4f4e9da2-1192-431e-a7a8-3730a87f9192	34e76391-0302-4440-a930-2dd60837f11b	0e0085f4-1207-4e7b-815d-a5a58183a9ce	dd95e812-5179-484c-bf7b-2a7f20394ea8	ranked	FINISHED	34e76391-0302-4440-a930-2dd60837f11b	0	0	471	573	481	563	2026-03-08 19:21:03.099+00	2026-03-08 19:22:44.238+00	2026-03-08 19:20:59.947459+00	2026-03-08 19:21:03.099+00	2026-03-08 19:22:44.238+00	100	t	\N	2026-03-08 19:22:44.238+00	10	-10	disconnect_during_match	easy	300	clear	0	0	0	0
\.


--
-- Data for Name: problems; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.problems (id, title, statement, difficulty, time_limit_seconds, test_cases, starter_code, supported_languages, is_active, created_at, short_story, input_format, output_format, constraints_text, solution_explanation, reference_solution_javascript, estimated_time_minutes, rating_weight, tags, problem_statement) FROM stdin;
cb5a3ff3-8fa2-4b2c-af52-1c07408537e5	Curie's Cold Notes	You are given an array of integer temperatures and an integer limit. Count how many temperatures are strictly smaller than the limit.\n\nInput Format\nAn object with `temps` (integer array) and `limit` (integer).\n\nOutput Format\nReturn a single integer.\n\nConstraints\n1 <= temps.length <= 100000; -100000 <= temps[i], limit <= 100000.	easy	300	[{"hidden": false, "validator": null, "input_json": {"limit": 3, "temps": [3, -1, 8, 2]}, "compare_mode": null, "expected_json": 2}, {"hidden": false, "validator": null, "input_json": {"limit": 5, "temps": [5, 5, 5]}, "compare_mode": null, "expected_json": 0}, {"hidden": false, "validator": null, "input_json": {"limit": -1, "temps": [-4, -3, -2]}, "compare_mode": null, "expected_json": 3}, {"hidden": true, "validator": null, "input_json": {"limit": 0, "temps": [10]}, "compare_mode": null, "expected_json": 0}, {"hidden": true, "validator": null, "input_json": {"limit": 2, "temps": [7, 1, 7, 1, 7]}, "compare_mode": null, "expected_json": 2}]	{"javascript": "function solution(input) {\\n  // Write your solution here\\n}\\n"}	{javascript}	t	2026-03-06 17:43:37.439495+00	While reviewing Marie Curie's lab notes, each recorded temperature below a safety limit must be counted before a sample can be moved.	An object with `temps` (integer array) and `limit` (integer).	Return a single integer.	1 <= temps.length <= 100000; -100000 <= temps[i], limit <= 100000.	Scan the array once and increment a counter whenever a value is below the limit. This is linear in the number of readings.	function solution(input) {\n  const { temps, limit } = input;\n  let count = 0;\n  for (const value of temps) {\n    if (value < limit) count++;\n  }\n  return count;\n}	5	1.00	{arrays,counting}	You are given an array of integer temperatures and an integer limit. Count how many temperatures are strictly smaller than the limit.
10377315-66f0-4fe5-86e1-bf8c0f6d46db	Hopper's Packet Pair	Given an array `nums` and an integer `target`, return the first pair of indices `[i, j]` with `i < j` such that `nums[i] + nums[j] = target`. If multiple answers exist, choose the one with the smallest `j`, then the smallest `i`.\n\nInput Format\nAn object with `nums` (integer array) and `target` (integer).\n\nOutput Format\nReturn an array `[i, j]`.\n\nConstraints\n2 <= nums.length <= 100000; exactly one valid pair exists.	easy	300	[{"hidden": false, "validator": "two_sum", "input_json": {"nums": [4, 9, 1, 6], "target": 10}, "compare_mode": null, "expected_json": null}, {"hidden": false, "validator": "two_sum", "input_json": {"nums": [2, 8, 2, 5], "target": 10}, "compare_mode": null, "expected_json": null}, {"hidden": false, "validator": "two_sum", "input_json": {"nums": [7, 3, 4, 3], "target": 6}, "compare_mode": null, "expected_json": null}, {"hidden": true, "validator": "two_sum", "input_json": {"nums": [-2, 11, 5, 8], "target": 6}, "compare_mode": null, "expected_json": null}, {"hidden": true, "validator": "two_sum", "input_json": {"nums": [1, 4, 6, 9], "target": 13}, "compare_mode": null, "expected_json": null}]	{"javascript": "function solution(input) {\\n  // Write your solution here\\n}\\n"}	{javascript}	t	2026-03-06 17:43:37.439495+00	While reviewing Grace Hopper's lab notes, two packet sizes must be found quickly so their combined length matches the decoder target.	An object with `nums` (integer array) and `target` (integer).	Return an array `[i, j]`.	2 <= nums.length <= 100000; exactly one valid pair exists.	Use a hash map from value to earliest index. For each position, check whether the complement already exists. Because you scan left to right and only store the first occurrence, the tie-breaking rule is satisfied.	function solution(input) {\n  const { nums, target } = input;\n  const seen = new Map();\n  for (let j = 0; j < nums.length; j++) {\n    const need = target - nums[j];\n    if (seen.has(need)) return [seen.get(need), j];\n    if (!seen.has(nums[j])) seen.set(nums[j], j);\n  }\n  return [];\n}	5	1.00	{arrays,hash-map}	Given an array `nums` and an integer `target`, return the first pair of indices `[i, j]` with `i < j` such that `nums[i] + nums[j] = target`. If multiple answers exist, choose the one with the smallest `j`, then the smallest `i`.
2266f1dc-e7f9-4501-a1d5-8068f51d0801	Kepler's Mirror Label	Given a string `text`, determine whether it is a palindrome after converting letters to lowercase and removing every character that is not a letter or digit.\n\nInput Format\nAn object with `text` (string).\n\nOutput Format\nReturn `true` or `false`.\n\nConstraints\n1 <= text.length <= 200000.	easy	300	[{"hidden": false, "validator": null, "input_json": {"text": "Rotor"}, "compare_mode": null, "expected_json": true}, {"hidden": false, "validator": null, "input_json": {"text": "Lab, bal!"}, "compare_mode": null, "expected_json": true}, {"hidden": false, "validator": null, "input_json": {"text": "planet"}, "compare_mode": null, "expected_json": false}, {"hidden": true, "validator": null, "input_json": {"text": "A man, a plan, a canal: Panama"}, "compare_mode": null, "expected_json": true}, {"hidden": true, "validator": null, "input_json": {"text": "0P"}, "compare_mode": null, "expected_json": false}]	{"javascript": "function solution(input) {\\n  // Write your solution here\\n}\\n"}	{javascript}	t	2026-03-06 17:43:37.439495+00	While reviewing Johannes Kepler's lab notes, a telescope label is accepted only if it reads the same forward and backward after non-letter symbols are ignored.	An object with `text` (string).	Return `true` or `false`.	1 <= text.length <= 200000.	Build two pointers, skip non-alphanumeric characters, and compare lowercase characters as you move inward.	function solution(input) {\n  const s = input.text;\n  let left = 0;\n  let right = s.length - 1;\n  const isAlphaNum = (ch) => /[a-z0-9]/i.test(ch);\n  while (left < right) {\n    while (left < right && !isAlphaNum(s[left])) left++;\n    while (left < right && !isAlphaNum(s[right])) right--;\n    if (s[left].toLowerCase() !== s[right].toLowerCase()) return false;\n    left++;\n    right--;\n  }\n  return true;\n}	5	1.00	{strings,two-pointers}	Given a string `text`, determine whether it is a palindrome after converting letters to lowercase and removing every character that is not a letter or digit.
aa1fb101-79c7-4879-b046-a44789ea3ed1	Franklin's Signal Majority	Given an array of integers, return the value that appears most often. If several values share the maximum frequency, return the smallest such value.\n\nInput Format\nAn object with `values` (integer array).\n\nOutput Format\nReturn one integer.\n\nConstraints\n1 <= values.length <= 100000.	easy	300	[{"hidden": false, "validator": null, "input_json": {"values": [4, 2, 4, 3, 2, 4]}, "compare_mode": null, "expected_json": 4}, {"hidden": false, "validator": null, "input_json": {"values": [9, 9, 1, 1]}, "compare_mode": null, "expected_json": 1}, {"hidden": false, "validator": null, "input_json": {"values": [5]}, "compare_mode": null, "expected_json": 5}, {"hidden": true, "validator": null, "input_json": {"values": [-1, -1, -2, -2, -2]}, "compare_mode": null, "expected_json": -2}, {"hidden": true, "validator": null, "input_json": {"values": [7, 8, 8, 7, 6, 6]}, "compare_mode": null, "expected_json": 6}]	{"javascript": "function solution(input) {\\n  // Write your solution here\\n}\\n"}	{javascript}	t	2026-03-06 17:43:37.439495+00	While reviewing Rosalind Franklin's lab notes, the most common signal value must be reported, and ties are broken by the smaller value to keep the log deterministic.	An object with `values` (integer array).	Return one integer.	1 <= values.length <= 100000.	Count frequencies with a map while tracking the current best value and best frequency.	function solution(input) {\n  const counts = new Map();\n  let bestValue = Infinity;\n  let bestCount = -1;\n  for (const value of input.values) {\n    const next = (counts.get(value) || 0) + 1;\n    counts.set(value, next);\n    if (next > bestCount || (next === bestCount && value < bestValue)) {\n      bestCount = next;\n      bestValue = value;\n    }\n  }\n  return bestValue;\n}	5	1.00	{arrays,hash-map}	Given an array of integers, return the value that appears most often. If several values share the maximum frequency, return the smallest such value.
eab95847-eaba-4f09-8adf-2f249cad2e75	Raman's Digit Echo	Given a non-negative integer `n`, repeatedly replace it with the sum of its digits until the result has only one digit. Return that final digit.\n\nInput Format\nAn object with `n` (non-negative integer).\n\nOutput Format\nReturn one integer.\n\nConstraints\n0 <= n <= 10^12.	easy	300	[{"hidden": false, "validator": null, "input_json": {"n": 0}, "compare_mode": null, "expected_json": 0}, {"hidden": false, "validator": null, "input_json": {"n": 38}, "compare_mode": null, "expected_json": 2}, {"hidden": false, "validator": null, "input_json": {"n": 9999}, "compare_mode": null, "expected_json": 9}, {"hidden": true, "validator": null, "input_json": {"n": 1729}, "compare_mode": null, "expected_json": 1}, {"hidden": true, "validator": null, "input_json": {"n": 500000000000}, "compare_mode": null, "expected_json": 5}]	{"javascript": "function solution(input) {\\n  // Write your solution here\\n}\\n"}	{javascript}	t	2026-03-06 17:43:37.439495+00	While reviewing C. V. Raman's lab notes, a sensor compresses a large number by repeatedly summing its digits until only one digit remains.	An object with `n` (non-negative integer).	Return one integer.	0 <= n <= 10^12.	Loop while the number has at least two digits, summing digits each round.	function solution(input) {\n  let n = input.n;\n  while (n >= 10) {\n    let sum = 0;\n    while (n > 0) {\n      sum += n % 10;\n      n = Math.floor(n / 10);\n    }\n    n = sum;\n  }\n  return n;\n}	5	1.00	{math,number-theory}	Given a non-negative integer `n`, repeatedly replace it with the sum of its digits until the result has only one digit. Return that final digit.
d23b1878-d264-4d4e-b84f-262e64dbb5e0	Galileo's Rising Streak	Given an array of integers, return the length of the longest contiguous strictly increasing segment.\n\nInput Format\nAn object with `values` (integer array).\n\nOutput Format\nReturn one integer.\n\nConstraints\n1 <= values.length <= 200000.	easy	300	[{"hidden": false, "validator": null, "input_json": {"values": [1, 2, 3, 2, 4]}, "compare_mode": null, "expected_json": 3}, {"hidden": false, "validator": null, "input_json": {"values": [5, 4, 3]}, "compare_mode": null, "expected_json": 1}, {"hidden": false, "validator": null, "input_json": {"values": [2, 3, 4, 5, 6]}, "compare_mode": null, "expected_json": 5}, {"hidden": true, "validator": null, "input_json": {"values": [1, 1, 2, 3]}, "compare_mode": null, "expected_json": 3}, {"hidden": true, "validator": null, "input_json": {"values": [9, 10, 7, 8, 9, 10]}, "compare_mode": null, "expected_json": 4}]	{"javascript": "function solution(input) {\\n  // Write your solution here\\n}\\n"}	{javascript}	t	2026-03-06 17:43:37.439495+00	While reviewing Galileo Galilei's lab notes, the observatory wants the longest consecutive run where each reading is strictly larger than the previous one.	An object with `values` (integer array).	Return one integer.	1 <= values.length <= 200000.	Track the current streak length and the best streak length while scanning the array once.	function solution(input) {\n  const values = input.values;\n  let best = 1;\n  let current = 1;\n  for (let i = 1; i < values.length; i++) {\n    if (values[i] > values[i - 1]) current++;\n    else current = 1;\n    if (current > best) best = current;\n  }\n  return best;\n}	5	1.00	{arrays,greedy}	Given an array of integers, return the length of the longest contiguous strictly increasing segment.
05b0faf6-f74f-40c2-b891-3ca05ed54934	Meitner's Rotation Check	Given an array `nums` and a non-negative integer `k`, rotate the array to the right by `k` positions and return the resulting array.\n\nInput Format\nAn object with `nums` (integer array) and `k` (integer).\n\nOutput Format\nReturn the rotated array.\n\nConstraints\n1 <= nums.length <= 200000; 0 <= k <= 10^18.	easy	300	[{"hidden": false, "validator": null, "input_json": {"k": 1, "nums": [1, 2, 3, 4]}, "compare_mode": null, "expected_json": [4, 1, 2, 3]}, {"hidden": false, "validator": null, "input_json": {"k": 4, "nums": [1, 2, 3, 4]}, "compare_mode": null, "expected_json": [1, 2, 3, 4]}, {"hidden": false, "validator": null, "input_json": {"k": 5, "nums": [9, 8, 7]}, "compare_mode": null, "expected_json": [8, 7, 9]}, {"hidden": true, "validator": null, "input_json": {"k": 999, "nums": [5]}, "compare_mode": null, "expected_json": [5]}, {"hidden": true, "validator": null, "input_json": {"k": 2, "nums": [3, 1, 4, 1, 5]}, "compare_mode": null, "expected_json": [1, 5, 3, 1, 4]}]	{"javascript": "function solution(input) {\\n  // Write your solution here\\n}\\n"}	{javascript}	t	2026-03-06 17:43:37.439495+00	While reviewing Lise Meitner's lab notes, a detector array is shifted to the right after each calibration and the final order must be reconstructed.	An object with `nums` (integer array) and `k` (integer).	Return the rotated array.	1 <= nums.length <= 200000; 0 <= k <= 10^18.	Use modulo to reduce `k`, then take the last `k` elements followed by the first `n-k` elements.	function solution(input) {\n  const nums = input.nums;\n  const n = nums.length;\n  const k = input.k % n;\n  if (k === 0) return nums.slice();\n  return nums.slice(n - k).concat(nums.slice(0, n - k));\n}	5	1.00	{arrays}	Given an array `nums` and a non-negative integer `k`, rotate the array to the right by `k` positions and return the resulting array.
c6d7a72a-dac1-41bd-b467-f5982bac94fb	Pasteur's Shared Samples	Given two arrays of integers, return the sorted array of distinct values that appear in both arrays.\n\nInput Format\nAn object with `a` and `b`, both integer arrays.\n\nOutput Format\nReturn an integer array in increasing order.\n\nConstraints\n1 <= a.length, b.length <= 100000.	easy	300	[{"hidden": false, "validator": null, "input_json": {"a": [1, 2, 2, 4], "b": [2, 2, 5]}, "compare_mode": null, "expected_json": [2]}, {"hidden": false, "validator": null, "input_json": {"a": [7, 8], "b": [9, 10]}, "compare_mode": null, "expected_json": []}, {"hidden": false, "validator": null, "input_json": {"a": [-1, 0, 1], "b": [1, 0, -1, -1]}, "compare_mode": null, "expected_json": [-1, 0, 1]}, {"hidden": true, "validator": null, "input_json": {"a": [5, 5, 5], "b": [5]}, "compare_mode": null, "expected_json": [5]}, {"hidden": true, "validator": null, "input_json": {"a": [3, 6, 9], "b": [9, 6, 3]}, "compare_mode": null, "expected_json": [3, 6, 9]}]	{"javascript": "function solution(input) {\\n  // Write your solution here\\n}\\n"}	{javascript}	t	2026-03-06 17:43:37.439495+00	While reviewing Louis Pasteur's lab notes, two trays of cultures are compared and only the sample ids present in both trays should remain.	An object with `a` and `b`, both integer arrays.	Return an integer array in increasing order.	1 <= a.length, b.length <= 100000.	Insert one array into a set, collect matches from the second array into another set, then sort the result.	function solution(input) {\n  const setA = new Set(input.a);\n  const common = new Set();\n  for (const value of input.b) {\n    if (setA.has(value)) common.add(value);\n  }\n  return Array.from(common).sort((x, y) => x - y);\n}	5	1.00	{arrays,hash-set}	Given two arrays of integers, return the sorted array of distinct values that appear in both arrays.
5fc6e5a2-b97d-4d52-8bc2-d8db1db0f528	Herschel's Brightest Row	Given a matrix of integers, find the row with the largest row sum. If several rows tie, return the smallest row index.\n\nInput Format\nAn object with `grid`, a 2D integer array.\n\nOutput Format\nReturn the row index as an integer.\n\nConstraints\n1 <= rows, cols <= 300.	easy	300	[{"hidden": false, "validator": null, "input_json": {"grid": [[1, 2], [3, 0]]}, "compare_mode": null, "expected_json": 0}, {"hidden": false, "validator": null, "input_json": {"grid": [[0], [5], [2]]}, "compare_mode": null, "expected_json": 1}, {"hidden": false, "validator": null, "input_json": {"grid": [[-5, -1], [-2, -2]]}, "compare_mode": null, "expected_json": 1}, {"hidden": true, "validator": null, "input_json": {"grid": [[4, 4], [3, 5], [2, 6]]}, "compare_mode": null, "expected_json": 0}, {"hidden": true, "validator": null, "input_json": {"grid": [[10, 0, 0]]}, "compare_mode": null, "expected_json": 0}]	{"javascript": "function solution(input) {\\n  // Write your solution here\\n}\\n"}	{javascript}	t	2026-03-06 17:43:37.439495+00	While reviewing Caroline Herschel's lab notes, each row of a sensor matrix has a brightness score, and the brightest row index must be reported.	An object with `grid`, a 2D integer array.	Return the row index as an integer.	1 <= rows, cols <= 300.	Compute the sum of each row and keep the index of the best sum seen so far.	function solution(input) {\n  const grid = input.grid;\n  let bestIndex = 0;\n  let bestSum = -Infinity;\n  for (let r = 0; r < grid.length; r++) {\n    let sum = 0;\n    for (const value of grid[r]) sum += value;\n    if (sum > bestSum) {\n      bestSum = sum;\n      bestIndex = r;\n    }\n  }\n  return bestIndex;\n}	5	1.00	{arrays,matrix}	Given a matrix of integers, find the row with the largest row sum. If several rows tie, return the smallest row index.
8fe00872-d24a-4bee-8766-e79125443681	Feynman's Missing Badge	You are given `n` and an array containing every integer from 1 to `n` except one. Return the missing value.\n\nInput Format\nAn object with `n` (integer) and `values` (integer array of length n-1).\n\nOutput Format\nReturn the missing integer.\n\nConstraints\n1 <= n <= 200000.	easy	300	[{"hidden": false, "validator": null, "input_json": {"n": 5, "values": [1, 2, 4, 5]}, "compare_mode": null, "expected_json": 3}, {"hidden": false, "validator": null, "input_json": {"n": 1, "values": []}, "compare_mode": null, "expected_json": 1}, {"hidden": false, "validator": null, "input_json": {"n": 4, "values": [2, 3, 4]}, "compare_mode": null, "expected_json": 1}, {"hidden": true, "validator": null, "input_json": {"n": 6, "values": [1, 2, 3, 4, 5]}, "compare_mode": null, "expected_json": 6}, {"hidden": true, "validator": null, "input_json": {"n": 7, "values": [1, 2, 3, 5, 6, 7]}, "compare_mode": null, "expected_json": 4}]	{"javascript": "function solution(input) {\\n  // Write your solution here\\n}\\n"}	{javascript}	t	2026-03-06 17:43:37.439495+00	While reviewing Richard Feynman's lab notes, one badge number from 1 through n vanished from a shuffled registration list.	An object with `n` (integer) and `values` (integer array of length n-1).	Return the missing integer.	1 <= n <= 200000.	Subtract the sum of the given array from the sum of 1..n.	function solution(input) {\n  const { n, values } = input;\n  const expected = (n * (n + 1)) / 2;\n  let actual = 0;\n  for (const value of values) actual += value;\n  return expected - actual;\n}	5	1.00	{math,arrays}	You are given `n` and an array containing every integer from 1 to `n` except one. Return the missing value.
57f93e31-8146-42c0-b6d3-5fdddb37f0a2	Einstein's Letter Shuffle	Given strings `a` and `b`, determine whether they are anagrams of each other. Uppercase and lowercase letters are considered different.\n\nInput Format\nAn object with strings `a` and `b`.\n\nOutput Format\nReturn `true` or `false`.\n\nConstraints\n0 <= a.length, b.length <= 200000.	easy	300	[{"hidden": false, "validator": null, "input_json": {"a": "silent", "b": "listen"}, "compare_mode": null, "expected_json": true}, {"hidden": false, "validator": null, "input_json": {"a": "Lab", "b": "bal"}, "compare_mode": null, "expected_json": false}, {"hidden": false, "validator": null, "input_json": {"a": "", "b": ""}, "compare_mode": null, "expected_json": true}, {"hidden": true, "validator": null, "input_json": {"a": "triangle", "b": "integral"}, "compare_mode": null, "expected_json": true}, {"hidden": true, "validator": null, "input_json": {"a": "note", "b": "tonee"}, "compare_mode": null, "expected_json": false}]	{"javascript": "function solution(input) {\\n  // Write your solution here\\n}\\n"}	{javascript}	t	2026-03-06 17:43:37.58132+00	While reviewing Albert Einstein's lab notes, two labels refer to the same sample only if one can be rearranged into the other exactly.	An object with strings `a` and `b`.	Return `true` or `false`.	0 <= a.length, b.length <= 200000.	If lengths differ, answer is false. Otherwise count characters from one string and cancel them with the other.	function solution(input) {\n  const { a, b } = input;\n  if (a.length !== b.length) return false;\n  const counts = new Map();\n  for (const ch of a) counts.set(ch, (counts.get(ch) || 0) + 1);\n  for (const ch of b) {\n    if (!counts.has(ch)) return false;\n    const next = counts.get(ch) - 1;\n    if (next === 0) counts.delete(ch);\n    else counts.set(ch, next);\n  }\n  return counts.size === 0;\n}	5	1.00	{strings,hash-map}	Given strings `a` and `b`, determine whether they are anagrams of each other. Uppercase and lowercase letters are considered different.
f31cf86d-e6ae-46e3-b881-5de7b532098f	Goodall's Quiet Window	Given an array `noise`, an integer `k`, and an integer `limit`, count how many contiguous windows of length `k` have average value less than or equal to `limit`.\n\nInput Format\nAn object with `noise` (integer array), `k` (integer), and `limit` (integer).\n\nOutput Format\nReturn one integer.\n\nConstraints\n1 <= k <= noise.length <= 200000.	easy	300	[{"hidden": false, "validator": null, "input_json": {"k": 2, "limit": 3, "noise": [2, 4, 3, 1]}, "compare_mode": null, "expected_json": 2}, {"hidden": false, "validator": null, "input_json": {"k": 1, "limit": 4, "noise": [5, 5, 5]}, "compare_mode": null, "expected_json": 0}, {"hidden": false, "validator": null, "input_json": {"k": 3, "limit": 1, "noise": [1, 1, 1, 1]}, "compare_mode": null, "expected_json": 2}, {"hidden": true, "validator": null, "input_json": {"k": 2, "limit": 4, "noise": [3, 6, 3, 6]}, "compare_mode": null, "expected_json": 0}, {"hidden": true, "validator": null, "input_json": {"k": 1, "limit": 7, "noise": [7]}, "compare_mode": null, "expected_json": 1}]	{"javascript": "function solution(input) {\\n  // Write your solution here\\n}\\n"}	{javascript}	t	2026-03-06 17:43:37.58132+00	While reviewing Jane Goodall's lab notes, a field recorder marks a window as quiet only when the average noise stays at or below the threshold.	An object with `noise` (integer array), `k` (integer), and `limit` (integer).	Return one integer.	1 <= k <= noise.length <= 200000.	Use a sliding window sum. A window is valid if `windowSum <= k * limit`.	function solution(input) {\n  const { noise, k, limit } = input;\n  let sum = 0;\n  let count = 0;\n  for (let i = 0; i < noise.length; i++) {\n    sum += noise[i];\n    if (i >= k) sum -= noise[i - k];\n    if (i >= k - 1 && sum <= k * limit) count++;\n  }\n  return count;\n}	5	1.00	{arrays,sliding-window}	Given an array `noise`, an integer `k`, and an integer `limit`, count how many contiguous windows of length `k` have average value less than or equal to `limit`.
b67be331-5b6b-436a-93c6-b53011c0ce3a	Faraday's Nearest Multiple	Given integers `value` and `step`, return the smallest absolute distance from `value` to any multiple of `step`.\n\nInput Format\nAn object with `value` and `step`.\n\nOutput Format\nReturn one integer.\n\nConstraints\n1 <= step <= 10^9; 0 <= value <= 10^18.	easy	300	[{"hidden": false, "validator": null, "input_json": {"step": 5, "value": 14}, "compare_mode": null, "expected_json": 1}, {"hidden": false, "validator": null, "input_json": {"step": 4, "value": 20}, "compare_mode": null, "expected_json": 0}, {"hidden": false, "validator": null, "input_json": {"step": 7, "value": 1}, "compare_mode": null, "expected_json": 1}, {"hidden": true, "validator": null, "input_json": {"step": 6, "value": 29}, "compare_mode": null, "expected_json": 1}, {"hidden": true, "validator": null, "input_json": {"step": 10, "value": 999999999999}, "compare_mode": null, "expected_json": 1}]	{"javascript": "function solution(input) {\\n  // Write your solution here\\n}\\n"}	{javascript}	t	2026-03-06 17:43:37.58132+00	While reviewing Michael Faraday's lab notes, a calibration wheel snaps to the closest multiple of a base step, and the travel distance must be reported.	An object with `value` and `step`.	Return one integer.	1 <= step <= 10^9; 0 <= value <= 10^18.	Compute `value % step`. The nearest multiple is either below by that remainder or above by `step - remainder`.	function solution(input) {\n  const { value, step } = input;\n  const rem = value % step;\n  return Math.min(rem, (step - rem) % step);\n}	5	1.00	{math}	Given integers `value` and `step`, return the smallest absolute distance from `value` to any multiple of `step`.
e3e3ddc7-58f5-4810-b6f9-c72c489f29da	Sagan's Reversed Broadcast	Given a sentence made of words separated by single spaces, return a new sentence with the word order reversed.\n\nInput Format\nAn object with `sentence` (string).\n\nOutput Format\nReturn a string.\n\nConstraints\n1 <= sentence.length <= 200000; there are no leading or trailing spaces.	easy	300	[{"hidden": false, "validator": null, "input_json": {"sentence": "red blue green"}, "compare_mode": null, "expected_json": "green blue red"}, {"hidden": false, "validator": null, "input_json": {"sentence": "solo"}, "compare_mode": null, "expected_json": "solo"}, {"hidden": false, "validator": null, "input_json": {"sentence": "stars align tonight"}, "compare_mode": null, "expected_json": "tonight align stars"}, {"hidden": true, "validator": null, "input_json": {"sentence": "one two"}, "compare_mode": null, "expected_json": "two one"}, {"hidden": true, "validator": null, "input_json": {"sentence": "alpha beta gamma delta"}, "compare_mode": null, "expected_json": "delta gamma beta alpha"}]	{"javascript": "function solution(input) {\\n  // Write your solution here\\n}\\n"}	{javascript}	t	2026-03-06 17:43:37.58132+00	While reviewing Carl Sagan's lab notes, a transmission arrived with its words in reverse order, but each word itself stayed unchanged.	An object with `sentence` (string).	Return a string.	1 <= sentence.length <= 200000; there are no leading or trailing spaces.	Split the sentence by spaces, reverse the list of words, then join with spaces.	function solution(input) {\n  return input.sentence.split(' ').reverse().join(' ');\n}	5	1.00	{strings}	Given a sentence made of words separated by single spaces, return a new sentence with the word order reversed.
c5a9e19c-37f8-4477-a8ec-cefccf9586d5	Turing's Neighbor Map	Given an undirected graph with nodes labeled from 0 to n-1, count how many nodes have degree exactly one.\n\nInput Format\nAn object with `n` (integer) and `edges` (array of `[u, v]`).\n\nOutput Format\nReturn one integer.\n\nConstraints\n1 <= n <= 200000; 0 <= edges.length <= 200000; no self-loops.	easy	300	[{"hidden": false, "validator": null, "input_json": {"n": 4, "edges": [[0, 1], [1, 2], [1, 3]]}, "compare_mode": null, "expected_json": 3}, {"hidden": false, "validator": null, "input_json": {"n": 3, "edges": [[0, 1], [1, 2], [2, 0]]}, "compare_mode": null, "expected_json": 0}, {"hidden": false, "validator": null, "input_json": {"n": 5, "edges": []}, "compare_mode": null, "expected_json": 0}, {"hidden": true, "validator": null, "input_json": {"n": 2, "edges": [[0, 1]]}, "compare_mode": null, "expected_json": 2}, {"hidden": true, "validator": null, "input_json": {"n": 6, "edges": [[0, 1], [1, 2], [2, 3], [3, 4]]}, "compare_mode": null, "expected_json": 2}]	{"javascript": "function solution(input) {\\n  // Write your solution here\\n}\\n"}	{javascript}	t	2026-03-06 17:43:37.58132+00	While reviewing Alan Turing's lab notes, a network diagram is considered fragile when many nodes have degree one.	An object with `n` (integer) and `edges` (array of `[u, v]`).	Return one integer.	1 <= n <= 200000; 0 <= edges.length <= 200000; no self-loops.	Compute the degree of each node from the edge list, then count how many degrees equal one.	function solution(input) {\n  const deg = Array(input.n).fill(0);\n  for (const [u, v] of input.edges) {\n    deg[u]++;\n    deg[v]++;\n  }\n  let count = 0;\n  for (const d of deg) if (d === 1) count++;\n  return count;\n}	5	1.00	{graphs}	Given an undirected graph with nodes labeled from 0 to n-1, count how many nodes have degree exactly one.
dd95e812-5179-484c-bf7b-2a7f20394ea8	Berners-Lee's Safe Brackets	Given a string containing only `()[]{}`, determine whether it is balanced.\n\nInput Format\nAn object with `s` (string).\n\nOutput Format\nReturn `true` or `false`.\n\nConstraints\n0 <= s.length <= 200000.	easy	300	[{"hidden": false, "validator": null, "input_json": {"s": "()[]{}"}, "compare_mode": null, "expected_json": true}, {"hidden": false, "validator": null, "input_json": {"s": "([)]"}, "compare_mode": null, "expected_json": false}, {"hidden": false, "validator": null, "input_json": {"s": ""}, "compare_mode": null, "expected_json": true}, {"hidden": true, "validator": null, "input_json": {"s": "{[()]}"}, "compare_mode": null, "expected_json": true}, {"hidden": true, "validator": null, "input_json": {"s": "(("}, "compare_mode": null, "expected_json": false}]	{"javascript": "function solution(input) {\\n  // Write your solution here\\n}\\n"}	{javascript}	t	2026-03-06 17:43:37.58132+00	While reviewing Tim Berners-Lee's lab notes, a markup fragment passes the pre-check only if every bracket closes correctly.	An object with `s` (string).	Return `true` or `false`.	0 <= s.length <= 200000.	Use a stack of opening brackets. Each closing bracket must match the top of the stack.	function solution(input) {\n  const map = new Map([[")", "("], ["]", "["], ["}", "{"]]);\n  const stack = [];\n  for (const ch of input.s) {\n    if (map.has(ch)) {\n      if (stack.pop() !== map.get(ch)) return false;\n    } else {\n      stack.push(ch);\n    }\n  }\n  return stack.length === 0;\n}	5	1.00	{strings,stack}	Given a string containing only `()[]{}`, determine whether it is balanced.
5079cc77-fa8b-4e44-892a-508eb2e9e13a	Newton's Coin Drawer	Given a non-negative integer amount, return the minimum number of coins needed using denominations 25, 10, 5, and 1.\n\nInput Format\nAn object with `amount` (integer).\n\nOutput Format\nReturn one integer.\n\nConstraints\n0 <= amount <= 10^9.	easy	300	[{"hidden": false, "validator": null, "input_json": {"amount": 41}, "compare_mode": null, "expected_json": 4}, {"hidden": false, "validator": null, "input_json": {"amount": 0}, "compare_mode": null, "expected_json": 0}, {"hidden": false, "validator": null, "input_json": {"amount": 99}, "compare_mode": null, "expected_json": 9}, {"hidden": true, "validator": null, "input_json": {"amount": 30}, "compare_mode": null, "expected_json": 2}, {"hidden": true, "validator": null, "input_json": {"amount": 7}, "compare_mode": null, "expected_json": 3}]	{"javascript": "function solution(input) {\\n  // Write your solution here\\n}\\n"}	{javascript}	t	2026-03-06 17:43:37.58132+00	While reviewing Isaac Newton's lab notes, the drawer contains coins of values 25, 10, 5, and 1, and the cashier always wants the minimum number of coins.	An object with `amount` (integer).	Return one integer.	0 <= amount <= 10^9.	For canonical U.S.-style coin values, greedily take the largest denomination each time.	function solution(input) {\n  let amount = input.amount;\n  let count = 0;\n  for (const coin of [25, 10, 5, 1]) {\n    count += Math.floor(amount / coin);\n    amount %= coin;\n  }\n  return count;\n}	5	1.00	{greedy,math}	Given a non-negative integer amount, return the minimum number of coins needed using denominations 25, 10, 5, and 1.
eddb8cca-ef33-4d91-90da-9cf87afa9729	Carson's Trail Steps	Given a positive integer `n`, return the sum `1 + 2 + ... + n` using a recursive idea.\n\nInput Format\nAn object with `n` (integer).\n\nOutput Format\nReturn one integer.\n\nConstraints\n1 <= n <= 10000.	easy	300	[{"hidden": false, "validator": null, "input_json": {"n": 1}, "compare_mode": null, "expected_json": 1}, {"hidden": false, "validator": null, "input_json": {"n": 4}, "compare_mode": null, "expected_json": 10}, {"hidden": false, "validator": null, "input_json": {"n": 10}, "compare_mode": null, "expected_json": 55}, {"hidden": true, "validator": null, "input_json": {"n": 7}, "compare_mode": null, "expected_json": 28}, {"hidden": true, "validator": null, "input_json": {"n": 100}, "compare_mode": null, "expected_json": 5050}]	{"javascript": "function solution(input) {\\n  // Write your solution here\\n}\\n"}	{javascript}	t	2026-03-06 17:43:37.58132+00	While reviewing Rachel Carson's lab notes, a ranger logs every step from 1 to n, and the total number of logged steps must be computed recursively.	An object with `n` (integer).	Return one integer.	1 <= n <= 10000.	Use the recurrence `sum(n) = n + sum(n-1)` with base case `sum(1)=1`. The direct formula also works, but this problem highlights simple recursion.	function solution(input) {\n  function go(n) {\n    if (n <= 1) return n;\n    return n + go(n - 1);\n  }\n  return go(input.n);\n}	5	1.00	{recursion,math}	Given a positive integer `n`, return the sum `1 + 2 + ... + n` using a recursive idea.
4f2b6129-3aa5-479a-9afc-e0f26ee94a24	Bohr's Shared Prefix	Given an array of strings, return their longest common prefix. If no common prefix exists, return the empty string.\n\nInput Format\nAn object with `words` (string array).\n\nOutput Format\nReturn a string.\n\nConstraints\n1 <= words.length <= 100000; total characters <= 200000.	easy	300	[{"hidden": false, "validator": null, "input_json": {"words": ["flower", "flow", "flight"]}, "compare_mode": null, "expected_json": "fl"}, {"hidden": false, "validator": null, "input_json": {"words": ["dog", "racecar", "car"]}, "compare_mode": null, "expected_json": ""}, {"hidden": false, "validator": null, "input_json": {"words": ["solo"]}, "compare_mode": null, "expected_json": "solo"}, {"hidden": true, "validator": null, "input_json": {"words": ["interview", "internal", "internet"]}, "compare_mode": null, "expected_json": "inter"}, {"hidden": true, "validator": null, "input_json": {"words": ["aa", "aa", "aa"]}, "compare_mode": null, "expected_json": "aa"}]	{"javascript": "function solution(input) {\\n  // Write your solution here\\n}\\n"}	{javascript}	t	2026-03-06 17:43:37.58132+00	While reviewing Niels Bohr's lab notes, several encoded labels belong to the same batch only up to their longest shared starting segment.	An object with `words` (string array).	Return a string.	1 <= words.length <= 100000; total characters <= 200000.	Start with the first word as the candidate prefix and shorten it until every word starts with it.	function solution(input) {\n  const words = input.words;\n  let prefix = words[0] || '';\n  for (let i = 1; i < words.length; i++) {\n    while (!words[i].startsWith(prefix)) {\n      prefix = prefix.slice(0, -1);\n      if (prefix === '') return '';\n    }\n  }\n  return prefix;\n}	5	1.00	{strings}	Given an array of strings, return their longest common prefix. If no common prefix exists, return the empty string.
4f15a2f4-1f46-4235-90cc-e726efecbbb4	Mendel's Trait Counter	Given an integer array `values` and an array `queries`, return an array where each position is the number of times the corresponding query appears in `values`.\n\nInput Format\nAn object with `values` (integer array) and `queries` (integer array).\n\nOutput Format\nReturn an integer array.\n\nConstraints\n1 <= values.length, queries.length <= 100000.	easy	300	[{"hidden": false, "validator": null, "input_json": {"values": [1, 2, 2, 3], "queries": [2, 4, 1]}, "compare_mode": null, "expected_json": [2, 0, 1]}, {"hidden": false, "validator": null, "input_json": {"values": [5, 5, 5], "queries": [5]}, "compare_mode": null, "expected_json": [3]}, {"hidden": false, "validator": null, "input_json": {"values": [7, 8], "queries": [8, 7, 8]}, "compare_mode": null, "expected_json": [1, 1, 1]}, {"hidden": true, "validator": null, "input_json": {"values": [], "queries": [1, 2]}, "compare_mode": null, "expected_json": [0, 0]}, {"hidden": true, "validator": null, "input_json": {"values": [-1, -1, 0], "queries": [-1, 0, 1]}, "compare_mode": null, "expected_json": [2, 1, 0]}]	{"javascript": "function solution(input) {\\n  // Write your solution here\\n}\\n"}	{javascript}	t	2026-03-06 17:43:37.58132+00	While reviewing Gregor Mendel's lab notes, after cataloging sample traits, the lab wants quick frequency answers for many requested values.	An object with `values` (integer array) and `queries` (integer array).	Return an integer array.	1 <= values.length, queries.length <= 100000.	Precompute a frequency map for `values`, then answer each query in constant average time.	function solution(input) {\n  const freq = new Map();\n  for (const value of input.values) freq.set(value, (freq.get(value) || 0) + 1);\n  return input.queries.map((q) => freq.get(q) || 0);\n}	5	1.00	{arrays,hash-map}	Given an integer array `values` and an array `queries`, return an array where each position is the number of times the corresponding query appears in `values`.
7a98ca7b-9605-40b4-9218-0cd68c3b405a	Noether's Balanced Shift	Given a string `s` containing only the characters `(`, `)`, `[`, `]`, `{`, and `}`, determine whether it is balanced.\n\nInput Format\nAn object with `s` (string).\n\nOutput Format\nReturn `true` if the string is balanced, otherwise return `false`.\n\nConstraints\n1 <= s.length <= 200000.	medium	600	[{"hidden": false, "validator": null, "input_json": {"s": "([]{})"}, "compare_mode": null, "expected_json": true}, {"hidden": false, "validator": null, "input_json": {"s": "([)]"}, "compare_mode": null, "expected_json": false}, {"hidden": false, "validator": null, "input_json": {"s": "(((())))"}, "compare_mode": null, "expected_json": true}, {"hidden": true, "validator": null, "input_json": {"s": "(()"}, "compare_mode": null, "expected_json": false}, {"hidden": true, "validator": null, "input_json": {"s": "{[()()][]}"}, "compare_mode": null, "expected_json": true}]	{"javascript": "function solution(input) {\\n  // Write your solution here\\n}\\n"}	{javascript}	t	2026-03-06 17:43:37.71576+00	While reviewing Emmy Noether's lab notes, a rotor string is considered stable only when every opening marker is matched in the correct order.	An object with `s` (string).	Return `true` if the string is balanced, otherwise return `false`.	1 <= s.length <= 200000.	Use a stack. Push opening brackets, and for each closing bracket verify it matches the latest opening bracket. The string is balanced only if every closing bracket matches and the stack is empty at the end.	function solution(input) {\n  const s = input.s;\n  const stack = [];\n  const pairs = { ')': '(', ']': '[', '}': '{' };\n  for (const ch of s) {\n    if (ch === '(' || ch === '[' || ch === '{') {\n      stack.push(ch);\n    } else {\n      if (stack.length === 0 || stack.pop() !== pairs[ch]) return false;\n    }\n  }\n  return stack.length === 0;\n}	10	1.50	{strings,stack}	Given a string `s` containing only the characters `(`, `)`, `[`, `]`, `{`, and `}`, determine whether it is balanced.
61c808a5-d69e-4d21-990d-7b61e3ebc5b5	Lovelace's Signal Groups	Given an array of lowercase words, group together words that are anagrams of each other. Return the groups sorted by the smallest original index of a member, and keep the words inside each group in their original order.\n\nInput Format\nAn object with `words` (string array).\n\nOutput Format\nReturn an array of string arrays.\n\nConstraints\n1 <= words.length <= 20000; 1 <= words[i].length <= 50.	medium	600	[{"hidden": false, "validator": null, "input_json": {"words": ["code", "deco", "node", "done", "leaf"]}, "compare_mode": null, "expected_json": [["code", "deco"], ["node", "done"], ["leaf"]]}, {"hidden": false, "validator": null, "input_json": {"words": ["rat", "tar", "art"]}, "compare_mode": null, "expected_json": [["rat", "tar", "art"]]}, {"hidden": false, "validator": null, "input_json": {"words": ["ab", "ba", "abc", "cab", "bca"]}, "compare_mode": null, "expected_json": [["ab", "ba"], ["abc", "cab", "bca"]]}, {"hidden": true, "validator": null, "input_json": {"words": ["x"]}, "compare_mode": null, "expected_json": [["x"]]}, {"hidden": true, "validator": null, "input_json": {"words": ["dust", "stud", "tuds", "note"]}, "compare_mode": null, "expected_json": [["dust", "stud", "tuds"], ["note"]]}]	{"javascript": "function solution(input) {\\n  // Write your solution here\\n}\\n"}	{javascript}	t	2026-03-06 17:43:37.71576+00	While reviewing Ada Lovelace's lab notes, encoded signal words must be grouped by their rearranged letter pattern before the engine can process them.	An object with `words` (string array).	Return an array of string arrays.	1 <= words.length <= 20000; 1 <= words[i].length <= 50.	Use the sorted letters of each word as a key in a hash map. Append each word to its group in scan order. Because groups are created when first seen, the final order already matches the required tie-break rule.	function solution(input) {\n  const groups = new Map();\n  for (const word of input.words) {\n    const key = word.split('').sort().join('');\n    if (!groups.has(key)) groups.set(key, []);\n    groups.get(key).push(word);\n  }\n  return Array.from(groups.values());\n}	10	1.50	{strings,hash-map}	Given an array of lowercase words, group together words that are anagrams of each other. Return the groups sorted by the smallest original index of a member, and keep the words inside each group in their original order.
444d9d69-be84-4e73-b0f5-63b30f33bc88	Huygens' Orbit Window	Given an integer array `nums` and an integer `k`, return the maximum sum of any contiguous subarray of length `k`.\n\nInput Format\nAn object with `nums` (integer array) and `k` (integer).\n\nOutput Format\nReturn a single integer.\n\nConstraints\n1 <= k <= nums.length <= 200000; -100000 <= nums[i] <= 100000.	medium	600	[{"hidden": false, "validator": null, "input_json": {"k": 2, "nums": [4, 2, 7, 1, 8]}, "compare_mode": null, "expected_json": 9}, {"hidden": false, "validator": null, "input_json": {"k": 2, "nums": [-3, -2, -5, -1]}, "compare_mode": null, "expected_json": -5}, {"hidden": false, "validator": null, "input_json": {"k": 3, "nums": [5, 5, 5]}, "compare_mode": null, "expected_json": 15}, {"hidden": true, "validator": null, "input_json": {"k": 3, "nums": [1, 9, 2, 8, 3, 7]}, "compare_mode": null, "expected_json": 19}, {"hidden": true, "validator": null, "input_json": {"k": 1, "nums": [10]}, "compare_mode": null, "expected_json": 10}]	{"javascript": "function solution(input) {\\n  // Write your solution here\\n}\\n"}	{javascript}	t	2026-03-06 17:43:37.71576+00	While reviewing Christiaan Huygens's lab notes, a telescope must be pointed during the brightest consecutive block of observations of fixed length.	An object with `nums` (integer array) and `k` (integer).	Return a single integer.	1 <= k <= nums.length <= 200000; -100000 <= nums[i] <= 100000.	Compute the sum of the first window, then slide the window by subtracting the outgoing value and adding the incoming one. Track the maximum seen.	function solution(input) {\n  const { nums, k } = input;\n  let window = 0;\n  for (let i = 0; i < k; i++) window += nums[i];\n  let best = window;\n  for (let i = k; i < nums.length; i++) {\n    window += nums[i] - nums[i - k];\n    if (window > best) best = window;\n  }\n  return best;\n}	10	1.50	{arrays,sliding-window}	Given an integer array `nums` and an integer `k`, return the maximum sum of any contiguous subarray of length `k`.
4ef556ee-f5a8-4b6c-9051-1e789561d218	Wu's Frequency Ledger	Given an integer array `nums`, return the value with the highest frequency. If several values share the highest frequency, return the smallest one among them.\n\nInput Format\nAn object with `nums` (integer array).\n\nOutput Format\nReturn a single integer.\n\nConstraints\n1 <= nums.length <= 200000; -100000 <= nums[i] <= 100000.	medium	600	[{"hidden": false, "validator": null, "input_json": {"nums": [4, 7, 4, 7, 4]}, "compare_mode": null, "expected_json": 4}, {"hidden": false, "validator": null, "input_json": {"nums": [9, 2, 9, 2]}, "compare_mode": null, "expected_json": 2}, {"hidden": false, "validator": null, "input_json": {"nums": [-1, -1, -2, -2, -2]}, "compare_mode": null, "expected_json": -2}, {"hidden": true, "validator": null, "input_json": {"nums": [5]}, "compare_mode": null, "expected_json": 5}, {"hidden": true, "validator": null, "input_json": {"nums": [8, 1, 8, 1, 3, 3, 3]}, "compare_mode": null, "expected_json": 3}]	{"javascript": "function solution(input) {\\n  // Write your solution here\\n}\\n"}	{javascript}	t	2026-03-06 17:43:37.71576+00	While reviewing Chien-Shiung Wu's lab notes, the lab wants the number that appears most often, breaking ties toward the smaller value.	An object with `nums` (integer array).	Return a single integer.	1 <= nums.length <= 200000; -100000 <= nums[i] <= 100000.	Count frequencies in a hash map. Scan the map and keep the value with the largest frequency, using the smaller value as the tie-breaker.	function solution(input) {\n  const freq = new Map();\n  for (const value of input.nums) {\n    freq.set(value, (freq.get(value) || 0) + 1);\n  }\n  let bestValue = null;\n  let bestCount = -1;\n  for (const [value, count] of freq.entries()) {\n    if (count > bestCount || (count === bestCount && value < bestValue)) {\n      bestCount = count;\n      bestValue = value;\n    }\n  }\n  return bestValue;\n}	10	1.50	{arrays,hash-map}	Given an integer array `nums`, return the value with the highest frequency. If several values share the highest frequency, return the smallest one among them.
e0ed3fcd-214d-42f4-b0cd-8f6369cf8c15	Maxwell's Circular Watch	Given a circular integer array `nums`, return an array where each position stores the next greater value encountered when moving right around the circle. If no greater value exists, store `-1`.\n\nInput Format\nAn object with `nums` (integer array).\n\nOutput Format\nReturn an integer array.\n\nConstraints\n1 <= nums.length <= 200000; -100000 <= nums[i] <= 100000.	medium	600	[{"hidden": false, "validator": null, "input_json": {"nums": [2, 5, 1]}, "compare_mode": null, "expected_json": [5, -1, 2]}, {"hidden": false, "validator": null, "input_json": {"nums": [7, 6, 5]}, "compare_mode": null, "expected_json": [-1, 7, 7]}, {"hidden": false, "validator": null, "input_json": {"nums": [1, 2, 3, 4]}, "compare_mode": null, "expected_json": [2, 3, 4, -1]}, {"hidden": true, "validator": null, "input_json": {"nums": [4]}, "compare_mode": null, "expected_json": [-1]}, {"hidden": true, "validator": null, "input_json": {"nums": [3, 1, 2, 1]}, "compare_mode": null, "expected_json": [-1, 2, 3, 3]}]	{"javascript": "function solution(input) {\\n  // Write your solution here\\n}\\n"}	{javascript}	t	2026-03-06 17:43:37.71576+00	While reviewing James Clerk Maxwell's lab notes, each reading on a circular dial must find the next stronger reading that appears when the dial continues around.	An object with `nums` (integer array).	Return an integer array.	1 <= nums.length <= 200000; -100000 <= nums[i] <= 100000.	Use a monotonic decreasing stack of indices. Traverse the array twice; during the second pass you only resolve remaining indices, which simulates circular behavior.	function solution(input) {\n  const nums = input.nums;\n  const n = nums.length;\n  const result = Array(n).fill(-1);\n  const stack = [];\n  for (let i = 0; i < 2 * n; i++) {\n    const idx = i % n;\n    while (stack.length && nums[stack[stack.length - 1]] < nums[idx]) {\n      result[stack.pop()] = nums[idx];\n    }\n    if (i < n) stack.push(idx);\n  }\n  return result;\n}	10	1.50	{arrays,stack}	Given a circular integer array `nums`, return an array where each position stores the next greater value encountered when moving right around the circle. If no greater value exists, store `-1`.
42f15e37-a1e3-46c2-8760-e5238c1cf0f3	Euler's Prime Burden	Given a positive integer `n`, return how many prime factors it has when multiplicity is counted. For example, `12 = 2 * 2 * 3` has 3 prime factors.\n\nInput Format\nAn object with `n` (integer).\n\nOutput Format\nReturn a single integer.\n\nConstraints\n2 <= n <= 10^12.	medium	600	[{"hidden": false, "validator": null, "input_json": {"n": 12}, "compare_mode": null, "expected_json": 3}, {"hidden": false, "validator": null, "input_json": {"n": 97}, "compare_mode": null, "expected_json": 1}, {"hidden": false, "validator": null, "input_json": {"n": 72}, "compare_mode": null, "expected_json": 5}, {"hidden": true, "validator": null, "input_json": {"n": 99991}, "compare_mode": null, "expected_json": 1}, {"hidden": true, "validator": null, "input_json": {"n": 3600}, "compare_mode": null, "expected_json": 8}]	{"javascript": "function solution(input) {\\n  // Write your solution here\\n}\\n"}	{javascript}	t	2026-03-06 17:43:37.71576+00	While reviewing Leonhard Euler's lab notes, a machine's burden score equals the total number of prime factors in its calibration value, counting repetition.	An object with `n` (integer).	Return a single integer.	2 <= n <= 10^12.	Repeatedly divide by each possible factor from 2 upward while the factor squared is at most the remaining number. Count each successful division. If a number greater than 1 remains, it is prime and contributes one more factor.	function solution(input) {\n  let n = input.n;\n  let count = 0;\n  let factor = 2;\n  while (factor * factor <= n) {\n    while (n % factor === 0) {\n      count++;\n      n = Math.floor(n / factor);\n    }\n    factor += factor === 2 ? 1 : 2;\n  }\n  if (n > 1) count++;\n  return count;\n}	10	1.60	{math,number-theory}	Given a positive integer `n`, return how many prime factors it has when multiplicity is counted. For example, `12 = 2 * 2 * 3` has 3 prime factors.
46d66a56-95b3-43d7-9a68-7def48f324dc	McClintock's Segment Merge	Given an array of intervals `[start, end]`, merge all overlapping intervals and return the merged result sorted by start.\n\nInput Format\nAn object with `intervals` (array of integer pairs).\n\nOutput Format\nReturn an array of integer pairs.\n\nConstraints\n1 <= intervals.length <= 200000; -10^9 <= start <= end <= 10^9.	medium	600	[{"hidden": false, "validator": null, "input_json": {"intervals": [[1, 3], [2, 5], [8, 9]]}, "compare_mode": "interval_set", "expected_json": [[1, 5], [8, 9]]}, {"hidden": false, "validator": null, "input_json": {"intervals": [[4, 6], [1, 2], [2, 4]]}, "compare_mode": "interval_set", "expected_json": [[1, 6]]}, {"hidden": false, "validator": null, "input_json": {"intervals": [[5, 7]]}, "compare_mode": "interval_set", "expected_json": [[5, 7]]}, {"hidden": true, "validator": null, "input_json": {"intervals": [[-3, -1], [-2, 2], [5, 8]]}, "compare_mode": "interval_set", "expected_json": [[-3, 2], [5, 8]]}, {"hidden": true, "validator": null, "input_json": {"intervals": [[1, 4], [6, 8], [7, 10]]}, "compare_mode": "interval_set", "expected_json": [[1, 4], [6, 10]]}]	{"javascript": "function solution(input) {\\n  // Write your solution here\\n}\\n"}	{javascript}	t	2026-03-06 17:43:37.71576+00	While reviewing Barbara McClintock's lab notes, overlapping genome activity windows must be combined before they are archived.	An object with `intervals` (array of integer pairs).	Return an array of integer pairs.	1 <= intervals.length <= 200000; -10^9 <= start <= end <= 10^9.	Sort intervals by start, then scan from left to right. If the next interval overlaps the current merged interval, extend the end. Otherwise start a new merged interval.	function solution(input) {\n  const intervals = [...input.intervals].sort((a, b) => a[0] - b[0] || a[1] - b[1]);\n  const merged = [];\n  for (const [start, end] of intervals) {\n    if (!merged.length || start > merged[merged.length - 1][1]) {\n      merged.push([start, end]);\n    } else {\n      merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], end);\n    }\n  }\n  return merged;\n}	10	1.60	{arrays,sorting,intervals}	Given an array of intervals `[start, end]`, merge all overlapping intervals and return the merged result sorted by start.
12ab1162-7c53-4fef-81b9-c708aa9ccfc1	Shannon's Rare Signal	Given a string `s`, return the length of the longest substring that contains no repeated characters.\n\nInput Format\nAn object with `s` (string).\n\nOutput Format\nReturn a single integer.\n\nConstraints\n0 <= s.length <= 200000.	medium	600	[{"hidden": false, "validator": null, "input_json": {"s": "abcaef"}, "compare_mode": null, "expected_json": 5}, {"hidden": false, "validator": null, "input_json": {"s": "bbbb"}, "compare_mode": null, "expected_json": 1}, {"hidden": false, "validator": null, "input_json": {"s": ""}, "compare_mode": null, "expected_json": 0}, {"hidden": true, "validator": null, "input_json": {"s": "pqrspqt"}, "compare_mode": null, "expected_json": 5}, {"hidden": true, "validator": null, "input_json": {"s": "dvdf"}, "compare_mode": null, "expected_json": 3}]	{"javascript": "function solution(input) {\\n  // Write your solution here\\n}\\n"}	{javascript}	t	2026-03-06 17:43:37.71576+00	While reviewing Claude Shannon's lab notes, a signal stream is clean only when the longest block without repeated symbols is identified.	An object with `s` (string).	Return a single integer.	0 <= s.length <= 200000.	Use a sliding window with a hash map from character to last seen index. Move the left boundary past the last occurrence whenever a duplicate appears.	function solution(input) {\n  const s = input.s;\n  const last = new Map();\n  let left = 0;\n  let best = 0;\n  for (let right = 0; right < s.length; right++) {\n    const ch = s[right];\n    if (last.has(ch) && last.get(ch) >= left) {\n      left = last.get(ch) + 1;\n    }\n    last.set(ch, right);\n    best = Math.max(best, right - left + 1);\n  }\n  return best;\n}	10	1.60	{strings,sliding-window,hash-map}	Given a string `s`, return the length of the longest substring that contains no repeated characters.
8f0b84cc-f510-4d62-a4ac-b26c7f5a4033	Bernoulli's Broken Stairs	Given `n` steps and an array `blocked` listing forbidden steps, count how many ways there are to reach step `n` from step `0` using moves of size 1 or 2. Return the result modulo `1000000007`.\n\nInput Format\nAn object with `n` (integer) and `blocked` (integer array).\n\nOutput Format\nReturn a single integer.\n\nConstraints\n1 <= n <= 200000; 0 <= blocked.length <= n.	medium	600	[{"hidden": false, "validator": null, "input_json": {"n": 4, "blocked": []}, "compare_mode": null, "expected_json": 5}, {"hidden": false, "validator": null, "input_json": {"n": 4, "blocked": [2]}, "compare_mode": null, "expected_json": 1}, {"hidden": false, "validator": null, "input_json": {"n": 5, "blocked": [3]}, "compare_mode": null, "expected_json": 2}, {"hidden": true, "validator": null, "input_json": {"n": 1, "blocked": [1]}, "compare_mode": null, "expected_json": 0}, {"hidden": true, "validator": null, "input_json": {"n": 7, "blocked": [4, 6]}, "compare_mode": null, "expected_json": 3}]	{"javascript": "function solution(input) {\\n  // Write your solution here\\n}\\n"}	{javascript}	t	2026-03-06 17:43:37.71576+00	While reviewing Jacob Bernoulli's lab notes, a staircase can be climbed in one-step or two-step moves, but some steps are blocked by loose equipment.	An object with `n` (integer) and `blocked` (integer array).	Return a single integer.	1 <= n <= 200000; 0 <= blocked.length <= n.	Dynamic programming works because the number of ways to reach a step equals the sum of the ways to reach the previous one and the one before it, unless the step is blocked.	function solution(input) {\n  const MOD = 1000000007;\n  const blocked = new Set(input.blocked);\n  const n = input.n;\n  const dp = Array(n + 1).fill(0);\n  dp[0] = blocked.has(0) ? 0 : 1;\n  for (let i = 1; i <= n; i++) {\n    if (blocked.has(i)) {\n      dp[i] = 0;\n      continue;\n    }\n    dp[i] = dp[i - 1];\n    if (i >= 2) dp[i] = (dp[i] + dp[i - 2]) % MOD;\n  }\n  return dp[n];\n}	10	1.70	{dynamic-programming}	Given `n` steps and an array `blocked` listing forbidden steps, count how many ways there are to reach step `n` from step `0` using moves of size 1 or 2. Return the result modulo `1000000007`.
c57e2fd5-b83b-45e8-ab29-39c12b16fedc	Johnson's Safe Route	Given a grid of `0` and `1`, where `0` means open and `1` means blocked, find the length of the shortest path from the top-left cell to the bottom-right cell using only up, down, left, and right moves. If no path exists, return `-1`.\n\nInput Format\nAn object with `grid` (2D integer array).\n\nOutput Format\nReturn a single integer path length counted in number of cells visited, including start and end.\n\nConstraints\n1 <= rows, cols <= 300.	medium	600	[{"hidden": false, "validator": null, "input_json": {"grid": [[0, 0, 0], [1, 1, 0], [0, 0, 0]]}, "compare_mode": null, "expected_json": 5}, {"hidden": false, "validator": null, "input_json": {"grid": [[0, 1], [1, 0]]}, "compare_mode": null, "expected_json": -1}, {"hidden": false, "validator": null, "input_json": {"grid": [[0]]}, "compare_mode": null, "expected_json": 1}, {"hidden": true, "validator": null, "input_json": {"grid": [[0, 0, 1], [0, 0, 0], [1, 0, 0]]}, "compare_mode": null, "expected_json": 5}, {"hidden": true, "validator": null, "input_json": {"grid": [[1]]}, "compare_mode": null, "expected_json": -1}]	{"javascript": "function solution(input) {\\n  // Write your solution here\\n}\\n"}	{javascript}	t	2026-03-06 17:43:37.71576+00	While reviewing Katherine Johnson's lab notes, a shuttle planner needs the shortest path across a grid while avoiding blocked cells.	An object with `grid` (2D integer array).	Return a single integer path length counted in number of cells visited, including start and end.	1 <= rows, cols <= 300.	Use BFS from the start cell. The first time the end cell is reached gives the shortest path length because each move has equal cost.	function solution(input) {\n  const grid = input.grid;\n  const rows = grid.length;\n  const cols = grid[0].length;\n  if (grid[0][0] === 1 || grid[rows - 1][cols - 1] === 1) return -1;\n  const queue = [[0, 0, 1]];\n  const seen = Array.from({ length: rows }, () => Array(cols).fill(false));\n  seen[0][0] = true;\n  const dirs = [[1,0],[-1,0],[0,1],[0,-1]];\n  for (let head = 0; head < queue.length; head++) {\n    const [r, c, dist] = queue[head];\n    if (r === rows - 1 && c === cols - 1) return dist;\n    for (const [dr, dc] of dirs) {\n      const nr = r + dr;\n      const nc = c + dc;\n      if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue;\n      if (seen[nr][nc] || grid[nr][nc] === 1) continue;\n      seen[nr][nc] = true;\n      queue.push([nr, nc, dist + 1]);\n    }\n  }\n  return -1;\n}	10	1.70	{graphs,bfs,grids}	Given a grid of `0` and `1`, where `0` means open and `1` means blocked, find the length of the shortest path from the top-left cell to the bottom-right cell using only up, down, left, and right moves. If no path exists, return `-1`.
11a60fdb-41e0-44fc-a43e-2b26363af6b4	Lamarr's Channel Groups	Given `n` labeled devices `0..n-1` and an array of undirected edges, return the number of connected components in the graph.\n\nInput Format\nAn object with `n` (integer) and `edges` (array of integer pairs).\n\nOutput Format\nReturn a single integer.\n\nConstraints\n1 <= n <= 200000; 0 <= edges.length <= 200000.	medium	600	[{"hidden": false, "validator": null, "input_json": {"n": 5, "edges": [[0, 1], [1, 2], [3, 4]]}, "compare_mode": null, "expected_json": 2}, {"hidden": false, "validator": null, "input_json": {"n": 4, "edges": []}, "compare_mode": null, "expected_json": 4}, {"hidden": false, "validator": null, "input_json": {"n": 3, "edges": [[0, 1], [1, 2]]}, "compare_mode": null, "expected_json": 1}, {"hidden": true, "validator": null, "input_json": {"n": 6, "edges": [[0, 1], [2, 3], [4, 5]]}, "compare_mode": null, "expected_json": 3}, {"hidden": true, "validator": null, "input_json": {"n": 1, "edges": []}, "compare_mode": null, "expected_json": 1}]	{"javascript": "function solution(input) {\\n  // Write your solution here\\n}\\n"}	{javascript}	t	2026-03-06 17:43:37.856785+00	While reviewing Hedy Lamarr's lab notes, devices sharing direct links belong to the same hopping group and must be counted.	An object with `n` (integer) and `edges` (array of integer pairs).	Return a single integer.	1 <= n <= 200000; 0 <= edges.length <= 200000.	Build adjacency lists and run DFS or BFS from every unvisited node. Each new traversal starts a new connected component.	function solution(input) {\n  const { n, edges } = input;\n  const graph = Array.from({ length: n }, () => []);\n  for (const [u, v] of edges) {\n    graph[u].push(v);\n    graph[v].push(u);\n  }\n  const seen = Array(n).fill(false);\n  let groups = 0;\n  for (let i = 0; i < n; i++) {\n    if (seen[i]) continue;\n    groups++;\n    const stack = [i];\n    seen[i] = true;\n    while (stack.length) {\n      const node = stack.pop();\n      for (const next of graph[node]) {\n        if (!seen[next]) {\n          seen[next] = true;\n          stack.push(next);\n        }\n      }\n    }\n  }\n  return groups;\n}	10	1.70	{graphs,dfs}	Given `n` labeled devices `0..n-1` and an array of undirected edges, return the number of connected components in the graph.
3bb257ce-8240-489d-a3e0-d29ed52bfc01	Chandrasekhar's Dock Schedule	Given an array of intervals `[start, end]`, return the minimum number of ports needed so that no overlapping intervals share a port. Intervals that end at time `t` do not overlap intervals that start at time `t`.\n\nInput Format\nAn object with `intervals` (array of integer pairs).\n\nOutput Format\nReturn a single integer.\n\nConstraints\n1 <= intervals.length <= 200000; -10^9 <= start <= end <= 10^9.	medium	600	[{"hidden": false, "validator": null, "input_json": {"intervals": [[1, 4], [2, 5], [7, 9]]}, "compare_mode": null, "expected_json": 2}, {"hidden": false, "validator": null, "input_json": {"intervals": [[1, 2], [2, 3], [3, 4]]}, "compare_mode": null, "expected_json": 1}, {"hidden": false, "validator": null, "input_json": {"intervals": [[0, 10], [1, 3], [2, 4], [5, 8]]}, "compare_mode": null, "expected_json": 3}, {"hidden": true, "validator": null, "input_json": {"intervals": [[5, 7]]}, "compare_mode": null, "expected_json": 1}, {"hidden": true, "validator": null, "input_json": {"intervals": [[1, 6], [2, 7], [3, 8], [4, 9]]}, "compare_mode": null, "expected_json": 4}]	{"javascript": "function solution(input) {\\n  // Write your solution here\\n}\\n"}	{javascript}	t	2026-03-06 17:43:37.856785+00	While reviewing Subrahmanyan Chandrasekhar's lab notes, arrival windows for cargo pods must be assigned to the fewest docking ports.	An object with `intervals` (array of integer pairs).	Return a single integer.	1 <= intervals.length <= 200000; -10^9 <= start <= end <= 10^9.	Sort intervals by start time. Track current end times in a min-heap; when the earliest finishing interval ends before the next one starts, reuse that port, otherwise allocate a new port.	class MinHeap {\n  constructor() { this.data = []; }\n  peek() { return this.data[0]; }\n  push(value) {\n    this.data.push(value);\n    let i = this.data.length - 1;\n    while (i > 0) {\n      const p = Math.floor((i - 1) / 2);\n      if (this.data[p] <= this.data[i]) break;\n      [this.data[p], this.data[i]] = [this.data[i], this.data[p]];\n      i = p;\n    }\n  }\n  pop() {\n    const top = this.data[0];\n    const last = this.data.pop();\n    if (this.data.length) {\n      this.data[0] = last;\n      let i = 0;\n      while (true) {\n        let left = 2 * i + 1;\n        let right = left + 1;\n        let smallest = i;\n        if (left < this.data.length && this.data[left] < this.data[smallest]) smallest = left;\n        if (right < this.data.length && this.data[right] < this.data[smallest]) smallest = right;\n        if (smallest === i) break;\n        [this.data[i], this.data[smallest]] = [this.data[smallest], this.data[i]];\n        i = smallest;\n      }\n    }\n    return top;\n  }\n  size() { return this.data.length; }\n}\n\nfunction solution(input) {\n  const intervals = [...input.intervals].sort((a, b) => a[0] - b[0] || a[1] - b[1]);\n  const heap = new MinHeap();\n  let best = 0;\n  for (const [start, end] of intervals) {\n    while (heap.size() && heap.peek() <= start) heap.pop();\n    heap.push(end);\n    if (heap.size() > best) best = heap.size();\n  }\n  return best;\n}	10	1.80	{greedy,heap,intervals}	Given an array of intervals `[start, end]`, return the minimum number of ports needed so that no overlapping intervals share a port. Intervals that end at time `t` do not overlap intervals that start at time `t`.
32e55e4b-f060-4f37-91e3-5aac6f3dab09	Leavitt's Brightness Order	Given an integer array `nums`, return a new array sorted by increasing frequency. If two values have the same frequency, place the larger value first.\n\nInput Format\nAn object with `nums` (integer array).\n\nOutput Format\nReturn an integer array.\n\nConstraints\n1 <= nums.length <= 100000; -100 <= nums[i] <= 100.	medium	600	[{"hidden": false, "validator": null, "input_json": {"nums": [3, 3, 1, 2, 2, 2]}, "compare_mode": null, "expected_json": [1, 3, 3, 2, 2, 2]}, {"hidden": false, "validator": null, "input_json": {"nums": [4, 4, 5, 5]}, "compare_mode": null, "expected_json": [5, 5, 4, 4]}, {"hidden": false, "validator": null, "input_json": {"nums": [7]}, "compare_mode": null, "expected_json": [7]}, {"hidden": true, "validator": null, "input_json": {"nums": [9, 8, 9, 8, 7]}, "compare_mode": null, "expected_json": [7, 9, 9, 8, 8]}, {"hidden": true, "validator": null, "input_json": {"nums": [-1, -1, -2, -2, -2, 3]}, "compare_mode": null, "expected_json": [3, -1, -1, -2, -2, -2]}]	{"javascript": "function solution(input) {\\n  // Write your solution here\\n}\\n"}	{javascript}	t	2026-03-06 17:43:37.856785+00	While reviewing Henrietta Swan Leavitt's lab notes, measurement values must be sorted by how often they appear, with ties broken by the value itself.	An object with `nums` (integer array).	Return an integer array.	1 <= nums.length <= 100000; -100 <= nums[i] <= 100.	Count frequencies, then sort the values using a comparator based on frequency ascending and value descending.	function solution(input) {\n  const freq = new Map();\n  for (const value of input.nums) {\n    freq.set(value, (freq.get(value) || 0) + 1);\n  }\n  return [...input.nums].sort((a, b) => {\n    const fa = freq.get(a);\n    const fb = freq.get(b);\n    if (fa !== fb) return fa - fb;\n    return b - a;\n  });\n}	10	1.50	{arrays,sorting,hash-map}	Given an integer array `nums`, return a new array sorted by increasing frequency. If two values have the same frequency, place the larger value first.
01c1d3eb-34d8-4878-96fa-04830471f935	Hawking's Reverse Stack	Given an array of tokens representing a valid reverse polish expression, evaluate it. The operators are `+`, `-`, `*`, and `/`, and division truncates toward zero.\n\nInput Format\nAn object with `tokens` (string array).\n\nOutput Format\nReturn a single integer.\n\nConstraints\n1 <= tokens.length <= 100000; the expression is valid and intermediate results fit in 32-bit signed integers.	medium	600	[{"hidden": false, "validator": null, "input_json": {"tokens": ["2", "1", "+", "3", "*"]}, "compare_mode": null, "expected_json": 9}, {"hidden": false, "validator": null, "input_json": {"tokens": ["8", "3", "/"]}, "compare_mode": null, "expected_json": 2}, {"hidden": false, "validator": null, "input_json": {"tokens": ["5", "1", "2", "+", "4", "*", "+", "3", "-"]}, "compare_mode": null, "expected_json": 14}, {"hidden": true, "validator": null, "input_json": {"tokens": ["7", "-3", "/"]}, "compare_mode": null, "expected_json": -2}, {"hidden": true, "validator": null, "input_json": {"tokens": ["4", "13", "5", "/", "+"]}, "compare_mode": null, "expected_json": 6}]	{"javascript": "function solution(input) {\\n  // Write your solution here\\n}\\n"}	{javascript}	t	2026-03-06 17:43:37.856785+00	While reviewing Stephen Hawking's lab notes, a compact expression from a simulation must be evaluated in reverse polish notation.	An object with `tokens` (string array).	Return a single integer.	1 <= tokens.length <= 100000; the expression is valid and intermediate results fit in 32-bit signed integers.	Use a stack. Push numbers. On an operator, pop the top two values, apply the operation in the correct order, and push the result back.	function solution(input) {\n  const stack = [];\n  for (const token of input.tokens) {\n    if (token === '+' || token === '-' || token === '*' || token === '/') {\n      const b = stack.pop();\n      const a = stack.pop();\n      if (token === '+') stack.push(a + b);\n      else if (token === '-') stack.push(a - b);\n      else if (token === '*') stack.push(a * b);\n      else stack.push(Math.trunc(a / b));\n    } else {\n      stack.push(Number(token));\n    }\n  }\n  return stack[0];\n}	10	1.60	{stack,math}	Given an array of tokens representing a valid reverse polish expression, evaluate it. The operators are `+`, `-`, `*`, and `/`, and division truncates toward zero.
82652db9-9214-4e64-98ff-1bd096810a80	Ride's Nested Archive	Given a nested array where each element is either an integer or another nested array of the same form, return the depth-weighted sum. Integers at depth 1 contribute their value once, depth 2 contribute twice, and so on.\n\nInput Format\nAn object with `data` (nested arrays and integers).\n\nOutput Format\nReturn a single integer.\n\nConstraints\nThe total number of integers and arrays is at most 100000; values fit in 32-bit signed integers.	medium	600	[{"hidden": false, "validator": null, "input_json": {"data": [1, [2, 3]]}, "compare_mode": null, "expected_json": 11}, {"hidden": false, "validator": null, "input_json": {"data": [[1], [2, [3]]]}, "compare_mode": null, "expected_json": 15}, {"hidden": false, "validator": null, "input_json": {"data": []}, "compare_mode": null, "expected_json": 0}, {"hidden": true, "validator": null, "input_json": {"data": [5, [1, [2]]]}, "compare_mode": null, "expected_json": 13}, {"hidden": true, "validator": null, "input_json": {"data": [[[[4]]]]}, "compare_mode": null, "expected_json": 16}]	{"javascript": "function solution(input) {\\n  // Write your solution here\\n}\\n"}	{javascript}	t	2026-03-06 17:43:37.856785+00	While reviewing Sally Ride's lab notes, a nested research archive stores integer values inside arrays inside arrays, and the depth-weighted sum is needed.	An object with `data` (nested arrays and integers).	Return a single integer.	The total number of integers and arrays is at most 100000; values fit in 32-bit signed integers.	Use recursion or an explicit stack. For each integer, add `value * depth`. For each nested array, recurse with depth + 1.	function dfs(node, depth) {\n  let total = 0;\n  for (const item of node) {\n    if (Array.isArray(item)) total += dfs(item, depth + 1);\n    else total += item * depth;\n  }\n  return total;\n}\n\nfunction solution(input) {\n  return dfs(input.data, 1);\n}	10	1.70	{recursion,arrays}	Given a nested array where each element is either an integer or another nested array of the same form, return the depth-weighted sum. Integers at depth 1 contribute their value once, depth 2 contribute twice, and so on.
b0665d9c-d9e7-44d9-b9e3-4bba5793a5ec	Moser's Rescue Boats	Given an array `people` of weights and an integer `limit`, return the minimum number of boats required if each boat carries at most two people and the total weight on a boat cannot exceed `limit`.\n\nInput Format\nAn object with `people` (integer array) and `limit` (integer).\n\nOutput Format\nReturn a single integer.\n\nConstraints\n1 <= people.length <= 200000; 1 <= people[i] <= limit <= 10^9.	medium	600	[{"hidden": false, "validator": null, "input_json": {"limit": 3, "people": [3, 2, 2, 1]}, "compare_mode": null, "expected_json": 3}, {"hidden": false, "validator": null, "input_json": {"limit": 4, "people": [4, 4, 4]}, "compare_mode": null, "expected_json": 3}, {"hidden": false, "validator": null, "input_json": {"limit": 3, "people": [1, 2]}, "compare_mode": null, "expected_json": 1}, {"hidden": true, "validator": null, "input_json": {"limit": 5, "people": [2, 3, 4, 5]}, "compare_mode": null, "expected_json": 3}, {"hidden": true, "validator": null, "input_json": {"limit": 7, "people": [5]}, "compare_mode": null, "expected_json": 1}]	{"javascript": "function solution(input) {\\n  // Write your solution here\\n}\\n"}	{javascript}	t	2026-03-06 17:43:37.856785+00	While reviewing Maria Gaetana Agnesi Moser's lab notes, each rescue boat can carry at most two people without exceeding a weight limit.	An object with `people` (integer array) and `limit` (integer).	Return a single integer.	1 <= people.length <= 200000; 1 <= people[i] <= limit <= 10^9.	Sort the weights. Pair the lightest remaining person with the heaviest remaining person whenever possible; otherwise the heaviest person goes alone. This greedy strategy is optimal.	function solution(input) {\n  const people = [...input.people].sort((a, b) => a - b);\n  let left = 0;\n  let right = people.length - 1;\n  let boats = 0;\n  while (left <= right) {\n    if (people[left] + people[right] <= input.limit) left++;\n    right--;\n    boats++;\n  }\n  return boats;\n}	10	1.60	{greedy,sorting}	Given an array `people` of weights and an integer `limit`, return the minimum number of boats required if each boat carries at most two people and the total weight on a boat cannot exceed `limit`.
1aae74ec-c079-4c10-bdb8-b017211d4a3f	Al-Khwarizmi's Divisible Pairs	Given an integer array `nums` and an integer `k`, count how many pairs `(i, j)` with `i < j` satisfy `(nums[i] + nums[j]) % k = 0`.\n\nInput Format\nAn object with `nums` (integer array) and `k` (integer).\n\nOutput Format\nReturn a single integer.\n\nConstraints\n1 <= nums.length <= 200000; 1 <= k <= 100000; -10^9 <= nums[i] <= 10^9.	medium	600	[{"hidden": false, "validator": null, "input_json": {"k": 3, "nums": [1, 2, 3, 4, 5]}, "compare_mode": null, "expected_json": 4}, {"hidden": false, "validator": null, "input_json": {"k": 4, "nums": [2, 2, 2]}, "compare_mode": null, "expected_json": 3}, {"hidden": false, "validator": null, "input_json": {"k": 6, "nums": [5, -1, 7]}, "compare_mode": null, "expected_json": 2}, {"hidden": true, "validator": null, "input_json": {"k": 5, "nums": [0, 0, 0, 0]}, "compare_mode": null, "expected_json": 6}, {"hidden": true, "validator": null, "input_json": {"k": 2, "nums": [1, 1, 1, 1]}, "compare_mode": null, "expected_json": 6}]	{"javascript": "function solution(input) {\\n  // Write your solution here\\n}\\n"}	{javascript}	t	2026-03-06 17:43:37.856785+00	While reviewing Al-Khwarizmi's lab notes, a ledger counts how many pairs of values combine to a total divisible by a chosen modulus.	An object with `nums` (integer array) and `k` (integer).	Return a single integer.	1 <= nums.length <= 200000; 1 <= k <= 100000; -10^9 <= nums[i] <= 10^9.	Track how many previous numbers have each remainder modulo `k`. For the current value, the needed remainder is `(k - r) % k`. Add that count to the answer, then record the current remainder.	function solution(input) {\n  const { nums, k } = input;\n  const count = new Map();\n  let answer = 0;\n  for (const value of nums) {\n    const r = ((value % k) + k) % k;\n    const need = (k - r) % k;\n    answer += count.get(need) || 0;\n    count.set(r, (count.get(r) || 0) + 1);\n  }\n  return answer;\n}	10	1.70	{arrays,hash-map,math}	Given an integer array `nums` and an integer `k`, count how many pairs `(i, j)` with `i < j` satisfy `(nums[i] + nums[j]) % k = 0`.
0fcb7b18-6c29-4c4f-8932-b423fefc766c	Burnell's Island Count	Given a grid of `0` and `1`, count how many connected groups of `1` cells exist using four-directional adjacency.\n\nInput Format\nAn object with `grid` (2D integer array).\n\nOutput Format\nReturn a single integer.\n\nConstraints\n1 <= rows, cols <= 300.	medium	600	[{"hidden": false, "validator": null, "input_json": {"grid": [[1, 1, 0], [0, 1, 0], [1, 0, 1]]}, "compare_mode": null, "expected_json": 3}, {"hidden": false, "validator": null, "input_json": {"grid": [[0, 0], [0, 0]]}, "compare_mode": null, "expected_json": 0}, {"hidden": false, "validator": null, "input_json": {"grid": [[1]]}, "compare_mode": null, "expected_json": 1}, {"hidden": true, "validator": null, "input_json": {"grid": [[1, 0, 1, 0], [1, 0, 0, 1], [0, 0, 1, 1]]}, "compare_mode": null, "expected_json": 3}, {"hidden": true, "validator": null, "input_json": {"grid": [[1, 1], [1, 1]]}, "compare_mode": null, "expected_json": 1}]	{"javascript": "function solution(input) {\\n  // Write your solution here\\n}\\n"}	{javascript}	t	2026-03-06 17:43:37.856785+00	While reviewing Jocelyn Bell Burnell's lab notes, clusters of active cells in a sky map must be counted as separate islands of signal.	An object with `grid` (2D integer array).	Return a single integer.	1 <= rows, cols <= 300.	Traverse the grid. Whenever an unvisited land cell is found, start a DFS or BFS to mark its full component, then increment the island count.	function solution(input) {\n  const grid = input.grid.map((row) => [...row]);\n  const rows = grid.length;\n  const cols = grid[0].length;\n  let islands = 0;\n  const dirs = [[1,0],[-1,0],[0,1],[0,-1]];\n  for (let r = 0; r < rows; r++) {\n    for (let c = 0; c < cols; c++) {\n      if (grid[r][c] !== 1) continue;\n      islands++;\n      const stack = [[r, c]];\n      grid[r][c] = 0;\n      while (stack.length) {\n        const [cr, cc] = stack.pop();\n        for (const [dr, dc] of dirs) {\n          const nr = cr + dr;\n          const nc = cc + dc;\n          if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue;\n          if (grid[nr][nc] !== 1) continue;\n          grid[nr][nc] = 0;\n          stack.push([nr, nc]);\n        }\n      }\n    }\n  }\n  return islands;\n}	10	1.70	{graphs,dfs,grids}	Given a grid of `0` and `1`, count how many connected groups of `1` cells exist using four-directional adjacency.
0fc37fdd-27d6-4d9c-bd7f-e2e670ec1c88	Babbage's Divisor Sweep	Given a positive integer `n`, return all of its positive divisors in increasing order.\n\nInput Format\nAn object with `n` (integer).\n\nOutput Format\nReturn an integer array sorted in increasing order.\n\nConstraints\n1 <= n <= 10^12.	medium	600	[{"hidden": false, "validator": null, "input_json": {"n": 1}, "compare_mode": null, "expected_json": [1]}, {"hidden": false, "validator": null, "input_json": {"n": 12}, "compare_mode": null, "expected_json": [1, 2, 3, 4, 6, 12]}, {"hidden": false, "validator": null, "input_json": {"n": 49}, "compare_mode": null, "expected_json": [1, 7, 49]}, {"hidden": true, "validator": null, "input_json": {"n": 18}, "compare_mode": null, "expected_json": [1, 2, 3, 6, 9, 18]}, {"hidden": true, "validator": null, "input_json": {"n": 97}, "compare_mode": null, "expected_json": [1, 97]}]	{"javascript": "function solution(input) {\\n  // Write your solution here\\n}\\n"}	{javascript}	t	2026-03-06 17:43:37.856785+00	While reviewing Charles Babbage's lab notes, a mechanical table can only be printed after every positive divisor of a number is listed in increasing order.	An object with `n` (integer).	Return an integer array sorted in increasing order.	1 <= n <= 10^12.	Scan possible divisors from 1 up to the square root of `n`. Whenever `d` divides `n`, record both `d` and `n / d`. Keep small divisors in one array and large divisors in another, then reverse the large-divisor array and append it.	function solution(input) {\n  const n = input.n;\n  const small = [];\n  const large = [];\n  let d = 1;\n  while (d * d <= n) {\n    if (n % d === 0) {\n      small.push(d);\n      if (d * d !== n) large.push(Math.floor(n / d));\n    }\n    d++;\n  }\n  large.reverse();\n  return small.concat(large);\n}	10	1.60	{math,number-theory}	Given a positive integer `n`, return all of its positive divisors in increasing order.
f5838b01-a62b-4579-9725-eb997a3c4a8f	Franklin's Coin Planner	Given an array `coins` of positive integers and an integer `amount`, return the minimum number of coins needed to make exactly `amount`. If it is impossible, return `-1`.\n\nInput Format\nAn object with `coins` (integer array) and `amount` (integer).\n\nOutput Format\nReturn a single integer.\n\nConstraints\n1 <= coins.length <= 100; 1 <= coins[i] <= 10000; 0 <= amount <= 100000.	medium	600	[{"hidden": false, "validator": null, "input_json": {"coins": [1, 3, 4], "amount": 6}, "compare_mode": null, "expected_json": 2}, {"hidden": false, "validator": null, "input_json": {"coins": [2], "amount": 3}, "compare_mode": null, "expected_json": -1}, {"hidden": false, "validator": null, "input_json": {"coins": [5, 7], "amount": 0}, "compare_mode": null, "expected_json": 0}, {"hidden": true, "validator": null, "input_json": {"coins": [2, 5, 10], "amount": 27}, "compare_mode": null, "expected_json": 4}, {"hidden": true, "validator": null, "input_json": {"coins": [9, 6, 5, 1], "amount": 11}, "compare_mode": null, "expected_json": 2}]	{"javascript": "function solution(input) {\\n  // Write your solution here\\n}\\n"}	{javascript}	t	2026-03-06 17:43:37.856785+00	While reviewing Rosalind Franklin's lab notes, a lab machine must be paid exactly using the smallest number of token denominations.	An object with `coins` (integer array) and `amount` (integer).	Return a single integer.	1 <= coins.length <= 100; 1 <= coins[i] <= 10000; 0 <= amount <= 100000.	Use dynamic programming where `dp[x]` stores the fewest coins needed for amount `x`. Update each amount from previous reachable amounts.	function solution(input) {\n  const { coins, amount } = input;\n  const INF = amount + 1;\n  const dp = Array(amount + 1).fill(INF);\n  dp[0] = 0;\n  for (const coin of coins) {\n    for (let x = coin; x <= amount; x++) {\n      dp[x] = Math.min(dp[x], dp[x - coin] + 1);\n    }\n  }\n  return dp[amount] === INF ? -1 : dp[amount];\n}	10	1.80	{dynamic-programming}	Given an array `coins` of positive integers and an integer `amount`, return the minimum number of coins needed to make exactly `amount`. If it is impossible, return `-1`.
359b5024-47fd-4895-89d2-3200e4ad3922	Turing's Cipher Relay	Given `beginWord`, `endWord`, and an array `words`, return the minimum number of words in a transformation sequence from `beginWord` to `endWord` such that consecutive words differ in exactly one position and every intermediate word belongs to `words`. If no sequence exists, return `0`.\n\nInput Format\nAn object with `beginWord` (string), `endWord` (string), and `words` (string array).\n\nOutput Format\nReturn a single integer.\n\nConstraints\n1 <= words.length <= 5000; all words have the same length between 1 and 10.	hard	1200	[{"hidden": false, "validator": null, "input_json": {"words": ["cord", "card", "ward", "warm", "word"], "endWord": "warm", "beginWord": "cold"}, "compare_mode": null, "expected_json": 5}, {"hidden": false, "validator": null, "input_json": {"words": ["load", "goad", "gold"], "endWord": "gold", "beginWord": "lead"}, "compare_mode": null, "expected_json": 4}, {"hidden": false, "validator": null, "input_json": {"words": ["came", "case", "cast"], "endWord": "cost", "beginWord": "same"}, "compare_mode": null, "expected_json": 0}, {"hidden": true, "validator": null, "input_json": {"words": ["span", "span", "spit", "spat", "spot"], "endWord": "spot", "beginWord": "spin"}, "compare_mode": null, "expected_json": 3}, {"hidden": true, "validator": null, "input_json": {"words": ["hot", "dot", "dog", "lot", "log", "cog"], "endWord": "cog", "beginWord": "hit"}, "compare_mode": null, "expected_json": 5}]	{"javascript": "function solution(input) {\\n  // Write your solution here\\n}\\n"}	{javascript}	t	2026-03-06 17:43:38.006554+00	While reviewing Alan Turing's lab notes, a message can move between code words only by changing one letter at a time through approved intermediate words.	An object with `beginWord` (string), `endWord` (string), and `words` (string array).	Return a single integer.	1 <= words.length <= 5000; all words have the same length between 1 and 10.	Build wildcard patterns such as `h*t` and map each pattern to all words matching it. Then run BFS from the start word. The first time the end word is reached gives the shortest transformation length.	function solution(input) {\n  const { beginWord, endWord, words } = input;\n  const dict = new Set(words);\n  if (!dict.has(endWord)) return 0;\n  const allWords = [...dict, beginWord];\n  const patterns = new Map();\n  for (const word of allWords) {\n    for (let i = 0; i < word.length; i++) {\n      const pattern = word.slice(0, i) + '*' + word.slice(i + 1);\n      if (!patterns.has(pattern)) patterns.set(pattern, []);\n      patterns.get(pattern).push(word);\n    }\n  }\n  const queue = [[beginWord, 1]];\n  const seen = new Set([beginWord]);\n  for (let head = 0; head < queue.length; head++) {\n    const [word, dist] = queue[head];\n    if (word === endWord) return dist;\n    for (let i = 0; i < word.length; i++) {\n      const pattern = word.slice(0, i) + '*' + word.slice(i + 1);\n      const nextWords = patterns.get(pattern) || [];\n      for (const next of nextWords) {\n        if (!seen.has(next)) {\n          seen.add(next);\n          queue.push([next, dist + 1]);\n        }\n      }\n      patterns.set(pattern, []);\n    }\n  }\n  return 0;\n}	20	2.20	{graphs,bfs,strings}	Given `beginWord`, `endWord`, and an array `words`, return the minimum number of words in a transformation sequence from `beginWord` to `endWord` such that consecutive words differ in exactly one position and every intermediate word belongs to `words`. If no sequence exists, return `0`.
f6e1edab-a785-4e56-9cd4-05606edb26a1	Kovalevskaya's Gravity Route	Given `n` nodes labeled `0..n-1`, an array of directed weighted edges `[from, to, cost]`, a `start`, and a `target`, return the minimum total cost from `start` to `target`. If no route exists, return `-1`.\n\nInput Format\nAn object with `n` (integer), `edges` (array of triples), `start` (integer), and `target` (integer).\n\nOutput Format\nReturn a single integer.\n\nConstraints\n1 <= n <= 100000; 0 <= edges.length <= 200000; 0 <= cost <= 10^9.	hard	1200	[{"hidden": false, "validator": null, "input_json": {"n": 4, "edges": [[0, 1, 3], [1, 3, 4], [0, 2, 10], [2, 3, 1]], "start": 0, "target": 3}, "compare_mode": null, "expected_json": 7}, {"hidden": false, "validator": null, "input_json": {"n": 3, "edges": [[0, 1, 5]], "start": 0, "target": 2}, "compare_mode": null, "expected_json": -1}, {"hidden": false, "validator": null, "input_json": {"n": 5, "edges": [[0, 1, 2], [1, 2, 2], [0, 2, 10], [2, 4, 1], [1, 4, 10]], "start": 0, "target": 4}, "compare_mode": null, "expected_json": 5}, {"hidden": true, "validator": null, "input_json": {"n": 1, "edges": [], "start": 0, "target": 0}, "compare_mode": null, "expected_json": 0}, {"hidden": true, "validator": null, "input_json": {"n": 6, "edges": [[0, 1, 7], [0, 2, 9], [0, 5, 14], [1, 2, 10], [1, 3, 15], [2, 3, 11], [2, 5, 2], [3, 4, 6], [5, 4, 9]], "start": 0, "target": 4}, "compare_mode": null, "expected_json": 20}]	{"javascript": "function solution(input) {\\n  // Write your solution here\\n}\\n"}	{javascript}	t	2026-03-06 17:43:38.006554+00	While reviewing Sofia Kovalevskaya's lab notes, stations are connected by weighted tunnels, and the cheapest route from the launch node to the target must be computed.	An object with `n` (integer), `edges` (array of triples), `start` (integer), and `target` (integer).	Return a single integer.	1 <= n <= 100000; 0 <= edges.length <= 200000; 0 <= cost <= 10^9.	Use Dijkstra's algorithm because all edge costs are non-negative. Maintain the current best distance to every node and always expand the not-yet-processed node with the smallest distance.	class MinHeap {\n  constructor() { this.data = []; }\n  push(item) {\n    this.data.push(item);\n    let i = this.data.length - 1;\n    while (i > 0) {\n      const p = Math.floor((i - 1) / 2);\n      if (this.data[p][0] <= this.data[i][0]) break;\n      [this.data[p], this.data[i]] = [this.data[i], this.data[p]];\n      i = p;\n    }\n  }\n  pop() {\n    const top = this.data[0];\n    const last = this.data.pop();\n    if (this.data.length) {\n      this.data[0] = last;\n      let i = 0;\n      while (true) {\n        let left = 2 * i + 1;\n        let right = left + 1;\n        let best = i;\n        if (left < this.data.length && this.data[left][0] < this.data[best][0]) best = left;\n        if (right < this.data.length && this.data[right][0] < this.data[best][0]) best = right;\n        if (best === i) break;\n        [this.data[i], this.data[best]] = [this.data[best], this.data[i]];\n        i = best;\n      }\n    }\n    return top;\n  }\n  size() { return this.data.length; }\n}\n\nfunction solution(input) {\n  const { n, edges, start, target } = input;\n  const graph = Array.from({ length: n }, () => []);\n  for (const [u, v, w] of edges) graph[u].push([v, w]);\n  const dist = Array(n).fill(Infinity);\n  dist[start] = 0;\n  const heap = new MinHeap();\n  heap.push([0, start]);\n  while (heap.size()) {\n    const [cost, node] = heap.pop();\n    if (cost !== dist[node]) continue;\n    if (node === target) return cost;\n    for (const [next, weight] of graph[node]) {\n      const candidate = cost + weight;\n      if (candidate < dist[next]) {\n        dist[next] = candidate;\n        heap.push([candidate, next]);\n      }\n    }\n  }\n  return -1;\n}	20	2.30	{graphs,dijkstra}	Given `n` nodes labeled `0..n-1`, an array of directed weighted edges `[from, to, cost]`, a `start`, and a `target`, return the minimum total cost from `start` to `target`. If no route exists, return `-1`.
22cbbf59-59fb-4e0e-a0b5-c3c70989e616	Bell's Echo Matrix	Given a matrix of integers, return the length of the longest path where every next cell is adjacent up, down, left, or right and contains a strictly larger value.\n\nInput Format\nAn object with `grid` (2D integer array).\n\nOutput Format\nReturn a single integer.\n\nConstraints\n1 <= rows, cols <= 200; -10^9 <= grid[r][c] <= 10^9.	hard	1200	[{"hidden": false, "validator": null, "input_json": {"grid": [[9, 9, 4], [6, 6, 8], [2, 1, 1]]}, "compare_mode": null, "expected_json": 4}, {"hidden": false, "validator": null, "input_json": {"grid": [[3, 4, 5], [3, 2, 6], [2, 2, 1]]}, "compare_mode": null, "expected_json": 4}, {"hidden": false, "validator": null, "input_json": {"grid": [[7]]}, "compare_mode": null, "expected_json": 1}, {"hidden": true, "validator": null, "input_json": {"grid": [[1, 2, 3], [6, 5, 4], [7, 8, 9]]}, "compare_mode": null, "expected_json": 9}, {"hidden": true, "validator": null, "input_json": {"grid": [[5, 4], [3, 2]]}, "compare_mode": null, "expected_json": 3}]	{"javascript": "function solution(input) {\\n  // Write your solution here\\n}\\n"}	{javascript}	t	2026-03-06 17:43:38.006554+00	While reviewing Alexander Graham Bell's lab notes, signal strength rises across a matrix, and the longest strictly increasing route must be measured.	An object with `grid` (2D integer array).	Return a single integer.	1 <= rows, cols <= 200; -10^9 <= grid[r][c] <= 10^9.	Use DFS with memoization. The best path starting from a cell is 1 plus the best path of any larger neighbor. Cache the result per cell so each state is solved once.	function solution(input) {\n  const grid = input.grid;\n  const rows = grid.length;\n  const cols = grid[0].length;\n  const memo = Array.from({ length: rows }, () => Array(cols).fill(0));\n  const dirs = [[1,0],[-1,0],[0,1],[0,-1]];\n  function dfs(r, c) {\n    if (memo[r][c]) return memo[r][c];\n    let best = 1;\n    for (const [dr, dc] of dirs) {\n      const nr = r + dr;\n      const nc = c + dc;\n      if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue;\n      if (grid[nr][nc] > grid[r][c]) {\n        best = Math.max(best, 1 + dfs(nr, nc));\n      }\n    }\n    memo[r][c] = best;\n    return best;\n  }\n  let answer = 0;\n  for (let r = 0; r < rows; r++) {\n    for (let c = 0; c < cols; c++) {\n      answer = Math.max(answer, dfs(r, c));\n    }\n  }\n  return answer;\n}	20	2.30	{dynamic-programming,graphs,dfs}	Given a matrix of integers, return the length of the longest path where every next cell is adjacent up, down, left, or right and contains a strictly larger value.
2f375227-a849-4c81-9e30-5327e133f948	Nash's Coin Strategy	Given an array `coins`, two players alternately take one coin from either the left end or the right end. Both play optimally. Return the final score difference `firstPlayerScore - secondPlayerScore`.\n\nInput Format\nAn object with `coins` (integer array).\n\nOutput Format\nReturn a single integer.\n\nConstraints\n1 <= coins.length <= 2000; -10^6 <= coins[i] <= 10^6.	hard	1200	[{"hidden": false, "validator": null, "input_json": {"coins": [4, 7, 2]}, "compare_mode": null, "expected_json": -1}, {"hidden": false, "validator": null, "input_json": {"coins": [5, 3, 7, 10]}, "compare_mode": null, "expected_json": 5}, {"hidden": false, "validator": null, "input_json": {"coins": [8]}, "compare_mode": null, "expected_json": 8}, {"hidden": true, "validator": null, "input_json": {"coins": [1, 100, 3]}, "compare_mode": null, "expected_json": -96}, {"hidden": true, "validator": null, "input_json": {"coins": [2, 2, 2, 2]}, "compare_mode": null, "expected_json": 0}]	{"javascript": "function solution(input) {\\n  // Write your solution here\\n}\\n"}	{javascript}	t	2026-03-06 17:43:38.006554+00	While reviewing John Nash's lab notes, two players alternately take a coin from either end of a line, and the first player wants the maximum score difference.	An object with `coins` (integer array).	Return a single integer.	1 <= coins.length <= 2000; -10^6 <= coins[i] <= 10^6.	Use interval DP. Let `dp[l][r]` be the best difference the current player can secure from subarray `l..r`. Then `dp[l][r] = max(coins[l] - dp[l+1][r], coins[r] - dp[l][r-1])`.	function solution(input) {\n  const coins = input.coins;\n  const n = coins.length;\n  const dp = Array.from({ length: n }, () => Array(n).fill(0));\n  for (let i = 0; i < n; i++) dp[i][i] = coins[i];\n  for (let len = 2; len <= n; len++) {\n    for (let left = 0; left + len - 1 < n; left++) {\n      const right = left + len - 1;\n      dp[left][right] = Math.max(coins[left] - dp[left + 1][right], coins[right] - dp[left][right - 1]);\n    }\n  }\n  return dp[0][n - 1];\n}	20	2.20	{dynamic-programming,game-theory}	Given an array `coins`, two players alternately take one coin from either the left end or the right end. Both play optimally. Return the final score difference `firstPlayerScore - secondPlayerScore`.
5fa29b3c-a9b6-4bd6-8548-babd03fc6c6b	Mirzakhani's Museum Tour	Given a directed acyclic graph with `n` nodes labeled `0..n-1`, an array of edges `[from, to]`, a `start`, and an `end`, return the number of distinct directed paths from `start` to `end` modulo `1000000007`.\n\nInput Format\nAn object with `n` (integer), `edges` (array of pairs), `start` (integer), and `end` (integer).\n\nOutput Format\nReturn a single integer.\n\nConstraints\n1 <= n <= 200000; 0 <= edges.length <= 300000; the graph is a DAG.	hard	1200	[{"hidden": false, "validator": null, "input_json": {"n": 4, "end": 3, "edges": [[0, 1], [0, 2], [1, 3], [2, 3]], "start": 0}, "compare_mode": null, "expected_json": 2}, {"hidden": false, "validator": null, "input_json": {"n": 5, "end": 4, "edges": [[0, 1], [1, 2], [0, 2], [2, 4], [1, 4]], "start": 0}, "compare_mode": null, "expected_json": 3}, {"hidden": false, "validator": null, "input_json": {"n": 3, "end": 2, "edges": [[0, 1]], "start": 0}, "compare_mode": null, "expected_json": 0}, {"hidden": true, "validator": null, "input_json": {"n": 1, "end": 0, "edges": [], "start": 0}, "compare_mode": null, "expected_json": 1}, {"hidden": true, "validator": null, "input_json": {"n": 6, "end": 5, "edges": [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4], [3, 5], [4, 5]], "start": 0}, "compare_mode": null, "expected_json": 4}]	{"javascript": "function solution(input) {\\n  // Write your solution here\\n}\\n"}	{javascript}	t	2026-03-06 17:43:38.006554+00	While reviewing Maryam Mirzakhani's lab notes, hallways form a directed acyclic route map, and the number of ways to reach the exit gallery must be counted.	An object with `n` (integer), `edges` (array of pairs), `start` (integer), and `end` (integer).	Return a single integer.	1 <= n <= 200000; 0 <= edges.length <= 300000; the graph is a DAG.	Topologically process the DAG. Track how many ways reach each node; propagate each count along outgoing edges. Because the graph is acyclic, every contribution is finalized when processed in topological order.	function solution(input) {\n  const MOD = 1000000007;\n  const { n, edges, start, end } = input;\n  const graph = Array.from({ length: n }, () => []);\n  const indeg = Array(n).fill(0);\n  for (const [u, v] of edges) {\n    graph[u].push(v);\n    indeg[v]++;\n  }\n  const queue = [];\n  for (let i = 0; i < n; i++) if (indeg[i] === 0) queue.push(i);\n  const ways = Array(n).fill(0);\n  ways[start] = 1;\n  for (let head = 0; head < queue.length; head++) {\n    const node = queue[head];\n    for (const next of graph[node]) {\n      ways[next] = (ways[next] + ways[node]) % MOD;\n      indeg[next]--;\n      if (indeg[next] === 0) queue.push(next);\n    }\n  }\n  return ways[end];\n}	20	2.40	{graphs,dynamic-programming,topological-sort}	Given a directed acyclic graph with `n` nodes labeled `0..n-1`, an array of edges `[from, to]`, a `start`, and an `end`, return the number of distinct directed paths from `start` to `end` modulo `1000000007`.
8a7e5d8a-78e6-4f1c-a378-454400a81fbd	Godel's Longest Brackets	Given a string `s` consisting only of `(` and `)`, return the length of the longest contiguous substring that forms a valid parentheses sequence.\n\nInput Format\nAn object with `s` (string).\n\nOutput Format\nReturn a single integer.\n\nConstraints\n0 <= s.length <= 200000.	hard	1200	[{"hidden": false, "validator": null, "input_json": {"s": "(()"}, "compare_mode": null, "expected_json": 2}, {"hidden": false, "validator": null, "input_json": {"s": ")()())"}, "compare_mode": null, "expected_json": 4}, {"hidden": false, "validator": null, "input_json": {"s": ""}, "compare_mode": null, "expected_json": 0}, {"hidden": true, "validator": null, "input_json": {"s": "((()))()"}, "compare_mode": null, "expected_json": 8}, {"hidden": true, "validator": null, "input_json": {"s": "())((())"}, "compare_mode": null, "expected_json": 4}]	{"javascript": "function solution(input) {\\n  // Write your solution here\\n}\\n"}	{javascript}	t	2026-03-06 17:43:38.006554+00	While reviewing Kurt Godel's lab notes, a proof fragment contains parentheses, and the longest valid contiguous region must be extracted by length.	An object with `s` (string).	Return a single integer.	0 <= s.length <= 200000.	Use a stack of indices. Initialize it with `-1`. When you see `(` push its index. When you see `)`, pop. If the stack becomes empty, push the current index as a new base. Otherwise update the best length with the distance to the new top.	function solution(input) {\n  const s = input.s;\n  const stack = [-1];\n  let best = 0;\n  for (let i = 0; i < s.length; i++) {\n    if (s[i] === '(') {\n      stack.push(i);\n    } else {\n      stack.pop();\n      if (!stack.length) {\n        stack.push(i);\n      } else {\n        best = Math.max(best, i - stack[stack.length - 1]);\n      }\n    }\n  }\n  return best;\n}	20	2.10	{strings,stack}	Given a string `s` consisting only of `(` and `)`, return the length of the longest contiguous substring that forms a valid parentheses sequence.
2d89c183-1ed2-4b7d-b0cb-03289594a43b	Bardeen's Charge Network	Given `n` nodes labeled `0..n-1` and an array of undirected weighted edges `[u, v, w]`, return the total weight of a minimum spanning tree. If the graph is disconnected, return `-1`.\n\nInput Format\nAn object with `n` (integer) and `edges` (array of triples).\n\nOutput Format\nReturn a single integer.\n\nConstraints\n1 <= n <= 200000; 0 <= edges.length <= 300000; 0 <= w <= 10^9.	hard	1200	[{"hidden": false, "validator": null, "input_json": {"n": 4, "edges": [[0, 1, 1], [1, 2, 2], [0, 2, 5], [2, 3, 1]]}, "compare_mode": null, "expected_json": 4}, {"hidden": false, "validator": null, "input_json": {"n": 3, "edges": [[0, 1, 7]]}, "compare_mode": null, "expected_json": -1}, {"hidden": false, "validator": null, "input_json": {"n": 1, "edges": []}, "compare_mode": null, "expected_json": 0}, {"hidden": true, "validator": null, "input_json": {"n": 5, "edges": [[0, 1, 1], [1, 2, 1], [2, 3, 1], [3, 4, 1], [0, 4, 10], [1, 4, 3]]}, "compare_mode": null, "expected_json": 4}, {"hidden": true, "validator": null, "input_json": {"n": 4, "edges": [[0, 1, 4], [0, 2, 3], [1, 2, 2], [2, 3, 5], [1, 3, 6]]}, "compare_mode": null, "expected_json": 10}]	{"javascript": "function solution(input) {\\n  // Write your solution here\\n}\\n"}	{javascript}	t	2026-03-06 17:43:38.006554+00	While reviewing John Bardeen's lab notes, an undirected weighted network must be connected with the minimum possible total cable cost.	An object with `n` (integer) and `edges` (array of triples).	Return a single integer.	1 <= n <= 200000; 0 <= edges.length <= 300000; 0 <= w <= 10^9.	Sort edges by weight and run Kruskal's algorithm using a disjoint-set union structure. Add an edge only if it connects two currently separate components.	class DSU {\n  constructor(n) {\n    this.parent = Array.from({ length: n }, (_, i) => i);\n    this.size = Array(n).fill(1);\n  }\n  find(x) {\n    while (this.parent[x] !== x) {\n      this.parent[x] = this.parent[this.parent[x]];\n      x = this.parent[x];\n    }\n    return x;\n  }\n  union(a, b) {\n    a = this.find(a);\n    b = this.find(b);\n    if (a === b) return false;\n    if (this.size[a] < this.size[b]) [a, b] = [b, a];\n    this.parent[b] = a;\n    this.size[a] += this.size[b];\n    return true;\n  }\n}\n\nfunction solution(input) {\n  const { n, edges } = input;\n  const sorted = [...edges].sort((a, b) => a[2] - b[2]);\n  const dsu = new DSU(n);\n  let used = 0;\n  let total = 0;\n  for (const [u, v, w] of sorted) {\n    if (dsu.union(u, v)) {\n      total += w;\n      used++;\n      if (used === n - 1) return total;\n    }\n  }\n  return n <= 1 ? 0 : -1;\n}	20	2.30	{graphs,greedy,disjoint-set}	Given `n` nodes labeled `0..n-1` and an array of undirected weighted edges `[u, v, w]`, return the total weight of a minimum spanning tree. If the graph is disconnected, return `-1`.
ff2d7748-1509-4039-ad91-03a8c3cf6b55	Alhazen's Mirror Cuts	Given a string `s`, return the minimum number of cuts needed so that every resulting substring is a palindrome.\n\nInput Format\nAn object with `s` (string).\n\nOutput Format\nReturn a single integer.\n\nConstraints\n1 <= s.length <= 2000.	hard	1200	[{"hidden": false, "validator": null, "input_json": {"s": "aab"}, "compare_mode": null, "expected_json": 1}, {"hidden": false, "validator": null, "input_json": {"s": "racecar"}, "compare_mode": null, "expected_json": 0}, {"hidden": false, "validator": null, "input_json": {"s": "abccbc"}, "compare_mode": null, "expected_json": 2}, {"hidden": true, "validator": null, "input_json": {"s": "banana"}, "compare_mode": null, "expected_json": 1}, {"hidden": true, "validator": null, "input_json": {"s": "abcdef"}, "compare_mode": null, "expected_json": 5}]	{"javascript": "function solution(input) {\\n  // Write your solution here\\n}\\n"}	{javascript}	t	2026-03-06 17:43:38.006554+00	While reviewing Ibn al-Haytham's lab notes, a reflective inscription must be divided into the fewest palindromic fragments.	An object with `s` (string).	Return a single integer.	1 <= s.length <= 2000.	Precompute which substrings are palindromes with dynamic programming, then compute `dp[i]`, the minimum cuts needed for prefix `s[0..i]`.	function solution(input) {\n  const s = input.s;\n  const n = s.length;\n  const pal = Array.from({ length: n }, () => Array(n).fill(false));\n  for (let i = n - 1; i >= 0; i--) {\n    for (let j = i; j < n; j++) {\n      if (s[i] === s[j] && (j - i <= 2 || pal[i + 1][j - 1])) {\n        pal[i][j] = true;\n      }\n    }\n  }\n  const dp = Array(n).fill(Infinity);\n  for (let i = 0; i < n; i++) {\n    if (pal[0][i]) {\n      dp[i] = 0;\n      continue;\n    }\n    for (let j = 1; j <= i; j++) {\n      if (pal[j][i]) dp[i] = Math.min(dp[i], dp[j - 1] + 1);\n    }\n  }\n  return dp[n - 1];\n}	20	2.20	{dynamic-programming,strings}	Given a string `s`, return the minimum number of cuts needed so that every resulting substring is a palindrome.
c3e39c97-ae68-4518-8b10-d38c3bf4e8ae	Sutherland's Cooling Queue	Given an array `tasks` of uppercase letters and an integer `cooldown`, return the minimum number of time slots needed to finish all tasks if the same task type must be separated by at least `cooldown` idle or busy slots.\n\nInput Format\nAn object with `tasks` (string array of single letters) and `cooldown` (integer).\n\nOutput Format\nReturn a single integer.\n\nConstraints\n1 <= tasks.length <= 200000; 0 <= cooldown <= 100000.	hard	1200	[{"hidden": false, "validator": null, "input_json": {"tasks": ["A", "A", "A", "B", "B", "B"], "cooldown": 2}, "compare_mode": null, "expected_json": 8}, {"hidden": false, "validator": null, "input_json": {"tasks": ["A", "B", "C"], "cooldown": 3}, "compare_mode": null, "expected_json": 3}, {"hidden": false, "validator": null, "input_json": {"tasks": ["A", "A", "A", "A"], "cooldown": 1}, "compare_mode": null, "expected_json": 7}, {"hidden": true, "validator": null, "input_json": {"tasks": ["A", "A", "B", "B", "C", "C"], "cooldown": 2}, "compare_mode": null, "expected_json": 6}, {"hidden": true, "validator": null, "input_json": {"tasks": ["Z"], "cooldown": 100}, "compare_mode": null, "expected_json": 1}]	{"javascript": "function solution(input) {\\n  // Write your solution here\\n}\\n"}	{javascript}	t	2026-03-06 17:43:38.006554+00	While reviewing Ivan Sutherland's lab notes, render tasks of named types must be scheduled with cooling gaps before the same type can run again.	An object with `tasks` (string array of single letters) and `cooldown` (integer).	Return a single integer.	1 <= tasks.length <= 200000; 0 <= cooldown <= 100000.	Let `maxFreq` be the highest task frequency and `countMax` be how many task types reach it. The optimal schedule length is `max(tasks.length, (maxFreq - 1) * (cooldown + 1) + countMax)`.	function solution(input) {\n  const freq = new Map();\n  for (const task of input.tasks) freq.set(task, (freq.get(task) || 0) + 1);\n  let maxFreq = 0;\n  let countMax = 0;\n  for (const count of freq.values()) {\n    if (count > maxFreq) {\n      maxFreq = count;\n      countMax = 1;\n    } else if (count === maxFreq) {\n      countMax++;\n    }\n  }\n  return Math.max(input.tasks.length, (maxFreq - 1) * (input.cooldown + 1) + countMax);\n}	20	2.10	{greedy,hash-map}	Given an array `tasks` of uppercase letters and an integer `cooldown`, return the minimum number of time slots needed to finish all tasks if the same task type must be separated by at least `cooldown` idle or busy slots.
37c4a9ca-ffd4-4e7b-a631-830e125a3b6f	Jemison's Portal Jumps	Given an array `nums` where from index `i` you may jump to `i - 1`, `i + 1`, or any other index `j` with `nums[j] = nums[i]`, return the minimum number of jumps needed to move from index `0` to index `n - 1`.\n\nInput Format\nAn object with `nums` (integer array).\n\nOutput Format\nReturn a single integer.\n\nConstraints\n1 <= nums.length <= 200000; -10^9 <= nums[i] <= 10^9.	hard	1200	[{"hidden": false, "validator": null, "input_json": {"nums": [7, 6, 9, 6, 9, 6, 9, 7]}, "compare_mode": null, "expected_json": 1}, {"hidden": false, "validator": null, "input_json": {"nums": [1, 2, 3, 4]}, "compare_mode": null, "expected_json": 3}, {"hidden": false, "validator": null, "input_json": {"nums": [5]}, "compare_mode": null, "expected_json": 0}, {"hidden": true, "validator": null, "input_json": {"nums": [11, 22, 7, 7, 7, 22, 11]}, "compare_mode": null, "expected_json": 1}, {"hidden": true, "validator": null, "input_json": {"nums": [3, 4, 3, 4, 3, 4, 9]}, "compare_mode": null, "expected_json": 3}]	{"javascript": "function solution(input) {\\n  // Write your solution here\\n}\\n"}	{javascript}	t	2026-03-06 17:43:38.006554+00	While reviewing Mae Jemison's lab notes, a mission line includes portal links that can be used instantly, and the fewest jumps to the destination are required.	An object with `nums` (integer array).	Return a single integer.	1 <= nums.length <= 200000; -10^9 <= nums[i] <= 10^9.	Build a map from value to all indices with that value. Then run BFS from index 0. After using the same-value edges for one value once, clear that list to avoid repeated expensive scans.	function solution(input) {\n  const nums = input.nums;\n  const n = nums.length;\n  if (n === 1) return 0;\n  const byValue = new Map();\n  for (let i = 0; i < n; i++) {\n    if (!byValue.has(nums[i])) byValue.set(nums[i], []);\n    byValue.get(nums[i]).push(i);\n  }\n  const queue = [[0, 0]];\n  const seen = Array(n).fill(false);\n  seen[0] = true;\n  for (let head = 0; head < queue.length; head++) {\n    const [idx, dist] = queue[head];\n    const nexts = byValue.get(nums[idx]) || [];\n    nexts.push(idx - 1, idx + 1);\n    for (const next of nexts) {\n      if (next < 0 || next >= n || seen[next]) continue;\n      if (next === n - 1) return dist + 1;\n      seen[next] = true;\n      queue.push([next, dist + 1]);\n    }\n    byValue.set(nums[idx], []);\n  }\n  return -1;\n}	20	2.40	{graphs,bfs,arrays,hash-map}	Given an array `nums` where from index `i` you may jump to `i - 1`, `i + 1`, or any other index `j` with `nums[j] = nums[i]`, return the minimum number of jumps needed to move from index `0` to index `n - 1`.
\.


--
-- Data for Name: store_transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.store_transactions (id, user_id, request_id, stripe_payment_intent_id, source, item_id, status, coin_delta, coin_balance_after, metadata, created_at) FROM stdin;
\.


--
-- Data for Name: submissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.submissions (id, match_id, user_id, code, language, test_results, passed_tests, total_tests, execution_time_ms, submitted_at, result, score, runtime_ms, memory_kb, is_winning_submission, failed_count, verdict, passed_count, total_count, code_hash, submission_sequence, compile_log, execution_log, test_summary, audit_metadata, submission_kind) FROM stdin;
0cc158fe-6075-445c-a048-048a876ce132	51af14bb-7ded-4009-8788-8061637bb11c	bee320f9-25e2-4bff-9f0e-e295dd9504a2	// Write your solution here\nfunction solution(input) {\n  const n = input.n;\n  \n  if (n === 0) return 0;\n  \n  return 1 + (n - 1) % 9;\n}	javascript	[{"actual": "", "hidden": false, "passed": false, "reason": "Runtime Error", "stderr": "You are not subscribed to this API."}]	0	5	2589	2026-03-06 17:48:03.037+00	unknown	0	2589	0	f	5	Runtime Error	0	5	\N	1			{}	{}	manual
703252af-216a-4f2b-bbcc-f4947b55972a	51af14bb-7ded-4009-8788-8061637bb11c	bee320f9-25e2-4bff-9f0e-e295dd9504a2	// Write your solution here\nfunction solution(input) {\n  const n = input.n;\n  \n  if (n === 0) return 0;\n  \n  return 1 + (n - 1) % 9;\n}	javascript	[{"actual": "", "hidden": false, "passed": false, "reason": "Runtime Error", "stderr": "You are not subscribed to this API."}]	0	5	1025	2026-03-06 17:48:13.449+00	unknown	0	1025	0	f	5	Runtime Error	0	5	\N	1			{}	{}	manual
894a185b-608e-45af-8711-9ec95a32f709	51af14bb-7ded-4009-8788-8061637bb11c	0e0085f4-1207-4e7b-815d-a5a58183a9ce	// Write your solution here\nfunction solution(input) {\n  \n}	javascript	[{"actual": "", "hidden": false, "passed": false, "reason": "Runtime Error", "stderr": "You are not subscribed to this API."}]	0	5	1298	2026-03-06 17:49:46.571+00	unknown	0	1298	0	f	5	Runtime Error	0	5	\N	1			{}	{}	manual
6028c745-3c3b-4955-8f47-3f4dcd93bda6	51af14bb-7ded-4009-8788-8061637bb11c	0e0085f4-1207-4e7b-815d-a5a58183a9ce	// Write your solution here\nfunction solution(input) {\n  \n}// Write your solution here\nfunction solution(input) {\n  const n = input.n;\n  \n  if (n === 0) return 0;\n  \n  return 1 + (n - 1) % 9;\n}	javascript	[{"actual": "", "hidden": false, "passed": false, "reason": "Runtime Error", "stderr": "You are not subscribed to this API."}]	0	5	1157	2026-03-06 17:49:51.14+00	unknown	0	1157	0	f	5	Runtime Error	0	5	\N	1			{}	{}	manual
1deeeb67-c2b6-4e9f-a5fe-032897ef8f33	9548c717-f72c-4ff3-95da-e504eeefc5cc	0e0085f4-1207-4e7b-815d-a5a58183a9ce	// Write your solution here\nfunction solution(input) {\n  const noise = input.noise;\n  const k = input.k;\n  const limit = input.limit;\n  \n  let sum = 0;\n  for (let i = 0; i < k; i++) {\n    sum += noise[i];\n  }\n  \n  let count = 0;\n  if (sum <= limit * k) count++;\n  \n  for (let i = k; i < noise.length; i++) {\n    sum += noise[i] - noise[i - k];\n    if (sum <= limit * k) count++;\n  }\n  \n  return count;\n}	javascript	[{"actual": "", "hidden": false, "passed": false, "reason": "Runtime Error", "stderr": "You are not subscribed to this API."}]	0	5	1113	2026-03-06 18:22:18.204+00	unknown	0	1113	0	f	5	Runtime Error	0	5	\N	1			{}	{}	manual
0e3926df-beab-459e-9c61-cd50ca67c8f6	a1a18197-b6b6-4ebc-b085-e6c7d6b5ed3c	0e0085f4-1207-4e7b-815d-a5a58183a9ce	// Write your solution here\nfunction solution(input) {\n  const values = input.values;\n  const freq = new Map();\n  \n  let maxFreq = 0;\n  let bestVal = Infinity;\n\n  for (const v of values) {\n    const count = (freq.get(v) || 0) + 1;\n    freq.set(v, count);\n\n    if (count > maxFreq || (count === maxFreq && v < bestVal)) {\n      maxFreq = count;\n      bestVal = v;\n    }\n  }\n\n  return bestVal;\n}	javascript	[{"actual": "4", "hidden": false, "passed": true, "reason": "OK", "stderr": ""}, {"actual": "1", "hidden": false, "passed": true, "reason": "OK", "stderr": ""}, {"actual": "5", "hidden": false, "passed": true, "reason": "OK", "stderr": ""}, {"actual": "", "hidden": true, "passed": true, "reason": "OK", "stderr": ""}, {"actual": "", "hidden": true, "passed": true, "reason": "OK", "stderr": ""}]	5	5	89	2026-03-06 18:39:52.261+00	unknown	100	89	0	t	0	Accepted	5	5	\N	1			{}	{}	manual
\.


--
-- Data for Name: user_profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_profiles (id, name, email, coins, total_coins_earned, xp, completed_lessons, level, hearts, max_hearts, last_heart_reset, current_avatar, owned_avatars, unlocked_achievements, current_streak, last_login_date, total_lessons_completed, email_verified, created_at, updated_at, xp_boost_multiplier, xp_boost_expires_at, unlimited_hearts_expires_at, lifetime_completed_lessons) FROM stdin;
34e76391-0302-4440-a930-2dd60837f11b	adam	nasoosadamopoylos@gmail.com	2680	0	17591	{python-variables-1,python-variables-2,python-type-casting,python-comparison-operators,python-logical-operators,python-if-statements,python-string-methods,python-while-loops-conditions,python-dictionaries,python-if-else,python-match,python-operators}	27	5	5	Sun Mar 08 2026	default	{default}	{first_steps,xp_250,xp_1000,xp_5000,level_5,level_15,warming_up,xp_15000,python_foundations}	2	2026-03-07	21	t	2026-02-28 15:15:40.413471+00	2026-03-08 19:11:40.594648+00	1	0	0	{python-variables-1,python-variables-2,python-type-casting,python-arrays,python-lists-methods,python-comparison-operators,python-logical-operators,python-if-statements,python-string-methods,python-while-loops-conditions,python-dictionaries,python-if-else,python-match,python-operators}
7c343925-d7e2-46ba-8ebb-c88417d49f82	codhak	codhakapp@gmail.com	0	0	0	{}	1	5	5	Sat Mar 07 2026	default	{default}	{}	0		0	t	2026-03-07 15:54:02.41542+00	2026-03-07 15:54:02.41542+00	1	0	0	{}
0e0085f4-1207-4e7b-815d-a5a58183a9ce	nasosadams	mpeliskoshbas@gmail.com	0	0	0	{}	1	5	5	Sun Mar 08 2026	default	{default}	{}	0		0	t	2026-03-06 19:43:53.095909+00	2026-03-08 19:11:56.400439+00	1	0	0	{}
bee320f9-25e2-4bff-9f0e-e295dd9504a2	nasosadamop	nasosadamopoylos@gmail.com	3680	0	2533	{python-variables-1,python-variables-2,python-type-casting,javascript-introduction-1,javascript-output-1,javascript-comments-1,javascript-where-to-1,javascript-let-1,cpp-intro-1,python-comparison-operators}	10	5	5	Sat Mar 07 2026	coder	{default,coder}	{first_steps,warming_up,xp_250,level_5,code_explorer,xp_1000}	1	2026-03-06	14	t	2026-03-02 02:53:44.071038+00	2026-03-07 19:32:58.250323+00	1	0	0	{python-variables-1,python-variables-2,python-type-casting,python-logical-operators,javascript-introduction-1,javascript-output-1,javascript-comments-1,javascript-where-to-1,javascript-let-1,cpp-intro-1,python-comparison-operators}
\.


--
-- Data for Name: messages_2026_03_05; Type: TABLE DATA; Schema: realtime; Owner: supabase_admin
--

COPY realtime.messages_2026_03_05 (topic, extension, payload, event, private, updated_at, inserted_at, id) FROM stdin;
\.


--
-- Data for Name: messages_2026_03_06; Type: TABLE DATA; Schema: realtime; Owner: supabase_admin
--

COPY realtime.messages_2026_03_06 (topic, extension, payload, event, private, updated_at, inserted_at, id) FROM stdin;
\.


--
-- Data for Name: messages_2026_03_07; Type: TABLE DATA; Schema: realtime; Owner: supabase_admin
--

COPY realtime.messages_2026_03_07 (topic, extension, payload, event, private, updated_at, inserted_at, id) FROM stdin;
\.


--
-- Data for Name: messages_2026_03_08; Type: TABLE DATA; Schema: realtime; Owner: supabase_admin
--

COPY realtime.messages_2026_03_08 (topic, extension, payload, event, private, updated_at, inserted_at, id) FROM stdin;
\.


--
-- Data for Name: messages_2026_03_09; Type: TABLE DATA; Schema: realtime; Owner: supabase_admin
--

COPY realtime.messages_2026_03_09 (topic, extension, payload, event, private, updated_at, inserted_at, id) FROM stdin;
\.


--
-- Data for Name: messages_2026_03_10; Type: TABLE DATA; Schema: realtime; Owner: supabase_admin
--

COPY realtime.messages_2026_03_10 (topic, extension, payload, event, private, updated_at, inserted_at, id) FROM stdin;
\.


--
-- Data for Name: messages_2026_03_11; Type: TABLE DATA; Schema: realtime; Owner: supabase_admin
--

COPY realtime.messages_2026_03_11 (topic, extension, payload, event, private, updated_at, inserted_at, id) FROM stdin;
\.


--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: realtime; Owner: supabase_admin
--

COPY realtime.schema_migrations (version, inserted_at) FROM stdin;
20211116024918	2026-02-28 14:36:42
20211116045059	2026-02-28 14:36:42
20211116050929	2026-02-28 14:36:42
20211116051442	2026-02-28 14:36:42
20211116212300	2026-02-28 14:36:42
20211116213355	2026-02-28 14:36:42
20211116213934	2026-02-28 14:36:42
20211116214523	2026-02-28 14:36:42
20211122062447	2026-02-28 14:36:42
20211124070109	2026-02-28 14:36:43
20211202204204	2026-02-28 14:36:43
20211202204605	2026-02-28 14:36:43
20211210212804	2026-02-28 14:36:43
20211228014915	2026-02-28 14:36:43
20220107221237	2026-02-28 14:36:43
20220228202821	2026-02-28 14:36:43
20220312004840	2026-02-28 14:36:43
20220603231003	2026-02-28 14:36:43
20220603232444	2026-02-28 14:36:43
20220615214548	2026-02-28 14:36:43
20220712093339	2026-02-28 14:36:43
20220908172859	2026-02-28 14:36:43
20220916233421	2026-02-28 14:36:43
20230119133233	2026-02-28 14:36:43
20230128025114	2026-02-28 14:36:43
20230128025212	2026-02-28 14:36:43
20230227211149	2026-02-28 14:36:43
20230228184745	2026-02-28 14:36:43
20230308225145	2026-02-28 14:36:43
20230328144023	2026-02-28 14:36:43
20231018144023	2026-02-28 14:36:43
20231204144023	2026-02-28 14:36:43
20231204144024	2026-02-28 14:36:43
20231204144025	2026-02-28 14:36:43
20240108234812	2026-02-28 14:36:43
20240109165339	2026-02-28 14:36:43
20240227174441	2026-02-28 14:36:43
20240311171622	2026-02-28 14:36:43
20240321100241	2026-02-28 14:36:43
20240401105812	2026-02-28 14:36:43
20240418121054	2026-02-28 14:36:43
20240523004032	2026-02-28 14:36:43
20240618124746	2026-02-28 14:36:43
20240801235015	2026-02-28 14:36:43
20240805133720	2026-02-28 14:36:43
20240827160934	2026-02-28 14:36:43
20240919163303	2026-02-28 14:36:43
20240919163305	2026-02-28 14:36:43
20241019105805	2026-02-28 14:36:43
20241030150047	2026-02-28 14:36:43
20241108114728	2026-02-28 14:36:43
20241121104152	2026-02-28 14:36:43
20241130184212	2026-02-28 14:36:43
20241220035512	2026-02-28 14:36:43
20241220123912	2026-02-28 14:36:43
20241224161212	2026-02-28 14:36:43
20250107150512	2026-02-28 14:36:43
20250110162412	2026-02-28 14:36:43
20250123174212	2026-02-28 14:36:43
20250128220012	2026-02-28 14:36:43
20250506224012	2026-02-28 14:36:43
20250523164012	2026-02-28 14:36:43
20250714121412	2026-02-28 14:36:43
20250905041441	2026-02-28 14:36:43
20251103001201	2026-02-28 14:36:43
20251120212548	2026-02-28 14:36:43
20251120215549	2026-02-28 14:36:43
20260218120000	2026-02-28 14:36:43
\.


--
-- Data for Name: subscription; Type: TABLE DATA; Schema: realtime; Owner: supabase_admin
--

COPY realtime.subscription (id, subscription_id, entity, filters, claims, created_at, action_filter) FROM stdin;
\.


--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY storage.buckets (id, name, owner, created_at, updated_at, public, avif_autodetection, file_size_limit, allowed_mime_types, owner_id, type) FROM stdin;
feedback-attachments	feedback-attachments	\N	2026-03-07 17:08:39.306522+00	2026-03-07 17:08:39.306522+00	f	f	4194304	{image/png,image/jpeg,image/webp,image/gif,application/pdf,text/plain}	\N	STANDARD
\.


--
-- Data for Name: buckets_analytics; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY storage.buckets_analytics (name, type, format, created_at, updated_at, id, deleted_at) FROM stdin;
\.


--
-- Data for Name: buckets_vectors; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY storage.buckets_vectors (id, type, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: migrations; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY storage.migrations (id, name, hash, executed_at) FROM stdin;
0	create-migrations-table	e18db593bcde2aca2a408c4d1100f6abba2195df	2026-02-28 14:36:47.945415
1	initialmigration	6ab16121fbaa08bbd11b712d05f358f9b555d777	2026-02-28 14:36:47.950842
2	storage-schema	f6a1fa2c93cbcd16d4e487b362e45fca157a8dbd	2026-02-28 14:36:47.954685
3	pathtoken-column	2cb1b0004b817b29d5b0a971af16bafeede4b70d	2026-02-28 14:36:47.968886
4	add-migrations-rls	427c5b63fe1c5937495d9c635c263ee7a5905058	2026-02-28 14:36:47.977046
5	add-size-functions	79e081a1455b63666c1294a440f8ad4b1e6a7f84	2026-02-28 14:36:47.979437
6	change-column-name-in-get-size	ded78e2f1b5d7e616117897e6443a925965b30d2	2026-02-28 14:36:47.982553
7	add-rls-to-buckets	e7e7f86adbc51049f341dfe8d30256c1abca17aa	2026-02-28 14:36:47.98549
8	add-public-to-buckets	fd670db39ed65f9d08b01db09d6202503ca2bab3	2026-02-28 14:36:47.988282
9	fix-search-function	af597a1b590c70519b464a4ab3be54490712796b	2026-02-28 14:36:47.991332
10	search-files-search-function	b595f05e92f7e91211af1bbfe9c6a13bb3391e16	2026-02-28 14:36:47.993982
11	add-trigger-to-auto-update-updated_at-column	7425bdb14366d1739fa8a18c83100636d74dcaa2	2026-02-28 14:36:47.998933
12	add-automatic-avif-detection-flag	8e92e1266eb29518b6a4c5313ab8f29dd0d08df9	2026-02-28 14:36:48.002953
13	add-bucket-custom-limits	cce962054138135cd9a8c4bcd531598684b25e7d	2026-02-28 14:36:48.005842
14	use-bytes-for-max-size	941c41b346f9802b411f06f30e972ad4744dad27	2026-02-28 14:36:48.008754
15	add-can-insert-object-function	934146bc38ead475f4ef4b555c524ee5d66799e5	2026-02-28 14:36:48.099515
16	add-version	76debf38d3fd07dcfc747ca49096457d95b1221b	2026-02-28 14:36:48.102427
17	drop-owner-foreign-key	f1cbb288f1b7a4c1eb8c38504b80ae2a0153d101	2026-02-28 14:36:48.105196
18	add_owner_id_column_deprecate_owner	e7a511b379110b08e2f214be852c35414749fe66	2026-02-28 14:36:48.108311
19	alter-default-value-objects-id	02e5e22a78626187e00d173dc45f58fa66a4f043	2026-02-28 14:36:48.113213
20	list-objects-with-delimiter	cd694ae708e51ba82bf012bba00caf4f3b6393b7	2026-02-28 14:36:48.115957
21	s3-multipart-uploads	8c804d4a566c40cd1e4cc5b3725a664a9303657f	2026-02-28 14:36:48.120464
22	s3-multipart-uploads-big-ints	9737dc258d2397953c9953d9b86920b8be0cdb73	2026-02-28 14:36:48.131088
23	optimize-search-function	9d7e604cddc4b56a5422dc68c9313f4a1b6f132c	2026-02-28 14:36:48.138639
24	operation-function	8312e37c2bf9e76bbe841aa5fda889206d2bf8aa	2026-02-28 14:36:48.141524
25	custom-metadata	d974c6057c3db1c1f847afa0e291e6165693b990	2026-02-28 14:36:48.14436
26	objects-prefixes	215cabcb7f78121892a5a2037a09fedf9a1ae322	2026-02-28 14:36:48.14709
27	search-v2	859ba38092ac96eb3964d83bf53ccc0b141663a6	2026-02-28 14:36:48.149583
28	object-bucket-name-sorting	c73a2b5b5d4041e39705814fd3a1b95502d38ce4	2026-02-28 14:36:48.151952
29	create-prefixes	ad2c1207f76703d11a9f9007f821620017a66c21	2026-02-28 14:36:48.154239
30	update-object-levels	2be814ff05c8252fdfdc7cfb4b7f5c7e17f0bed6	2026-02-28 14:36:48.156677
31	objects-level-index	b40367c14c3440ec75f19bbce2d71e914ddd3da0	2026-02-28 14:36:48.159021
32	backward-compatible-index-on-objects	e0c37182b0f7aee3efd823298fb3c76f1042c0f7	2026-02-28 14:36:48.1614
33	backward-compatible-index-on-prefixes	b480e99ed951e0900f033ec4eb34b5bdcb4e3d49	2026-02-28 14:36:48.163661
34	optimize-search-function-v1	ca80a3dc7bfef894df17108785ce29a7fc8ee456	2026-02-28 14:36:48.165989
35	add-insert-trigger-prefixes	458fe0ffd07ec53f5e3ce9df51bfdf4861929ccc	2026-02-28 14:36:48.168308
36	optimise-existing-functions	6ae5fca6af5c55abe95369cd4f93985d1814ca8f	2026-02-28 14:36:48.170922
37	add-bucket-name-length-trigger	3944135b4e3e8b22d6d4cbb568fe3b0b51df15c1	2026-02-28 14:36:48.1733
38	iceberg-catalog-flag-on-buckets	02716b81ceec9705aed84aa1501657095b32e5c5	2026-02-28 14:36:48.176703
39	add-search-v2-sort-support	6706c5f2928846abee18461279799ad12b279b78	2026-02-28 14:36:48.184606
40	fix-prefix-race-conditions-optimized	7ad69982ae2d372b21f48fc4829ae9752c518f6b	2026-02-28 14:36:48.186909
41	add-object-level-update-trigger	07fcf1a22165849b7a029deed059ffcde08d1ae0	2026-02-28 14:36:48.189234
42	rollback-prefix-triggers	771479077764adc09e2ea2043eb627503c034cd4	2026-02-28 14:36:48.191613
43	fix-object-level	84b35d6caca9d937478ad8a797491f38b8c2979f	2026-02-28 14:36:48.196066
44	vector-bucket-type	99c20c0ffd52bb1ff1f32fb992f3b351e3ef8fb3	2026-02-28 14:36:48.198581
45	vector-buckets	049e27196d77a7cb76497a85afae669d8b230953	2026-02-28 14:36:48.201617
46	buckets-objects-grants	fedeb96d60fefd8e02ab3ded9fbde05632f84aed	2026-02-28 14:36:48.226716
47	iceberg-table-metadata	649df56855c24d8b36dd4cc1aeb8251aa9ad42c2	2026-02-28 14:36:48.229814
48	iceberg-catalog-ids	e0e8b460c609b9999ccd0df9ad14294613eed939	2026-02-28 14:36:48.232624
49	buckets-objects-grants-postgres	072b1195d0d5a2f888af6b2302a1938dd94b8b3d	2026-02-28 14:36:48.246699
50	search-v2-optimised	6323ac4f850aa14e7387eb32102869578b5bd478	2026-02-28 14:36:48.249924
51	index-backward-compatible-search	2ee395d433f76e38bcd3856debaf6e0e5b674011	2026-02-28 14:36:48.343293
52	drop-not-used-indexes-and-functions	5cc44c8696749ac11dd0dc37f2a3802075f3a171	2026-02-28 14:36:48.344829
53	drop-index-lower-name	d0cb18777d9e2a98ebe0bc5cc7a42e57ebe41854	2026-02-28 14:36:48.353262
54	drop-index-object-level	6289e048b1472da17c31a7eba1ded625a6457e67	2026-02-28 14:36:48.355296
55	prevent-direct-deletes	262a4798d5e0f2e7c8970232e03ce8be695d5819	2026-02-28 14:36:48.356717
56	fix-optimized-search-function	cb58526ebc23048049fd5bf2fd148d18b04a2073	2026-02-28 14:36:48.36
\.


--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY storage.objects (id, bucket_id, name, owner, created_at, updated_at, last_accessed_at, metadata, version, owner_id, user_metadata) FROM stdin;
\.


--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY storage.s3_multipart_uploads (id, in_progress_size, upload_signature, bucket_id, key, version, owner_id, created_at, user_metadata) FROM stdin;
\.


--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY storage.s3_multipart_uploads_parts (id, upload_id, size, part_number, bucket_id, key, etag, owner_id, version, created_at) FROM stdin;
\.


--
-- Data for Name: vector_indexes; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY storage.vector_indexes (id, name, bucket_id, data_type, dimension, distance_metric, metadata_configuration, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: secrets; Type: TABLE DATA; Schema: vault; Owner: supabase_admin
--

COPY vault.secrets (id, name, description, secret, key_id, nonce, created_at, updated_at) FROM stdin;
\.


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--

SELECT pg_catalog.setval('auth.refresh_tokens_id_seq', 145, true);


--
-- Name: subscription_id_seq; Type: SEQUENCE SET; Schema: realtime; Owner: supabase_admin
--

SELECT pg_catalog.setval('realtime.subscription_id_seq', 1, false);


--
-- Name: mfa_amr_claims amr_id_pk; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT amr_id_pk PRIMARY KEY (id);


--
-- Name: audit_log_entries audit_log_entries_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.audit_log_entries
    ADD CONSTRAINT audit_log_entries_pkey PRIMARY KEY (id);


--
-- Name: flow_state flow_state_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.flow_state
    ADD CONSTRAINT flow_state_pkey PRIMARY KEY (id);


--
-- Name: identities identities_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_pkey PRIMARY KEY (id);


--
-- Name: identities identities_provider_id_provider_unique; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_provider_id_provider_unique UNIQUE (provider_id, provider);


--
-- Name: instances instances_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.instances
    ADD CONSTRAINT instances_pkey PRIMARY KEY (id);


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_authentication_method_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_authentication_method_pkey UNIQUE (session_id, authentication_method);


--
-- Name: mfa_challenges mfa_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_pkey PRIMARY KEY (id);


--
-- Name: mfa_factors mfa_factors_last_challenged_at_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_last_challenged_at_key UNIQUE (last_challenged_at);


--
-- Name: mfa_factors mfa_factors_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_pkey PRIMARY KEY (id);


--
-- Name: oauth_authorizations oauth_authorizations_authorization_code_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_authorization_code_key UNIQUE (authorization_code);


--
-- Name: oauth_authorizations oauth_authorizations_authorization_id_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_authorization_id_key UNIQUE (authorization_id);


--
-- Name: oauth_authorizations oauth_authorizations_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_pkey PRIMARY KEY (id);


--
-- Name: oauth_client_states oauth_client_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_client_states
    ADD CONSTRAINT oauth_client_states_pkey PRIMARY KEY (id);


--
-- Name: oauth_clients oauth_clients_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_clients
    ADD CONSTRAINT oauth_clients_pkey PRIMARY KEY (id);


--
-- Name: oauth_consents oauth_consents_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_pkey PRIMARY KEY (id);


--
-- Name: oauth_consents oauth_consents_user_client_unique; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_user_client_unique UNIQUE (user_id, client_id);


--
-- Name: one_time_tokens one_time_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_token_unique; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_unique UNIQUE (token);


--
-- Name: saml_providers saml_providers_entity_id_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_entity_id_key UNIQUE (entity_id);


--
-- Name: saml_providers saml_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_pkey PRIMARY KEY (id);


--
-- Name: saml_relay_states saml_relay_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sso_domains sso_domains_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_pkey PRIMARY KEY (id);


--
-- Name: sso_providers sso_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sso_providers
    ADD CONSTRAINT sso_providers_pkey PRIMARY KEY (id);


--
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: anti_cheat_case_events anti_cheat_case_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.anti_cheat_case_events
    ADD CONSTRAINT anti_cheat_case_events_pkey PRIMARY KEY (id);


--
-- Name: anti_cheat_cases anti_cheat_cases_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.anti_cheat_cases
    ADD CONSTRAINT anti_cheat_cases_pkey PRIMARY KEY (id);


--
-- Name: code_snapshots code_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.code_snapshots
    ADD CONSTRAINT code_snapshots_pkey PRIMARY KEY (id);


--
-- Name: duel_matches duel_matches_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.duel_matches
    ADD CONSTRAINT duel_matches_pkey PRIMARY KEY (id);


--
-- Name: duel_submissions duel_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.duel_submissions
    ADD CONSTRAINT duel_submissions_pkey PRIMARY KEY (id);


--
-- Name: duel_test_cases duel_test_cases_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.duel_test_cases
    ADD CONSTRAINT duel_test_cases_pkey PRIMARY KEY (id);


--
-- Name: duel_users duel_users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.duel_users
    ADD CONSTRAINT duel_users_pkey PRIMARY KEY (id);


--
-- Name: duel_users duel_users_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.duel_users
    ADD CONSTRAINT duel_users_username_key UNIQUE (username);


--
-- Name: feedback_attachments feedback_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feedback_attachments
    ADD CONSTRAINT feedback_attachments_pkey PRIMARY KEY (id);


--
-- Name: feedback_attachments feedback_attachments_storage_path_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feedback_attachments
    ADD CONSTRAINT feedback_attachments_storage_path_key UNIQUE (storage_path);


--
-- Name: feedback_audit_logs feedback_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feedback_audit_logs
    ADD CONSTRAINT feedback_audit_logs_pkey PRIMARY KEY (id);


--
-- Name: feedback_entries feedback_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feedback_entries
    ADD CONSTRAINT feedback_entries_pkey PRIMARY KEY (id);


--
-- Name: legal_acceptances legal_acceptances_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.legal_acceptances
    ADD CONSTRAINT legal_acceptances_pkey PRIMARY KEY (id);


--
-- Name: lesson_completion_events lesson_completion_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lesson_completion_events
    ADD CONSTRAINT lesson_completion_events_pkey PRIMARY KEY (id);


--
-- Name: match_events match_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.match_events
    ADD CONSTRAINT match_events_pkey PRIMARY KEY (id);


--
-- Name: match_replays match_replays_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.match_replays
    ADD CONSTRAINT match_replays_pkey PRIMARY KEY (id);


--
-- Name: matches matches_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_pkey PRIMARY KEY (id);


--
-- Name: problems problems_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.problems
    ADD CONSTRAINT problems_pkey PRIMARY KEY (id);


--
-- Name: store_transactions store_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.store_transactions
    ADD CONSTRAINT store_transactions_pkey PRIMARY KEY (id);


--
-- Name: store_transactions store_transactions_request_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.store_transactions
    ADD CONSTRAINT store_transactions_request_id_key UNIQUE (request_id);


--
-- Name: store_transactions store_transactions_stripe_payment_intent_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.store_transactions
    ADD CONSTRAINT store_transactions_stripe_payment_intent_id_key UNIQUE (stripe_payment_intent_id);


--
-- Name: submissions submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.submissions
    ADD CONSTRAINT submissions_pkey PRIMARY KEY (id);


--
-- Name: user_profiles user_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE ONLY realtime.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_03_05 messages_2026_03_05_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages_2026_03_05
    ADD CONSTRAINT messages_2026_03_05_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_03_06 messages_2026_03_06_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages_2026_03_06
    ADD CONSTRAINT messages_2026_03_06_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_03_07 messages_2026_03_07_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages_2026_03_07
    ADD CONSTRAINT messages_2026_03_07_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_03_08 messages_2026_03_08_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages_2026_03_08
    ADD CONSTRAINT messages_2026_03_08_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_03_09 messages_2026_03_09_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages_2026_03_09
    ADD CONSTRAINT messages_2026_03_09_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_03_10 messages_2026_03_10_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages_2026_03_10
    ADD CONSTRAINT messages_2026_03_10_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_03_11 messages_2026_03_11_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages_2026_03_11
    ADD CONSTRAINT messages_2026_03_11_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: subscription pk_subscription; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.subscription
    ADD CONSTRAINT pk_subscription PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: buckets_analytics buckets_analytics_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.buckets_analytics
    ADD CONSTRAINT buckets_analytics_pkey PRIMARY KEY (id);


--
-- Name: buckets buckets_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.buckets
    ADD CONSTRAINT buckets_pkey PRIMARY KEY (id);


--
-- Name: buckets_vectors buckets_vectors_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.buckets_vectors
    ADD CONSTRAINT buckets_vectors_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_name_key; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_name_key UNIQUE (name);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: objects objects_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT objects_pkey PRIMARY KEY (id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_pkey PRIMARY KEY (id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_pkey PRIMARY KEY (id);


--
-- Name: vector_indexes vector_indexes_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.vector_indexes
    ADD CONSTRAINT vector_indexes_pkey PRIMARY KEY (id);


--
-- Name: audit_logs_instance_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX audit_logs_instance_id_idx ON auth.audit_log_entries USING btree (instance_id);


--
-- Name: confirmation_token_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX confirmation_token_idx ON auth.users USING btree (confirmation_token) WHERE ((confirmation_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: email_change_token_current_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX email_change_token_current_idx ON auth.users USING btree (email_change_token_current) WHERE ((email_change_token_current)::text !~ '^[0-9 ]*$'::text);


--
-- Name: email_change_token_new_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX email_change_token_new_idx ON auth.users USING btree (email_change_token_new) WHERE ((email_change_token_new)::text !~ '^[0-9 ]*$'::text);


--
-- Name: factor_id_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX factor_id_created_at_idx ON auth.mfa_factors USING btree (user_id, created_at);


--
-- Name: flow_state_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX flow_state_created_at_idx ON auth.flow_state USING btree (created_at DESC);


--
-- Name: identities_email_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX identities_email_idx ON auth.identities USING btree (email text_pattern_ops);


--
-- Name: INDEX identities_email_idx; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON INDEX auth.identities_email_idx IS 'Auth: Ensures indexed queries on the email column';


--
-- Name: identities_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX identities_user_id_idx ON auth.identities USING btree (user_id);


--
-- Name: idx_auth_code; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX idx_auth_code ON auth.flow_state USING btree (auth_code);


--
-- Name: idx_oauth_client_states_created_at; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX idx_oauth_client_states_created_at ON auth.oauth_client_states USING btree (created_at);


--
-- Name: idx_user_id_auth_method; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX idx_user_id_auth_method ON auth.flow_state USING btree (user_id, authentication_method);


--
-- Name: mfa_challenge_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX mfa_challenge_created_at_idx ON auth.mfa_challenges USING btree (created_at DESC);


--
-- Name: mfa_factors_user_friendly_name_unique; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX mfa_factors_user_friendly_name_unique ON auth.mfa_factors USING btree (friendly_name, user_id) WHERE (TRIM(BOTH FROM friendly_name) <> ''::text);


--
-- Name: mfa_factors_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX mfa_factors_user_id_idx ON auth.mfa_factors USING btree (user_id);


--
-- Name: oauth_auth_pending_exp_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_auth_pending_exp_idx ON auth.oauth_authorizations USING btree (expires_at) WHERE (status = 'pending'::auth.oauth_authorization_status);


--
-- Name: oauth_clients_deleted_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_clients_deleted_at_idx ON auth.oauth_clients USING btree (deleted_at);


--
-- Name: oauth_consents_active_client_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_consents_active_client_idx ON auth.oauth_consents USING btree (client_id) WHERE (revoked_at IS NULL);


--
-- Name: oauth_consents_active_user_client_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_consents_active_user_client_idx ON auth.oauth_consents USING btree (user_id, client_id) WHERE (revoked_at IS NULL);


--
-- Name: oauth_consents_user_order_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_consents_user_order_idx ON auth.oauth_consents USING btree (user_id, granted_at DESC);


--
-- Name: one_time_tokens_relates_to_hash_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX one_time_tokens_relates_to_hash_idx ON auth.one_time_tokens USING hash (relates_to);


--
-- Name: one_time_tokens_token_hash_hash_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX one_time_tokens_token_hash_hash_idx ON auth.one_time_tokens USING hash (token_hash);


--
-- Name: one_time_tokens_user_id_token_type_key; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX one_time_tokens_user_id_token_type_key ON auth.one_time_tokens USING btree (user_id, token_type);


--
-- Name: reauthentication_token_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX reauthentication_token_idx ON auth.users USING btree (reauthentication_token) WHERE ((reauthentication_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: recovery_token_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX recovery_token_idx ON auth.users USING btree (recovery_token) WHERE ((recovery_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: refresh_tokens_instance_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_instance_id_idx ON auth.refresh_tokens USING btree (instance_id);


--
-- Name: refresh_tokens_instance_id_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_instance_id_user_id_idx ON auth.refresh_tokens USING btree (instance_id, user_id);


--
-- Name: refresh_tokens_parent_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_parent_idx ON auth.refresh_tokens USING btree (parent);


--
-- Name: refresh_tokens_session_id_revoked_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_session_id_revoked_idx ON auth.refresh_tokens USING btree (session_id, revoked);


--
-- Name: refresh_tokens_updated_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_updated_at_idx ON auth.refresh_tokens USING btree (updated_at DESC);


--
-- Name: saml_providers_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_providers_sso_provider_id_idx ON auth.saml_providers USING btree (sso_provider_id);


--
-- Name: saml_relay_states_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_relay_states_created_at_idx ON auth.saml_relay_states USING btree (created_at DESC);


--
-- Name: saml_relay_states_for_email_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_relay_states_for_email_idx ON auth.saml_relay_states USING btree (for_email);


--
-- Name: saml_relay_states_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_relay_states_sso_provider_id_idx ON auth.saml_relay_states USING btree (sso_provider_id);


--
-- Name: sessions_not_after_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sessions_not_after_idx ON auth.sessions USING btree (not_after DESC);


--
-- Name: sessions_oauth_client_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sessions_oauth_client_id_idx ON auth.sessions USING btree (oauth_client_id);


--
-- Name: sessions_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sessions_user_id_idx ON auth.sessions USING btree (user_id);


--
-- Name: sso_domains_domain_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX sso_domains_domain_idx ON auth.sso_domains USING btree (lower(domain));


--
-- Name: sso_domains_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sso_domains_sso_provider_id_idx ON auth.sso_domains USING btree (sso_provider_id);


--
-- Name: sso_providers_resource_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX sso_providers_resource_id_idx ON auth.sso_providers USING btree (lower(resource_id));


--
-- Name: sso_providers_resource_id_pattern_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sso_providers_resource_id_pattern_idx ON auth.sso_providers USING btree (resource_id text_pattern_ops);


--
-- Name: unique_phone_factor_per_user; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX unique_phone_factor_per_user ON auth.mfa_factors USING btree (user_id, phone);


--
-- Name: user_id_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX user_id_created_at_idx ON auth.sessions USING btree (user_id, created_at);


--
-- Name: users_email_partial_key; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX users_email_partial_key ON auth.users USING btree (email) WHERE (is_sso_user = false);


--
-- Name: INDEX users_email_partial_key; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON INDEX auth.users_email_partial_key IS 'Auth: A partial unique index that applies only when is_sso_user is false';


--
-- Name: users_instance_id_email_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX users_instance_id_email_idx ON auth.users USING btree (instance_id, lower((email)::text));


--
-- Name: users_instance_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX users_instance_id_idx ON auth.users USING btree (instance_id);


--
-- Name: users_is_anonymous_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX users_is_anonymous_idx ON auth.users USING btree (is_anonymous);


--
-- Name: anti_cheat_case_events_case_created_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX anti_cheat_case_events_case_created_idx ON public.anti_cheat_case_events USING btree (case_id, created_at DESC);


--
-- Name: anti_cheat_cases_match_uidx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX anti_cheat_cases_match_uidx ON public.anti_cheat_cases USING btree (match_id);


--
-- Name: anti_cheat_cases_risk_created_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX anti_cheat_cases_risk_created_idx ON public.anti_cheat_cases USING btree (risk_score DESC, created_at DESC);


--
-- Name: anti_cheat_cases_status_created_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX anti_cheat_cases_status_created_idx ON public.anti_cheat_cases USING btree (status, created_at DESC);


--
-- Name: feedback_attachments_feedback_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX feedback_attachments_feedback_idx ON public.feedback_attachments USING btree (feedback_id, created_at);


--
-- Name: feedback_audit_logs_feedback_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX feedback_audit_logs_feedback_idx ON public.feedback_audit_logs USING btree (feedback_id, created_at DESC);


--
-- Name: feedback_entries_dedupe_user_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX feedback_entries_dedupe_user_idx ON public.feedback_entries USING btree (user_id, dedupe_hash, created_at DESC);


--
-- Name: feedback_entries_status_created_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX feedback_entries_status_created_idx ON public.feedback_entries USING btree (status, created_at DESC);


--
-- Name: feedback_entries_type_created_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX feedback_entries_type_created_idx ON public.feedback_entries USING btree (type, created_at DESC);


--
-- Name: feedback_entries_user_created_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX feedback_entries_user_created_idx ON public.feedback_entries USING btree (user_id, created_at DESC);


--
-- Name: idx_code_snapshots_match_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_code_snapshots_match_id ON public.code_snapshots USING btree (match_id);


--
-- Name: idx_duel_users_easy_rating; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_duel_users_easy_rating ON public.duel_users USING btree (easy_rating DESC);


--
-- Name: idx_duel_users_hard_rating; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_duel_users_hard_rating ON public.duel_users USING btree (hard_rating DESC);


--
-- Name: idx_duel_users_last_online; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_duel_users_last_online ON public.duel_users USING btree (last_online DESC);


--
-- Name: idx_duel_users_medium_rating; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_duel_users_medium_rating ON public.duel_users USING btree (medium_rating DESC);


--
-- Name: idx_duel_users_rating; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_duel_users_rating ON public.duel_users USING btree (rating DESC);


--
-- Name: idx_lesson_completion_events_completed_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lesson_completion_events_completed_at ON public.lesson_completion_events USING btree (completed_at DESC);


--
-- Name: idx_lesson_completion_events_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lesson_completion_events_user_id ON public.lesson_completion_events USING btree (user_id);


--
-- Name: idx_lesson_completion_events_user_period; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lesson_completion_events_user_period ON public.lesson_completion_events USING btree (user_id, completed_at DESC);


--
-- Name: idx_matches_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_matches_created_at ON public.matches USING btree (created_at DESC);


--
-- Name: idx_matches_player_a; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_matches_player_a ON public.matches USING btree (player_a_id);


--
-- Name: idx_matches_player_b; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_matches_player_b ON public.matches USING btree (player_b_id);


--
-- Name: idx_matches_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_matches_status ON public.matches USING btree (status);


--
-- Name: idx_submissions_match_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_submissions_match_id ON public.submissions USING btree (match_id);


--
-- Name: idx_submissions_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_submissions_user_id ON public.submissions USING btree (user_id);


--
-- Name: legal_acceptances_document_version_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX legal_acceptances_document_version_idx ON public.legal_acceptances USING btree (document_key, version, created_at DESC);


--
-- Name: legal_acceptances_user_created_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX legal_acceptances_user_created_idx ON public.legal_acceptances USING btree (user_id, created_at DESC);


--
-- Name: legal_acceptances_user_document_version_uidx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX legal_acceptances_user_document_version_uidx ON public.legal_acceptances USING btree (user_id, document_key, version);


--
-- Name: store_transactions_item_created_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX store_transactions_item_created_idx ON public.store_transactions USING btree (item_id, created_at DESC);


--
-- Name: store_transactions_source_created_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX store_transactions_source_created_idx ON public.store_transactions USING btree (source, created_at DESC);


--
-- Name: store_transactions_user_created_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX store_transactions_user_created_idx ON public.store_transactions USING btree (user_id, created_at DESC);


--
-- Name: ix_realtime_subscription_entity; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE INDEX ix_realtime_subscription_entity ON realtime.subscription USING btree (entity);


--
-- Name: messages_inserted_at_topic_index; Type: INDEX; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE INDEX messages_inserted_at_topic_index ON ONLY realtime.messages USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_03_05_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE INDEX messages_2026_03_05_inserted_at_topic_idx ON realtime.messages_2026_03_05 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_03_06_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE INDEX messages_2026_03_06_inserted_at_topic_idx ON realtime.messages_2026_03_06 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_03_07_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE INDEX messages_2026_03_07_inserted_at_topic_idx ON realtime.messages_2026_03_07 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_03_08_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE INDEX messages_2026_03_08_inserted_at_topic_idx ON realtime.messages_2026_03_08 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_03_09_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE INDEX messages_2026_03_09_inserted_at_topic_idx ON realtime.messages_2026_03_09 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_03_10_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE INDEX messages_2026_03_10_inserted_at_topic_idx ON realtime.messages_2026_03_10 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_03_11_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE INDEX messages_2026_03_11_inserted_at_topic_idx ON realtime.messages_2026_03_11 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: subscription_subscription_id_entity_filters_action_filter_key; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE UNIQUE INDEX subscription_subscription_id_entity_filters_action_filter_key ON realtime.subscription USING btree (subscription_id, entity, filters, action_filter);


--
-- Name: bname; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX bname ON storage.buckets USING btree (name);


--
-- Name: bucketid_objname; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX bucketid_objname ON storage.objects USING btree (bucket_id, name);


--
-- Name: buckets_analytics_unique_name_idx; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX buckets_analytics_unique_name_idx ON storage.buckets_analytics USING btree (name) WHERE (deleted_at IS NULL);


--
-- Name: idx_multipart_uploads_list; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX idx_multipart_uploads_list ON storage.s3_multipart_uploads USING btree (bucket_id, key, created_at);


--
-- Name: idx_objects_bucket_id_name; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX idx_objects_bucket_id_name ON storage.objects USING btree (bucket_id, name COLLATE "C");


--
-- Name: idx_objects_bucket_id_name_lower; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX idx_objects_bucket_id_name_lower ON storage.objects USING btree (bucket_id, lower(name) COLLATE "C");


--
-- Name: name_prefix_search; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX name_prefix_search ON storage.objects USING btree (name text_pattern_ops);


--
-- Name: vector_indexes_name_bucket_id_idx; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX vector_indexes_name_bucket_id_idx ON storage.vector_indexes USING btree (name, bucket_id);


--
-- Name: messages_2026_03_05_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_03_05_inserted_at_topic_idx;


--
-- Name: messages_2026_03_05_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_03_05_pkey;


--
-- Name: messages_2026_03_06_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_03_06_inserted_at_topic_idx;


--
-- Name: messages_2026_03_06_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_03_06_pkey;


--
-- Name: messages_2026_03_07_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_03_07_inserted_at_topic_idx;


--
-- Name: messages_2026_03_07_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_03_07_pkey;


--
-- Name: messages_2026_03_08_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_03_08_inserted_at_topic_idx;


--
-- Name: messages_2026_03_08_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_03_08_pkey;


--
-- Name: messages_2026_03_09_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_03_09_inserted_at_topic_idx;


--
-- Name: messages_2026_03_09_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_03_09_pkey;


--
-- Name: messages_2026_03_10_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_03_10_inserted_at_topic_idx;


--
-- Name: messages_2026_03_10_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_03_10_pkey;


--
-- Name: messages_2026_03_11_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_03_11_inserted_at_topic_idx;


--
-- Name: messages_2026_03_11_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_03_11_pkey;


--
-- Name: anti_cheat_cases anti_cheat_cases_set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER anti_cheat_cases_set_updated_at BEFORE UPDATE ON public.anti_cheat_cases FOR EACH ROW EXECUTE FUNCTION public.set_anti_cheat_updated_at();


--
-- Name: feedback_entries feedback_entries_set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER feedback_entries_set_updated_at BEFORE UPDATE ON public.feedback_entries FOR EACH ROW EXECUTE FUNCTION public.set_feedback_updated_at();


--
-- Name: user_profiles handle_user_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER handle_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: duel_users trg_sync_duel_user_match_counts; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_sync_duel_user_match_counts BEFORE INSERT OR UPDATE ON public.duel_users FOR EACH ROW EXECUTE FUNCTION public.sync_duel_user_match_counts();


--
-- Name: subscription tr_check_filters; Type: TRIGGER; Schema: realtime; Owner: supabase_admin
--

CREATE TRIGGER tr_check_filters BEFORE INSERT OR UPDATE ON realtime.subscription FOR EACH ROW EXECUTE FUNCTION realtime.subscription_check_filters();


--
-- Name: buckets enforce_bucket_name_length_trigger; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER enforce_bucket_name_length_trigger BEFORE INSERT OR UPDATE OF name ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.enforce_bucket_name_length();


--
-- Name: buckets protect_buckets_delete; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER protect_buckets_delete BEFORE DELETE ON storage.buckets FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();


--
-- Name: objects protect_objects_delete; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER protect_objects_delete BEFORE DELETE ON storage.objects FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();


--
-- Name: objects update_objects_updated_at; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.update_updated_at_column();


--
-- Name: identities identities_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: mfa_challenges mfa_challenges_auth_factor_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_auth_factor_id_fkey FOREIGN KEY (factor_id) REFERENCES auth.mfa_factors(id) ON DELETE CASCADE;


--
-- Name: mfa_factors mfa_factors_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: oauth_authorizations oauth_authorizations_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: oauth_authorizations oauth_authorizations_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: oauth_consents oauth_consents_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: oauth_consents oauth_consents_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: one_time_tokens one_time_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: saml_providers saml_providers_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_flow_state_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_flow_state_id_fkey FOREIGN KEY (flow_state_id) REFERENCES auth.flow_state(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_oauth_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_oauth_client_id_fkey FOREIGN KEY (oauth_client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: sso_domains sso_domains_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: anti_cheat_case_events anti_cheat_case_events_actor_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.anti_cheat_case_events
    ADD CONSTRAINT anti_cheat_case_events_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: anti_cheat_case_events anti_cheat_case_events_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.anti_cheat_case_events
    ADD CONSTRAINT anti_cheat_case_events_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.anti_cheat_cases(id) ON DELETE CASCADE;


--
-- Name: anti_cheat_cases anti_cheat_cases_match_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.anti_cheat_cases
    ADD CONSTRAINT anti_cheat_cases_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE CASCADE;


--
-- Name: anti_cheat_cases anti_cheat_cases_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.anti_cheat_cases
    ADD CONSTRAINT anti_cheat_cases_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: code_snapshots code_snapshots_match_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.code_snapshots
    ADD CONSTRAINT code_snapshots_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE CASCADE;


--
-- Name: code_snapshots code_snapshots_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.code_snapshots
    ADD CONSTRAINT code_snapshots_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.duel_users(id) ON DELETE CASCADE;


--
-- Name: duel_matches duel_matches_player1_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.duel_matches
    ADD CONSTRAINT duel_matches_player1_fkey FOREIGN KEY (player1) REFERENCES public.duel_users(id);


--
-- Name: duel_matches duel_matches_player2_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.duel_matches
    ADD CONSTRAINT duel_matches_player2_fkey FOREIGN KEY (player2) REFERENCES public.duel_users(id);


--
-- Name: duel_matches duel_matches_winner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.duel_matches
    ADD CONSTRAINT duel_matches_winner_id_fkey FOREIGN KEY (winner_id) REFERENCES public.duel_users(id);


--
-- Name: duel_submissions duel_submissions_match_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.duel_submissions
    ADD CONSTRAINT duel_submissions_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.duel_matches(id) ON DELETE CASCADE;


--
-- Name: duel_submissions duel_submissions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.duel_submissions
    ADD CONSTRAINT duel_submissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.duel_users(id);


--
-- Name: duel_users duel_users_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.duel_users
    ADD CONSTRAINT duel_users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: feedback_attachments feedback_attachments_feedback_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feedback_attachments
    ADD CONSTRAINT feedback_attachments_feedback_id_fkey FOREIGN KEY (feedback_id) REFERENCES public.feedback_entries(id) ON DELETE CASCADE;


--
-- Name: feedback_attachments feedback_attachments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feedback_attachments
    ADD CONSTRAINT feedback_attachments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: feedback_audit_logs feedback_audit_logs_actor_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feedback_audit_logs
    ADD CONSTRAINT feedback_audit_logs_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: feedback_audit_logs feedback_audit_logs_feedback_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feedback_audit_logs
    ADD CONSTRAINT feedback_audit_logs_feedback_id_fkey FOREIGN KEY (feedback_id) REFERENCES public.feedback_entries(id) ON DELETE CASCADE;


--
-- Name: feedback_entries feedback_entries_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feedback_entries
    ADD CONSTRAINT feedback_entries_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: legal_acceptances legal_acceptances_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.legal_acceptances
    ADD CONSTRAINT legal_acceptances_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: lesson_completion_events lesson_completion_events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lesson_completion_events
    ADD CONSTRAINT lesson_completion_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: match_events match_events_match_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.match_events
    ADD CONSTRAINT match_events_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE CASCADE;


--
-- Name: match_replays match_replays_match_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.match_replays
    ADD CONSTRAINT match_replays_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE CASCADE;


--
-- Name: matches matches_player_a_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_player_a_id_fkey FOREIGN KEY (player_a_id) REFERENCES public.duel_users(id) ON DELETE CASCADE;


--
-- Name: matches matches_player_b_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_player_b_id_fkey FOREIGN KEY (player_b_id) REFERENCES public.duel_users(id) ON DELETE CASCADE;


--
-- Name: matches matches_problem_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_problem_id_fkey FOREIGN KEY (problem_id) REFERENCES public.problems(id) ON DELETE RESTRICT;


--
-- Name: matches matches_winner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_winner_id_fkey FOREIGN KEY (winner_id) REFERENCES public.duel_users(id) ON DELETE SET NULL;


--
-- Name: store_transactions store_transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.store_transactions
    ADD CONSTRAINT store_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: submissions submissions_match_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.submissions
    ADD CONSTRAINT submissions_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE CASCADE;


--
-- Name: submissions submissions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.submissions
    ADD CONSTRAINT submissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.duel_users(id) ON DELETE CASCADE;


--
-- Name: user_profiles user_profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: objects objects_bucketId_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT "objects_bucketId_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_upload_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_upload_id_fkey FOREIGN KEY (upload_id) REFERENCES storage.s3_multipart_uploads(id) ON DELETE CASCADE;


--
-- Name: vector_indexes vector_indexes_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.vector_indexes
    ADD CONSTRAINT vector_indexes_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets_vectors(id);


--
-- Name: audit_log_entries; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.audit_log_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: flow_state; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.flow_state ENABLE ROW LEVEL SECURITY;

--
-- Name: identities; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.identities ENABLE ROW LEVEL SECURITY;

--
-- Name: instances; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.instances ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_amr_claims; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.mfa_amr_claims ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_challenges; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.mfa_challenges ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_factors; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.mfa_factors ENABLE ROW LEVEL SECURITY;

--
-- Name: one_time_tokens; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.one_time_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: refresh_tokens; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.refresh_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_providers; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.saml_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_relay_states; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.saml_relay_states ENABLE ROW LEVEL SECURITY;

--
-- Name: schema_migrations; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.schema_migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: sessions; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_domains; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.sso_domains ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_providers; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.sso_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

--
-- Name: user_profiles Leaderboard can read all user_profiles; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Leaderboard can read all user_profiles" ON public.user_profiles FOR SELECT TO authenticated, anon USING (true);


--
-- Name: duel_users Users can insert own duel profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert own duel profile" ON public.duel_users FOR INSERT TO authenticated WITH CHECK ((auth.uid() = id));


--
-- Name: user_profiles Users can insert own profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert own profile" ON public.user_profiles FOR INSERT TO authenticated WITH CHECK ((auth.uid() = id));


--
-- Name: duel_users Users can update own duel profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own duel profile" ON public.duel_users FOR UPDATE TO authenticated USING ((auth.uid() = id));


--
-- Name: user_profiles Users can update own profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own profile" ON public.user_profiles FOR UPDATE TO authenticated USING ((auth.uid() = id));


--
-- Name: duel_users Users can view all duel profiles; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view all duel profiles" ON public.duel_users FOR SELECT TO authenticated USING (true);


--
-- Name: user_profiles Users can view own profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view own profile" ON public.user_profiles FOR SELECT TO authenticated USING ((auth.uid() = id));


--
-- Name: anti_cheat_case_events; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.anti_cheat_case_events ENABLE ROW LEVEL SECURITY;

--
-- Name: anti_cheat_case_events anti_cheat_case_events_select_none; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY anti_cheat_case_events_select_none ON public.anti_cheat_case_events FOR SELECT TO authenticated USING (false);


--
-- Name: anti_cheat_cases; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.anti_cheat_cases ENABLE ROW LEVEL SECURITY;

--
-- Name: anti_cheat_cases anti_cheat_cases_select_none; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY anti_cheat_cases_select_none ON public.anti_cheat_cases FOR SELECT TO authenticated USING (false);


--
-- Name: code_snapshots; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.code_snapshots ENABLE ROW LEVEL SECURITY;

--
-- Name: code_snapshots code_snapshots_authenticated_insert_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY code_snapshots_authenticated_insert_own ON public.code_snapshots FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- Name: code_snapshots code_snapshots_authenticated_select_from_own_matches; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY code_snapshots_authenticated_select_from_own_matches ON public.code_snapshots FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.matches m
  WHERE ((m.id = code_snapshots.match_id) AND ((m.player_a_id = auth.uid()) OR (m.player_b_id = auth.uid()))))));


--
-- Name: code_snapshots code_snapshots_service_role_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY code_snapshots_service_role_all ON public.code_snapshots TO service_role USING (true) WITH CHECK (true);


--
-- Name: duel_matches; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.duel_matches ENABLE ROW LEVEL SECURITY;

--
-- Name: duel_submissions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.duel_submissions ENABLE ROW LEVEL SECURITY;

--
-- Name: duel_test_cases; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.duel_test_cases ENABLE ROW LEVEL SECURITY;

--
-- Name: duel_users; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.duel_users ENABLE ROW LEVEL SECURITY;

--
-- Name: duel_users duel_users_insert_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY duel_users_insert_own ON public.duel_users FOR INSERT TO authenticated WITH CHECK ((id = auth.uid()));


--
-- Name: duel_users duel_users_select_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY duel_users_select_own ON public.duel_users FOR SELECT TO authenticated USING ((id = auth.uid()));


--
-- Name: duel_users duel_users_service_role_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY duel_users_service_role_all ON public.duel_users TO service_role USING (true) WITH CHECK (true);


--
-- Name: duel_users duel_users_update_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY duel_users_update_own ON public.duel_users FOR UPDATE TO authenticated USING ((id = auth.uid())) WITH CHECK ((id = auth.uid()));


--
-- Name: feedback_attachments; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.feedback_attachments ENABLE ROW LEVEL SECURITY;

--
-- Name: feedback_attachments feedback_attachments_insert_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY feedback_attachments_insert_own ON public.feedback_attachments FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: feedback_attachments feedback_attachments_select_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY feedback_attachments_select_own ON public.feedback_attachments FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: feedback_audit_logs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.feedback_audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: feedback_audit_logs feedback_audit_logs_select_none; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY feedback_audit_logs_select_none ON public.feedback_audit_logs FOR SELECT TO authenticated USING (false);


--
-- Name: feedback_entries; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.feedback_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: feedback_entries feedback_entries_insert_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY feedback_entries_insert_own ON public.feedback_entries FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: feedback_entries feedback_entries_select_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY feedback_entries_select_own ON public.feedback_entries FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: legal_acceptances; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.legal_acceptances ENABLE ROW LEVEL SECURITY;

--
-- Name: legal_acceptances legal_acceptances_insert_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY legal_acceptances_insert_own ON public.legal_acceptances FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: legal_acceptances legal_acceptances_select_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY legal_acceptances_select_own ON public.legal_acceptances FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: lesson_completion_events; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.lesson_completion_events ENABLE ROW LEVEL SECURITY;

--
-- Name: lesson_completion_events lesson_completion_events_insert_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY lesson_completion_events_insert_own ON public.lesson_completion_events FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: lesson_completion_events lesson_completion_events_select_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY lesson_completion_events_select_own ON public.lesson_completion_events FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: match_events; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.match_events ENABLE ROW LEVEL SECURITY;

--
-- Name: match_events match_events_authenticated_select_from_own_matches; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY match_events_authenticated_select_from_own_matches ON public.match_events FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.matches m
  WHERE ((m.id = match_events.match_id) AND ((m.player_a_id = auth.uid()) OR (m.player_b_id = auth.uid()))))));


--
-- Name: match_events match_events_service_role_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY match_events_service_role_all ON public.match_events TO service_role USING (true) WITH CHECK (true);


--
-- Name: match_replays; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.match_replays ENABLE ROW LEVEL SECURITY;

--
-- Name: match_replays match_replays_authenticated_select_from_own_matches; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY match_replays_authenticated_select_from_own_matches ON public.match_replays FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.matches m
  WHERE ((m.id = match_replays.match_id) AND ((m.player_a_id = auth.uid()) OR (m.player_b_id = auth.uid()))))));


--
-- Name: match_replays match_replays_service_role_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY match_replays_service_role_all ON public.match_replays TO service_role USING (true) WITH CHECK (true);


--
-- Name: matches; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

--
-- Name: matches matches_authenticated_select_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY matches_authenticated_select_own ON public.matches FOR SELECT TO authenticated USING (((player_a_id = auth.uid()) OR (player_b_id = auth.uid())));


--
-- Name: matches matches_service_role_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY matches_service_role_all ON public.matches TO service_role USING (true) WITH CHECK (true);


--
-- Name: problems; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.problems ENABLE ROW LEVEL SECURITY;

--
-- Name: problems problems_select_active_anon_and_auth; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY problems_select_active_anon_and_auth ON public.problems FOR SELECT TO authenticated, anon USING ((is_active = true));


--
-- Name: problems problems_service_role_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY problems_service_role_all ON public.problems TO service_role USING (true) WITH CHECK (true);


--
-- Name: store_transactions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.store_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: store_transactions store_transactions_select_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY store_transactions_select_own ON public.store_transactions FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: submissions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

--
-- Name: submissions submissions_authenticated_insert_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY submissions_authenticated_insert_own ON public.submissions FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- Name: submissions submissions_authenticated_select_from_own_matches; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY submissions_authenticated_select_from_own_matches ON public.submissions FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.matches m
  WHERE ((m.id = submissions.match_id) AND ((m.player_a_id = auth.uid()) OR (m.player_b_id = auth.uid()))))));


--
-- Name: submissions submissions_service_role_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY submissions_service_role_all ON public.submissions TO service_role USING (true) WITH CHECK (true);


--
-- Name: user_profiles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: user_profiles user_profiles_service_role_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY user_profiles_service_role_all ON public.user_profiles TO service_role USING (true) WITH CHECK (true);


--
-- Name: messages; Type: ROW SECURITY; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets_analytics; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.buckets_analytics ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets_vectors; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.buckets_vectors ENABLE ROW LEVEL SECURITY;

--
-- Name: migrations; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: objects; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.s3_multipart_uploads ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads_parts; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.s3_multipart_uploads_parts ENABLE ROW LEVEL SECURITY;

--
-- Name: vector_indexes; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.vector_indexes ENABLE ROW LEVEL SECURITY;

--
-- Name: supabase_realtime; Type: PUBLICATION; Schema: -; Owner: postgres
--

CREATE PUBLICATION supabase_realtime WITH (publish = 'insert, update, delete, truncate');


ALTER PUBLICATION supabase_realtime OWNER TO postgres;

--
-- Name: supabase_realtime_messages_publication; Type: PUBLICATION; Schema: -; Owner: supabase_admin
--

CREATE PUBLICATION supabase_realtime_messages_publication WITH (publish = 'insert, update, delete, truncate');


ALTER PUBLICATION supabase_realtime_messages_publication OWNER TO supabase_admin;

--
-- Name: supabase_realtime_messages_publication messages; Type: PUBLICATION TABLE; Schema: realtime; Owner: supabase_admin
--

ALTER PUBLICATION supabase_realtime_messages_publication ADD TABLE ONLY realtime.messages;


--
-- Name: SCHEMA auth; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA auth TO anon;
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT USAGE ON SCHEMA auth TO service_role;
GRANT ALL ON SCHEMA auth TO supabase_auth_admin;
GRANT ALL ON SCHEMA auth TO dashboard_user;
GRANT USAGE ON SCHEMA auth TO postgres;


--
-- Name: SCHEMA extensions; Type: ACL; Schema: -; Owner: postgres
--

GRANT USAGE ON SCHEMA extensions TO anon;
GRANT USAGE ON SCHEMA extensions TO authenticated;
GRANT USAGE ON SCHEMA extensions TO service_role;
GRANT ALL ON SCHEMA extensions TO dashboard_user;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: SCHEMA realtime; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA realtime TO postgres;
GRANT USAGE ON SCHEMA realtime TO anon;
GRANT USAGE ON SCHEMA realtime TO authenticated;
GRANT USAGE ON SCHEMA realtime TO service_role;
GRANT ALL ON SCHEMA realtime TO supabase_realtime_admin;


--
-- Name: SCHEMA storage; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA storage TO postgres WITH GRANT OPTION;
GRANT USAGE ON SCHEMA storage TO anon;
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT USAGE ON SCHEMA storage TO service_role;
GRANT ALL ON SCHEMA storage TO supabase_storage_admin WITH GRANT OPTION;
GRANT ALL ON SCHEMA storage TO dashboard_user;


--
-- Name: SCHEMA vault; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA vault TO postgres WITH GRANT OPTION;
GRANT USAGE ON SCHEMA vault TO service_role;


--
-- Name: FUNCTION email(); Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON FUNCTION auth.email() TO dashboard_user;


--
-- Name: FUNCTION jwt(); Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON FUNCTION auth.jwt() TO postgres;
GRANT ALL ON FUNCTION auth.jwt() TO dashboard_user;


--
-- Name: FUNCTION role(); Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON FUNCTION auth.role() TO dashboard_user;


--
-- Name: FUNCTION uid(); Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON FUNCTION auth.uid() TO dashboard_user;


--
-- Name: FUNCTION armor(bytea); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.armor(bytea) FROM postgres;
GRANT ALL ON FUNCTION extensions.armor(bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.armor(bytea) TO dashboard_user;


--
-- Name: FUNCTION armor(bytea, text[], text[]); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.armor(bytea, text[], text[]) FROM postgres;
GRANT ALL ON FUNCTION extensions.armor(bytea, text[], text[]) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.armor(bytea, text[], text[]) TO dashboard_user;


--
-- Name: FUNCTION crypt(text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.crypt(text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.crypt(text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.crypt(text, text) TO dashboard_user;


--
-- Name: FUNCTION dearmor(text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.dearmor(text) FROM postgres;
GRANT ALL ON FUNCTION extensions.dearmor(text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.dearmor(text) TO dashboard_user;


--
-- Name: FUNCTION decrypt(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.decrypt(bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.decrypt(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.decrypt(bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION decrypt_iv(bytea, bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.decrypt_iv(bytea, bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.decrypt_iv(bytea, bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.decrypt_iv(bytea, bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION digest(bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.digest(bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.digest(bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.digest(bytea, text) TO dashboard_user;


--
-- Name: FUNCTION digest(text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.digest(text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.digest(text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.digest(text, text) TO dashboard_user;


--
-- Name: FUNCTION encrypt(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.encrypt(bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.encrypt(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.encrypt(bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION encrypt_iv(bytea, bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.encrypt_iv(bytea, bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.encrypt_iv(bytea, bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.encrypt_iv(bytea, bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION gen_random_bytes(integer); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.gen_random_bytes(integer) FROM postgres;
GRANT ALL ON FUNCTION extensions.gen_random_bytes(integer) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.gen_random_bytes(integer) TO dashboard_user;


--
-- Name: FUNCTION gen_random_uuid(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.gen_random_uuid() FROM postgres;
GRANT ALL ON FUNCTION extensions.gen_random_uuid() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.gen_random_uuid() TO dashboard_user;


--
-- Name: FUNCTION gen_salt(text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.gen_salt(text) FROM postgres;
GRANT ALL ON FUNCTION extensions.gen_salt(text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.gen_salt(text) TO dashboard_user;


--
-- Name: FUNCTION gen_salt(text, integer); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.gen_salt(text, integer) FROM postgres;
GRANT ALL ON FUNCTION extensions.gen_salt(text, integer) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.gen_salt(text, integer) TO dashboard_user;


--
-- Name: FUNCTION grant_pg_cron_access(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION extensions.grant_pg_cron_access() FROM supabase_admin;
GRANT ALL ON FUNCTION extensions.grant_pg_cron_access() TO supabase_admin WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.grant_pg_cron_access() TO dashboard_user;


--
-- Name: FUNCTION grant_pg_graphql_access(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.grant_pg_graphql_access() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION grant_pg_net_access(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION extensions.grant_pg_net_access() FROM supabase_admin;
GRANT ALL ON FUNCTION extensions.grant_pg_net_access() TO supabase_admin WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.grant_pg_net_access() TO dashboard_user;


--
-- Name: FUNCTION hmac(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.hmac(bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.hmac(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.hmac(bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION hmac(text, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.hmac(text, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.hmac(text, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.hmac(text, text, text) TO dashboard_user;


--
-- Name: FUNCTION pg_stat_statements(showtext boolean, OUT userid oid, OUT dbid oid, OUT toplevel boolean, OUT queryid bigint, OUT query text, OUT plans bigint, OUT total_plan_time double precision, OUT min_plan_time double precision, OUT max_plan_time double precision, OUT mean_plan_time double precision, OUT stddev_plan_time double precision, OUT calls bigint, OUT total_exec_time double precision, OUT min_exec_time double precision, OUT max_exec_time double precision, OUT mean_exec_time double precision, OUT stddev_exec_time double precision, OUT rows bigint, OUT shared_blks_hit bigint, OUT shared_blks_read bigint, OUT shared_blks_dirtied bigint, OUT shared_blks_written bigint, OUT local_blks_hit bigint, OUT local_blks_read bigint, OUT local_blks_dirtied bigint, OUT local_blks_written bigint, OUT temp_blks_read bigint, OUT temp_blks_written bigint, OUT shared_blk_read_time double precision, OUT shared_blk_write_time double precision, OUT local_blk_read_time double precision, OUT local_blk_write_time double precision, OUT temp_blk_read_time double precision, OUT temp_blk_write_time double precision, OUT wal_records bigint, OUT wal_fpi bigint, OUT wal_bytes numeric, OUT jit_functions bigint, OUT jit_generation_time double precision, OUT jit_inlining_count bigint, OUT jit_inlining_time double precision, OUT jit_optimization_count bigint, OUT jit_optimization_time double precision, OUT jit_emission_count bigint, OUT jit_emission_time double precision, OUT jit_deform_count bigint, OUT jit_deform_time double precision, OUT stats_since timestamp with time zone, OUT minmax_stats_since timestamp with time zone); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pg_stat_statements(showtext boolean, OUT userid oid, OUT dbid oid, OUT toplevel boolean, OUT queryid bigint, OUT query text, OUT plans bigint, OUT total_plan_time double precision, OUT min_plan_time double precision, OUT max_plan_time double precision, OUT mean_plan_time double precision, OUT stddev_plan_time double precision, OUT calls bigint, OUT total_exec_time double precision, OUT min_exec_time double precision, OUT max_exec_time double precision, OUT mean_exec_time double precision, OUT stddev_exec_time double precision, OUT rows bigint, OUT shared_blks_hit bigint, OUT shared_blks_read bigint, OUT shared_blks_dirtied bigint, OUT shared_blks_written bigint, OUT local_blks_hit bigint, OUT local_blks_read bigint, OUT local_blks_dirtied bigint, OUT local_blks_written bigint, OUT temp_blks_read bigint, OUT temp_blks_written bigint, OUT shared_blk_read_time double precision, OUT shared_blk_write_time double precision, OUT local_blk_read_time double precision, OUT local_blk_write_time double precision, OUT temp_blk_read_time double precision, OUT temp_blk_write_time double precision, OUT wal_records bigint, OUT wal_fpi bigint, OUT wal_bytes numeric, OUT jit_functions bigint, OUT jit_generation_time double precision, OUT jit_inlining_count bigint, OUT jit_inlining_time double precision, OUT jit_optimization_count bigint, OUT jit_optimization_time double precision, OUT jit_emission_count bigint, OUT jit_emission_time double precision, OUT jit_deform_count bigint, OUT jit_deform_time double precision, OUT stats_since timestamp with time zone, OUT minmax_stats_since timestamp with time zone) FROM postgres;
GRANT ALL ON FUNCTION extensions.pg_stat_statements(showtext boolean, OUT userid oid, OUT dbid oid, OUT toplevel boolean, OUT queryid bigint, OUT query text, OUT plans bigint, OUT total_plan_time double precision, OUT min_plan_time double precision, OUT max_plan_time double precision, OUT mean_plan_time double precision, OUT stddev_plan_time double precision, OUT calls bigint, OUT total_exec_time double precision, OUT min_exec_time double precision, OUT max_exec_time double precision, OUT mean_exec_time double precision, OUT stddev_exec_time double precision, OUT rows bigint, OUT shared_blks_hit bigint, OUT shared_blks_read bigint, OUT shared_blks_dirtied bigint, OUT shared_blks_written bigint, OUT local_blks_hit bigint, OUT local_blks_read bigint, OUT local_blks_dirtied bigint, OUT local_blks_written bigint, OUT temp_blks_read bigint, OUT temp_blks_written bigint, OUT shared_blk_read_time double precision, OUT shared_blk_write_time double precision, OUT local_blk_read_time double precision, OUT local_blk_write_time double precision, OUT temp_blk_read_time double precision, OUT temp_blk_write_time double precision, OUT wal_records bigint, OUT wal_fpi bigint, OUT wal_bytes numeric, OUT jit_functions bigint, OUT jit_generation_time double precision, OUT jit_inlining_count bigint, OUT jit_inlining_time double precision, OUT jit_optimization_count bigint, OUT jit_optimization_time double precision, OUT jit_emission_count bigint, OUT jit_emission_time double precision, OUT jit_deform_count bigint, OUT jit_deform_time double precision, OUT stats_since timestamp with time zone, OUT minmax_stats_since timestamp with time zone) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pg_stat_statements(showtext boolean, OUT userid oid, OUT dbid oid, OUT toplevel boolean, OUT queryid bigint, OUT query text, OUT plans bigint, OUT total_plan_time double precision, OUT min_plan_time double precision, OUT max_plan_time double precision, OUT mean_plan_time double precision, OUT stddev_plan_time double precision, OUT calls bigint, OUT total_exec_time double precision, OUT min_exec_time double precision, OUT max_exec_time double precision, OUT mean_exec_time double precision, OUT stddev_exec_time double precision, OUT rows bigint, OUT shared_blks_hit bigint, OUT shared_blks_read bigint, OUT shared_blks_dirtied bigint, OUT shared_blks_written bigint, OUT local_blks_hit bigint, OUT local_blks_read bigint, OUT local_blks_dirtied bigint, OUT local_blks_written bigint, OUT temp_blks_read bigint, OUT temp_blks_written bigint, OUT shared_blk_read_time double precision, OUT shared_blk_write_time double precision, OUT local_blk_read_time double precision, OUT local_blk_write_time double precision, OUT temp_blk_read_time double precision, OUT temp_blk_write_time double precision, OUT wal_records bigint, OUT wal_fpi bigint, OUT wal_bytes numeric, OUT jit_functions bigint, OUT jit_generation_time double precision, OUT jit_inlining_count bigint, OUT jit_inlining_time double precision, OUT jit_optimization_count bigint, OUT jit_optimization_time double precision, OUT jit_emission_count bigint, OUT jit_emission_time double precision, OUT jit_deform_count bigint, OUT jit_deform_time double precision, OUT stats_since timestamp with time zone, OUT minmax_stats_since timestamp with time zone) TO dashboard_user;


--
-- Name: FUNCTION pg_stat_statements_info(OUT dealloc bigint, OUT stats_reset timestamp with time zone); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pg_stat_statements_info(OUT dealloc bigint, OUT stats_reset timestamp with time zone) FROM postgres;
GRANT ALL ON FUNCTION extensions.pg_stat_statements_info(OUT dealloc bigint, OUT stats_reset timestamp with time zone) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pg_stat_statements_info(OUT dealloc bigint, OUT stats_reset timestamp with time zone) TO dashboard_user;


--
-- Name: FUNCTION pg_stat_statements_reset(userid oid, dbid oid, queryid bigint, minmax_only boolean); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pg_stat_statements_reset(userid oid, dbid oid, queryid bigint, minmax_only boolean) FROM postgres;
GRANT ALL ON FUNCTION extensions.pg_stat_statements_reset(userid oid, dbid oid, queryid bigint, minmax_only boolean) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pg_stat_statements_reset(userid oid, dbid oid, queryid bigint, minmax_only boolean) TO dashboard_user;


--
-- Name: FUNCTION pgp_armor_headers(text, OUT key text, OUT value text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_armor_headers(text, OUT key text, OUT value text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_armor_headers(text, OUT key text, OUT value text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_armor_headers(text, OUT key text, OUT value text) TO dashboard_user;


--
-- Name: FUNCTION pgp_key_id(bytea); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_key_id(bytea) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_key_id(bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_key_id(bytea) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_decrypt(bytea, bytea); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_decrypt(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_decrypt(bytea, bytea, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_decrypt_bytea(bytea, bytea); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_decrypt_bytea(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_decrypt_bytea(bytea, bytea, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_encrypt(text, bytea); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_encrypt(text, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_encrypt_bytea(bytea, bytea); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_encrypt_bytea(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_decrypt(bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_decrypt(bytea, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_decrypt_bytea(bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_decrypt_bytea(bytea, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_encrypt(text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_encrypt(text, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_encrypt_bytea(bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_encrypt_bytea(bytea, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text, text) TO dashboard_user;


--
-- Name: FUNCTION pgrst_ddl_watch(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgrst_ddl_watch() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgrst_drop_watch(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgrst_drop_watch() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION set_graphql_placeholder(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.set_graphql_placeholder() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION uuid_generate_v1(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_generate_v1() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_generate_v1() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_generate_v1() TO dashboard_user;


--
-- Name: FUNCTION uuid_generate_v1mc(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_generate_v1mc() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_generate_v1mc() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_generate_v1mc() TO dashboard_user;


--
-- Name: FUNCTION uuid_generate_v3(namespace uuid, name text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_generate_v3(namespace uuid, name text) FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_generate_v3(namespace uuid, name text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_generate_v3(namespace uuid, name text) TO dashboard_user;


--
-- Name: FUNCTION uuid_generate_v4(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_generate_v4() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_generate_v4() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_generate_v4() TO dashboard_user;


--
-- Name: FUNCTION uuid_generate_v5(namespace uuid, name text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_generate_v5(namespace uuid, name text) FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_generate_v5(namespace uuid, name text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_generate_v5(namespace uuid, name text) TO dashboard_user;


--
-- Name: FUNCTION uuid_nil(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_nil() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_nil() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_nil() TO dashboard_user;


--
-- Name: FUNCTION uuid_ns_dns(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_ns_dns() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_ns_dns() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_ns_dns() TO dashboard_user;


--
-- Name: FUNCTION uuid_ns_oid(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_ns_oid() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_ns_oid() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_ns_oid() TO dashboard_user;


--
-- Name: FUNCTION uuid_ns_url(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_ns_url() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_ns_url() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_ns_url() TO dashboard_user;


--
-- Name: FUNCTION uuid_ns_x500(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_ns_x500() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_ns_x500() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_ns_x500() TO dashboard_user;


--
-- Name: FUNCTION graphql("operationName" text, query text, variables jsonb, extensions jsonb); Type: ACL; Schema: graphql_public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) TO postgres;
GRANT ALL ON FUNCTION graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) TO anon;
GRANT ALL ON FUNCTION graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) TO authenticated;
GRANT ALL ON FUNCTION graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) TO service_role;


--
-- Name: FUNCTION pg_reload_conf(); Type: ACL; Schema: pg_catalog; Owner: supabase_admin
--

GRANT ALL ON FUNCTION pg_catalog.pg_reload_conf() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION get_auth(p_usename text); Type: ACL; Schema: pgbouncer; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION pgbouncer.get_auth(p_usename text) FROM PUBLIC;
GRANT ALL ON FUNCTION pgbouncer.get_auth(p_usename text) TO pgbouncer;


--
-- Name: FUNCTION apply_store_coin_purchase(p_user_id uuid, p_request_id uuid, p_item_id text, p_coin_cost integer, p_item_kind text, p_duration_hours integer, p_multiplier integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.apply_store_coin_purchase(p_user_id uuid, p_request_id uuid, p_item_id text, p_coin_cost integer, p_item_kind text, p_duration_hours integer, p_multiplier integer) TO anon;
GRANT ALL ON FUNCTION public.apply_store_coin_purchase(p_user_id uuid, p_request_id uuid, p_item_id text, p_coin_cost integer, p_item_kind text, p_duration_hours integer, p_multiplier integer) TO authenticated;
GRANT ALL ON FUNCTION public.apply_store_coin_purchase(p_user_id uuid, p_request_id uuid, p_item_id text, p_coin_cost integer, p_item_kind text, p_duration_hours integer, p_multiplier integer) TO service_role;


--
-- Name: FUNCTION fulfill_store_coin_pack(p_user_id uuid, p_payment_intent_id text, p_item_id text, p_coins integer, p_amount_cents integer, p_currency text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.fulfill_store_coin_pack(p_user_id uuid, p_payment_intent_id text, p_item_id text, p_coins integer, p_amount_cents integer, p_currency text) TO anon;
GRANT ALL ON FUNCTION public.fulfill_store_coin_pack(p_user_id uuid, p_payment_intent_id text, p_item_id text, p_coins integer, p_amount_cents integer, p_currency text) TO authenticated;
GRANT ALL ON FUNCTION public.fulfill_store_coin_pack(p_user_id uuid, p_payment_intent_id text, p_item_id text, p_coins integer, p_amount_cents integer, p_currency text) TO service_role;


--
-- Name: FUNCTION get_leaderboard_period_start(p_period text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_leaderboard_period_start(p_period text) TO anon;
GRANT ALL ON FUNCTION public.get_leaderboard_period_start(p_period text) TO authenticated;
GRANT ALL ON FUNCTION public.get_leaderboard_period_start(p_period text) TO service_role;


--
-- Name: FUNCTION get_public_leaderboard_page(p_limit integer, p_offset integer, p_period text, p_sort text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_public_leaderboard_page(p_limit integer, p_offset integer, p_period text, p_sort text) TO anon;
GRANT ALL ON FUNCTION public.get_public_leaderboard_page(p_limit integer, p_offset integer, p_period text, p_sort text) TO authenticated;
GRANT ALL ON FUNCTION public.get_public_leaderboard_page(p_limit integer, p_offset integer, p_period text, p_sort text) TO service_role;


--
-- Name: FUNCTION get_public_leaderboard_rank(p_user_id uuid, p_period text, p_sort text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_public_leaderboard_rank(p_user_id uuid, p_period text, p_sort text) TO anon;
GRANT ALL ON FUNCTION public.get_public_leaderboard_rank(p_user_id uuid, p_period text, p_sort text) TO authenticated;
GRANT ALL ON FUNCTION public.get_public_leaderboard_rank(p_user_id uuid, p_period text, p_sort text) TO service_role;


--
-- Name: FUNCTION get_public_leaderboard_user_stats(p_user_id uuid, p_period text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_public_leaderboard_user_stats(p_user_id uuid, p_period text) TO anon;
GRANT ALL ON FUNCTION public.get_public_leaderboard_user_stats(p_user_id uuid, p_period text) TO authenticated;
GRANT ALL ON FUNCTION public.get_public_leaderboard_user_stats(p_user_id uuid, p_period text) TO service_role;


--
-- Name: FUNCTION handle_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.handle_updated_at() TO anon;
GRANT ALL ON FUNCTION public.handle_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.handle_updated_at() TO service_role;


--
-- Name: FUNCTION rls_auto_enable(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.rls_auto_enable() TO anon;
GRANT ALL ON FUNCTION public.rls_auto_enable() TO authenticated;
GRANT ALL ON FUNCTION public.rls_auto_enable() TO service_role;


--
-- Name: FUNCTION set_anti_cheat_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.set_anti_cheat_updated_at() TO anon;
GRANT ALL ON FUNCTION public.set_anti_cheat_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.set_anti_cheat_updated_at() TO service_role;


--
-- Name: FUNCTION set_feedback_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.set_feedback_updated_at() TO anon;
GRANT ALL ON FUNCTION public.set_feedback_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.set_feedback_updated_at() TO service_role;


--
-- Name: FUNCTION sync_duel_user_match_counts(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.sync_duel_user_match_counts() TO anon;
GRANT ALL ON FUNCTION public.sync_duel_user_match_counts() TO authenticated;
GRANT ALL ON FUNCTION public.sync_duel_user_match_counts() TO service_role;


--
-- Name: FUNCTION apply_rls(wal jsonb, max_record_bytes integer); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO postgres;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO anon;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO authenticated;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO service_role;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO supabase_realtime_admin;


--
-- Name: FUNCTION broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text) TO postgres;
GRANT ALL ON FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text) TO dashboard_user;


--
-- Name: FUNCTION build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO postgres;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO anon;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO authenticated;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO service_role;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO supabase_realtime_admin;


--
-- Name: FUNCTION "cast"(val text, type_ regtype); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO postgres;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO dashboard_user;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO anon;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO authenticated;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO service_role;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO supabase_realtime_admin;


--
-- Name: FUNCTION check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO postgres;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO anon;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO authenticated;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO service_role;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO supabase_realtime_admin;


--
-- Name: FUNCTION is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO postgres;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO anon;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO authenticated;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO service_role;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO supabase_realtime_admin;


--
-- Name: FUNCTION list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO postgres;
GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO anon;
GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO authenticated;
GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO service_role;
GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO supabase_realtime_admin;


--
-- Name: FUNCTION quote_wal2json(entity regclass); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO postgres;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO anon;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO authenticated;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO service_role;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO supabase_realtime_admin;


--
-- Name: FUNCTION send(payload jsonb, event text, topic text, private boolean); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean) TO postgres;
GRANT ALL ON FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean) TO dashboard_user;


--
-- Name: FUNCTION subscription_check_filters(); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO postgres;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO dashboard_user;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO anon;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO authenticated;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO service_role;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO supabase_realtime_admin;


--
-- Name: FUNCTION to_regrole(role_name text); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO postgres;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO anon;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO authenticated;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO service_role;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO supabase_realtime_admin;


--
-- Name: FUNCTION topic(); Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT ALL ON FUNCTION realtime.topic() TO postgres;
GRANT ALL ON FUNCTION realtime.topic() TO dashboard_user;


--
-- Name: FUNCTION _crypto_aead_det_decrypt(message bytea, additional bytea, key_id bigint, context bytea, nonce bytea); Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT ALL ON FUNCTION vault._crypto_aead_det_decrypt(message bytea, additional bytea, key_id bigint, context bytea, nonce bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION vault._crypto_aead_det_decrypt(message bytea, additional bytea, key_id bigint, context bytea, nonce bytea) TO service_role;


--
-- Name: FUNCTION create_secret(new_secret text, new_name text, new_description text, new_key_id uuid); Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT ALL ON FUNCTION vault.create_secret(new_secret text, new_name text, new_description text, new_key_id uuid) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION vault.create_secret(new_secret text, new_name text, new_description text, new_key_id uuid) TO service_role;


--
-- Name: FUNCTION update_secret(secret_id uuid, new_secret text, new_name text, new_description text, new_key_id uuid); Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT ALL ON FUNCTION vault.update_secret(secret_id uuid, new_secret text, new_name text, new_description text, new_key_id uuid) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION vault.update_secret(secret_id uuid, new_secret text, new_name text, new_description text, new_key_id uuid) TO service_role;


--
-- Name: TABLE audit_log_entries; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.audit_log_entries TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.audit_log_entries TO postgres;
GRANT SELECT ON TABLE auth.audit_log_entries TO postgres WITH GRANT OPTION;


--
-- Name: TABLE flow_state; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.flow_state TO postgres;
GRANT SELECT ON TABLE auth.flow_state TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.flow_state TO dashboard_user;


--
-- Name: TABLE identities; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.identities TO postgres;
GRANT SELECT ON TABLE auth.identities TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.identities TO dashboard_user;


--
-- Name: TABLE instances; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.instances TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.instances TO postgres;
GRANT SELECT ON TABLE auth.instances TO postgres WITH GRANT OPTION;


--
-- Name: TABLE mfa_amr_claims; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.mfa_amr_claims TO postgres;
GRANT SELECT ON TABLE auth.mfa_amr_claims TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.mfa_amr_claims TO dashboard_user;


--
-- Name: TABLE mfa_challenges; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.mfa_challenges TO postgres;
GRANT SELECT ON TABLE auth.mfa_challenges TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.mfa_challenges TO dashboard_user;


--
-- Name: TABLE mfa_factors; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.mfa_factors TO postgres;
GRANT SELECT ON TABLE auth.mfa_factors TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.mfa_factors TO dashboard_user;


--
-- Name: TABLE oauth_authorizations; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.oauth_authorizations TO postgres;
GRANT ALL ON TABLE auth.oauth_authorizations TO dashboard_user;


--
-- Name: TABLE oauth_client_states; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.oauth_client_states TO postgres;
GRANT ALL ON TABLE auth.oauth_client_states TO dashboard_user;


--
-- Name: TABLE oauth_clients; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.oauth_clients TO postgres;
GRANT ALL ON TABLE auth.oauth_clients TO dashboard_user;


--
-- Name: TABLE oauth_consents; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.oauth_consents TO postgres;
GRANT ALL ON TABLE auth.oauth_consents TO dashboard_user;


--
-- Name: TABLE one_time_tokens; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.one_time_tokens TO postgres;
GRANT SELECT ON TABLE auth.one_time_tokens TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.one_time_tokens TO dashboard_user;


--
-- Name: TABLE refresh_tokens; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.refresh_tokens TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.refresh_tokens TO postgres;
GRANT SELECT ON TABLE auth.refresh_tokens TO postgres WITH GRANT OPTION;


--
-- Name: SEQUENCE refresh_tokens_id_seq; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON SEQUENCE auth.refresh_tokens_id_seq TO dashboard_user;
GRANT ALL ON SEQUENCE auth.refresh_tokens_id_seq TO postgres;


--
-- Name: TABLE saml_providers; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.saml_providers TO postgres;
GRANT SELECT ON TABLE auth.saml_providers TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.saml_providers TO dashboard_user;


--
-- Name: TABLE saml_relay_states; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.saml_relay_states TO postgres;
GRANT SELECT ON TABLE auth.saml_relay_states TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.saml_relay_states TO dashboard_user;


--
-- Name: TABLE schema_migrations; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT SELECT ON TABLE auth.schema_migrations TO postgres WITH GRANT OPTION;


--
-- Name: TABLE sessions; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.sessions TO postgres;
GRANT SELECT ON TABLE auth.sessions TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.sessions TO dashboard_user;


--
-- Name: TABLE sso_domains; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.sso_domains TO postgres;
GRANT SELECT ON TABLE auth.sso_domains TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.sso_domains TO dashboard_user;


--
-- Name: TABLE sso_providers; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.sso_providers TO postgres;
GRANT SELECT ON TABLE auth.sso_providers TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.sso_providers TO dashboard_user;


--
-- Name: TABLE users; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.users TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.users TO postgres;
GRANT SELECT ON TABLE auth.users TO postgres WITH GRANT OPTION;


--
-- Name: TABLE pg_stat_statements; Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON TABLE extensions.pg_stat_statements FROM postgres;
GRANT ALL ON TABLE extensions.pg_stat_statements TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE extensions.pg_stat_statements TO dashboard_user;


--
-- Name: TABLE pg_stat_statements_info; Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON TABLE extensions.pg_stat_statements_info FROM postgres;
GRANT ALL ON TABLE extensions.pg_stat_statements_info TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE extensions.pg_stat_statements_info TO dashboard_user;


--
-- Name: TABLE anti_cheat_case_events; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.anti_cheat_case_events TO anon;
GRANT ALL ON TABLE public.anti_cheat_case_events TO authenticated;
GRANT ALL ON TABLE public.anti_cheat_case_events TO service_role;


--
-- Name: TABLE anti_cheat_cases; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.anti_cheat_cases TO anon;
GRANT ALL ON TABLE public.anti_cheat_cases TO authenticated;
GRANT ALL ON TABLE public.anti_cheat_cases TO service_role;


--
-- Name: TABLE code_snapshots; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.code_snapshots TO anon;
GRANT ALL ON TABLE public.code_snapshots TO authenticated;
GRANT ALL ON TABLE public.code_snapshots TO service_role;


--
-- Name: TABLE duel_matches; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.duel_matches TO anon;
GRANT ALL ON TABLE public.duel_matches TO authenticated;
GRANT ALL ON TABLE public.duel_matches TO service_role;


--
-- Name: TABLE duel_submissions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.duel_submissions TO anon;
GRANT ALL ON TABLE public.duel_submissions TO authenticated;
GRANT ALL ON TABLE public.duel_submissions TO service_role;


--
-- Name: TABLE duel_test_cases; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.duel_test_cases TO anon;
GRANT ALL ON TABLE public.duel_test_cases TO authenticated;
GRANT ALL ON TABLE public.duel_test_cases TO service_role;


--
-- Name: TABLE duel_users; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.duel_users TO anon;
GRANT ALL ON TABLE public.duel_users TO authenticated;
GRANT ALL ON TABLE public.duel_users TO service_role;


--
-- Name: TABLE feedback_attachments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.feedback_attachments TO anon;
GRANT ALL ON TABLE public.feedback_attachments TO authenticated;
GRANT ALL ON TABLE public.feedback_attachments TO service_role;


--
-- Name: TABLE feedback_audit_logs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.feedback_audit_logs TO anon;
GRANT ALL ON TABLE public.feedback_audit_logs TO authenticated;
GRANT ALL ON TABLE public.feedback_audit_logs TO service_role;


--
-- Name: TABLE feedback_entries; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.feedback_entries TO anon;
GRANT ALL ON TABLE public.feedback_entries TO authenticated;
GRANT ALL ON TABLE public.feedback_entries TO service_role;


--
-- Name: TABLE leaderboard_entries; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.leaderboard_entries TO anon;
GRANT ALL ON TABLE public.leaderboard_entries TO authenticated;
GRANT ALL ON TABLE public.leaderboard_entries TO service_role;


--
-- Name: TABLE legal_acceptances; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.legal_acceptances TO anon;
GRANT ALL ON TABLE public.legal_acceptances TO authenticated;
GRANT ALL ON TABLE public.legal_acceptances TO service_role;


--
-- Name: TABLE lesson_completion_events; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.lesson_completion_events TO anon;
GRANT ALL ON TABLE public.lesson_completion_events TO authenticated;
GRANT ALL ON TABLE public.lesson_completion_events TO service_role;


--
-- Name: TABLE match_events; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.match_events TO anon;
GRANT ALL ON TABLE public.match_events TO authenticated;
GRANT ALL ON TABLE public.match_events TO service_role;


--
-- Name: TABLE match_replays; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.match_replays TO anon;
GRANT ALL ON TABLE public.match_replays TO authenticated;
GRANT ALL ON TABLE public.match_replays TO service_role;


--
-- Name: TABLE matches; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.matches TO anon;
GRANT ALL ON TABLE public.matches TO authenticated;
GRANT ALL ON TABLE public.matches TO service_role;


--
-- Name: TABLE problems; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.problems TO anon;
GRANT ALL ON TABLE public.problems TO authenticated;
GRANT ALL ON TABLE public.problems TO service_role;


--
-- Name: TABLE user_profiles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_profiles TO anon;
GRANT ALL ON TABLE public.user_profiles TO authenticated;
GRANT ALL ON TABLE public.user_profiles TO service_role;


--
-- Name: TABLE public_leaderboard; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.public_leaderboard TO anon;
GRANT ALL ON TABLE public.public_leaderboard TO authenticated;
GRANT ALL ON TABLE public.public_leaderboard TO service_role;


--
-- Name: TABLE store_transactions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.store_transactions TO anon;
GRANT ALL ON TABLE public.store_transactions TO authenticated;
GRANT ALL ON TABLE public.store_transactions TO service_role;


--
-- Name: TABLE submissions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.submissions TO anon;
GRANT ALL ON TABLE public.submissions TO authenticated;
GRANT ALL ON TABLE public.submissions TO service_role;


--
-- Name: TABLE messages; Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT ALL ON TABLE realtime.messages TO postgres;
GRANT ALL ON TABLE realtime.messages TO dashboard_user;
GRANT SELECT,INSERT,UPDATE ON TABLE realtime.messages TO anon;
GRANT SELECT,INSERT,UPDATE ON TABLE realtime.messages TO authenticated;
GRANT SELECT,INSERT,UPDATE ON TABLE realtime.messages TO service_role;


--
-- Name: TABLE messages_2026_03_05; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON TABLE realtime.messages_2026_03_05 TO postgres;
GRANT ALL ON TABLE realtime.messages_2026_03_05 TO dashboard_user;


--
-- Name: TABLE messages_2026_03_06; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON TABLE realtime.messages_2026_03_06 TO postgres;
GRANT ALL ON TABLE realtime.messages_2026_03_06 TO dashboard_user;


--
-- Name: TABLE messages_2026_03_07; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON TABLE realtime.messages_2026_03_07 TO postgres;
GRANT ALL ON TABLE realtime.messages_2026_03_07 TO dashboard_user;


--
-- Name: TABLE messages_2026_03_08; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON TABLE realtime.messages_2026_03_08 TO postgres;
GRANT ALL ON TABLE realtime.messages_2026_03_08 TO dashboard_user;


--
-- Name: TABLE messages_2026_03_09; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON TABLE realtime.messages_2026_03_09 TO postgres;
GRANT ALL ON TABLE realtime.messages_2026_03_09 TO dashboard_user;


--
-- Name: TABLE messages_2026_03_10; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON TABLE realtime.messages_2026_03_10 TO postgres;
GRANT ALL ON TABLE realtime.messages_2026_03_10 TO dashboard_user;


--
-- Name: TABLE messages_2026_03_11; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON TABLE realtime.messages_2026_03_11 TO postgres;
GRANT ALL ON TABLE realtime.messages_2026_03_11 TO dashboard_user;


--
-- Name: TABLE schema_migrations; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON TABLE realtime.schema_migrations TO postgres;
GRANT ALL ON TABLE realtime.schema_migrations TO dashboard_user;
GRANT SELECT ON TABLE realtime.schema_migrations TO anon;
GRANT SELECT ON TABLE realtime.schema_migrations TO authenticated;
GRANT SELECT ON TABLE realtime.schema_migrations TO service_role;
GRANT ALL ON TABLE realtime.schema_migrations TO supabase_realtime_admin;


--
-- Name: TABLE subscription; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON TABLE realtime.subscription TO postgres;
GRANT ALL ON TABLE realtime.subscription TO dashboard_user;
GRANT SELECT ON TABLE realtime.subscription TO anon;
GRANT SELECT ON TABLE realtime.subscription TO authenticated;
GRANT SELECT ON TABLE realtime.subscription TO service_role;
GRANT ALL ON TABLE realtime.subscription TO supabase_realtime_admin;


--
-- Name: SEQUENCE subscription_id_seq; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON SEQUENCE realtime.subscription_id_seq TO postgres;
GRANT ALL ON SEQUENCE realtime.subscription_id_seq TO dashboard_user;
GRANT USAGE ON SEQUENCE realtime.subscription_id_seq TO anon;
GRANT USAGE ON SEQUENCE realtime.subscription_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE realtime.subscription_id_seq TO service_role;
GRANT ALL ON SEQUENCE realtime.subscription_id_seq TO supabase_realtime_admin;


--
-- Name: TABLE buckets; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

REVOKE ALL ON TABLE storage.buckets FROM supabase_storage_admin;
GRANT ALL ON TABLE storage.buckets TO supabase_storage_admin WITH GRANT OPTION;
GRANT ALL ON TABLE storage.buckets TO service_role;
GRANT ALL ON TABLE storage.buckets TO authenticated;
GRANT ALL ON TABLE storage.buckets TO anon;
GRANT ALL ON TABLE storage.buckets TO postgres WITH GRANT OPTION;


--
-- Name: TABLE buckets_analytics; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON TABLE storage.buckets_analytics TO service_role;
GRANT ALL ON TABLE storage.buckets_analytics TO authenticated;
GRANT ALL ON TABLE storage.buckets_analytics TO anon;


--
-- Name: TABLE buckets_vectors; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT SELECT ON TABLE storage.buckets_vectors TO service_role;
GRANT SELECT ON TABLE storage.buckets_vectors TO authenticated;
GRANT SELECT ON TABLE storage.buckets_vectors TO anon;


--
-- Name: TABLE objects; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

REVOKE ALL ON TABLE storage.objects FROM supabase_storage_admin;
GRANT ALL ON TABLE storage.objects TO supabase_storage_admin WITH GRANT OPTION;
GRANT ALL ON TABLE storage.objects TO service_role;
GRANT ALL ON TABLE storage.objects TO authenticated;
GRANT ALL ON TABLE storage.objects TO anon;
GRANT ALL ON TABLE storage.objects TO postgres WITH GRANT OPTION;


--
-- Name: TABLE s3_multipart_uploads; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON TABLE storage.s3_multipart_uploads TO service_role;
GRANT SELECT ON TABLE storage.s3_multipart_uploads TO authenticated;
GRANT SELECT ON TABLE storage.s3_multipart_uploads TO anon;


--
-- Name: TABLE s3_multipart_uploads_parts; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON TABLE storage.s3_multipart_uploads_parts TO service_role;
GRANT SELECT ON TABLE storage.s3_multipart_uploads_parts TO authenticated;
GRANT SELECT ON TABLE storage.s3_multipart_uploads_parts TO anon;


--
-- Name: TABLE vector_indexes; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT SELECT ON TABLE storage.vector_indexes TO service_role;
GRANT SELECT ON TABLE storage.vector_indexes TO authenticated;
GRANT SELECT ON TABLE storage.vector_indexes TO anon;


--
-- Name: TABLE secrets; Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT SELECT,REFERENCES,DELETE,TRUNCATE ON TABLE vault.secrets TO postgres WITH GRANT OPTION;
GRANT SELECT,DELETE ON TABLE vault.secrets TO service_role;


--
-- Name: TABLE decrypted_secrets; Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT SELECT,REFERENCES,DELETE,TRUNCATE ON TABLE vault.decrypted_secrets TO postgres WITH GRANT OPTION;
GRANT SELECT,DELETE ON TABLE vault.decrypted_secrets TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: auth; Owner: supabase_auth_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON SEQUENCES TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: auth; Owner: supabase_auth_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON FUNCTIONS TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: auth; Owner: supabase_auth_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON TABLES TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: extensions; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA extensions GRANT ALL ON SEQUENCES TO postgres WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: extensions; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA extensions GRANT ALL ON FUNCTIONS TO postgres WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: extensions; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA extensions GRANT ALL ON TABLES TO postgres WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: graphql; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: graphql; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: graphql; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: graphql_public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: graphql_public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: graphql_public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: realtime; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON SEQUENCES TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: realtime; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON FUNCTIONS TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: realtime; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON TABLES TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: storage; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: storage; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: storage; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON TABLES TO service_role;


--
-- Name: ensure_rls; Type: EVENT TRIGGER; Schema: -; Owner: postgres
--

CREATE EVENT TRIGGER ensure_rls ON ddl_command_end
         WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
   EXECUTE FUNCTION public.rls_auto_enable();


ALTER EVENT TRIGGER ensure_rls OWNER TO postgres;

--
-- Name: issue_graphql_placeholder; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER issue_graphql_placeholder ON sql_drop
         WHEN TAG IN ('DROP EXTENSION')
   EXECUTE FUNCTION extensions.set_graphql_placeholder();


ALTER EVENT TRIGGER issue_graphql_placeholder OWNER TO supabase_admin;

--
-- Name: issue_pg_cron_access; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER issue_pg_cron_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_cron_access();


ALTER EVENT TRIGGER issue_pg_cron_access OWNER TO supabase_admin;

--
-- Name: issue_pg_graphql_access; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER issue_pg_graphql_access ON ddl_command_end
         WHEN TAG IN ('CREATE FUNCTION')
   EXECUTE FUNCTION extensions.grant_pg_graphql_access();


ALTER EVENT TRIGGER issue_pg_graphql_access OWNER TO supabase_admin;

--
-- Name: issue_pg_net_access; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER issue_pg_net_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_net_access();


ALTER EVENT TRIGGER issue_pg_net_access OWNER TO supabase_admin;

--
-- Name: pgrst_ddl_watch; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER pgrst_ddl_watch ON ddl_command_end
   EXECUTE FUNCTION extensions.pgrst_ddl_watch();


ALTER EVENT TRIGGER pgrst_ddl_watch OWNER TO supabase_admin;

--
-- Name: pgrst_drop_watch; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER pgrst_drop_watch ON sql_drop
   EXECUTE FUNCTION extensions.pgrst_drop_watch();


ALTER EVENT TRIGGER pgrst_drop_watch OWNER TO supabase_admin;

--
-- PostgreSQL database dump complete
--

\unrestrict q6LATO5nWdBhEgfoE2cZnw9z15ovdhxw8F8DDwdCo1dyXzlfHAR0z8BBe45XNRN

