/*
  # Create exercises table

  1. New Tables
    - `exercises`
      - `id` (integer, primary key) - matches the JSON id field
      - `name` (text, not null) - exercise name
      - `is_keystone` (boolean, default false) - whether it's a keystone exercise
      - `movement_pattern` (text) - movement pattern like Push, Pull, Hinge, etc.
      - `primary_muscle_group` (text, not null) - main muscle group targeted
      - `secondary_muscle_groups` (text array) - additional muscle groups
      - `equipment` (text) - required equipment
      - `difficulty` (text) - difficulty level
      - `execution_cues` (jsonb) - structured execution instructions
      - `common_mistakes` (text array) - list of common mistakes
      - `contraindications` (text array) - when not to do the exercise
      - `progression_id` (integer) - reference to progression exercise
      - `regression_id` (integer) - reference to regression exercise
      - `user_id` (uuid) - null for master exercises, user id for custom exercises
      - `created_at` (timestamptz) - creation timestamp
      - `updated_at` (timestamptz) - last update timestamp

  2. Security
    - Enable RLS on `exercises` table
    - Add policy for public read access to master exercises
    - Add policy for users to read/write their own custom exercises

  3. Indexes
    - Index on primary_muscle_group for filtering
    - Index on equipment for filtering
    - Index on user_id for custom exercises
    - Index on name for searching
</sql>

-- Create the exercises table
CREATE TABLE IF NOT EXISTS exercises (
  id integer PRIMARY KEY,
  name text NOT NULL,
  is_keystone boolean DEFAULT false,
  movement_pattern text,
  primary_muscle_group text NOT NULL,
  secondary_muscle_groups text[] DEFAULT '{}',
  equipment text,
  difficulty text,
  execution_cues jsonb,
  common_mistakes text[] DEFAULT '{}',
  contraindications text[] DEFAULT '{}',
  progression_id integer,
  regression_id integer,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow public read access to master exercises"
  ON exercises
  FOR SELECT
  TO public
  USING (user_id IS NULL);

CREATE POLICY "Users can read their own custom exercises"
  ON exercises
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create custom exercises"
  ON exercises
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own custom exercises"
  ON exercises
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own custom exercises"
  ON exercises
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_exercises_primary_muscle_group ON exercises (primary_muscle_group);
CREATE INDEX IF NOT EXISTS idx_exercises_equipment ON exercises (equipment);
CREATE INDEX IF NOT EXISTS idx_exercises_user_id ON exercises (user_id);
CREATE INDEX IF NOT EXISTS idx_exercises_name ON exercises (name);
CREATE INDEX IF NOT EXISTS idx_exercises_difficulty ON exercises (difficulty);
CREATE INDEX IF NOT EXISTS idx_exercises_movement_pattern ON exercises (movement_pattern);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_exercises_updated
  BEFORE UPDATE ON exercises
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();