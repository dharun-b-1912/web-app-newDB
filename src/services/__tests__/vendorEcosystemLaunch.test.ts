// ============================================================================
// JOY PeopleHR — SaaS Launch-Critical Verification Suite: Vendor Ecosystem Authority
// Focus: Vendor Desk, External Vendor Portal, CLRA Form V, 3-Way Matching,
//        Multi-Company Isolation & End-to-End Persona Validation
// ============================================================================

import { vendorService } from '../vendorService';
import { vendorPortalService } from '../vendorPortalService';
import { hrEventBus } from '../hrEventBus';
import { organizationContextService } from '../organizationContextService';
import { getPrimaryRole, ROLE_PROFILES } from '../../lib/rbac/permissionEngine';
import { User, Vendor, VendorContract } from '../../types';

// Polyfill localStorage in Node test environment if not present
if (typeof globalThis.localStorage === 'undefined') {
  const store: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach((k) => delete store[k]);
    },
    key: (index: number) => Object.keys(store)[index] || null,
    get length() {
      return Object.keys(store).length;
    },
  };
}

export interface TestResultItem {
  testNumber: number;
  testName: string;
  passed: boolean;
  details: string;
}

export interface VendorLaunchSuiteResult {
  passed: boolean;
  passCount: number;
  totalCount: number;
  errors: string[];
  results: TestResultItem[];
}

