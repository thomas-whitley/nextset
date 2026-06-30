---
name: create-migration
description: Scaffold a new Supabase migration file for momentum-enhanced with correct naming, RLS boilerplate, and schema conventions
---

Create a new SQL migration file in `supabase/migrations/` for the momentum-enhanced project.

## Steps

1. **Determine the next migration number** by listing `supabase/migrations/` and incrementing the highest existing number (zero-padded to 4 digits). Current highest is `0001`.

2. **Build the filename**: `<NNNN>_<snake_case_description>.sql`
   - Example: `0002_add_exercise_categories.sql`

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
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "<table_name>_insert_own" ON <table_name>
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "<table_name>_update_own" ON <table_name>
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "<table_name>_delete_own" ON <table_name>
  FOR DELETE USING (auth.uid() = user_id);
```

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
