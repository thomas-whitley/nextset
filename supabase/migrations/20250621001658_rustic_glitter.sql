/*
  # Create user active programs table

  1. New Tables
    - `user_active_programs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `program_template_id` (text, references original JSON program id)
      - `program_data` (jsonb, stores the entire modified program object)
      - `created_at` (timestamp with time zone)
      - `updated_at` (timestamp with time zone)

  2. Security
    - Enable RLS on `user_active_programs` table
    - Add policy for users to read/write their own active programs
*/

CREATE TABLE IF NOT EXISTS user_active_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  program_template_id text NOT NULL,
  program_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_active_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own active programs"
  ON user_active_programs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own active programs"
  ON user_active_programs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own active programs"
  ON user_active_programs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own active programs"
  ON user_active_programs
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_user_active_programs_user_id 
  ON user_active_programs(user_id);

CREATE INDEX IF NOT EXISTS idx_user_active_programs_template_id 
  ON user_active_programs(program_template_id);