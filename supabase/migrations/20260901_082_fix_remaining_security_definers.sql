-- supabase/migrations/20260901_082_fix_remaining_security_definers.sql
-- ============================================================================
-- JOY PEOPLEHR — FINAL SECURITY DEFINER & FUNCTION PERMISSIONS FIX
-- Converts fn_get_employee_authorized_locations & send_push_notification
-- to SECURITY INVOKER across all argument signatures
-- ============================================================================

DO $$
DECLARE
  r RECORD;
BEGIN
  -- 1. Switch all matching functions to SECURITY INVOKER dynamically by OID
  FOR r IN
    SELECT p.oid, n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
      AND p.proname IN (
        'fn_get_employee_authorized_locations',
        'send_push_notification',
        'auto_confirm_email_for_user'
      )
  LOOP
    -- Switch from SECURITY DEFINER to SECURITY INVOKER
    EXECUTE format('ALTER FUNCTION %I.%I(%s) SECURITY INVOKER;', r.nspname, r.proname, r.args);
    
    -- Revoke from public and anon
    EXECUTE format('REVOKE ALL ON FUNCTION %I.%I(%s) FROM anon, PUBLIC;', r.nspname, r.proname, r.args);
    
    -- Grant to authenticated and service_role
    EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I(%s) TO authenticated, service_role;', r.nspname, r.proname, r.args);
    
    RAISE NOTICE 'Successfully converted %I(%s) to SECURITY INVOKER and secured permissions.', r.proname, r.args;
  END LOOP;
END $$;
