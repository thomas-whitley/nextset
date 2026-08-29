-- ============================================================
-- 0005_lock_profile_columns_and_timer_presets_check.sql
-- Two gaps found in a review before the repo went public (2026-08-29).
--
-- 1. profile_update_own (0001) checks only auth.uid() = id, so a user could
--    update any column of their own row, including role, email and is_active.
--    Column level grants now limit UPDATE to the fields the app edits.
--    role stays with service_role.
-- 2. timer_presets_update_own (0001) has USING but no WITH CHECK, so an owner
--    could reassign a preset's user_id to another account. Same fix as 0003
--    and 0004.
--
-- Hygiene from the same review: TRUNCATE, TRIGGER and REFERENCES are not
-- governed by RLS and the API roles do not need them; the trigger function
-- should not be callable through /rest/v1/rpc.
-- ============================================================

REVOKE UPDATE ON public.profile FROM anon, authenticated;
GRANT UPDATE (full_name, username, phone, avatar_url, updated_at)
  ON public.profile TO authenticated;

DROP POLICY IF EXISTS "timer_presets_update_own" ON public.timer_presets;
CREATE POLICY "timer_presets_update_own" ON public.timer_presets
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

REVOKE TRUNCATE, TRIGGER, REFERENCES ON ALL TABLES IN SCHEMA public
  FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
