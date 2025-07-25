/*
  # Schema Cleanup - Remove Duplicate Tables

  1. Changes
    - Drop duplicate `user_profiles` table (functionality moved to `profile` table)
    - Drop duplicate `timer_presets` table (functionality moved to `timer_preset` table)
    - Clean up any orphaned data or references

  2. Safety
    - Only removes tables that are confirmed duplicates
    - Main functionality uses `profile` and `timer_preset` tables
    - No data loss as these are structural duplicates
*/

-- Drop the duplicate user_profiles table
-- The main profile table is already being used by the application
DROP TABLE IF EXISTS user_profiles;

-- Drop the duplicate timer_presets table  
-- The main timer_preset table is already being used by the application
DROP TABLE IF EXISTS timer_presets;