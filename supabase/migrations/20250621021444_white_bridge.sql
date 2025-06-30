/*
  # Create workout history and timer presets tables

  1. New Tables
    - `workout_history`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `completed_at` (timestamp)
      - `workout_data` (jsonb, snapshot of completed workout)
      - `health_stats` (jsonb, HealthKit data)
      - `total_volume` (numeric, calculated volume)
      - `duration_minutes` (integer)
    - `timer_presets`
      - `id` (uuid, primary key)
      - `user_id` (uuid, optional for public presets)
      - `preset_name` (text)
      - `is_public` (boolean)
      - `preset_data` (jsonb, timer configuration)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
*/

-- Create workout_history table
CREATE TABLE IF NOT EXISTS workout_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  completed_at timestamptz DEFAULT now(),
  workout_data jsonb NOT NULL,
  health_stats jsonb DEFAULT '{}',
  total_volume numeric DEFAULT 0,
  duration_minutes integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE workout_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own workout history"
  ON workout_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workout history"
  ON workout_history
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create timer_presets table
CREATE TABLE IF NOT EXISTS timer_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  preset_name text NOT NULL,
  is_public boolean DEFAULT false,
  preset_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE timer_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own timer presets"
  ON timer_presets
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can insert own timer presets"
  ON timer_presets
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own timer presets"
  ON timer_presets
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own timer presets"
  ON timer_presets
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_workout_history_user_id 
  ON workout_history(user_id);

CREATE INDEX IF NOT EXISTS idx_workout_history_completed_at 
  ON workout_history(completed_at);

CREATE INDEX IF NOT EXISTS idx_timer_presets_user_id 
  ON timer_presets(user_id);

CREATE INDEX IF NOT EXISTS idx_timer_presets_public 
  ON timer_presets(is_public) WHERE is_public = true;

-- Insert some default public timer presets
INSERT INTO timer_presets (preset_name, is_public, preset_data) VALUES
('Core Smasher', true, '{
  "type": "circuit",
  "exercises": [
    {"name": "Plank", "workTime": 45, "restTime": 15},
    {"name": "Mountain Climbers", "workTime": 30, "restTime": 15},
    {"name": "Russian Twists", "workTime": 30, "restTime": 15},
    {"name": "Dead Bug", "workTime": 30, "restTime": 15}
  ],
  "sets": 3,
  "setRestTime": 60,
  "circuits": 1,
  "circuitRestTime": 120
}'),
('HIIT Blast', true, '{
  "type": "circuit",
  "exercises": [
    {"name": "Burpees", "workTime": 20, "restTime": 10},
    {"name": "Jump Squats", "workTime": 20, "restTime": 10},
    {"name": "Push-ups", "workTime": 20, "restTime": 10},
    {"name": "High Knees", "workTime": 20, "restTime": 10}
  ],
  "sets": 4,
  "setRestTime": 90,
  "circuits": 2,
  "circuitRestTime": 180
}'),
('Strength Focus', true, '{
  "type": "strength",
  "exercises": [
    {"name": "Compound Movement", "workTime": 0, "restTime": 180},
    {"name": "Accessory Work", "workTime": 0, "restTime": 120},
    {"name": "Isolation", "workTime": 0, "restTime": 90}
  ],
  "sets": 1,
  "setRestTime": 0,
  "circuits": 1,
  "circuitRestTime": 0
}');