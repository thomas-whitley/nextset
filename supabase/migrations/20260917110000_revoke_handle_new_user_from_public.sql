-- ============================================================
-- 20260917110000_revoke_handle_new_user_from_public.sql
-- 0005 revoked EXECUTE on handle_new_user() from anon and authenticated, but
-- Postgres grants EXECUTE on new functions to PUBLIC by default, and both roles
-- inherit from PUBLIC — so the advisor still flags it as callable via
-- /rest/v1/rpc. Revoke from PUBLIC too (spec §10 item 5 said all three).
-- The trigger still fires: triggers run as the table owner, not via EXECUTE.
-- ============================================================

revoke execute on function public.handle_new_user() from public, anon, authenticated;
