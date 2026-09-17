-- ============================================================
-- 20260917100000_preferences_indexes_constraints.sql
-- Plan B (spec 2026-09-17 §3.2). Schema truthfulness, part 1:
--   1. profile.preferences — Settings finally persists to the account.
--   2. user_active_programs: dedupe (user_id, program_template_id) then make
--      it unique. The app reads this pair with .single(); duplicates made
--      that return "not found" and the app inserted another copy.
--   3. Indexes for every user_id lookup (advisor: 4 unindexed FKs).
--   4. updated_at trigger so the column is true without the app setting it.
--   5. Sanity bound on total_volume (a 60 kg x 6 session once stored
--      1,245,613,856 kg).
-- ============================================================

-- 1. Preferences -------------------------------------------------------
alter table public.profile
  add column preferences jsonb not null default '{}'::jsonb;

-- 0005 replaced the blanket UPDATE grant with a column list; extend it.
grant update (preferences) on public.profile to authenticated;

-- 2. Dedupe then constrain active programs ------------------------------
delete from public.user_active_programs a
using (
  select id,
         row_number() over (
           partition by user_id, program_template_id
           order by updated_at desc nulls last, created_at desc nulls last
         ) as rn
  from public.user_active_programs
) d
where a.id = d.id and d.rn > 1;

alter table public.user_active_programs
  add constraint user_active_programs_user_template_key
  unique (user_id, program_template_id);

-- 3. Indexes ------------------------------------------------------------
create index if not exists workout_history_user_completed_idx
  on public.workout_history (user_id, completed_at desc);

-- The unique constraint above already indexes (user_id, program_template_id),
-- whose leading column serves the user_id-only lookups. No separate index.

-- 4. updated_at trigger -------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function public.set_updated_at() from public, anon, authenticated;

drop trigger if exists set_updated_at on public.profile;
create trigger set_updated_at
  before update on public.profile
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.user_active_programs;
create trigger set_updated_at
  before update on public.user_active_programs
  for each row execute function public.set_updated_at();

-- 5. Volume sanity ------------------------------------------------------
-- 1000 kg x 100 reps x 10 sets x 10 exercises = 10,000,000. A real session
-- is under 100,000. Anything above the bound is corrupt test data.
delete from public.workout_history where total_volume >= 10000000 or total_volume < 0;

alter table public.workout_history
  add constraint workout_history_total_volume_sane
  check (total_volume >= 0 and total_volume < 10000000);
