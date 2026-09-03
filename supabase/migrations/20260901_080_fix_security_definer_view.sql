-- supabase/migrations/20260901_080_fix_security_definer_view.sql
-- ============================================================================
-- Joy PeopleHR — Supabase Security Linter Remediation: Fix Security Definer View
-- Linter Rule: 0010_security_definer_view
-- Target View: public.v_attendance_checkout_verification
-- ============================================================================

-- Sets security_invoker = true so that Row Level Security (RLS) and Postgres permissions
-- of the querying user (not the view creator) are strictly enforced when querying the view.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM pg_views 
    WHERE schemaname = 'public' 
      AND viewname = 'v_attendance_checkout_verification'
  ) THEN
    ALTER VIEW public.v_attendance_checkout_verification SET (security_invoker = true);
    RAISE NOTICE 'Successfully applied security_invoker = true to public.v_attendance_checkout_verification';
  ELSE
    RAISE NOTICE 'View public.v_attendance_checkout_verification does not exist, skipping.';
  END IF;
END $$;
