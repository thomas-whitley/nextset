-- ============================================================
-- 0004_add_missing_update_with_check.sql
-- exercise_log_update_own and user_active_programs_update_own (from
-- 0001_initial_schema.sql) have USING but no WITH CHECK, so a user could
-- UPDATE their own row and reassign user_id to someone else's account.
-- Add WITH CHECK to close that.
-- ============================================================

DROP POLICY IF EXISTS "exercise_log_update_own" ON exercise_log;
CREATE POLICY "exercise_log_update_own" ON exercise_log
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_active_programs_update_own" ON user_active_programs;
CREATE POLICY "user_active_programs_update_own" ON user_active_programs
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
