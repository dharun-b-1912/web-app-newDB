import { describe, it, expect, beforeEach } from 'vitest';
import { api } from '../api';
import { payrollCalculationEngine } from '../payroll/payrollCalculationEngine';
import { payrollApi } from '../payrollApi';

describe('Onboarding Relational Persistence & Statutory Engine Synchronization', () => {
  const TEST_EMP_ID = 'c1111111-2222-4333-8444-555555555555';
  const ORG_ID = '0c621892-e938-4707-9957-13534ea32c19';

  beforeEach(() => {
    // Reset cache if needed
    if (api._empCache) {
      api._empCache = null;
    }
  });

  it('verifies that getEmployeeById loads and normalizes employee record', async () => {
    // Create base test employee
    const baseEmp = await api.createEmployee({
      id: TEST_EMP_ID,
      organization_id: ORG_ID,
      employee_code: 'TEST-9901',
      first_name: 'Aditya',
      last_name: 'Verma',
      work_email: 'aditya.verma@joycorporate.com',
      phone: '+919876543210',
      status: 'Active',
      employment_type: 'Full Time',
    });

    expect(baseEmp).toBeDefined();
    expect(baseEmp.id).toBe(TEST_EMP_ID);

    const hydrated = await api.getEmployeeById(TEST_EMP_ID);
    expect(hydrated).toBeDefined();
    expect(hydrated?.first_name).toBe('Aditya');
    expect(hydrated?.work_email).toBe('aditya.verma@joycorporate.com');
  }, 15000);

  it('verifies saveEmployeeOnboardingStep persists Step 1 (Identity)', async () => {
    const step1Payload = {
      first_name: 'Aditya',
      middle_name: 'Kumar',
      last_name: 'Verma',
      preferred_name: 'Aditya V',
      work_email: 'aditya.k.verma@joycorporate.com',
      phone: '+919876543210',
      dob: '1995-08-15',
      gender: 'Male',
      employee_code: 'TEST-9901',
    };

    const saved = await api.saveEmployeeOnboardingStep(TEST_EMP_ID, ORG_ID, 1, step1Payload);
    expect(saved).toBeDefined();
    expect(saved.middle_name).toBe('Kumar');
    expect(saved.work_email).toBe('aditya.k.verma@joycorporate.com');
    expect(saved.profile?.date_of_birth).toBe('1995-08-15');
  }, 15000);

  it('verifies saveEmployeeOnboardingStep persists Step 2 (Contact & Address)', async () => {
    const step2Payload = {
      personal_email: 'aditya.personal@gmail.com',
      alternate_phone: '+919876500000',
      marital_status: 'Married',
      nationality: 'Indian',
      blood_group: 'B+',
      preferred_language: 'Tamil',
      current_line1: '124, Cross Cut Road',
      current_line2: 'Gandhipuram',
      current_city: 'Coimbatore',
      current_state: 'Tamil Nadu',
      current_country: 'India',
      current_postal: '641012',
      same_as_permanent: true,
    };

    const saved = await api.saveEmployeeOnboardingStep(TEST_EMP_ID, ORG_ID, 2, step2Payload);
    expect(saved).toBeDefined();
    expect(saved.profile?.personal_email).toBe('aditya.personal@gmail.com');
    expect(saved.profile?.blood_group).toBe('B+');
    expect(saved.profile?.current_address?.city).toBe('Coimbatore');
    expect(saved.profile?.permanent_address?.line1).toBe('124, Cross Cut Road');
    expect(saved.profile?.same_as_permanent).toBe(true);
  }, 15000);

  it('verifies saveEmployeeOnboardingStep persists Step 3 (Employment & CTC Structure)', async () => {
    const step3Payload = {
      doj: '2026-04-01',
      employment_type: 'Full Time',
      employment_source: 'DIRECT',
      status: 'Active',
      department_id: 'dept-eng',
      department_name: 'Engineering',
      designation_id: 'desig-se',
      designation_title: 'Senior Software Engineer',
      annual_ctc: 1200000,
      monthly_ctc: 100000,
      compensation_basis: 'CTC_INCLUSIVE',
      salary_structure_code: 'CORP_STD_01',
      pf_applicable: true,
      esi_applicable: false,
      pt_applicable: true,
    };

    const saved = await api.saveEmployeeOnboardingStep(TEST_EMP_ID, ORG_ID, 3, step3Payload);
    expect(saved).toBeDefined();
    expect(saved.employment?.employment_type).toBe('Full Time');
    expect(saved.employment?.annual_ctc).toBe(1200000);
    expect((saved.employment as any)?.compensation_basis).toBe('CTC_INCLUSIVE');
  }, 15000);

  it('verifies saveEmployeeOnboardingStep persists Step 5 (Emergency, Bank & Statutory)', async () => {
    const step5Payload = {
      emergency_name: 'Deepa Verma',
      emergency_relation: 'Spouse',
      emergency_phone: '+919876599999',
      emergency_email: 'deepa@gmail.com',
      bank_name: 'HDFC Bank',
      account_number: '50100234567890',
      ifsc: 'HDFC0001234',
      account_holder_name: 'Aditya Kumar Verma',
      account_type: 'SALARY',
      pan: 'ABCDE1234F',
      uan: '100998877665',
      pf_number: 'TN/CBE/12345/001',
      esi_number: '31000987654321',
      tax_regime: 'NEW',
    };

    const saved = await api.saveEmployeeOnboardingStep(TEST_EMP_ID, ORG_ID, 5, step5Payload);
    expect(saved).toBeDefined();
    expect(saved.profile?.emergency_contacts?.[0]?.name).toBe('Deepa Verma');
    expect(saved.profile?.emergency_contact_phone).toBe('+919876599999');
    expect((saved.profile as any)?.bank_account?.account_number).toBe('50100234567890');
    expect((saved.profile as any)?.statutory?.pan).toBe('ABCDE1234F');
  }, 15000);

  it('verifies Step 3 live calculation engine matches /payroll-statutory for ₹15,000 CTC', () => {
    const statutoryConfig = payrollApi.getStatutoryConfig();

    // In CTC_INCLUSIVE mode:
    const breakdownInclusive = payrollCalculationEngine.calculateCtcBreakdown({
      annualCtc: 180000,
      monthlyCtc: 15000,
      structureCode: 'CORP_STD_01',
      compensationBasis: 'CTC_INCLUSIVE',
      pfApplicable: true,
      esiApplicable: true,
      ptApplicable: true,
      statutoryConfig,
    });

    // Invariant checks
    expect(breakdownInclusive.netMonthlyPay).toBeLessThanOrEqual(breakdownInclusive.monthlyGrossEarnings);
    expect(breakdownInclusive.monthlyGrossEarnings).toBeLessThanOrEqual(15000);
    // Since gross <= 21,000, ESIC must be active
    expect(breakdownInclusive.esicEmployee).toBeGreaterThan(0);
    expect(breakdownInclusive.esicEmployer).toBeGreaterThan(0);
    // EPF must be active
    expect(breakdownInclusive.epfEmployee).toBeGreaterThan(0);
    expect(breakdownInclusive.epfEmployer).toBeGreaterThan(0);

    // In GROSS_BASED mode:
    const breakdownGrossBased = payrollCalculationEngine.calculateCtcBreakdown({
      annualCtc: 180000,
      monthlyCtc: 15000,
      structureCode: 'CORP_STD_01',
      compensationBasis: 'GROSS_BASED',
      pfApplicable: true,
      esiApplicable: true,
      ptApplicable: true,
      statutoryConfig,
    });

    expect(breakdownGrossBased.monthlyGrossEarnings).toBe(15000);
    expect(breakdownGrossBased.monthlyCtc).toBeGreaterThan(15000);
    expect(breakdownGrossBased.netMonthlyPay).toBeLessThanOrEqual(15000);
  });

  it('verifies Vendor Workforce multi-step onboarding persists vendor, client, site, and contract mapping', async () => {
    const { VendorWorkforceService } = await import('../vendor/vendorWorkforceService');
    const VENDOR_EMP_ID = 'e7777777-8888-4999-b111-222222222222';
    const TEST_VENDOR_ID = 'VND-MANPOWER-ALPHA';
    const TEST_CLIENT_ID = 'comp-client-chennai';
    const TEST_SITE_ID = 'site-plant-1';
    const TEST_CONTRACT_ID = 'CTR-2026-CHE-01';

    // 1. Initial Step 1 (Identity)
    await api.createEmployee({
      id: VENDOR_EMP_ID,
      organization_id: ORG_ID,
      employee_code: 'VEMP-7701',
      first_name: 'Murugan',
      last_name: 'Kandasamy',
      work_email: 'murugan.k@manpoweralpha.com',
      phone: '+919876512345',
      status: 'Active',
      employment_type: 'Full Time',
      employment_source: 'VENDOR',
    });

    // 2. Step 3 (Employment & Vendor Workforce Allocation)
    const step3VendorPayload = {
      doj: '2026-05-01',
      employment_type: 'Full Time',
      employment_source: 'VENDOR',
      vendor_id: TEST_VENDOR_ID,
      vendor_name: 'Alpha Manpower Solutions Pvt Ltd',
      vendor_employee_code: 'ALPHA-WRK-109',
      vendor_contract_id: TEST_CONTRACT_ID,
      client_company_id: TEST_CLIENT_ID,
      site_id: TEST_SITE_ID,
      department_id: 'dept-ops',
      department_name: 'Operations & Maintenance',
      designation_id: 'desig-tech',
      designation_title: 'Senior Electro-Mechanical Technician',
      annual_ctc: 360000,
      monthly_ctc: 30000,
      compensation_basis: 'CTC_INCLUSIVE',
      salary_structure_code: 'CORP_STD_01',
      pf_applicable: true,
      esi_applicable: true,
      pt_applicable: true,
    };

    const savedStep3 = await api.saveEmployeeOnboardingStep(VENDOR_EMP_ID, ORG_ID, 3, step3VendorPayload);
    expect(savedStep3).toBeDefined();
    expect(savedStep3.employment_source).toBe('VENDOR');
    expect(savedStep3.vendor_id).toBe(TEST_VENDOR_ID);
    expect(savedStep3.client_company_id).toBe(TEST_CLIENT_ID);
    expect(savedStep3.site_id).toBe(TEST_SITE_ID);
    expect(savedStep3.employment?.vendor_contract_id).toBe(TEST_CONTRACT_ID);

    // 3. Step 4 (Organization & Reporting Hierarchy)
    const step4Payload = {
      reporting_manager_id: 'mgr-ramesh-99',
      reporting_manager_name: 'Ramesh Sundaram (Operations Lead)',
      team_lead_name: 'Suresh Kumar (Line Supervisor)',
      business_unit: 'Plant Assembly',
      cost_center: 'CC-MFG-01',
    };

    const savedStep4 = await api.saveEmployeeOnboardingStep(VENDOR_EMP_ID, ORG_ID, 4, step4Payload);
    expect(savedStep4.employment?.reporting_manager_name).toBe('Ramesh Sundaram (Operations Lead)');
    expect(savedStep4.employment?.team_lead_name).toBe('Suresh Kumar (Line Supervisor)');

    // 4. Verify Vendor Portal immediately discovers worker in getVendorWorkers
    const vendorWorkers = await VendorWorkforceService.getVendorWorkers(TEST_VENDOR_ID);
    const matchedWorker = vendorWorkers.find(
      (w) => w.employeeId === VENDOR_EMP_ID || w.workerCode === 'ALPHA-WRK-109'
    );

    expect(matchedWorker).toBeDefined();
    expect(matchedWorker?.fullName).toBe('Murugan Kandasamy');
    expect(matchedWorker?.siteId).toBe(TEST_SITE_ID);
    expect(matchedWorker?.contractReference).toBe(TEST_CONTRACT_ID);
  }, 25000);
});
