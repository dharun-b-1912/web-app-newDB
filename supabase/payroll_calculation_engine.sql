-- ============================================================================
-- WORKFORCEOS ENTERPRISE HRMS — UNIVERSAL SQL PAYROLL & ATTENDANCE CALCULATION ENGINE
-- Mathematical Invariants:
-- 1. Net Payable Days = MAX(0, Total Calendar Days - LOP Days)
-- 2. LOP Deduction = ROUND((Gross Base / Total Calendar Days) * LOP Days)
-- 3. Net Payout = MAX(0, Gross Earnings + OT Pay + Reimbursements - Total Deductions)
-- 4. EPF Employee = CASE WHEN gross_basic <= 15000 THEN gross_basic * 0.12 ELSE 1800 END
-- 5. ESIC Employee = CASE WHEN gross_monthly <= 21000 THEN ROUND(gross_monthly * 0.0075) ELSE 0 END
-- ============================================================================

-- 1. FUNCTION: Calculate Daily Attendance & Headcount Metrics
CREATE OR REPLACE FUNCTION fn_calculate_daily_attendance_metrics(
    p_organization_id UUID,
    p_target_date DATE
)
RETURNS TABLE (
    total_headcount INT,
    present_count INT,
    late_count INT,
    wfh_count INT,
    on_leave_count INT,
    absent_count INT,
    not_marked_count INT,
    attendance_rate_pct NUMERIC(5, 2)
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total INT := 0;
    v_present INT := 0;
    v_late INT := 0;
    v_wfh INT := 0;
    v_leave INT := 0;
    v_absent INT := 0;
    v_not_marked INT := 0;
    v_rate NUMERIC(5, 2) := 0;
BEGIN
    -- Active headcount for organization
    SELECT COUNT(*)
    INTO v_total
    FROM employees e
    WHERE e.organization_id = p_organization_id
      AND e.status NOT IN ('Terminated', 'Exited', 'Resigned');

    IF v_total = 0 THEN
        RETURN QUERY SELECT 0, 0, 0, 0, 0, 0, 0, 0.00;
        RETURN;
    END IF;

    -- Aggregate attendance records
    WITH att_summary AS (
        SELECT 
            e.id AS employee_id,
            COALESCE(a.status, 'Not Checked In') AS att_status,
            COALESCE(a.late_minutes, 0) AS late_mins,
            a.first_check_in,
            CASE 
                WHEN l.id IS NOT NULL THEN 'On Leave'
                ELSE COALESCE(a.status, 'Not Checked In')
            END AS resolved_status
        FROM employees e
        LEFT JOIN attendance_daily a 
            ON a.organization_id = p_organization_id 
           AND (a.employee_id = e.id OR a.employee_code = e.employee_code)
           AND a.date = p_target_date
        LEFT JOIN leave_requests l 
            ON l.organization_id = p_organization_id 
           AND l.employee_id = e.id 
           AND l.status = 'Approved' 
           AND p_target_date BETWEEN l.from_date AND l.to_date
        WHERE e.organization_id = p_organization_id
          AND e.status NOT IN ('Terminated', 'Exited', 'Resigned')
    )
    SELECT
        COUNT(*) FILTER (WHERE resolved_status IN ('Present', 'Checked Out', 'Late', 'Half Day', 'Overtime') OR first_check_in IS NOT NULL),
        COUNT(*) FILTER (WHERE late_mins > 0 OR resolved_status = 'Late'),
        COUNT(*) FILTER (WHERE resolved_status = 'WFH'),
        COUNT(*) FILTER (WHERE resolved_status = 'On Leave'),
        COUNT(*) FILTER (WHERE resolved_status = 'Absent'),
        COUNT(*) FILTER (WHERE resolved_status = 'Not Checked In' AND first_check_in IS NULL)
    INTO 
        v_present,
        v_late,
        v_wfh,
        v_leave,
        v_absent,
        v_not_marked
    FROM att_summary;

    -- Compute attendance rate invariant
    v_rate := ROUND((v_present::NUMERIC / GREATEST(1, v_total)) * 100, 2);

    RETURN QUERY SELECT 
        v_total, 
        v_present, 
        v_late, 
        v_wfh, 
        v_leave, 
        v_absent, 
        v_not_marked, 
        v_rate;
END;
$$;

-- 2. FUNCTION: Calculate Exact Monthly Salary Slip & Deductions
CREATE OR REPLACE FUNCTION fn_calculate_employee_salary_slip(
    p_gross_monthly NUMERIC,
    p_total_month_days INT DEFAULT 30,
    p_lop_days NUMERIC DEFAULT 0,
    p_ot_hours NUMERIC DEFAULT 0,
    p_pf_enabled BOOLEAN DEFAULT true,
    p_esi_enabled BOOLEAN DEFAULT true,
    p_pt_monthly NUMERIC DEFAULT 208,
    p_approved_reimbursements NUMERIC DEFAULT 0,
    p_loan_emi NUMERIC DEFAULT 0,
    p_advance_recovery NUMERIC DEFAULT 0
)
RETURNS TABLE (
    basic_pay NUMERIC,
    hra NUMERIC,
    special_allowance NUMERIC,
    overtime_pay NUMERIC,
    reimbursements NUMERIC,
    gross_earnings NUMERIC,
    lop_deduction NUMERIC,
    epf_employee NUMERIC,
    epf_employer NUMERIC,
    esic_employee NUMERIC,
    esic_employer NUMERIC,
    professional_tax NUMERIC,
    loan_deduction NUMERIC,
    advance_deduction NUMERIC,
    total_deductions NUMERIC,
    net_payout NUMERIC,
    payable_days NUMERIC
)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_basic NUMERIC;
    v_hra NUMERIC;
    v_special NUMERIC;
    v_ot_rate NUMERIC;
    v_ot_pay NUMERIC;
    v_gross_earnings NUMERIC;
    v_lop_ded NUMERIC;
    v_epf_emp NUMERIC := 0;
    v_epf_empr NUMERIC := 0;
    v_esic_emp NUMERIC := 0;
    v_esic_empr NUMERIC := 0;
    v_total_ded NUMERIC;
    v_net_pay NUMERIC;
    v_payable_days NUMERIC;
BEGIN
    -- Payable days clamped between 0 and total month days
    v_payable_days := GREATEST(0, p_total_month_days - p_lop_days);

    -- Wage breakdown (50% Basic, 40% HRA of Basic, Balance Special Allowance)
    v_basic := ROUND(p_gross_monthly * 0.50);
    v_hra := ROUND(v_basic * 0.40);
    v_special := GREATEST(0, p_gross_monthly - v_basic - v_hra);

    -- Overtime (Hourly rate * 1.5x multiplier)
    v_ot_rate := ROUND((p_gross_monthly / GREATEST(1, p_total_month_days) / 8.0) * 1.5, 2);
    v_ot_pay := ROUND(p_ot_hours * v_ot_rate);

    v_gross_earnings := p_gross_monthly + v_ot_pay + p_approved_reimbursements;

    -- LOP Pro-rata Deduction
    v_lop_ded := ROUND((p_gross_monthly / GREATEST(1, p_total_month_days)) * p_lop_days);

    -- Statutory EPF (12% of Basic capped at 15,000 wage ceiling)
    IF p_pf_enabled THEN
        v_epf_emp := ROUND(LEAST(v_basic, 15000) * 0.12);
        v_epf_empr := ROUND(LEAST(v_basic, 15000) * 0.12);
    END IF;

    -- Statutory ESIC (0.75% Employee / 3.25% Employer if Gross <= 21,000)
    IF p_esi_enabled AND p_gross_monthly <= 21000 THEN
        v_esic_emp := ROUND(p_gross_monthly * 0.0075);
        v_esic_empr := ROUND(p_gross_monthly * 0.0325);
    END IF;

    -- Total Deductions
    v_total_ded := v_lop_ded + v_epf_emp + v_esic_emp + p_pt_monthly + p_loan_emi + p_advance_recovery;

    -- Net Payout (Guaranteed non-negative)
    v_net_pay := GREATEST(0, v_gross_earnings - v_total_ded);

    RETURN QUERY SELECT 
        v_basic,
        v_hra,
        v_special,
        v_ot_pay,
        p_approved_reimbursements,
        v_gross_earnings,
        v_lop_ded,
        v_epf_emp,
        v_epf_empr,
        v_esic_emp,
        v_esic_empr,
        p_pt_monthly,
        p_loan_emi,
        p_advance_recovery,
        v_total_ded,
        v_net_pay,
        v_payable_days;
END;
$$;

-- 3. FUNCTION: Calculate Vendor Contractor Man-Day Billing & Invoice Summary
CREATE OR REPLACE FUNCTION fn_calculate_vendor_contractor_billing(
    p_organization_id UUID,
    p_vendor_name TEXT,
    p_from_date DATE,
    p_to_date DATE,
    p_vendor_daily_rate NUMERIC DEFAULT 650.00,
    p_vendor_ot_hourly_rate NUMERIC DEFAULT 120.00,
    p_service_charge_pct NUMERIC DEFAULT 8.50,
    p_gst_pct NUMERIC DEFAULT 18.00
)
RETURNS TABLE (
    total_contractor_headcount INT,
    total_man_days_worked NUMERIC,
    total_ot_hours_worked NUMERIC,
    base_man_day_amount NUMERIC,
    overtime_billing_amount NUMERIC,
    subtotal_direct_cost NUMERIC,
    contractor_agency_margin NUMERIC,
    gst_tax_amount NUMERIC,
    total_vendor_invoice_amount NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_headcount INT := 0;
    v_man_days NUMERIC := 0;
    v_ot_hours NUMERIC := 0;
    v_base_amt NUMERIC := 0;
    v_ot_amt NUMERIC := 0;
    v_subtotal NUMERIC := 0;
    v_agency_margin NUMERIC := 0;
    v_gst_amt NUMERIC := 0;
    v_total_invoice NUMERIC := 0;
BEGIN
    -- Count distinct vendor workforce
    SELECT COUNT(DISTINCT e.id)
    INTO v_headcount
    FROM employees e
    WHERE e.organization_id = p_organization_id
      AND (
        e.vendor_name ILIKE '%' || p_vendor_name || '%'
        OR e.employment_source IN ('VENDOR', 'MANPOWER_PROVIDER')
      )
      AND e.status NOT IN ('Terminated', 'Exited');

    -- Aggregate verified attendance records within date window
    SELECT 
        COALESCE(SUM(
            CASE 
                WHEN a.status IN ('Present', 'Checked Out', 'Late', 'Overtime') OR a.first_check_in IS NOT NULL THEN 1.0
                WHEN a.status = 'Half Day' THEN 0.5
                ELSE 0.0
            END
        ), 0),
        COALESCE(SUM(COALESCE(a.overtime_minutes, 0)) / 60.0, 0)
    INTO
        v_man_days,
        v_ot_hours
    FROM attendance_daily a
    JOIN employees e ON (e.id = a.employee_id OR e.employee_code = a.employee_code)
    WHERE a.organization_id = p_organization_id
      AND (
        e.vendor_name ILIKE '%' || p_vendor_name || '%'
        OR e.employment_source IN ('VENDOR', 'MANPOWER_PROVIDER')
      )
      AND a.date BETWEEN p_from_date AND p_to_date;

    -- Billing calculations
    v_base_amt := ROUND(v_man_days * p_vendor_daily_rate, 2);
    v_ot_amt := ROUND(v_ot_hours * p_vendor_ot_hourly_rate, 2);
    v_subtotal := v_base_amt + v_ot_amt;
    v_agency_margin := ROUND((v_subtotal * p_service_charge_pct) / 100.0, 2);
    v_gst_amt := ROUND(((v_subtotal + v_agency_margin) * p_gst_pct) / 100.0, 2);
    v_total_invoice := v_subtotal + v_agency_margin + v_gst_amt;

    RETURN QUERY SELECT 
        v_headcount,
        v_man_days,
        v_ot_hours,
        v_base_amt,
        v_ot_amt,
        v_subtotal,
        v_agency_margin,
        v_gst_amt,
        v_total_invoice;
END;
$$;

