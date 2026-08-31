-- ============================================================
-- Migration: 20260828_065_seed_helpdesk_and_service_requests.sql
-- Description: Seeds rich mock Helpdesk Tickets, Messages,
--              Service Definitions, and Service Requests for
--              Flutter App development and immediate testing.
-- ============================================================

DO $$
DECLARE
    v_tenant_id TEXT := 'org-joy-01';
    v_org_id TEXT := 'org-joy-01';
    
    -- Target employees to seed for
    emp_record RECORD;
    v_emp_list TEXT[] := ARRAY['EMP-001', 'EMP-002', 'emp-admin-001', 'emp-joy-101', 'emp_001', 'emp_002'];
    v_curr_emp_id TEXT;
    v_curr_emp_name TEXT;
    v_curr_dept TEXT;
    
    -- Ticket UUIDs
    t1 UUID;
    t2 UUID;
    t3 UUID;
    t4 UUID;
    
    -- Service Definition UUIDs
    sd_salary UUID;
    sd_idcard UUID;
    sd_laptop UUID;
    
    -- Service Request UUIDs
    sr1 UUID;
    sr2 UUID;
BEGIN
    -- ------------------------------------------------------------
    -- 1. SEED SERVICE DEFINITIONS (Catalog)
    -- ------------------------------------------------------------
    INSERT INTO public.service_definitions (id, tenant_id, organization_id, code, name, category, description, icon, enabled, employee_visible, requires_approval, sla_hours)
    VALUES 
        (gen_random_uuid(), v_tenant_id, v_org_id, 'SRV-SALARY-CERT', 'Salary Certificate / Letter', 'Documents', 'Request official verified salary statement for bank loans or visa.', 'file-text', true, true, true, 24),
        (gen_random_uuid(), v_tenant_id, v_org_id, 'SRV-ID-REPLACE', 'ID Card Replacement', 'General', 'Request replacement for lost, damaged or updated corporate identity badge.', 'credit-card', true, true, false, 48),
        (gen_random_uuid(), v_tenant_id, v_org_id, 'SRV-LAPTOP-UPG', 'Hardware / Laptop Upgrade', 'IT Assets', 'Request developer workstation RAM, storage upgrade or peripheral replacement.', 'monitor', true, true, true, 72),
        (gen_random_uuid(), v_tenant_id, v_org_id, 'SRV-MED-INS', 'Medical Insurance Endorsement', 'Benefits', 'Add eligible dependent (spouse/child) to corporate health coverage.', 'heart-pulse', true, true, true, 96)
    ON CONFLICT (tenant_id, code) DO UPDATE SET
        name = EXCLUDED.name,
        category = EXCLUDED.category,
        description = EXCLUDED.description;

    SELECT id INTO sd_salary FROM public.service_definitions WHERE tenant_id = v_tenant_id AND code = 'SRV-SALARY-CERT' LIMIT 1;
    SELECT id INTO sd_idcard FROM public.service_definitions WHERE tenant_id = v_tenant_id AND code = 'SRV-ID-REPLACE' LIMIT 1;
    SELECT id INTO sd_laptop FROM public.service_definitions WHERE tenant_id = v_tenant_id AND code = 'SRV-LAPTOP-UPG' LIMIT 1;

    -- ------------------------------------------------------------
    -- 2. SEED TICKETS FOR EXISTING EMPLOYEES IN DB
    -- ------------------------------------------------------------
    FOR emp_record IN (
        SELECT id, display_name, COALESCE(department_name, 'Engineering') as dept 
        FROM public.employees 
        WHERE status = 'Active' OR status IS NULL 
        LIMIT 10
    ) LOOP
        -- Seed Tickets for DB Employee
        t1 := gen_random_uuid();
        t2 := gen_random_uuid();
        t3 := gen_random_uuid();

        INSERT INTO public.helpdesk_tickets (
            id, tenant_id, organization_id, employee_id, employee_name, department,
            ticket_number, category, subject, description, priority, status,
            assigned_to, assigned_to_name, sla_hours, created_at, updated_at
        ) VALUES
        (
            t1, v_tenant_id, v_org_id, emp_record.id, emp_record.display_name, emp_record.dept,
            'HD-' || UPPER(SUBSTRING(MD5(t1::text) FROM 1 FOR 6)),
            'Payroll', 'August Month Incentive Calculation Discrepancy',
            'Hi HR Team, my performance bonus for August sprint deliverables appears to be lower than projected in my offer annexure. Could you please review the calculation breakdown?',
            'HIGH', 'IN_PROGRESS', 'hr_mgr_01', 'Sarah Jenkins (HR Ops)', 24,
            NOW() - INTERVAL '2 days', NOW() - INTERVAL '4 hours'
        ),
        (
            t2, v_tenant_id, v_org_id, emp_record.id, emp_record.display_name, emp_record.dept,
            'HD-' || UPPER(SUBSTRING(MD5(t2::text) FROM 1 FOR 6)),
            'Leave', 'Annual Leave Balance Adjustment Request',
            'I worked during the national holiday sprint on 15th August and would like to request my compensatory off credit added to my Annual Leave balance.',
            'MEDIUM', 'OPEN', NULL, NULL, 48,
            NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'
        ),
        (
            t3, v_tenant_id, v_org_id, emp_record.id, emp_record.display_name, emp_record.dept,
            'HD-' || UPPER(SUBSTRING(MD5(t3::text) FROM 1 FOR 6)),
            'Benefits', 'Health Insurance E-Card Download Issue',
            'The insurance portal states invalid employee policy ID when attempting to download my family e-cards. Kindly re-sync my details with the TPA provider.',
            'LOW', 'RESOLVED', 'hr_ops_02', 'David Ross (Benefits Lead)', 48,
            NOW() - INTERVAL '5 days', NOW() - INTERVAL '1 day'
        )
        ON CONFLICT (ticket_number) DO NOTHING;

        -- Seed Messages for Ticket 1
        INSERT INTO public.helpdesk_messages (ticket_id, tenant_id, sender_id, sender_name, sender_role, message, visibility, created_at)
        VALUES 
            (t1, v_tenant_id, emp_record.id, emp_record.display_name, 'EMPLOYEE', 'Hi HR Team, my performance bonus for August sprint deliverables appears to be lower than projected in my offer annexure. Could you please review the calculation breakdown?', 'EMPLOYEE', NOW() - INTERVAL '2 days'),
            (t1, v_tenant_id, 'hr_mgr_01', 'Sarah Jenkins (HR Ops)', 'HR', 'Hello! We have reviewed your payroll context. The variable component will reflect in the supplemental cycle on 5th September.', 'EMPLOYEE', NOW() - INTERVAL '4 hours');

        -- Seed Service Requests
        IF sd_salary IS NOT NULL THEN
            sr1 := gen_random_uuid();
            INSERT INTO public.service_requests (
                id, tenant_id, organization_id, employee_id, employee_name, department,
                service_definition_id, service_code, service_name, category, request_number,
                status, priority, form_data, submitted_at
            ) VALUES (
                sr1, v_tenant_id, v_org_id, emp_record.id, emp_record.display_name, emp_record.dept,
                sd_salary, 'SRV-SALARY-CERT', 'Salary Certificate / Letter', 'Documents',
                'SR-' || UPPER(SUBSTRING(MD5(sr1::text) FROM 1 FOR 6)),
                'PENDING_HR', 'HIGH',
                '{"purpose": "Bank Home Loan Application", "delivery_mode": "Digital Verified PDF", "bank_name": "HDFC Bank"}'::jsonb,
                NOW() - INTERVAL '1 day'
            ) ON CONFLICT (request_number) DO NOTHING;
        END IF;
    END LOOP;

    -- ------------------------------------------------------------
    -- 3. SEED TICKETS FOR HARDCODED FLUTTER TEST ACCOUNTS
    -- ------------------------------------------------------------
    FOREACH v_curr_emp_id IN ARRAY v_emp_list LOOP
        v_curr_emp_name := 'Joy Staff (' || v_curr_emp_id || ')';
        v_curr_dept := 'Product Engineering';

        t1 := gen_random_uuid();
        t2 := gen_random_uuid();
        t3 := gen_random_uuid();
        t4 := gen_random_uuid();

        INSERT INTO public.helpdesk_tickets (
            id, tenant_id, organization_id, employee_id, employee_name, department,
            ticket_number, category, subject, description, priority, status,
            assigned_to, assigned_to_name, sla_hours, created_at, updated_at
        ) VALUES
        (
            t1, v_tenant_id, v_org_id, v_curr_emp_id, v_curr_emp_name, v_curr_dept,
            'HD-' || UPPER(SUBSTRING(MD5(t1::text) FROM 1 FOR 6)),
            'Payroll', 'August Month Salary & Tax Slip Query',
            'I noticed standard deduction was calculated differently this month compared to previous cycle. Could someone from payroll guide me through the new tax slab calculation?',
            'MEDIUM', 'IN_PROGRESS', 'hr_mgr_01', 'Sarah Jenkins (HR Ops)', 24,
            NOW() - INTERVAL '1 day', NOW() - INTERVAL '2 hours'
        ),
        (
            t2, v_tenant_id, v_org_id, v_curr_emp_id, v_curr_emp_name, v_curr_dept,
            'HD-' || UPPER(SUBSTRING(MD5(t2::text) FROM 1 FOR 6)),
            'Attendance', 'Biometric Punch Regularization on 24th Aug',
            'Due to client site visit on 24th August, punch-out time was not logged via biometric terminal. Onsite log sheet is attached.',
            'HIGH', 'OPEN', NULL, NULL, 48,
            NOW() - INTERVAL '12 hours', NOW() - INTERVAL '12 hours'
        ),
        (
            t3, v_tenant_id, v_org_id, v_curr_emp_id, v_curr_emp_name, v_curr_dept,
            'HD-' || UPPER(SUBSTRING(MD5(t3::text) FROM 1 FOR 6)),
            'General HR', 'Employee ID Badge RFID Malfunction',
            'My physical office entry card is intermittently failing at the 3rd-floor security turnstiles. Requesting re-magnetization or replacement card.',
            'LOW', 'RESOLVED', 'hr_ops_02', 'David Ross (Facility Lead)', 48,
            NOW() - INTERVAL '4 days', NOW() - INTERVAL '1 day'
        ),
        (
            t4, v_tenant_id, v_org_id, v_curr_emp_id, v_curr_emp_name, v_curr_dept,
            'HD-' || UPPER(SUBSTRING(MD5(t4::text) FROM 1 FOR 6)),
            'Documents', 'Form 16 Part B Signed Copy Request',
            'Requesting digitally signed Form 16 Part A & Part B for FY 2025-2026 IT filing.',
            'MEDIUM', 'CLOSED', 'hr_mgr_01', 'Sarah Jenkins (HR Ops)', 24,
            NOW() - INTERVAL '10 days', NOW() - INTERVAL '6 days'
        )
        ON CONFLICT (ticket_number) DO NOTHING;

        -- Seed Messages for Flutter Test User Ticket 1
        INSERT INTO public.helpdesk_messages (ticket_id, tenant_id, sender_id, sender_name, sender_role, message, visibility, created_at)
        VALUES 
            (t1, v_tenant_id, v_curr_emp_id, v_curr_emp_name, 'EMPLOYEE', 'I noticed standard deduction was calculated differently this month. Could someone from payroll guide me through the new tax slab calculation?', 'EMPLOYEE', NOW() - INTERVAL '1 day'),
            (t1, v_tenant_id, 'hr_mgr_01', 'Sarah Jenkins (HR Ops)', 'HR', 'Hello! We transitioned your tax regime declaration as selected during quarterly window. Your revised compute sheet has been uploaded to your document locker.', 'EMPLOYEE', NOW() - INTERVAL '2 hours');

        -- Seed Service Requests
        IF sd_salary IS NOT NULL THEN
            sr1 := gen_random_uuid();
            INSERT INTO public.service_requests (
                id, tenant_id, organization_id, employee_id, employee_name, department,
                service_definition_id, service_code, service_name, category, request_number,
                status, priority, form_data, submitted_at
            ) VALUES (
                sr1, v_tenant_id, v_org_id, v_curr_emp_id, v_curr_emp_name, v_curr_dept,
                sd_salary, 'SRV-SALARY-CERT', 'Salary Certificate / Letter', 'Documents',
                'SR-' || UPPER(SUBSTRING(MD5(sr1::text) FROM 1 FOR 6)),
                'PENDING_HR', 'HIGH',
                '{"purpose": "Bank Home Loan Application", "delivery_mode": "Digital Verified PDF", "bank_name": "HDFC Bank"}'::jsonb,
                NOW() - INTERVAL '1 day'
            ) ON CONFLICT (request_number) DO NOTHING;
        END IF;

        IF sd_laptop IS NOT NULL THEN
            sr2 := gen_random_uuid();
            INSERT INTO public.service_requests (
                id, tenant_id, organization_id, employee_id, employee_name, department,
                service_definition_id, service_code, service_name, category, request_number,
                status, priority, form_data, submitted_at
            ) VALUES (
                sr2, v_tenant_id, v_org_id, v_curr_emp_id, v_curr_emp_name, v_curr_dept,
                sd_laptop, 'SRV-LAPTOP-UPG', 'Hardware / Laptop Upgrade', 'IT Assets',
                'SR-' || UPPER(SUBSTRING(MD5(sr2::text) FROM 1 FOR 6)),
                'APPROVED', 'MEDIUM',
                '{"current_device": "MacBook Pro M1 16GB", "requested_upgrade": "32GB RAM Upgrade for Mobile Builds", "justification": "Flutter & Android Emulator Memory requirements"}'::jsonb,
                NOW() - INTERVAL '3 days'
            ) ON CONFLICT (request_number) DO NOTHING;
        END IF;
    END LOOP;
END $$;
