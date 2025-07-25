/*
  # Fix signup profile creation with database trigger

  1. Database Functions
    - Create function to handle new user profile creation
    - Automatically creates profile when user signs up through Supabase Auth

  2. Triggers
    - Add trigger on auth.users table to auto-create profile
    - Ensures profile is created during Supabase's signup process

  3. Security
    - Remove manual profile creation from application code
    - Rely on database-level automation for consistency
*/

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profile (
    id,
    email,
    full_name,
    username,
    phone,
    role,
    avatar_url,
    is_active
  )
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'phone',
    'user',
    COALESCE(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    true
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update RLS policies to be more restrictive since we're using triggers
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profile;

-- Keep existing policies for reading and updating
-- Users can still read and update their own profiles
-- But profile creation is now handled automatically by the database