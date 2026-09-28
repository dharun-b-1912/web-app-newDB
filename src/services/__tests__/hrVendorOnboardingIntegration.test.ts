import { describe, it, expect, beforeEach } from 'vitest';
import { api } from '../api';
import { onboardingService } from '../onboardingService';
import { VendorWorkforceService } from '../vendor/vendorWorkforceService';
import { VendorInvoiceService } from '../vendor/vendorInvoiceService';

describe('HR-to-Vendor Workforce Integration & Onboarding Persistence Reality', () => {
  const TEST_VENDOR_ID = 'vnd-joy-manpower-01';
  const TEST_VENDOR_NAME = 'Joy Manpower Services Ltd';
  const ORG_ID = '0c621892-e938-4707-9957-13534ea32c19';
  const COMP_ID = 'comp-joy-01';

  beforeEach(() => {
    if (api._empCache) {
      api._empCache = null;
    }
  });

  it('Gate 1: Completes step-by-step onboarding for Vendor Workforce employee without creating duplicates', async () => {
    // Step 1: Identity Creation
    const empCode = `WF-${Math.floor(2000 + Math.random() * 8000)}`;
    const step1Employee = await api.createEmployee({
      organization_id: ORG_ID,
      company_id: COMP_ID,
      first_name: 'Karthik',
      last_name: 'Subramanian',
      work_email: `karthik.${Date.now()}@joycorporate.com`,
      phone: '+919876543322',
      employee_code: empCode,
      status: 'Active',
      employment_type: 'Contract',
      employment_source: 'VENDOR',
      vendor_id: TEST_VENDOR_ID,
      vendor_name: TEST_VENDOR_NAME,
    });

    expect(step1Employee).toBeDefined();
    expect(step1Employee.id).toBeDefined();
    const employeeId = step1Employee.id;

    // Step 2: Contact & Address
    const step2Saved = await api.saveEmployeeOnboardingStep(employeeId, ORG_ID, 2, {
      personal_email: 'karthik.sub@gmail.com',
      current_line1: '45, Trichy Road',
      current_city: 'Coimbatore',
      current_state: 'Tamil Nadu',
      current_country: 'India',
      current_postal: '641018',
      same_as_permanent: true,
    });
    expect(step2Saved.profile?.current_address?.city).toBe('Coimbatore');
    expect(step2Saved.profile?.same_as_permanent).toBe(true);

    // Step 3: Employment, Vendor Assignment & Rate
    const step3Saved = await api.saveEmployeeOnboardingStep(employeeId, ORG_ID, 3, {
      doj: '2026-05-01',
      employment_type: 'Contract',
      employment_source: 'VENDOR',
      vendor_id: TEST_VENDOR_ID,
      vendor_name: TEST_VENDOR_NAME,
      vendor_employee_code: `VND-EMP-${Math.floor(100 + Math.random() * 900)}`,
      vendor_contract_id: 'cnt-joy-mp-2026',
      site_id: 'site-joy-che-01',
      department_id: 'dept-ops',
      department_name: 'Facility Operations',
      designation_id: 'desig-tech',
      designation_title: 'HVAC Technician',
      annual_ctc: 360000,
      monthly_ctc: 30000,
      work_mode: 'On-site',
      pf_applicable: true,
      esi_applicable: true,
    });
    expect(step3Saved.employment?.vendor_id).toBe(TEST_VENDOR_ID);
    expect(step3Saved.employment?.vendor_name).toBe(TEST_VENDOR_NAME);
    expect(step3Saved.employment?.designation_title).toBe('HVAC Technician');

    // Step 5: Bank & Statutory Details
    const step5Saved = await api.saveEmployeeOnboardingStep(employeeId, ORG_ID, 5, {
      emergency_name: 'Meena Subramanian',
      emergency_relation: 'Spouse',
      emergency_phone: '+919876541111',
      bank_name: 'State Bank of India',
      account_number: '30491029384',
      ifsc: 'SBIN0001234',
      pan: 'ABCDE9876K',
      uan: '100889977665',
      tax_regime: 'NEW',
    });
    expect((step5Saved.profile as any)?.bank_account?.account_number).toBe('30491029384');
    expect((step5Saved.profile as any)?.statutory?.pan).toBe('ABCDE9876K');

    // Step 7: Final Submission via finalizeOnboarding
    const finalResult = await onboardingService.finalizeOnboarding({
      id: employeeId,
      organization_id: ORG_ID,
      company_id: COMP_ID,
      identity: {
        id: employeeId,
        employee_code: empCode,
        first_name: 'Karthik',
        last_name: 'Subramanian',
        work_email: step1Employee.work_email,
        phone: '+919876543322',
      },
      employment: {
        employment_type: 'Contract',
        employment_source: 'VENDOR',
        vendor_id: TEST_VENDOR_ID,
        vendor_name: TEST_VENDOR_NAME,
        department_name: 'Facility Operations',
        designation_title: 'HVAC Technician',
        doj: '2026-05-01',
      },
      compensation: {
        annual_ctc: 360000,
      },
      statutory: {
        pan: 'ABCDE9876K',
      },
    });

    expect(finalResult.success).toBe(true);
    expect(finalResult.employee_id).toBe(employeeId);

    // Verify employee record exists and is unique (no duplicate ID or code)
    const allEmployees = await api.getEmployees();
    const matchingEmployees = allEmployees.filter((e) => e.id === employeeId || e.employee_code === empCode);
    expect(matchingEmployees.length).toBe(1);
    expect(matchingEmployees[0].employment_source).toBe('VENDOR');
    expect(matchingEmployees[0].vendor_id).toBe(TEST_VENDOR_ID);
  }, 45000);

  it('Gate 2: Vendor Portal automatically reflects assigned employee in Workforce Directory', async () => {
    const workers = await VendorWorkforceService.getVendorWorkers(TEST_VENDOR_ID);
    expect(workers).toBeDefined();
    expect(workers.length).toBeGreaterThan(0);

    const karthikWorker = workers.find((w) => w.fullName.includes('Karthik') || w.designation.includes('HVAC'));
    expect(karthikWorker).toBeDefined();
    expect(karthikWorker?.status).toBe('ACTIVE');
    expect(karthikWorker?.complianceStatus).toBe('COMPLIANT');
  });

  it('Gate 3: Vendor prepares and submits invoice; HR review queue receives it with 3-Way Match capability', async () => {
    const invNumber = `INV-JOY-${Date.now().toString(36).toUpperCase()}`;

    // 1. Vendor prepares and submits invoice
    const createRes = await VendorInvoiceService.createInvoice({
      vendorId: TEST_VENDOR_ID,
      organizationId: ORG_ID,
      poId: 'po-manpower-2026-001',
      invoiceNumber: invNumber,
      billingPeriod: '2026-05',
      items: [
        {
          description: 'HVAC & Facility Maintenance Deployment - May 2026',
          workforceCount: 1,
          ratePerUnit: 30000,
          serviceChargePct: 10,
          taxRatePct: 18,
        },
      ],
    });

    expect(createRes.success).toBe(true);
    expect(createRes.invoice).toBeDefined();
    expect(createRes.invoice?.approvalStatus).toBe('SUBMITTED');

    // 2. Company HR lists invoices and verifies the submitted invoice is present
    const hrListRes = await VendorInvoiceService.listInvoices({
      organizationId: ORG_ID,
      status: 'ALL',
    });

    expect(hrListRes.success).toBe(true);
    const submittedInv = hrListRes.invoices.find((i) => i.invoiceNumber === invNumber);
    expect(submittedInv).toBeDefined();
    expect(submittedInv?.approvalStatus).toBe('SUBMITTED');
    expect(submittedInv?.totalAmount).toBe(38940);

    // 3. HR performs review decision (Approval / Verification)
    const reviewRes = await VendorInvoiceService.reviewInvoice(submittedInv!.id, {
      decision: 'APPROVE',
      reviewerRemarks: 'Attendance and rate verified against contract PO.',
      reviewerId: 'usr-hr-admin-01',
    });

    expect(reviewRes.success).toBe(true);
    expect(reviewRes.invoice?.approvalStatus).toBe('APPROVED');
  });
});
