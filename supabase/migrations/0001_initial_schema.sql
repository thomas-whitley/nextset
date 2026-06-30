-- ============================================================
-- 0001_initial_schema.sql
-- Clean baseline schema for momentum-enhanced
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- Enums
-- ============================================================

CREATE TYPE user_role AS ENUM ('user', 'admin', 'super_admin');

-- ============================================================
-- Tables
-- ============================================================

CREATE TABLE profile (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  username text UNIQUE,
  phone text,
  role user_role DEFAULT 'user',
  avatar_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE user_active_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  program_template_id text NOT NULL,
  program_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE workout_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  completed_at timestamptz DEFAULT now(),
  workout_data jsonb NOT NULL,
  health_stats jsonb DEFAULT '{}',
  total_volume numeric DEFAULT 0,
  duration_minutes integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE exercise_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  completed_at timestamptz DEFAULT now(),
  workout_name text NOT NULL,
  duration_seconds integer DEFAULT 0,
  workout_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE timer_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  preset_name text NOT NULL,
  is_public boolean DEFAULT false,
  preset_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_active_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE timer_presets ENABLE ROW LEVEL SECURITY;

-- profile: SELECT own row
CREATE POLICY "profile_select_own" ON profile
  FOR SELECT USING (auth.uid() = id);

-- profile: INSERT own row
CREATE POLICY "profile_insert_own" ON profile
  FOR INSERT WITH CHECK (auth.uid() = id);

-- profile: UPDATE own row — safe columns only (role excluded)
CREATE POLICY "profile_update_own" ON profile
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- user_active_programs: full CRUD own rows
CREATE POLICY "user_active_programs_select_own" ON user_active_programs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_active_programs_insert_own" ON user_active_programs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_active_programs_update_own" ON user_active_programs
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "user_active_programs_delete_own" ON user_active_programs
  FOR DELETE USING (auth.uid() = user_id);

-- workout_history: SELECT + INSERT own rows
CREATE POLICY "workout_history_select_own" ON workout_history
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "workout_history_insert_own" ON workout_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- exercise_log: full CRUD own rows
CREATE POLICY "exercise_log_select_own" ON exercise_log
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "exercise_log_insert_own" ON exercise_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "exercise_log_update_own" ON exercise_log
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "exercise_log_delete_own" ON exercise_log
  FOR DELETE USING (auth.uid() = user_id);

-- timer_presets: SELECT own rows + all public presets
CREATE POLICY "timer_presets_select_own_or_public" ON timer_presets
  FOR SELECT USING (auth.uid() = user_id OR is_public = true);

-- timer_presets: INSERT/UPDATE/DELETE own rows only
CREATE POLICY "timer_presets_insert_own" ON timer_presets
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "timer_presets_update_own" ON timer_presets
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "timer_presets_delete_own" ON timer_presets
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- Seed: public timer presets
-- ============================================================

INSERT INTO timer_presets (preset_name, is_public, preset_data) VALUES
(
  'Core Smasher',
  true,
  '{"intervals":[{"name":"Work","duration":40},{"name":"Rest","duration":20}],"rounds":8,"restBetweenRounds":60}'
),
(
  'HIIT Blast',
  true,
  '{"intervals":[{"name":"Sprint","duration":30},{"name":"Walk","duration":30}],"rounds":10,"restBetweenRounds":90}'
),
(
  'Strength Focus',
  true,
  '{"intervals":[{"name":"Lift","duration":60},{"name":"Rest","duration":120}],"rounds":5,"restBetweenRounds":180}'
);
