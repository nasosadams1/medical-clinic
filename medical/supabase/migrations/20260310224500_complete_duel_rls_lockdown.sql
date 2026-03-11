/*
  Complete duel RLS lockdown using the live policy names currently present in the
  remote database. This removes direct client reads/writes for hidden tests,
  submissions, snapshots, match events, and replays.
*/

drop policy if exists problems_select_active_anon_and_auth on public.problems;

drop policy if exists submissions_authenticated_insert_own on public.submissions;
drop policy if exists submissions_authenticated_select_from_own_matches on public.submissions;

drop policy if exists code_snapshots_authenticated_insert_own on public.code_snapshots;
drop policy if exists code_snapshots_authenticated_select_from_own_matches on public.code_snapshots;

drop policy if exists match_events_authenticated_select_from_own_matches on public.match_events;
drop policy if exists match_replays_authenticated_select_from_own_matches on public.match_replays;