-- supabase/migrations/20260924_141_provision_live_enterprise_vendor_scenario.sql
-- ============================================================================
-- Joy PeopleHR — Live Enterprise Vendor Baseline Scenario
-- Organization: Joy Corporate Solutions (0c621892-e938-4707-9957-13534ea32c19)
-- Vendor: Joy Manpower Services Pvt Ltd (240a7f7d-ec41-4251-b78f-3e781264dd92)
-- Contract PO: PO-2026-08-001 (August 2026)
-- ============================================================================

BEGIN;

DO $$
DECLARE
  v_org_id UUID := '0c621892-e938-4707-9957-13534ea32c19'::uuid;
  v_vendor_id UUID := '240a7f7d-ec41-4251-b78f-3e781264dd92'::uuid;
  v_rel_id UUID := 'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d'::uuid;
  v_po_id UUID := 'c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5f'::uuid;
  v_batch_id UUID := 'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f5a'::uuid;
  v_w1 UUID := 'e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a5b'::uuid;
  v_w2 UUID := 'e2f3a4b5-c6d7-4e8f-9a0b-1c2d3e4f5a6b'::uuid;
  v_w3 UUID := 'e3f4a5b6-c7d8-4e9f-0a1b-2c3d4e5f6a7b'::uuid;
  v_w4 UUID := 'e4f5a6b7-c8d9-4e0f-1a2b-3c4d5e6f7a8b'::uuid;
  v_w5 UUID := 'e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b'::uuid;
