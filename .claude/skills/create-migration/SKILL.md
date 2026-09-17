---
name: create-migration
description: Scaffold a new Supabase migration file for momentum-enhanced with correct naming, RLS boilerplate, and schema conventions
---

Create a new SQL migration file in `supabase/migrations/` for the momentum-enhanced project.

## Steps

1. **Build the filename** from the current UTC time: `<YYYYMMDDHHMMSS>_<snake_case_description>.sql` (the Supabase CLI records this prefix as the migration version; `supabase migration list` must match the repo). Example: `20260917100000_preferences_indexes_constraints.sql`.

2. **Never apply it yourself.** The user runs `npx supabase db push` (dry-run first). Say so in your report.

3. **Write the file** to `supabase/migrations/<filename>` using this template:

```sql
-- ============================================================
-- <filename>
-- <One-line description of what this migration does>
-- ============================================================

-- [Your DDL here]

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;

-- Users can only access their own rows
CREATE POLICY "<table_name>_select_own" ON <table_name>
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

CREATE POLICY "<table_name>_insert_own" ON <table_name>
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "<table_name>_update_own" ON <table_name>
  FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "<table_name>_delete_own" ON <table_name>
  FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);
```

Functions: `security invoker`, `set search_path = ''`, revoke execute from `anon, authenticated` unless the API must call it.

## Schema conventions (from `0001_initial_schema.sql`)
- Primary keys: `uuid PRIMARY KEY DEFAULT gen_random_uuid()` (except `profile` which uses `auth.users.id`)
- Foreign keys to users: `user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL`
- Timestamps: `timestamptz DEFAULT now()`
- Rich data stored as `jsonb`
- All new tables must have RLS enabled with per-user policies
- The `profile` table mirrors `auth.users` and is auto-populated by a DB trigger — do not insert into it manually

## After writing the file
Tell the user the filename and remind them to apply it via:
```bash
supabase db push   # remote
# or
supabase migration up   # local dev stack
```
Or apply it directly via the Supabase MCP (`apply_migration` tool).
