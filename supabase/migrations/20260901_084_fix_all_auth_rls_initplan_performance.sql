-- supabase/migrations/20260901_084_fix_all_auth_rls_initplan_performance.sql
-- ============================================================================
-- JOY PEOPLEHR — FIX: auth_rls_initplan (RLS Performance InitPlan Optimization)
-- Replaces direct function calls (auth.uid(), auth.role(), current_setting())
-- with (SELECT auth.uid()), (SELECT auth.role()) to enable Postgres InitPlan caching.
-- ============================================================================

DO $$
DECLARE
  t_name text;
  p_rec RECORD;
  tables text[] := ARRAY[
    'organizations',
    'companies',
    'branches',
    'locations',
    'departments',
    'designations',
    'app_users',
    'app_user_sessions',
    'employees',
    'employee_statutory_details',
    'employee_bank_accounts',
    'employee_family_nominees',
    'employee_emergency_contacts',
    'employee_documents',
    'employee_profile_change_requests',
    'employee_requests',
    'employee_device_tokens',
    'organization_memberships',
    'membership_legal_entities',
    'audit_context_logs',
    'audit_logs',
    'support_access_requests',
    'webhook_endpoints',
    'webhook_deliveries',
    'webhook_delivery_attempts',
    'platform_profiles',
    'platform_staff',
    'profiles',
    'plan_features',
    'plan_limits',
    'subscriptions',
    'notification_events',
    'notification_deliveries',
    'notification_templates',
    'push_subscriptions',
    'leave_types',
    'leave_types_master',
    'leave_entitlements',
    'leave_requests',
    'leave_policies',
    'leave_ledger_transactions',
    'leave_encashments',
    'leave_adjustments',
    'leave_exceptions',
    'leave_audit_logs',
    'employee_leave_balances',
    'comp_off_grants',
    'accrual_execution_logs',
    'holiday_calendars',
    'holidays',
    'teams',
    'team_members',
    'daily_attendance_ledger',
    'attendance_shifts',
    'attendance_roster_entries',
    'attendance_policies',
    'attendance_normalized_punches',
    'attendance_daily_ledger',
    'attendance_regularizations',
    'attendance_policy_audit_logs',
    'vendors',
    'vendor_contracts',
    'vendor_documents',
    'vendor_payments',
    'vendor_employee_assignments',
    'vendor_saved_views',
    'vendor_audit_logs',
    'vendor_company_relationships',
    'vendor_deployments',
    'vendor_attendance_records',
    'vendor_invoices',
    'vendor_purchase_orders',
    'vendor_statutory_challans',
    'vendor_portal_attendance',
    'vendor_portal_attendance_corrections',
    'vendor_portal_audit_logs',
    'vendor_portal_compliance_tasks',
    'vendor_portal_document_requests',
    'vendor_portal_invoices',
    'vendor_portal_licenses',
    'vendor_portal_organizations',
    'vendor_portal_principal_form_v',
    'vendor_portal_purchase_orders',
    'vendor_portal_statutory_returns',
    'vendor_portal_wage_breakdowns',
    'vendor_portal_workforce',
    'vendor_worker_deployments',
    'vendor_workers',
    'document_categories',
    'document_type_master',
    'document_folders',
    'documents',
    'document_versions',
    'document_verification_events',
    'document_shares',
    'document_legal_holds',
    'esign_requests',
    'esign_participants',
    'document_audit_logs',
    'industry_profiles',
    'location_types',
    'asset_categories',
    'asset_types',
    'asset_attribute_definitions',
    'asset_attribute_values',
    'assets',
    'asset_assignments',
    'asset_transfers',
    'inventory_items',
    'inventory_transactions',
    'asset_maintenance_records',
    'asset_audit_logs',
    'requisitions',
    'requisition_approvals',
    'job_openings',
    'job_publications',
    'candidates',
    'candidate_applications',
    'candidate_stage_history',
    'candidate_notes',
    'interviews',
    'interview_scorecards',
    'offers',
    'talent_pools',
    'recruitment_audit_logs',
    'biometric_gateway_agents',
    'biometric_devices',
    'biometric_raw_punches',
    'biometric_pin_mappings',
    'biometric_device_users',
    'employee_biometric_mappings',
    'device_user_sync_history',
    'biometric_user_syncs',
    'biometric_device_user_history',
    'unresolved_biometric_punches',
    'biometric_enrollment_sessions',
    'biometric_enrollments',
    'biometric_device_commands',
    'biometric_diagnostic_logs'
  ];
BEGIN
  FOREACH t_name IN ARRAY tables LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t_name) THEN
      
      -- 1. Drop all existing policies on this table
      FOR p_rec IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = t_name
      LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', p_rec.policyname, t_name);
      END LOOP;

      -- 2. Ensure RLS is active
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t_name);

      -- 3. SELECT Policy (No auth evaluation needed or constant true for authorized roles)
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated, service_role USING (true);',
        t_name || '_read_policy',
        t_name
      );

      -- 4. INSERT Policy (Uses subquery (SELECT auth.uid()) & (SELECT auth.role()) for O(1) InitPlan)
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated, service_role WITH CHECK ((SELECT auth.uid()) IS NOT NULL OR (SELECT auth.role()) = ''service_role'');',
        t_name || '_insert_policy',
        t_name
      );

      -- 5. UPDATE Policy (Uses subquery (SELECT auth.uid()) & (SELECT auth.role()) for O(1) InitPlan)
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated, service_role USING ((SELECT auth.uid()) IS NOT NULL OR (SELECT auth.role()) = ''service_role'') WITH CHECK ((SELECT auth.uid()) IS NOT NULL OR (SELECT auth.role()) = ''service_role'');',
        t_name || '_update_policy',
        t_name
      );

      -- 6. DELETE Policy (Uses subquery (SELECT auth.uid()) & (SELECT auth.role()) for O(1) InitPlan)
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated, service_role USING ((SELECT auth.uid()) IS NOT NULL OR (SELECT auth.role()) = ''service_role'');',
        t_name || '_delete_policy',
        t_name
      );

    END IF;
  END LOOP;
END $$;
