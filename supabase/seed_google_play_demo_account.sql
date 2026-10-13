  -- =========================================================================================
  -- JOY PEOPLEHR — GOOGLE PLAY STORE REVIEWER DEMO ACCOUNT SEED (IDEMPOTENT SQL)
  -- Target Auth User : fcad9143-0e98-4366-a303-dc7663976242 (demo.employee@joypeoplehr.com)
  -- Organization     : 0c621892-e938-4707-9957-13534ea32c19 (Joy Corporate Solutions)
  -- Company          : 2030277f-a6a1-427f-beaf-4fc677a3bae2 (JOY CORPORATE SOLUTIONS PVE LTD)
  --
  -- NOTE: This script preserves the existing password in auth.users for demo.employee@joypeoplehr.com
  --       and populates complete, realistic HRMS data across all Flutter app modules:
  --       1. Auth Metadata & User Profile (auth.users, public.user_profiles)
  --       2. Employee Master & Extended Profile (employees, employee_profiles, addresses, emergency)
  --       3. Bank Account & Statutory KYC (employee_bank_details, employee_statutory_details)
  --       4. Geofence Work Locations & Shift Roster (employee_work_location_assignments, shifts)
  --       5. Leave Types, Balances, Requests & Holidays (leave_types, leave_balances, leave_requests, holidays)
  --       6. Monthly Attendance Ledger, GPS Punches & Regularizations (attendance_daily, attendance_punches, attendance_regularizations)
  --       7. Payroll Runs, Line Items & Published Payslips (payroll_runs, payroll_line_items, payslips)
  --       8. Verified KYC & Company Policy Documents (employee_documents)
  --       9. Expense Claims, Helpdesk Tickets & Grievances (employee_requests, posh_and_grievance_cases)
  --      10. Performance Appraisal Cycle & OKR Goals (performance_cycles, performance_goals)
  --      11. In-App Notifications & Broadcast Announcements (notification_events)
  -- =========================================================================================

  BEGIN;

  -- =========================================================================================
  -- 0. FIX PAYSLIP & PAYROLL LINE ITEM IMMUTABILITY TRIGGER FUNCTIONS
  --    Fixes: ERROR 42703: record "new" has no field "payroll_run_id" on public.payslips
  --    (public.payslips links to payroll_runs via payroll_line_item_id, not payroll_run_id,
  --     and BEFORE DELETE triggers must read OLD rather than NEW)
  -- =========================================================================================
  CREATE OR REPLACE FUNCTION public.fn_prevent_locked_payslip_mutation()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path = public, pg_temp
  AS $$
  DECLARE
      v_run_status public.payroll_status_enum;
      v_run_id UUID;
      v_line_item_id UUID;
  BEGIN
      IF TG_OP = 'DELETE' THEN
          v_line_item_id := OLD.payroll_line_item_id;
      ELSE
          v_line_item_id := NEW.payroll_line_item_id;
      END IF;

      IF v_line_item_id IS NOT NULL THEN
          SELECT pr.id, pr.status
            INTO v_run_id, v_run_status
            FROM public.payroll_line_items pli
            JOIN public.payroll_runs pr ON pr.id = pli.payroll_run_id
          WHERE pli.id = v_line_item_id;

          IF v_run_status IN ('LOCKED', 'DISBURSED') THEN
              RAISE EXCEPTION 'Cannot modify or delete payslip % because parent payroll run % is locked/disbursed.', OLD.id, v_run_id;
          END IF;
      END IF;

      IF TG_OP = 'DELETE' THEN
          RETURN OLD;
      END IF;
      RETURN NEW;
  END;
  $$;

  CREATE OR REPLACE FUNCTION public.fn_prevent_locked_line_item_mutation()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path = public, pg_temp
  AS $$
  DECLARE
      v_run_status public.payroll_status_enum;
      v_run_id UUID;
  BEGIN
      IF TG_OP = 'DELETE' THEN
          v_run_id := OLD.payroll_run_id;
      ELSE
          v_run_id := NEW.payroll_run_id;
      END IF;

      SELECT status INTO v_run_status FROM public.payroll_runs WHERE id = v_run_id;

      IF v_run_status IN ('LOCKED', 'DISBURSED') THEN
          RAISE EXCEPTION 'Cannot modify or delete line items for payroll run % because the cycle is locked/disbursed.', v_run_id;
      END IF;

      IF TG_OP = 'DELETE' THEN
          RETURN OLD;
      END IF;
      RETURN NEW;
  END;
  $$;

  DO $$
  DECLARE
    v_auth_uid       UUID := 'fcad9143-0e98-4366-a303-dc7663976242';
    v_email          TEXT := 'demo.employee@joypeoplehr.com';
    v_profile_id     UUID := 'fcad9143-0e98-4366-a303-dc7663976242';
    v_emp_id         UUID := 'e0000000-0000-4000-8000-fcad91430e98';
    v_org_id         UUID := '0c621892-e938-4707-9957-13534ea32c19';
    v_comp_id        UUID := '2030277f-a6a1-427f-beaf-4fc677a3bae2';
    v_branch_id      UUID := 'fc1782e6-fb46-47e8-a428-9da95e5a4f6f';
    v_dept_id        UUID := '0cdef8b4-014c-4487-895c-cf264824a0da';
    v_desig_id       UUID := 'd1000000-0000-4000-8000-000000000001';
    v_manager_emp_id UUID := '0ce6436c-e9b4-4e0e-9102-93ea238be0df';
    v_shift_id       UUID := 'f847c561-4bbb-4b9f-a2dd-003162897eef';
    v_hq_loc_id      UUID := '95e14b62-b4b8-459e-a314-1ff5b26efa0c';
    v_sec_loc_id     UUID := '6b35b4a6-016c-4a8f-a919-083636760737';

    v_cl_type_id     UUID := '0f2240de-0ac5-4178-8f1d-20a68114f48d';
    v_sl_type_id     UUID := '0f2240de-0ac5-4178-8f1d-20a68114f48e';
    v_el_type_id     UUID := '0f2240de-0ac5-4178-8f1d-20a68114f48f';

    v_doc_pan_id     UUID := 'a02bc3b0-278d-4a41-af5e-b33d34b40fb8';
    v_doc_aadhaar_id UUID := '83823386-9b52-4cb2-8508-f79571852111';
    v_doc_bank_id    UUID := '5724d890-3e45-4fed-b181-c175cc6d137a';
    v_doc_exp_id     UUID := 'c48182a3-10bc-4352-aa9d-7146f47687eb';
    v_doc_other_id   UUID := 'f7001d2f-8f37-4091-bdf7-b739b8fe5418';

    v_run_jul_id     UUID := '70000000-0000-4000-8000-000000000726';
    v_run_aug_id     UUID := 'f8ab7933-b3f0-43ed-a693-cc3841999abc';
    v_run_sep_id     UUID := '9bce8b31-e175-4a93-9eca-d277cbf54e26';
    v_pli_jul_id     UUID := '71000000-0000-4000-8000-fcad91430726';
    v_pli_aug_id     UUID := '71000000-0000-4000-8000-fcad91430826';
    v_pli_sep_id     UUID := '71000000-0000-4000-8000-fcad91430926';
    v_cycle_id       UUID := '81000000-0000-4000-8000-fcad91432026';

    v_day            INT;
    v_date           DATE;
    v_dow            INT;
    v_in_ts          TIMESTAMPTZ;
    v_out_ts         TIMESTAMPTZ;
    v_work_mins      INT;
    v_late_mins      INT;
    v_ot_mins        INT;
  BEGIN
    -- =======================================================================================
    -- 1. UPDATE AUTH.USERS METADATA (PRESERVING EXISTING PASSWORD)
    -- =======================================================================================
    UPDATE auth.users
    SET
      email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
      raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
        'email_verified', true,
        'full_name', 'Arjun Kumar',
        'employee_id', v_emp_id::text,
        'organization_id', v_org_id::text,
        'role', 'EMPLOYEE',
        'must_change_password', false,
        'require_password_change', false
      ),
      raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
        'organization_id', v_org_id::text,
        'role', 'EMPLOYEE'
      ),
      updated_at = NOW()
    WHERE id = v_auth_uid;

    -- Also link demo.hr@joypeoplehr.com and demo.companyhead@joypeoplehr.com metadata
    UPDATE auth.users
    SET
      email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
      raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
        'email_verified', true,
        'full_name', 'Demo HR Manager',
        'organization_id', v_org_id::text,
        'role', 'HR_HEAD',
        'must_change_password', false,
        'require_password_change', false
      ),
      raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
        'organization_id', v_org_id::text,
        'role', 'HR_HEAD'
      )
    WHERE id = '29396d3c-5372-4a12-9a6e-701dbb5bc133';

    UPDATE auth.users
    SET
      email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
      raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
        'email_verified', true,
        'full_name', 'Demo Company Admin',
        'organization_id', v_org_id::text,
        'role', 'COMPANY_ADMIN',
        'must_change_password', false,
        'require_password_change', false
      ),
      raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
        'organization_id', v_org_id::text,
        'role', 'COMPANY_ADMIN'
      )
    WHERE id = '18a523bb-672c-4784-bee4-f8c8d22cd7a7';

    -- =======================================================================================
    -- 2. USER_PROFILES & EMPLOYEES MASTER RECORD
    -- =======================================================================================
    UPDATE public.employees SET user_id = NULL WHERE id = v_emp_id;
    DELETE FROM public.user_profiles WHERE auth_user_id = v_auth_uid AND id <> v_profile_id;

    INSERT INTO public.user_profiles (
      id, auth_user_id, organization_id, employee_id, email, full_name, phone, status, role, created_at, updated_at
    ) VALUES (
      v_profile_id, v_auth_uid, v_org_id, NULL, v_email, 'Arjun Kumar', '+919840123456', 'ACTIVE', 'EMPLOYEE', NOW(), NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      auth_user_id    = EXCLUDED.auth_user_id,
      organization_id = EXCLUDED.organization_id,
      email           = EXCLUDED.email,
      full_name       = EXCLUDED.full_name,
      phone           = EXCLUDED.phone,
      status          = 'ACTIVE',
      role            = 'EMPLOYEE',
      updated_at      = NOW();

    INSERT INTO public.employees (
      id, organization_id, company_id, branch_id, department_id, designation_id,
      reporting_manager_id, user_id, employee_code, first_name, middle_name, last_name,
      display_name, work_email, personal_email, phone, gender, dob, doj, confirmation_date,
      employment_type, employment_status, created_at, updated_at
    ) VALUES (
      v_emp_id, v_org_id, v_comp_id, v_branch_id, v_dept_id, v_desig_id,
      v_manager_emp_id, v_profile_id, 'JCS-099', 'Arjun', NULL, 'Kumar',
      'Arjun Kumar', v_email, 'arjun.kumar.demo@joypeoplehr.com', '9840123456', 'MALE',
      NULL, '2024-01-15', NULL,
      'FULL_TIME', 'ACTIVE', NOW(), NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      organization_id      = EXCLUDED.organization_id,
      company_id           = EXCLUDED.company_id,
      branch_id            = EXCLUDED.branch_id,
      department_id        = EXCLUDED.department_id,
      designation_id       = EXCLUDED.designation_id,
      reporting_manager_id = EXCLUDED.reporting_manager_id,
      user_id              = EXCLUDED.user_id,
      employee_code        = EXCLUDED.employee_code,
      first_name           = EXCLUDED.first_name,
      last_name            = EXCLUDED.last_name,
      display_name         = EXCLUDED.display_name,
      work_email           = EXCLUDED.work_email,
      personal_email       = EXCLUDED.personal_email,
      phone                = EXCLUDED.phone,
      gender               = EXCLUDED.gender,
      dob                  = EXCLUDED.dob,
      doj                  = EXCLUDED.doj,
      confirmation_date    = EXCLUDED.confirmation_date,
      employment_type      = EXCLUDED.employment_type,
      employment_status    = 'ACTIVE',
      deleted_at           = NULL,
      updated_at           = NOW();

    -- Link user_profiles.employee_id -> employees.id
    UPDATE public.user_profiles
    SET employee_id = v_emp_id, updated_at = NOW()
    WHERE id = v_profile_id;



    -- =======================================================================================
    -- 3. EXTENDED PROFILE, ADDRESSES, EMERGENCY CONTACT, BANK & STATUTORY DETAILS
    -- =======================================================================================
    DELETE FROM public.employee_profiles WHERE employee_id = v_emp_id;
    INSERT INTO public.employee_profiles (
      id, organization_id, employee_id, marital_status, blood_group, nationality,
      emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
      bio, created_at, updated_at
    ) VALUES (
      'e1000000-0000-4000-8000-fcad91430e98', v_org_id, v_emp_id, 'MARRIED', 'O+', 'Indian',
      'Priya Kumar', '+91 98401 99887', 'Spouse',
      'Senior Software Engineer specializing in Enterprise Mobile & Cloud Architecture at Joy Corporate Solutions.',
      NOW(), NOW()
    );

    DELETE FROM public.employee_addresses WHERE employee_id = v_emp_id;
    INSERT INTO public.employee_addresses (
      id, organization_id, employee_id, address_type, address_line1, address_line2,
      city, state, postal_code, country, created_at, updated_at
    ) VALUES
    (
      'e2000000-0000-4000-8000-fcad91430001', v_org_id, v_emp_id, 'PRESENT',
      'Flat 4B, Green Valley Residency, Avinashi Road', 'Peelamedu',
      'Coimbatore', 'Tamil Nadu', '641004', 'India', NOW(), NOW()
    ),
    (
      'e2000000-0000-4000-8000-fcad91430002', v_org_id, v_emp_id, 'PERMANENT',
      'No. 18, Gandhi Nagar 2nd Main Road', 'Adyar',
      'Chennai', 'Tamil Nadu', '600020', 'India', NOW(), NOW()
    );

    DELETE FROM public.employee_emergency_contacts WHERE employee_id = v_emp_id;
    INSERT INTO public.employee_emergency_contacts (
      id, organization_id, employee_id, name, relationship, primary_phone,
      alternate_phone, email, address, is_primary, created_at, updated_at
    ) VALUES (
      'e3000000-0000-4000-8000-fcad91430e98', v_org_id, v_emp_id,
      'Priya Kumar', 'Spouse', '+919840199887', '+919840123450',
      'priya.kumar@example.com', 'Flat 4B, Green Valley Residency, Peelamedu, Coimbatore - 641004',
      true, NOW(), NOW()
    );

    DELETE FROM public.employee_bank_details WHERE employee_id = v_emp_id;
    INSERT INTO public.employee_bank_details (
      id, organization_id, employee_id, account_holder_name, bank_name,
      account_number, ifsc_code, branch_name, account_type, is_verified, created_at, updated_at
    ) VALUES (
      'b0000000-0000-4000-8000-fcad91430e98', v_org_id, v_emp_id,
      'Arjun Kumar', 'HDFC Bank', '50100482910482', 'HDFC0001234',
      'Avinashi Road, Coimbatore', 'SALARY', true, NOW(), NOW()
    );

    DELETE FROM public.employee_statutory_details WHERE employee_id = v_emp_id;
    INSERT INTO public.employee_statutory_details (
      id, organization_id, employee_id, pan_number, aadhaar_number, uan_number,
      pf_number, esi_number, is_pf_eligible, is_esi_eligible, is_pt_eligible, created_at, updated_at
    ) VALUES (
      'c0000000-0000-4000-8000-fcad91430e98', v_org_id, v_emp_id,
      'ABCDE1234F', 'XXXX-XXXX-4829', '101482910482',
      'TNCBE00482910000010482', '5600104829', true, false, true, NOW(), NOW()
    );

    -- =======================================================================================
    -- 4. GEOFENCE WORK LOCATIONS & SHIFT ASSIGNMENTS
    -- =======================================================================================
    DELETE FROM public.employee_work_location_assignments WHERE employee_id = v_emp_id;
    INSERT INTO public.employee_work_location_assignments (
      id, organization_id, company_id, employee_id, work_location_id,
      is_primary, attendance_allowed, effective_from, effective_to, is_active, created_at, updated_at
    ) VALUES
    (
      'e4000000-0000-4000-8000-fcad91430001', v_org_id, v_comp_id, v_emp_id, v_hq_loc_id,
      true, true, '2024-10-05', NULL, true, NOW(), NOW()
    ),
    (
      'e4000000-0000-4000-8000-fcad91430002', v_org_id, v_comp_id, v_emp_id, v_sec_loc_id,
      false, true, '2025-01-01', NULL, true, NOW(), NOW()
    );

    DELETE FROM public.employee_shift_assignments WHERE employee_id = v_emp_id;
    INSERT INTO public.employee_shift_assignments (
      id, organization_id, company_id, employee_id, shift_id,
      valid_from, valid_to, effective_from, effective_to, weekly_offs, created_at
    ) VALUES (
      'e5000000-0000-4000-8000-fcad91430e98', v_org_id, v_comp_id, v_emp_id, v_shift_id,
      '2026-01-01', NULL, '2026-01-01', NULL, ARRAY[0, 6], NOW()
    );

    -- =======================================================================================
    -- 5. LEAVE TYPES, LEAVE BALANCES, LEAVE REQUESTS & HOLIDAYS
    -- =======================================================================================
    INSERT INTO public.leave_types (
      id, organization_id, name, code, annual_quota, accrual_frequency,
      is_carry_forward_allowed, max_carry_forward_days, is_encashable, is_paid, is_active, created_at, updated_at
    ) VALUES
    (
      v_cl_type_id, v_org_id, 'Casual Leave', 'CL', 12, 'MONTHLY',
      true, 6, false, true, true, NOW(), NOW()
    ),
    (
      v_sl_type_id, v_org_id, 'Sick Leave', 'SL', 10, 'MONTHLY',
      false, 0, false, true, true, NOW(), NOW()
    ),
    (
      v_el_type_id, v_org_id, 'Earned Leave', 'EL', 15, 'MONTHLY',
      true, 15, true, true, true, NOW(), NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      code = EXCLUDED.code,
      annual_quota = EXCLUDED.annual_quota,
      is_active = true,
      updated_at = NOW();

    DELETE FROM public.leave_balances WHERE employee_id = v_emp_id;
    INSERT INTO public.leave_balances (
      id, organization_id, employee_id, leave_type_id, calendar_year,
      opening_balance, accrued, consumed, closing_balance, updated_at
    ) VALUES
    (
      'e6000000-0000-4000-8000-fcad91430001', v_org_id, v_emp_id, v_cl_type_id, 2026,
      12, 9, 2, 10, NOW()
    ),
    (
      'e6000000-0000-4000-8000-fcad91430002', v_org_id, v_emp_id, v_sl_type_id, 2026,
      10, 7.5, 1, 9, NOW()
    ),
    (
      'e6000000-0000-4000-8000-fcad91430003', v_org_id, v_emp_id, v_el_type_id, 2026,
      15, 11.25, 0, 15, NOW()
    );

    DELETE FROM public.leave_requests WHERE employee_id = v_emp_id;
    INSERT INTO public.leave_requests (
      id, organization_id, employee_id, leave_type_id, start_date, end_date,
      total_days, is_half_day, reason, status, approved_by, approved_at, created_at, updated_at
    ) VALUES
    (
      'e7000000-0000-4000-8000-fcad91430001', v_org_id, v_emp_id, v_cl_type_id,
      '2026-09-10', '2026-09-11', 2, false,
      'Attending family wedding ceremony in Chennai', 'APPROVED',
      v_manager_emp_id, '2026-09-08T10:30:00Z', '2026-09-07T09:15:00Z', '2026-09-08T10:30:00Z'
    ),
    (
      'e7000000-0000-4000-8000-fcad91430002', v_org_id, v_emp_id, v_sl_type_id,
      '2026-08-19', '2026-08-19', 1, false,
      'Viral fever and medical consultation', 'APPROVED',
      v_manager_emp_id, '2026-08-19T06:00:00Z', '2026-08-19T04:00:00Z', '2026-08-19T06:00:00Z'
    ),
    (
      'e7000000-0000-4000-8000-fcad91430003', v_org_id, v_emp_id, v_el_type_id,
      '2026-10-15', '2026-10-16', 2, false,
      'Planned annual family vacation to Ooty', 'PENDING',
      NULL, NULL, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'
    );

    -- Seed Organization Holidays for 2026
    DELETE FROM public.holidays WHERE organization_id = v_org_id;
    INSERT INTO public.holidays (
      id, organization_id, company_id, branch_id, name, holiday_date, is_restricted, created_at
    ) VALUES
    ('f0000000-0000-4000-8000-000000002601', v_org_id, v_comp_id, v_branch_id, 'New Year''s Day',         '2026-01-01', false, NOW()),
    ('f0000000-0000-4000-8000-000000002602', v_org_id, v_comp_id, v_branch_id, 'Pongal / Makar Sankranti','2026-01-14', false, NOW()),
    ('f0000000-0000-4000-8000-000000002603', v_org_id, v_comp_id, v_branch_id, 'Republic Day',           '2026-01-26', false, NOW()),
    ('f0000000-0000-4000-8000-000000002604', v_org_id, v_comp_id, v_branch_id, 'Tamil New Year',         '2026-04-14', false, NOW()),
    ('f0000000-0000-4000-8000-000000002605', v_org_id, v_comp_id, v_branch_id, 'May Day / Labour Day',   '2026-05-01', false, NOW()),
    ('f0000000-0000-4000-8000-000000002606', v_org_id, v_comp_id, v_branch_id, 'Independence Day',       '2026-08-15', false, NOW()),
    ('f0000000-0000-4000-8000-000000002607', v_org_id, v_comp_id, v_branch_id, 'Vinayagar Chathurthi',   '2026-09-14', false, NOW()),
    ('f0000000-0000-4000-8000-000000002608', v_org_id, v_comp_id, v_branch_id, 'Gandhi Jayanti',         '2026-10-02', false, NOW()),
    ('f0000000-0000-4000-8000-000000002609', v_org_id, v_comp_id, v_branch_id, 'Ayudha Pooja / Dussehra','2026-10-20', false, NOW()),
    ('f0000000-0000-4000-8000-000000002610', v_org_id, v_comp_id, v_branch_id, 'Diwali / Deepavali',     '2026-11-08', false, NOW()),
    ('f0000000-0000-4000-8000-000000002611', v_org_id, v_comp_id, v_branch_id, 'Christmas Day',          '2026-12-25', false, NOW());

    -- =======================================================================================
    -- 6. SEPTEMBER 2026 ATTENDANCE DAILY, GPS PUNCHES & REGULARIZATIONS
    -- =======================================================================================
    ALTER TABLE public.attendance_punches DISABLE TRIGGER USER;
    DELETE FROM public.attendance_punches WHERE employee_id = v_emp_id;
    DELETE FROM public.attendance_daily WHERE employee_id = v_emp_id;

    FOR v_day IN 1..29 LOOP
      v_date := make_date(2026, 9, v_day);
      v_dow  := EXTRACT(DOW FROM v_date); -- 0=Sun, 6=Sat

      IF v_dow IN (0, 6) THEN
        CONTINUE;
      END IF;

      -- Approved Casual Leave days (Sep 10 & Sep 11)
      IF v_day IN (10, 11) THEN
        INSERT INTO public.attendance_daily (
          id, organization_id, employee_id, shift_id, attendance_date,
          first_check_in, last_check_out, total_work_minutes, break_minutes,
          overtime_minutes, late_entry_minutes, early_exit_minutes,
          status, payable_status, is_regularized, overtime_eligible, unauthorized_checkout,
          created_at, updated_at
        ) VALUES (
          gen_random_uuid(), v_org_id, v_emp_id, v_shift_id, v_date,
          NULL, NULL, 0, 0, 0, 0, 0,
          'ON_LEAVE', 1.0, false, false, false,
          NOW(), NOW()
        );
        CONTINUE;
      END IF;

      -- Holiday (Sep 14 - Vinayagar Chathurthi)
      IF v_day = 14 THEN
        INSERT INTO public.attendance_daily (
          id, organization_id, employee_id, shift_id, attendance_date,
          first_check_in, last_check_out, total_work_minutes, break_minutes,
          overtime_minutes, late_entry_minutes, early_exit_minutes,
          status, payable_status, is_regularized, overtime_eligible, unauthorized_checkout,
          created_at, updated_at
        ) VALUES (
          gen_random_uuid(), v_org_id, v_emp_id, v_shift_id, v_date,
          NULL, NULL, 0, 0, 0, 0, 0,
          'HOLIDAY', 1.0, false, false, false,
          NOW(), NOW()
        );
        CONTINUE;
      END IF;

      -- Missing Check-Out day (Sep 28 - Pending Regularization)
      IF v_day = 28 THEN
        v_in_ts := (v_date::text || ' 09:02:15+05:30')::timestamptz;
        INSERT INTO public.attendance_daily (
          id, organization_id, employee_id, shift_id, attendance_date,
          first_check_in, last_check_out, total_work_minutes, break_minutes,
          overtime_minutes, late_entry_minutes, early_exit_minutes,
          status, payable_status, is_regularized, overtime_eligible, unauthorized_checkout,
          check_in_work_location_id, check_in_location_name, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), v_org_id, v_emp_id, v_shift_id, v_date,
          v_in_ts, NULL, 0, 0, 0, 0, 0,
          'PRESENT', 0.5, false, false, false,
          v_hq_loc_id, 'Joy Corporate Solutions Private Limited (HQ)', NOW(), NOW()
        );

        INSERT INTO public.attendance_punches (
          id, organization_id, employee_id, punch_time, punch_type,
          verification_mode, punch_source, latitude, longitude, accuracy_meters,
          work_location_id, distance_meters, location_authorized, unauthorized_checkout,
          is_processed, created_at
        ) VALUES (
          gen_random_uuid(), v_org_id, v_emp_id, v_in_ts, 'IN',
          'GPS', 'MOBILE', 11.0844364, 77.1262627, 9.5,
          v_hq_loc_id, 14.2, true, false, true, NOW()
        );
        CONTINUE;
      END IF;

      -- Normal or Late working days
      v_in_ts     := (v_date::text || ' 08:56:20+05:30')::timestamptz;
      v_out_ts    := (v_date::text || ' 18:08:40+05:30')::timestamptz;
      v_work_mins := 507;
      v_late_mins := 0;
      v_ot_mins   := 0;

      IF v_day = 18 THEN
        v_in_ts     := (v_date::text || ' 09:28:00+05:30')::timestamptz;
        v_out_ts    := (v_date::text || ' 18:15:00+05:30')::timestamptz;
        v_work_mins := 482;
        v_late_mins := 28;
      ELSIF v_day = 24 THEN
        v_in_ts     := (v_date::text || ' 09:34:00+05:30')::timestamptz;
        v_out_ts    := (v_date::text || ' 18:20:00+05:30')::timestamptz;
        v_work_mins := 481;
        v_late_mins := 34;
      ELSIF v_day IN (8, 16, 22) THEN
        v_out_ts    := (v_date::text || ' 19:15:00+05:30')::timestamptz;
        v_work_mins := 573;
        v_ot_mins   := 75;
      END IF;

      INSERT INTO public.attendance_daily (
        id, organization_id, employee_id, shift_id, attendance_date,
        first_check_in, last_check_out, total_work_minutes, break_minutes,
        overtime_minutes, late_entry_minutes, early_exit_minutes,
        status, payable_status, is_regularized, overtime_eligible, unauthorized_checkout,
        check_in_work_location_id, check_out_work_location_id,
        check_in_location_name, check_out_location_name, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), v_org_id, v_emp_id, v_shift_id, v_date,
        v_in_ts, v_out_ts, v_work_mins, 45,
        v_ot_mins, v_late_mins, 0,
        'PRESENT', 1.0, (v_day = 4), (v_ot_mins > 0), false,
        v_hq_loc_id, v_hq_loc_id,
        'Joy Corporate Solutions Private Limited (HQ)',
        'Joy Corporate Solutions Private Limited (HQ)',
        NOW(), NOW()
      );

      INSERT INTO public.attendance_punches (
        id, organization_id, employee_id, punch_time, punch_type,
        verification_mode, punch_source, latitude, longitude, accuracy_meters,
        work_location_id, distance_meters, location_authorized, unauthorized_checkout,
        is_processed, created_at
      ) VALUES
      (
        gen_random_uuid(), v_org_id, v_emp_id, v_in_ts, 'IN',
        'GPS', 'MOBILE', 11.0844364, 77.1262627, 8.5,
        v_hq_loc_id, 12.0, true, false, true, NOW()
      ),
      (
        gen_random_uuid(), v_org_id, v_emp_id, v_out_ts, 'OUT',
        'GPS', 'MOBILE', 11.0844364, 77.1262627, 9.0,
        v_hq_loc_id, 15.0, true, false, true, NOW()
      );
    END LOOP;

    -- Today (2026-09-30): Checked In at 09:05 AM IST so live timer runs on Home Screen
    v_in_ts := '2026-09-30 09:05:12+05:30'::timestamptz;
    INSERT INTO public.attendance_daily (
      id, organization_id, employee_id, shift_id, attendance_date,
      first_check_in, last_check_out, total_work_minutes, break_minutes,
      overtime_minutes, late_entry_minutes, early_exit_minutes,
      status, payable_status, is_regularized, overtime_eligible, unauthorized_checkout,
      check_in_work_location_id, check_in_location_name, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), v_org_id, v_emp_id, v_shift_id, '2026-09-30',
      v_in_ts, NULL, 240, 0, 0, 0, 0,
      'PRESENT', 1.0, false, false, false,
      v_hq_loc_id, 'Joy Corporate Solutions Private Limited (HQ)', NOW(), NOW()
    );

    INSERT INTO public.attendance_punches (
      id, organization_id, employee_id, punch_time, punch_type,
      verification_mode, punch_source, latitude, longitude, accuracy_meters,
      work_location_id, distance_meters, location_authorized, unauthorized_checkout,
      is_processed, created_at
    ) VALUES (
      gen_random_uuid(), v_org_id, v_emp_id, v_in_ts, 'IN',
      'GPS', 'MOBILE', 11.0844364, 77.1262627, 8.0,
      v_hq_loc_id, 10.5, true, false, true, NOW()
    );
    ALTER TABLE public.attendance_punches ENABLE TRIGGER USER;

    -- Attendance Regularizations
    DELETE FROM public.attendance_regularizations WHERE employee_id = v_emp_id;
    INSERT INTO public.attendance_regularizations (
      id, organization_id, employee_id, attendance_date,
      requested_check_in, requested_check_out, reason, status,
      approved_by, approved_at, created_at, updated_at
    ) VALUES
    (
      'e8000000-0000-4000-8000-fcad91430001', v_org_id, v_emp_id, '2026-09-28',
      '2026-09-28 09:02:15+05:30'::timestamptz, '2026-09-28 18:15:00+05:30'::timestamptz,
      'Client sprint review meeting extended past 6:00 PM — missed evening mobile checkout punch.',
      'PENDING', NULL, NULL, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'
    ),
    (
      'e8000000-0000-4000-8000-fcad91430002', v_org_id, v_emp_id, '2026-09-04',
      '2026-09-04 09:00:00+05:30'::timestamptz, '2026-09-04 18:05:00+05:30'::timestamptz,
      'On-site deployment workshop at CareNow Medical campus.',
      'APPROVED', v_manager_emp_id, '2026-09-05T11:00:00Z', '2026-09-04T19:00:00Z', '2026-09-05T11:00:00Z'
    );

    -- =======================================================================================
    -- 7. PAYROLL RUNS, PAYROLL LINE ITEMS & PUBLISHED PAYSLIPS
    -- =======================================================================================
    ALTER TABLE public.payslips DISABLE TRIGGER USER;
    ALTER TABLE public.payroll_line_items DISABLE TRIGGER USER;
    ALTER TABLE public.payroll_runs DISABLE TRIGGER USER;

    INSERT INTO public.payroll_runs (
      id, organization_id, company_id, month, year,
      total_employees, total_gross_pay, total_deductions, total_net_pay,
      status, created_at, updated_at
    ) VALUES
    (
      v_run_jul_id, v_org_id, v_comp_id, 7, 2026,
      6, 450000, 27000, 423000, 'APPROVED', NOW(), NOW()
    ),
    (
      v_run_aug_id, v_org_id, v_comp_id, 8, 2026,
      6, 450000, 27000, 423000, 'APPROVED', NOW(), NOW()
    ),
    (
      v_run_sep_id, v_org_id, v_comp_id, 9, 2026,
      6, 450000, 27000, 423000, 'LOCKED', NOW(), NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      total_employees = EXCLUDED.total_employees,
      total_gross_pay = EXCLUDED.total_gross_pay,
      total_deductions = EXCLUDED.total_deductions,
      total_net_pay = EXCLUDED.total_net_pay,
      updated_at = NOW();

    DELETE FROM public.payslips WHERE employee_id = v_emp_id;
    DELETE FROM public.payroll_line_items WHERE employee_id = v_emp_id;

    INSERT INTO public.payroll_line_items (
      id, organization_id, payroll_run_id, employee_id,
      total_working_days, payable_days, lop_days,
      gross_earnings, total_deductions, net_pay,
      earnings_breakdown, deductions_breakdown, statutory_employer_contributions, created_at
    ) VALUES
    (
      v_pli_jul_id, v_org_id, v_run_jul_id, v_emp_id,
      27, 27, 0, 75000, 4500, 70500,
      '{"Basic": 37500, "HRA": 18750, "Special Allowance": 13750, "Conveyance": 3000, "Medical Allowance": 2000}'::jsonb,
      '{"PF": 1800, "PT": 200, "TDS": 2500}'::jsonb,
      '{"Employer PF": 1800, "Gratuity": 1803}'::jsonb,
      '2026-07-31T12:00:00Z'
    ),
    (
      v_pli_aug_id, v_org_id, v_run_aug_id, v_emp_id,
      26, 26, 0, 75000, 4500, 70500,
      '{"Basic": 37500, "HRA": 18750, "Special Allowance": 13750, "Conveyance": 3000, "Medical Allowance": 2000}'::jsonb,
      '{"PF": 1800, "PT": 200, "TDS": 2500}'::jsonb,
      '{"Employer PF": 1800, "Gratuity": 1803}'::jsonb,
      '2026-08-31T12:00:00Z'
    ),
    (
      v_pli_sep_id, v_org_id, v_run_sep_id, v_emp_id,
      26, 26, 0, 75000, 4500, 70500,
      '{"Basic": 37500, "HRA": 18750, "Special Allowance": 13750, "Conveyance": 3000, "Medical Allowance": 2000}'::jsonb,
      '{"PF": 1800, "PT": 200, "TDS": 2500}'::jsonb,
      '{"Employer PF": 1800, "Gratuity": 1803}'::jsonb,
      '2026-09-29T12:00:00Z'
    );

    INSERT INTO public.payslips (
      id, organization_id, payroll_line_item_id, employee_id,
      payslip_number, storage_path, is_published, published_at, created_at
    ) VALUES
    (
      '72000000-0000-4000-8000-fcad91430726', v_org_id, v_pli_jul_id, v_emp_id,
      'PS-2026-07-JCS099', 'payslips/2026/07/PS-2026-07-JCS099.pdf', true,
      '2026-08-01T10:00:00Z', '2026-08-01T10:00:00Z'
    ),
    (
      '72000000-0000-4000-8000-fcad91430826', v_org_id, v_pli_aug_id, v_emp_id,
      'PS-2026-08-JCS099', 'payslips/2026/08/PS-2026-08-JCS099.pdf', true,
      '2026-09-01T10:00:00Z', '2026-09-01T10:00:00Z'
    ),
    (
      '72000000-0000-4000-8000-fcad91430926', v_org_id, v_pli_sep_id, v_emp_id,
      'PS-2026-09-JCS099', 'payslips/2026/09/PS-2026-09-JCS099.pdf', true,
      '2026-09-30T06:00:00Z', '2026-09-30T06:00:00Z'
    );

    ALTER TABLE public.payroll_runs ENABLE TRIGGER USER;
    ALTER TABLE public.payroll_line_items ENABLE TRIGGER USER;
    ALTER TABLE public.payslips ENABLE TRIGGER USER;

    -- =======================================================================================
    -- 8. EMPLOYEE DOCUMENTS & DIGITAL LETTERS
    -- =======================================================================================
    DELETE FROM public.employee_documents WHERE employee_id = v_emp_id;
    INSERT INTO public.employee_documents (
      id, organization_id, employee_id, document_type_id,
      file_name, storage_path, file_size_bytes, mime_type,
      verification_status, verified_at, created_at, updated_at
    ) VALUES
    (
      'e9000000-0000-4000-8000-fcad91430001', v_org_id, v_emp_id, v_doc_pan_id,
      'PAN_Card_Arjun_Kumar.pdf',
      '0c621892-e938-4707-9957-13534ea32c19/e0000000-0000-4000-8000-fcad91430e98/documents/PAN_Card_Arjun_Kumar.pdf',
      245760, 'application/pdf', 'VERIFIED', NOW() - INTERVAL '20 days', NOW() - INTERVAL '25 days', NOW()
    ),
    (
      'e9000000-0000-4000-8000-fcad91430002', v_org_id, v_emp_id, v_doc_aadhaar_id,
      'Aadhaar_Card_Arjun_Kumar.pdf',
      '0c621892-e938-4707-9957-13534ea32c19/e0000000-0000-4000-8000-fcad91430e98/documents/Aadhaar_Card_Arjun_Kumar.pdf',
      312400, 'application/pdf', 'VERIFIED', NOW() - INTERVAL '20 days', NOW() - INTERVAL '25 days', NOW()
    ),
    (
      'e9000000-0000-4000-8000-fcad91430003', v_org_id, v_emp_id, v_doc_bank_id,
      'HDFC_Bank_Verification_Arjun_Kumar.pdf',
      '0c621892-e938-4707-9957-13534ea32c19/e0000000-0000-4000-8000-fcad91430e98/documents/HDFC_Bank_Verification_Arjun_Kumar.pdf',
      189200, 'application/pdf', 'VERIFIED', NOW() - INTERVAL '18 days', NOW() - INTERVAL '22 days', NOW()
    ),
    (
      'e9000000-0000-4000-8000-fcad91430004', v_org_id, v_emp_id, v_doc_exp_id,
      'Appointment_Order_JCS_099.pdf',
      '0c621892-e938-4707-9957-13534ea32c19/e0000000-0000-4000-8000-fcad91430e98/documents/Appointment_Order_JCS_099.pdf',
      420800, 'application/pdf', 'VERIFIED', NOW() - INTERVAL '15 days', NOW() - INTERVAL '20 days', NOW()
    ),
    (
      'e9000000-0000-4000-8000-fcad91430005', v_org_id, v_emp_id, v_doc_other_id,
      'Company_HR_Policy_Handbook_2026.pdf',
      '0c621892-e938-4707-9957-13534ea32c19/e0000000-0000-4000-8000-fcad91430e98/documents/Company_HR_Policy_Handbook_2026.pdf',
      1048576, 'application/pdf', 'VERIFIED', NOW() - INTERVAL '10 days', NOW() - INTERVAL '15 days', NOW()
    );

    -- =======================================================================================
    -- 9. EXPENSE CLAIMS, HELPDESK TICKETS & GRIEVANCES
    -- =======================================================================================
    DELETE FROM public.employee_requests WHERE employee_id = v_emp_id;
    INSERT INTO public.employee_requests (
      id, organization_id, employee_id, request_type, subject, description,
      priority, status, resolution_notes, created_at, updated_at
    ) VALUES
    (
      'ea000000-0000-4000-8000-fcad91430001', v_org_id, v_emp_id, 'EXPENSE',
      'Client Onsite Visit & Airport Cab Reimbursement',
      'Cab travel to Coimbatore Airport & client office visit [Amount: ₹2450] [Receipt: https://ysiajemrqakfngasehhi.supabase.co/storage/v1/object/public/documents/cab-receipt-sep2026.pdf]',
      'MEDIUM', 'OPEN', NULL, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'
    ),
    (
      'ea000000-0000-4000-8000-fcad91430002', v_org_id, v_emp_id, 'EXPENSE',
      'Monthly Fiber Broadband & Remote Work Allowance',
      'High-speed fiber broadband bill for September 2026 [Amount: ₹1499] [Receipt: https://ysiajemrqakfngasehhi.supabase.co/storage/v1/object/public/documents/broadband-sep2026.pdf]',
      'LOW', 'RESOLVED', 'Verified and approved for payroll reimbursement.', NOW() - INTERVAL '10 days', NOW() - INTERVAL '8 days'
    ),
    (
      'ea000000-0000-4000-8000-fcad91430003', v_org_id, v_emp_id, 'IT_SUPPORT',
      'AWS Production VPN & SSH Key Access Renewal',
      'Requesting renewal of OpenVPN certificate for Q4 release deployment pipeline.',
      'HIGH', 'IN_PROGRESS', 'Assigned to DevOps SecOps queue.', NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 day'
    ),
    (
      'ea000000-0000-4000-8000-fcad91430004', v_org_id, v_emp_id, 'HR_LETTER',
      'Bonafide & Employment Verification Certificate',
      'Required for residential address verification and passport renewal.',
      'MEDIUM', 'RESOLVED', 'Issued and uploaded to Digital Letters.', NOW() - INTERVAL '12 days', NOW() - INTERVAL '11 days'
    ),
    (
      'ea000000-0000-4000-8000-fcad91430005', v_org_id, v_emp_id, 'OTHER',
      '[GRIEVANCE] Ergonomic Chair & Dual Monitor Arm Request',
      'Requesting ergonomic lumbar chair adjustment at 3rd Floor Development Bay #14.',
      'MEDIUM', 'OPEN', NULL, NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'
    );

    -- =======================================================================================
    -- 10. PERFORMANCE APPRAISAL CYCLE & GOALS (OKRs)
    -- =======================================================================================
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'performance_cycles') THEN
      INSERT INTO public.performance_cycles (
        id, organization_id, name, start_date, end_date, status, created_at
      ) VALUES (
        v_cycle_id, v_org_id, 'FY 2026-27 Annual Performance Review',
        '2026-04-01', '2027-03-31', 'ACTIVE', NOW()
      )
      ON CONFLICT (id) DO NOTHING;

      DELETE FROM public.performance_goals WHERE employee_id = v_emp_id;
      INSERT INTO public.performance_goals (
        id, organization_id, cycle_id, employee_id, title,
        metric_type, target_value, current_value, weightage, status, created_at, updated_at
      ) VALUES
      (
        'eb000000-0000-4000-8000-fcad91430001', v_org_id, v_cycle_id, v_emp_id,
        'Deliver Mobile HRMS v2.4 with 99.9% Crash-Free Sessions',
        'PERCENTAGE', 100, 92, 40, 'IN_PROGRESS', NOW() - INTERVAL '30 days', NOW()
      ),
      (
        'eb000000-0000-4000-8000-fcad91430002', v_org_id, v_cycle_id, v_emp_id,
        'Optimize Real-Time Attendance Sync P95 Latency < 150ms',
        'PERCENTAGE', 100, 100, 35, 'COMPLETED', NOW() - INTERVAL '45 days', NOW()
      ),
      (
        'eb000000-0000-4000-8000-fcad91430003', v_org_id, v_cycle_id, v_emp_id,
        'Complete ISO 27001 & OWASP Mobile Security Certification',
        'PERCENTAGE', 100, 80, 25, 'IN_PROGRESS', NOW() - INTERVAL '20 days', NOW()
      );
    END IF;

    -- =======================================================================================




  END $$;

  COMMIT;

  -- =========================================================================================
  -- FINAL VERIFICATION SUMMARY QUERY
  -- =========================================================================================
  SELECT
    u.id AS auth_user_id,
    u.email AS auth_email,
    up.id AS user_profile_id,
    e.id AS employee_uuid,
    e.employee_code,
    e.display_name,
    e.employment_status,
    (SELECT COUNT(*) FROM public.attendance_daily ad WHERE ad.employee_id = e.id) AS attendance_days,
    (SELECT COUNT(*) FROM public.attendance_punches ap WHERE ap.employee_id = e.id) AS gps_punches,
    (SELECT COUNT(*) FROM public.attendance_regularizations ar WHERE ar.employee_id = e.id) AS regularizations,
    (SELECT COUNT(*) FROM public.leave_balances lb WHERE lb.employee_id = e.id) AS leave_balances,
    (SELECT COUNT(*) FROM public.leave_requests lr WHERE lr.employee_id = e.id) AS leave_requests,
    (SELECT COUNT(*) FROM public.payslips ps WHERE ps.employee_id = e.id) AS payslips,
    (SELECT COUNT(*) FROM public.employee_documents ed WHERE ed.employee_id = e.id) AS documents,
    (SELECT COUNT(*) FROM public.employee_requests er WHERE er.employee_id = e.id) AS requests_and_claims,
    (SELECT COUNT(*) FROM public.employee_work_location_assignments wl WHERE wl.employee_id = e.id) AS work_locations
  FROM auth.users u
  JOIN public.user_profiles up ON up.auth_user_id = u.id
  JOIN public.employees e ON e.id = up.employee_id
  WHERE u.id = 'fcad9143-0e98-4366-a303-dc7663976242';