export async function runVendorEcosystemLaunchTests(): Promise<VendorLaunchSuiteResult> {
  console.log('\n============================================================');
  console.log('  SAAS LAUNCH TRACK: VENDOR ECOSYSTEM & ADMIN GOVERNANCE SUITE');
  console.log('============================================================');

  const results: TestResultItem[] = [];
  const errors: string[] = [];
  const MOCK_TENANT_ID = 'org-joy-01';
  const MOCK_COMPANY_ID = 'comp-joy-01';

  const record = (num: number, name: string, condition: boolean, details: string) => {
    results.push({ testNumber: num, testName: name, passed: condition, details });
    if (condition) {
      console.log(`  ✅ [PASS] Test ${num}: ${name} — ${details}`);
    } else {
      console.error(`  ❌ [FAIL] Test ${num}: ${name} — ${details}`);
      errors.push(`Test ${num} (${name}): ${details}`);
    }
  };

  try {
    // ─── TEST 1: Vendor Onboarding & Auto-Generated Code ─────────────────────
    let eventReceived = false;
    const unsub = hrEventBus.subscribe('vendor.created', () => {
      eventReceived = true;
    });

    const newVendor = await vendorService.createVendor({
      organization_id: MOCK_TENANT_ID,
      legal_entity_id: MOCK_COMPANY_ID,
      legal_name: 'Stallion Industrial Workforce Pvt Ltd',
      vendor_type: 'MANPOWER_PROVIDER',
      status: 'PENDING_VERIFICATION',
      primary_contact_name: 'Vikram Seth',
      primary_contact_email: 'vikram@stallionforce.in',
      primary_contact_phone: '+91 99887 76655',
      tax_id: '33AABCS8899K1Z4',
      pan: 'AABCS8899K',
      gstin: '33AABCS8899K1Z4',
      bank_name: 'HDFC Bank',
      account_number_masked: '•••• •••• 9922',
      ifsc_code: 'HDFC0004321',
      manpower_license_no: 'TN-CBE-CLA-2026-9901',
    });

    unsub();

    const t1Passed = !!newVendor.id && /^VEN-\d{6}$/.test(newVendor.vendor_code) && eventReceived;
    record(
      1,
      'Vendor Onboarding & Code Generation',
      t1Passed,
      `Generated ${newVendor.vendor_code} with vendor.created event dispatch`
    );

    // ─── TEST 2: Contract Creation with Rate Cards & SLA ─────────────────────
    const initialCheck = await vendorService.validateActivationEligibility(newVendor.id);

    const contract = await vendorService.createVendorContract(newVendor.id, {
      contract_number: 'MSA-2026-STALLION-01',
      contract_type: 'Master Service Agreement (MSA)',
      start_date: '2026-09-01',
      end_date: '2027-08-31',
      service_charge_percentage: 8.5,
      rate_card_type: 'Per Head Per Month',
      status: 'ACTIVE',
    });

    const postCheck = await vendorService.validateActivationEligibility(newVendor.id);
    const activeVendor = await vendorService.updateVendorStatus(newVendor.id, 'ACTIVE');

    const t2Passed = postCheck.eligible && activeVendor.status === 'ACTIVE' && contract.service_charge_percentage === 8.5;
    record(
      2,
      'Contract SLA & Activation Verification',
      t2Passed,
      `Service charge 8.5% configured, contract active, status shifted to ACTIVE`
    );

    // ─── TEST 3: Principal Employer Form V Certificate Issuance ───────────────
    const formV = vendorPortalService.issuePrincipalEmployerFormV({
      vendor_id: newVendor.id,
      nature_of_work: 'Precision CNC Machining & Quality Inspection',
      max_workers: 100,
      duration_from: '2026-09-01',
      duration_to: '2027-08-31',
      site_location: 'Coimbatore Plant 1 & 2',
      issued_by_name: 'Senthil Nathan',
      issued_by_designation: 'Head of Human Resources & Labour Compliance',
    });

    const formVs = vendorPortalService.getPrincipalEmployerFormVs(newVendor.id);
    const t3Passed = !!formV.id && formV.certificate_number.includes('FORM-V') && formVs.some((f) => f.id === formV.id);
    record(
      3,
      'Principal Employer Form V Issuance',
      t3Passed,
      `Issued ${formV.certificate_number} for 100 workers under CLRA compliance`
    );

    // ─── TEST 4: Contractor Worker Deployment ────────────────────────────────
    const deployment = vendorPortalService.assignWorkerDeployment({
      worker_id: 'w-stallion-101',
      vendor_id: newVendor.id,
      company_id: MOCK_COMPANY_ID,
      company_name: 'Joy Corporate Solutions Pvt Ltd',
      site_name: 'Coimbatore Plant 1',
      department_name: 'Production & Assembly',
      designation: 'Senior CNC Operator',
      daily_wage_rate: 850,
      start_date: '2026-09-01',
    });

    const deployments = vendorPortalService.getDeployments(newVendor.id);
    const t4Passed = !!deployment.id && deployment.status === 'ACTIVE' && deployments.some((d) => d.id === deployment.id);
    record(
      4,
      'Contractor Worker Deployment to Site',
      t4Passed,
      `Deployed worker to Coimbatore Plant 1 at ₹850 daily wage rate`
    );

    // ─── TEST 5: 3-Way Match Reconciler ──────────────────────────────────────
    const matchResult = vendorPortalService.runThreeWayMatch({
      vendor_id: 'vnd-apex-01',
      company_id: MOCK_COMPANY_ID,
      period: '2026-08',
      po_number: 'PO-2026-08-001',
      claimed_amount: 150000,
    });

    const t5Passed = !!matchResult.invoice_number && matchResult.period === '2026-08' && matchResult.is_po_limit_sufficient && !!matchResult.match_status;
    record(
      5,
      '3-Way Match Reconciler (PO + Attendance + Invoice)',
      t5Passed,
      `Match status: ${matchResult.match_status}, PO balance verified`
    );

    // ─── TEST 6: Invoice Submission & Company Admin Verification ─────────────
    const invoiceSubmission = vendorPortalService.submitInvoice({
      vendor_id: newVendor.id,
      invoice_number: 'INV-STL-2026-09-01',
      total_amount: 125000,
      file_name: 'Tax_Invoice_Sept_2026.pdf',
      period: '2026-08',
      po_number: 'PO-2026-08-001',
    });

    vendorPortalService.verifyInvoice(invoiceSubmission.invoice.id, {
      verified_by: 'Finance Controller',
      verified_amount: 125000,
    });

    vendorPortalService.approveInvoice(invoiceSubmission.invoice.id, {
      approved_by: 'Dharun Joy (Company Admin)',
    });

    const invoices = vendorPortalService.getInvoices(newVendor.id);
    const approvedInv = invoices.find((i) => i.id === invoiceSubmission.invoice.id);
    const t6Passed = approvedInv?.status === 'APPROVED';
    record(
      6,
      'Vendor Invoice Submission & Multi-Stage Approval',
      t6Passed,
      `Invoice ${invoiceSubmission.invoice.invoice_number} approved by Company Admin`
    );

    // ─── TEST 7: Payment Disbursement & Returned Payment Resolution ──────────
    const payment = await vendorService.recordPayment({
      vendor_id: newVendor.id,
      invoice_reference: 'INV-STL-2026-09-01',
      invoice_number: 'INV-STL-2026-09-01',
      amount: 125000,
      currency: 'INR',
      payment_date: '2026-09-05',
      payment_method: 'NEFT',
      status: 'PROCESSING',
    });

    const returned = await vendorService.markPaymentReturned(
      payment.id,
      'IFSC_DISCREPANCY',
      'Branch IFSC updated',
      'UTR-FAIL-991'
    );

    const resolved = await vendorService.resolveReturnedPayment(
      payment.id,
      'Updated IFSC confirmed with branch bank statement. Re-disbursed via RTGS.'
    );

    const t7Passed = returned.status === 'RETURNED' && resolved.status === 'PAID' && resolved.resolution_notes?.includes('Updated IFSC');
    record(
      7,
      'Payment Disbursement & Return Resolution Lifecycle',
      t7Passed,
      `Recorded disbursement, handled bank return, and re-disbursed with audit trail`
    );

    // ─── TEST 8: Multi-Company Boundary & Organization Admin Governance ──────
    const orgAdminUser: User = {
      id: 'usr-org-admin-01',
      name: 'Group Executive',
      email: 'exec@joypeoplehr.com',
      role: 'Organization Admin',
      primaryRole: 'Organization Admin',
      organization_id: MOCK_TENANT_ID,
    } as any;

    const vendorAdminUser: User = {
      id: 'usr-vendor-admin-01',
      name: 'Stallion Portal Lead',
      email: 'vendor@stallionforce.in',
      role: 'Vendor Admin',
      primaryRole: 'Vendor Admin',
      organization_id: MOCK_TENANT_ID,
    } as any;

    const orgRole = getPrimaryRole(orgAdminUser);
    const vendorRole = getPrimaryRole(vendorAdminUser);
    const orgTitle = organizationContextService.formatCleanRoleTitle('Organization Admin');
    const vendorTitle = organizationContextService.formatCleanRoleTitle('Vendor Admin');
    const orgScope = ROLE_PROFILES['Organization Admin'].defaultScope;
    const vendorScope = ROLE_PROFILES['Vendor Admin'];
    const allowedModules = vendorScope.allowedModules as unknown as string[];

    const t8Passed =
      orgRole === 'Organization Admin' &&
      vendorRole === 'Vendor Admin' &&
      orgTitle === 'Organization Admin (Tenant)' &&
      vendorTitle === 'Vendor Operations Admin (Partner)' &&
      orgScope === 'ORGANIZATION' &&
      allowedModules.includes('vendor') &&
      !allowedModules.includes('payroll');

    record(
      8,
      'Organization Admin vs Vendor Admin Multi-Company Governance',
      t8Passed,
      `Strict tenant scoping & bounded vendor permissions confirmed`
    );
  } catch (err: any) {
    errors.push(`Unexpected error: ${err?.message || err}`);
  }

  const passCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  const passed = errors.length === 0 && passCount === totalCount;

  return {
    passed,
    passCount,
    totalCount,
    errors,
    results,
  };
}
