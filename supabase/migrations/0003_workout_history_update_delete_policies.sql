-- ============================================================
-- 0003_workout_history_update_delete_policies.sql
-- workout_history only had SELECT + INSERT policies; users had no way to
-- correct or delete their own workout records. Add UPDATE/DELETE own-row
-- policies. Includes WITH CHECK on UPDATE so a user can't reassign
-- user_id to someone else's row when updating.
-- ============================================================

DROP POLICY IF EXISTS "workout_history_update_own" ON workout_history;
CREATE POLICY "workout_history_update_own" ON workout_history
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "workout_history_delete_own" ON workout_history;
CREATE POLICY "workout_history_delete_own" ON workout_history
  FOR DELETE USING (auth.uid() = user_id);
