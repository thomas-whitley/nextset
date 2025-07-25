/*
  # Create exercise log table

  1. New Tables
    - `exercise_log`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `completed_at` (timestamptz)
      - `workout_name` (text)
      - `duration_seconds` (integer)
      - `workout_data` (jsonb, stores the entire workout data)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `exercise_log` table
    - Add policy for users to read/write their own logs
*/

CREATE TABLE IF NOT EXISTS exercise_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  completed_at timestamptz DEFAULT now(),
  workout_name text NOT NULL,
  duration_seconds integer DEFAULT 0,
  workout_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE exercise_log ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Users can read own exercise logs"
  ON exercise_log
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own exercise logs"
  ON exercise_log
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own exercise logs"
  ON exercise_log
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own exercise logs"
  ON exercise_log
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_exercise_log_user_id 
  ON exercise_log(user_id);

CREATE INDEX IF NOT EXISTS idx_exercise_log_completed_at 
  ON exercise_log(completed_at);