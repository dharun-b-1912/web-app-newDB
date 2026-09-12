// src/services/__tests__/tenantAdministrativeSetupGate12_5.test.ts
// ============================================================================
// JOY PEOPLEHR — GATE 12.5: TENANT ONBOARDING & ADMINISTRATIVE SETUP AUTHORITY
// Master Verification of Multi-Company Provisioning, Setup Wizard & Admin Scoping
// ============================================================================

import { TenantAdministrativeSetupService } from '../platform/tenantAdministrativeSetupService';

interface TestResult {
  testNumber: number;
  description: string;
  category: string;
  passed: boolean;
  message: string;
}

const results: TestResult[] = [];

function record(testNumber: number, description: string, category: string, condition: boolean, message: string) {
  results.push({
    testNumber,
    description,
    category,
    passed: condition,
    message: condition ? message : `FAILED: ${message}`,
  });
}

export async function runTenantAdministrativeSetupGate12_5(): Promise<{ passed: number; failed: number; total: number }> {
  console.log('\n============================================================');
  console.log('  GATE 12.5: TENANT ONBOARDING & ADMINISTRATIVE SETUP AUTHORITY');
  console.log('============================================================\n');

  TenantAdministrativeSetupService.resetStores();

  // Test 1: Organization Creation with Subscription Tiers
  const orgResult = TenantAdministrativeSetupService.provisionOrganization({
    orgName: 'Titan Industrial Holdings',
    orgCode: 'TITAN-GRP',
    planTier: 'Enterprise',
    primaryAdminEmail: 'director@titanholdings.com',
    primaryAdminName: 'Vikramaditya Rao',
  });

  record(
    1,
    'Gate 12.5.1: Platform Super Admin Organization Provisioning',
    'ORG_PROVISIONING',
    orgResult.organization.id === 'org-titan-grp' &&
      orgResult.subscription.planTier === 'Enterprise' &&
      orgResult.subscription.maxCompanies === 100,
    'Successfully provisioned Titan Industrial Holdings on Enterprise plan with 100 company capacity.'
  );

  // Test 2: Legal Entity Creation (Company A — Chennai Manufacturing)
  const compA = TenantAdministrativeSetupService.provisionCompanyEntity({
    organizationId: orgResult.organization.id,
    companyName: 'Titan Heavy Industries Pvt Ltd',
    companyCode: 'TITAN-CHN',
    legalEntityName: 'Titan Heavy Industries Chennai Private Limited',
    cin: 'U29100TN2020PTC139821',
    pan: 'AABCT1234F',
    gstin: '33AABCT1234F1Z1',
    state: 'Tamil Nadu',
    city: 'Chennai',
    assignedAdminEmail: 'admin.chn@titanholdings.com',
    assignedHrHeadEmail: 'hrhead.chn@titanholdings.com',
  });

  record(
    2,
    'Gate 12.5.2: Multi-Company Legal Entity Provisioning (Entity A)',
    'COMPANY_PROVISIONING',
    compA.company.id === 'comp-titan-chn' &&
      compA.wizardState.completedStepsCount === 1 &&
      compA.wizardState.isSetupComplete === false,
    'Provisioned Titan Heavy Industries Chennai with initial setup wizard pending (1/8 completed).'
  );

  // Test 3: Sibling Legal Entity Creation (Company B — Coimbatore Precision)
  const compB = TenantAdministrativeSetupService.provisionCompanyEntity({
    organizationId: orgResult.organization.id,
    companyName: 'Titan Precision Tools Pvt Ltd',
    companyCode: 'TITAN-CBE',
    legalEntityName: 'Titan Precision Tools Coimbatore Private Limited',
    pan: 'AABCT5678G',
    gstin: '33AABCT5678G1Z2',
    state: 'Tamil Nadu',
    city: 'Coimbatore',
    assignedAdminEmail: 'admin.cbe@titanholdings.com',
  });

  record(
    3,
    'Gate 12.5.3: Sibling Legal Entity Generation (Entity B)',
    'COMPANY_PROVISIONING',
    compB.company.id === 'comp-titan-cbe' &&
      compB.company.id !== compA.company.id,
    'Provisioned sibling legal entity Titan Precision Tools Coimbatore under same organization.'
  );

  // Test 4: Duplicate Company Code Protection
  let duplicateRejected = false;
  try {
    TenantAdministrativeSetupService.provisionCompanyEntity({
      organizationId: orgResult.organization.id,
      companyName: 'Titan Duplicate Entity',
      companyCode: 'TITAN-CHN', // duplicate
      legalEntityName: 'Duplicate Entity',
      pan: 'AABCT9999K',
      gstin: '33AABCT9999K1Z9',
      state: 'Tamil Nadu',
      city: 'Chennai',
    });
  } catch (err: any) {
    duplicateRejected = err.message.includes('already exists in this organization');
  }

  record(
    4,
    'Gate 12.5.4: Duplicate Company Entity Code Barrier',
    'GOVERNANCE_GUARD',
    duplicateRejected,
    'Duplicate company code TITAN-CHN was strictly rejected within the same organization.'
  );

  // Test 5: Incomplete Setup Warning & Onboarding Blocker
  const initialOnboardingCheck = TenantAdministrativeSetupService.isReadyForEmployeeOnboarding(compA.company.id);
  record(
    5,
    'Gate 12.5.5: Incomplete Setup Blocker & Missing Configuration Warnings',
    'SETUP_WIZARD',
    initialOnboardingCheck.ready === false &&
      initialOnboardingCheck.missingConfigurations.length === 7,
    `Onboarding blocker correctly identified ${initialOnboardingCheck.missingConfigurations.length} missing configuration areas.`
  );

  // Test 6: Setup Wizard Step Progress & Completion
  TenantAdministrativeSetupService.updateSetupWizardStep(compA.company.id, 'isLocationsConfigured', true);
  TenantAdministrativeSetupService.updateSetupWizardStep(compA.company.id, 'isDepartmentsConfigured', true);
  TenantAdministrativeSetupService.updateSetupWizardStep(compA.company.id, 'isDesignationsConfigured', true);
  TenantAdministrativeSetupService.updateSetupWizardStep(compA.company.id, 'isShiftsConfigured', true);
  TenantAdministrativeSetupService.updateSetupWizardStep(compA.company.id, 'isHolidaysConfigured', true);
  TenantAdministrativeSetupService.updateSetupWizardStep(compA.company.id, 'isLeavePoliciesConfigured', true);
  const completedWizard = TenantAdministrativeSetupService.updateSetupWizardStep(compA.company.id, 'isPayrollConfigured', true);

  const postWizardCheck = TenantAdministrativeSetupService.isReadyForEmployeeOnboarding(compA.company.id);

  record(
    6,
    'Gate 12.5.6: Company Setup Wizard 8-Stage Execution & Verification',
    'SETUP_WIZARD',
    completedWizard.isSetupComplete === true &&
      completedWizard.completedStepsCount === 8 &&
      postWizardCheck.ready === true &&
      postWizardCheck.missingConfigurations.length === 0,
    'All 8 setup wizard steps configured; company status transitioned to ACTIVE and ready for employee onboarding.'
  );

  // Test 7: Multi-Company Context Switching — Org Admin Authority
  const orgAdminSwitchCheck = TenantAdministrativeSetupService.authorizeCompanySwitch(
    orgResult.organization.id,
    compB.company.id,
    'ORGANIZATION_ADMIN'
  );

  record(
    7,
    'Gate 12.5.7: Organization Admin Cross-Company Switching Authority',
    'TENANT_SCOPING',
    orgAdminSwitchCheck.authorized === true,
    'Organization Admin granted global multi-entity switching authority across sibling companies.'
  );

  // Test 8: Company Admin Sibling Boundary Rejection
  const companyAdminIllegalSwitch = TenantAdministrativeSetupService.authorizeCompanySwitch(
    orgResult.organization.id,
    compB.company.id,
    'COMPANY_ADMIN',
    compA.company.id // user belongs only to Company A
  );

  record(
    8,
    'Gate 12.5.8: Company Admin Sibling Company Isolation Guard',
    'TENANT_SCOPING',
    companyAdminIllegalSwitch.authorized === false,
    'Company A Admin strictly prohibited from switching to or accessing Company B.'
  );

  // Test 9: Cross-Tenant Organization Switch Barrier
  const crossOrgAttempt = TenantAdministrativeSetupService.authorizeCompanySwitch(
    'org-foreign-intruder',
    compA.company.id,
    'ORGANIZATION_ADMIN'
  );

  record(
    9,
    'Gate 12.5.9: Foreign Organization Cross-Tenant Switch Rejection',
    'TENANT_SCOPING',
    crossOrgAttempt.authorized === false,
    'Cross-organization tenant switch strictly blocked at core boundary.'
  );

  // Test 10: Starter Plan Company Limit Guard
  const starterOrg = TenantAdministrativeSetupService.provisionOrganization({
    orgName: 'Small Biz Startups',
    orgCode: 'STARTER-BIZ',
    planTier: 'Starter',
    primaryAdminEmail: 'founder@smallbiz.com',
    primaryAdminName: 'Kiran Dave',
  });

  TenantAdministrativeSetupService.provisionCompanyEntity({
    organizationId: starterOrg.organization.id,
    companyName: 'Starter Comp 1',
    companyCode: 'START-01',
    legalEntityName: 'Starter Comp 1 Ltd',
    pan: 'AABCS1111A',
    gstin: '33AABCS1111A1Z1',
    state: 'Tamil Nadu',
    city: 'Chennai',
  });

  TenantAdministrativeSetupService.provisionCompanyEntity({
    organizationId: starterOrg.organization.id,
    companyName: 'Starter Comp 2',
    companyCode: 'START-02',
    legalEntityName: 'Starter Comp 2 Ltd',
    pan: 'AABCS2222B',
    gstin: '33AABCS2222B1Z2',
    state: 'Tamil Nadu',
    city: 'Chennai',
  });

  let starterOverflowRejected = false;
  try {
    TenantAdministrativeSetupService.provisionCompanyEntity({
      organizationId: starterOrg.organization.id,
      companyName: 'Starter Comp 3 (Illegal Overflow)',
      companyCode: 'START-03',
      legalEntityName: 'Starter Comp 3 Ltd',
      pan: 'AABCS3333C',
      gstin: '33AABCS3333C1Z3',
      state: 'Tamil Nadu',
      city: 'Chennai',
    });
  } catch (err: any) {
    starterOverflowRejected = err.message.includes('Plan limit reached');
  }

  record(
    10,
    'Gate 12.5.10: Subscription Plan Capacity & Feature Enforcement',
    'GOVERNANCE_GUARD',
    starterOverflowRejected,
    'Subscription tier correctly enforced limit of 2 companies for Starter plan.'
  );

  // ========================================================================
  // FINAL SUMMARY
  // ========================================================================

  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log(`Gate 12.5 Tenant Onboarding & Setup Authority Summary: ${passed} / ${total} Passed (${Math.round((passed / total) * 100)}%)`);
  results.forEach((r) => {
    console.log(`  ${r.passed ? '✅ [PASS]' : '❌ [FAIL]'} Test ${r.testNumber} [${r.category}]: ${r.description} — ${r.message}`);
  });

  return { passed, failed, total };
}

// Direct execution support
if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('tenantAdministrativeSetupGate12_5.test')) {
  runTenantAdministrativeSetupGate12_5()
    .then(({ failed }) => {
      if (failed > 0) process.exit(1);
    })
    .catch((err) => {
      console.error('Fatal execution error in Gate 12.5 test suite:', err);
      process.exit(1);
    });
}