BEGIN
  -- 1. Ensure Organization exists
  IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = v_org_id) THEN
    SELECT id INTO v_org_id FROM public.organizations LIMIT 1;
  END IF;

  -- 2. Insert Vendor Master
  INSERT INTO public.vendors (
    id,
    organization_id,
    vendor_code,
    legal_name,
    display_name,
    trade_name,
    vendor_type,
    category,
    pan_number,
    gst_number,
    gstin,
    contact_email,
    contact_person,
    contact_phone,
    msme_number,
    registration_number,
    email,
    phone,
    website,
    address_json,
    bank_details,
    primary_contact,
    compliance_contact,
    max_capacity,
    status
  ) VALUES (
    v_vendor_id,
    v_org_id,
    'VND-JOY-01',
    'Joy Manpower Services Private Limited',
    'Joy Manpower Services',
    'Joy Staffing & Facility Ops',
    'MANPOWER_PROVIDER',
    'Technical & Facility Staffing',
    'AAACJ1234F',
    '33AAACJ1234F1Z5',
    '33AAACJ1234F1Z5',
    'billing@joymanpower.com',
    'Senthil Nathan',
    '+91 98401 23456',
    'UDYAM-TN-02-0012345',
    'CIN-U74999TN2020PTC123456',
    'billing@joymanpower.com',
    '+91 98401 23456',
    'https://joymanpower.com',
    '{"addressLine1":"Plot 42, Tech Park Boulevard","city":"Chennai","state":"Tamil Nadu","pincode":"600119","country":"India"}'::jsonb,
    '{"accountNumber":"921020034567890","bankName":"HDFC Bank","ifscCode":"HDFC0001234","branch":"Anna Salai, Chennai","accountHolderName":"Joy Manpower Services Private Limited","isVerified":true}'::jsonb,
    '{"fullName":"Senthil Nathan","email":"senthil@joymanpower.com","phone":"+91 98401 23456","designation":"Managing Partner"}'::jsonb,
    '{"fullName":"Kavitha R","email":"compliance@joymanpower.com","phone":"+91 98401 23457","designation":"Statutory Compliance Lead"}'::jsonb,
    250,
    'ACTIVE'
  ) ON CONFLICT (id) DO UPDATE
  SET legal_name = EXCLUDED.legal_name,
      vendor_code = EXCLUDED.vendor_code,
      status = 'ACTIVE';

  -- 3. Insert Vendor Relationship
  INSERT INTO public.vendor_relationships (
    id,
    organization_id,
    vendor_id,
    relationship_code,
    category,
    service_type,
    onboarding_status,
    compliance_status,
    contract_status,
    sites_json,
    valid_from,
    valid_to,
    status
  ) VALUES (
    v_rel_id,
    v_org_id,
    v_vendor_id,
    'REL-JOY-2026-001',
    'Contract Manpower',
    'MANPOWER_SUPPLY',
    'ACTIVE',
    'COMPLIANT',
    'ACTIVE',
    '[{"siteId":"SITE-CHE-01","siteName":"Chennai Tech Park Campus","location":"Sholinganallur, Chennai"},{"siteId":"SITE-CBE-02","siteName":"Coimbatore Plant Facility","location":"Saravanampatti, Coimbatore"}]'::jsonb,
    '2026-01-01',
    '2026-12-31',
    'ACTIVE'
  ) ON CONFLICT (id) DO UPDATE
  SET status = 'ACTIVE',
      compliance_status = 'COMPLIANT';

  -- 4. Insert Published Purchase Order
  INSERT INTO public.purchase_orders (
    id,
    organization_id,
    vendor_id,
    relationship_id,
    po_number,
    contract_reference,
    service_period,
    po_date,
    valid_from,
    valid_until,
    currency,
    payment_terms,
    delivery_location,
    cost_center,
    department,
    requesting_manager,
    subtotal_amount,
    discount_amount,
    taxable_amount,
    tax_amount,
    grand_total,
    status,
    notes
  ) VALUES (
    v_po_id,
    v_org_id,
    v_vendor_id,
    v_rel_id,
    'PO-2026-08-001',
    'CON-JOY-CORP-2026-01',
    '2026-08',
    '2026-08-01',
    '2026-08-01',
    '2026-08-31',
    'INR',
    'Net 30',
    'Chennai Tech Park Campus - Unit 4',
    'CC-OPS-FACILITIES',
    'Facilities & Technical Operations',
    'Deepak Sharma (VP Operations)',
    101506.00,
    0.00,
    101506.00,
    18271.08,
    119777.08,
    'SENT_TO_VENDOR',
    'Contractual Manpower Staffing & Statutory Billing for August 2026'
  ) ON CONFLICT (id) DO UPDATE
  SET status = 'SENT_TO_VENDOR',
      subtotal_amount = 101506.00,
      tax_amount = 18271.08,
      grand_total = 119777.08;

  -- 4b. Insert Purchase Order Items
  DELETE FROM public.purchase_order_items WHERE po_id = v_po_id;

  INSERT INTO public.purchase_order_items (
    po_id, description, category, quantity, unit, unit_price, discount_pct, tax_rate_pct, line_total, service_period
  ) VALUES
    (v_po_id, 'Contract Manpower Technical & Support Staff (84.5 days muster base)', 'MANPOWER_SERVICES', 84.50, 'DAYS', 620.00, 0.00, 18.00, 79215.00, '2026-08'),
    (v_po_id, 'Statutory Employer PF Contribution @ 13% on Qualifying Base (₹52,390)', 'STATUTORY_PF', 1.00, 'MONTH', 6811.00, 0.00, 18.00, 6811.00, '2026-08'),
    (v_po_id, 'Statutory Employer ESI Contribution @ 3.25% on Qualifying Base (₹52,390)', 'STATUTORY_ESI', 1.00, 'MONTH', 1703.00, 0.00, 18.00, 1703.00, '2026-08'),
    (v_po_id, 'Contractual Agency Service Charge @ 8% on Gross Contract Wages', 'SERVICE_CHARGE', 1.00, 'MONTH', 6337.00, 0.00, 18.00, 6337.00, '2026-08'),
    (v_po_id, 'Approved Site Room & Logistics Allowance (93 working shifts @ ₹80/shift)', 'ALLOWANCE', 93.00, 'DAYS', 80.00, 0.00, 18.00, 7440.00, '2026-08');

  -- 5. Insert Approved Deployed Workers
  INSERT INTO public.vendor_workers (
    id, vendor_id, organization_id, worker_code, first_name, last_name, full_name, email, phone, designation, department, skill_level, work_location, site_id, contract_reference, daily_wage_rate, monthly_base_salary, overtime_eligible, compliance_status, status
  ) VALUES
    (v_w1, v_vendor_id, v_org_id, 'VNW-001', 'Murugan', 'Perumal', 'Murugan Perumal', 'murugan@joymanpower.com', '+91 98401 99001', 'Senior Electrical Technician', 'Operations', 'Skilled', 'Chennai Tech Park Campus', 'SITE-CHE-01', 'CON-JOY-CORP-2026-01', 650.00, 16900.00, true, 'COMPLIANT', 'ACTIVE'),
    (v_w2, v_vendor_id, v_org_id, 'VNW-002', 'Anand', 'Kumar', 'Anand Kumar', 'anand@joymanpower.com', '+91 98401 99002', 'HVAC Plant Operator', 'Operations', 'Skilled', 'Chennai Tech Park Campus', 'SITE-CHE-01', 'CON-JOY-CORP-2026-01', 620.00, 16120.00, true, 'COMPLIANT', 'ACTIVE'),
    (v_w3, v_vendor_id, v_org_id, 'VNW-003', 'Sangeetha', 'Mani', 'Sangeetha Mani', 'sangeetha@joymanpower.com', '+91 98401 99003', 'Facility Control Specialist', 'Operations', 'Skilled', 'Chennai Tech Park Campus', 'SITE-CHE-01', 'CON-JOY-CORP-2026-01', 620.00, 16120.00, true, 'COMPLIANT', 'ACTIVE'),
    (v_w4, v_vendor_id, v_org_id, 'VNW-004', 'Vignesh', 'Karthik', 'Vignesh Karthik', 'vignesh@joymanpower.com', '+91 98401 99004', 'Electro-Mechanical Technician', 'Operations', 'Skilled', 'Chennai Tech Park Campus', 'SITE-CHE-01', 'CON-JOY-CORP-2026-01', 620.00, 16120.00, true, 'COMPLIANT', 'ACTIVE'),
    (v_w5, v_vendor_id, v_org_id, 'VNW-005', 'Selvam', 'Ramasamy', 'Selvam Ramasamy', 'selvam@joymanpower.com', '+91 98401 99005', 'Preventive Maintenance Lead', 'Operations', 'Skilled', 'Chennai Tech Park Campus', 'SITE-CHE-01', 'CON-JOY-CORP-2026-01', 600.00, 15600.00, true, 'COMPLIANT', 'ACTIVE')
  ON CONFLICT (id) DO UPDATE
  SET status = 'ACTIVE',
      compliance_status = 'COMPLIANT';

  -- 6. Insert Verified Compliance Documents
  INSERT INTO public.vendor_documents (
    vendor_id, relationship_id, document_category, document_type, document_number, period_month, file_name, file_path, file_size, mime_type, issue_date, expiry_date, verification_status, version
  ) VALUES
    (v_vendor_id, v_rel_id, 'COMPLIANCE', 'EPFO_MONTHLY_ECR_CHALLAN', 'EPFO-AUG-2026-9901', '2026-08', 'EPFO_ECR_Challan_August_2026.pdf', 'vendors/240a7f7d/EPFO_ECR_Challan_August_2026.pdf', 312000, 'application/pdf', '2026-08-05', '2027-08-04', 'APPROVED', 1),
    (v_vendor_id, v_rel_id, 'COMPLIANCE', 'ESIC_MONTHLY_CONTRIBUTION_CHALLAN', 'ESIC-AUG-2026-4412', '2026-08', 'ESIC_Challan_August_2026.pdf', 'vendors/240a7f7d/ESIC_Challan_August_2026.pdf', 189000, 'application/pdf', '2026-08-05', '2027-08-04', 'APPROVED', 1),
    (v_vendor_id, v_rel_id, 'CONTRACT', 'MASTER_SERVICE_AGREEMENT', 'MSA-JOY-2026-001', '2026-ANNUAL', 'Executed_Master_Service_Agreement_2026.pdf', 'vendors/240a7f7d/Executed_MSA.pdf', 1420000, 'application/pdf', '2026-01-01', '2026-12-31', 'APPROVED', 1),
    (v_vendor_id, v_rel_id, 'STATUTORY', 'GST_REGISTRATION_CERTIFICATE', '33AAACJ1234F1Z5', '2026-ANNUAL', 'Form_REG_06_GST_Certificate.pdf', 'vendors/240a7f7d/GST_Certificate.pdf', 540000, 'application/pdf', '2024-06-01', '2029-05-31', 'APPROVED', 1)
  ON CONFLICT DO NOTHING;

  -- 7. Insert Attendance Batch
  INSERT INTO public.vendor_attendance_batches (
    id, vendor_id, organization_id, client_site_contract_id, batch_name, period_month, total_records, valid_records, error_records, status, uploaded_by, uploaded_at
  ) VALUES (
    v_batch_id, v_vendor_id::text, v_org_id::text, 'CON-JOY-CORP-2026-01', 'ATT-AUG2026-BATCH-01', '2026-08', 5, 5, 0, 'PROCESSED', 'billing@joymanpower.com', NOW()
  ) ON CONFLICT (id) DO NOTHING;

END $$;

COMMIT;
