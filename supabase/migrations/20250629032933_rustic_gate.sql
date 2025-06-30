-- Create the 'profile' table to match your database schema
-- This migration ensures the table exists with the correct name and structure

-- Create user_role enum if it doesn't exist
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('user', 'admin', 'super_admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create the 'profile' table (singular, as per your schema)
CREATE TABLE IF NOT EXISTS profile (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  username text UNIQUE,
  phone text,
  role user_role DEFAULT 'user'::user_role,
  avatar_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE profile ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own profile" ON profile;
DROP POLICY IF EXISTS "Users can update own profile" ON profile;
DROP POLICY IF EXISTS "Users can insert own profile" ON profile;
DROP POLICY IF EXISTS "Admins can read all profiles" ON profile;
DROP POLICY IF EXISTS "Admins can update user profiles" ON profile;
DROP POLICY IF EXISTS "Super admins can delete profiles" ON profile;

-- Create RLS policies
CREATE POLICY "Users can read own profile"
  ON profile
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profile
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profile
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
  ON profile
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profile p
      WHERE p.id = auth.uid() 
      AND p.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can update user profiles"
  ON profile
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profile p
      WHERE p.id = auth.uid() 
      AND p.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Super admins can delete profiles"
  ON profile
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profile p
      WHERE p.id = auth.uid() 
      AND p.role = 'super_admin'
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profile_email ON profile(email);
CREATE INDEX IF NOT EXISTS idx_profile_username ON profile(username);
CREATE INDEX IF NOT EXISTS idx_profile_role ON profile(role);

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profile (id, email, full_name, username, phone)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'phone'
  );
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Profile already exists, just return
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update function to handle profile updates
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS handle_updated_at ON profile;
CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON profile
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();