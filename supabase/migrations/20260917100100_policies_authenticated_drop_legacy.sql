-- ============================================================
-- 20260917100100_policies_authenticated_drop_legacy.sql
-- Plan B (spec 2026-09-17 §3.3). Schema truthfulness, part 2:
--   1. Drop the two tables nothing writes (roadmap decisions 10 and 11).
--   2. Recreate the eleven remaining policies scoped TO authenticated and
--      using (select auth.uid()) so the value is computed once per query,
--      not once per row (advisor auth_rls_initplan x19).
--   3. anon reads nothing.
-- ============================================================

-- 1. Drops --------------------------------------------------------------
drop table if exists public.exercise_log;
drop table if exists public.timer_presets;

-- 2. Policies -----------------------------------------------------------
-- profile (keyed by id)
drop policy if exists "profile_select_own" on public.profile;
drop policy if exists "profile_insert_own" on public.profile;
drop policy if exists "profile_update_own" on public.profile;

create policy "profile_select_own" on public.profile
  for select to authenticated
  using ((select auth.uid()) = id);

create policy "profile_insert_own" on public.profile
  for insert to authenticated
  with check ((select auth.uid()) = id);

create policy "profile_update_own" on public.profile
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- user_active_programs (keyed by user_id)
drop policy if exists "user_active_programs_select_own" on public.user_active_programs;
drop policy if exists "user_active_programs_insert_own" on public.user_active_programs;
drop policy if exists "user_active_programs_update_own" on public.user_active_programs;
drop policy if exists "user_active_programs_delete_own" on public.user_active_programs;

create policy "user_active_programs_select_own" on public.user_active_programs
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "user_active_programs_insert_own" on public.user_active_programs
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "user_active_programs_update_own" on public.user_active_programs
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "user_active_programs_delete_own" on public.user_active_programs
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- workout_history (keyed by user_id)
drop policy if exists "workout_history_select_own" on public.workout_history;
drop policy if exists "workout_history_insert_own" on public.workout_history;
drop policy if exists "workout_history_update_own" on public.workout_history;
drop policy if exists "workout_history_delete_own" on public.workout_history;

create policy "workout_history_select_own" on public.workout_history
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "workout_history_insert_own" on public.workout_history
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "workout_history_update_own" on public.workout_history
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "workout_history_delete_own" on public.workout_history
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- 3. anon ---------------------------------------------------------------
revoke all on all tables in schema public from anon;
