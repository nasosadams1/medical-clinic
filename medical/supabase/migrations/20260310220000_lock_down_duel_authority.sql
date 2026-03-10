/*
  Lock down duel authority so only trusted backend services can read hidden tests
  and mutate authoritative duel state.
*/

drop policy if exists "Anyone can view active problems" on public.problems;
drop policy if exists "System can insert matches" on public.matches;
drop policy if exists "System can update matches" on public.matches;
drop policy if exists "Users can insert their own submissions" on public.submissions;
drop policy if exists "Users can insert their own snapshots" on public.code_snapshots;
