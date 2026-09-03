-- docs/production-evidence/disaster-recovery/R10_INTEGRITY_VALIDATION.sql
-- ============================================================================
-- Joy PeopleHR — Gate R10: Post-Recovery Integrity Validation SQL Suite
-- ============================================================================

-- 1. Verify Canonical Identity Count (Target: 3 Active Staff)
SELECT count(*) AS active_employee_count 
FROM public.employees 
WHERE status = 'Active';

-- 2. Verify Zero Orphan Relationships
SELECT count(*) AS orphan_relationships
FROM public.workforce_employment_relationships r
LEFT JOIN public.employees e ON r.person_id = e.id
WHERE e.id IS NULL;

-- 3. Verify Exact 9 Canonical Location Assignments (3 Emps x 3 Locs = 9)
SELECT count(*) AS location_assignments_count
FROM public.employee_work_location_assignments;

-- 4. Verify RLS Row Security Enabled on All Operational Tables
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = false;

-- 5. Verify Unbroken 5-Way Financial Reconciliation Records
SELECT id, billing_period, vendor_name, match_status, calculated_net_payable, vendor_claimed_amount
FROM public.vendor_5way_reconciliations
WHERE match_status IS NULL;
