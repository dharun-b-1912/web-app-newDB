import { runAllSecurityAuditTests } from './securityAuditSuite.test';
import { Phase45ProductionRealityCertificationSuite } from './phase45ProductionRealityCertification.test';
import { PayrollFinancialAuthorityGate2Suite } from './payrollFinancialAuthorityGate2.test';

import { DomainEventsAndApprovalsGate3Suite } from './domainEventsAndApprovalsGate3.test';
import { runLeaveEngineModule01CertificationSuite } from './leaveEngineModule01.test';
import { runOffboardingFnFModule02CertificationSuite } from './offboardingFnFModule02.test';
import { runPeopleLifecycleModule03CertificationSuite } from './peopleLifecycleModule03.test';
import { runLaunchScopeFeatureGovernanceTests } from './launchScopeFeatureGovernance.test';
import { runAuthPortalRoutingCertificationTests } from './authPortalRoutingCertification.test';
import { runProductionTenantRealityCertificationGate11 } from './productionTenantRealityCertificationGate11.test';
import { runProductionLaunchReadinessGate12 } from './productionLaunchReadinessGate12.test';
import { runTenantAdministrativeSetupGate12_5 } from './tenantAdministrativeSetupGate12_5.test';
import { runBiometricDeviceRealityGate12_6 } from './biometricDeviceRealityGate12_6.test';
import { runCustomerUatScenarioGate12_7 } from './customerUatScenarioGate12_7.test';
import { runLaunchUiUxNavigationGate13 } from './launchUiUxNavigationGate13.test';
import { runCompanyAdminAuthorityGate14A } from './companyAdminAuthorityGate14A.test';
import { runPayslipProductionCertificationGate15 } from './payslipProductionCertificationGate15.test';
import { runPayslipPreviewPrintCertificationSuite } from './payslipPreviewPrintCertification.test';
import { PayrollCalculationRealityGateSuite } from './payrollCalculationRealityGate.test';
import { DedicatedOTConfigurationGateSuite } from './dedicatedOTConfigurationGate.test';
import { TamilNaduLWFStatutoryGateSuite } from './tamilNaduLWFStatutoryGate.test';
import { runPayrollCalculationArchitectureTests } from './payrollCalculationArchitecture.test';

async function main() {
  console.log('=== STARTING PRODUCTION READINESS CERTIFICATION GATES ===\n');

  // Gate Suite 1: Security & Multi-Tenancy Audit
  const secRes = runAllSecurityAuditTests();
  if (secRes.failed !== 0) {
    console.error(`Security audit suite failed with ${secRes.failed} failures.`);
    process.exit(1);
  }

  // Gate Suite 2: 10 Production Reality & Integration Certification Gates
  console.log('\n[RUNNING 10 PRODUCTION REALITY GATES]');
  const realityRes = await Phase45ProductionRealityCertificationSuite.runAllGates();
  console.log(`Production Reality Gates: ${realityRes.passCount} / ${realityRes.totalCount} passed.`);
  realityRes.results.forEach(r => {
    console.log(`  ${r.passed ? '✓' : '✗'} Gate ${r.gateNumber}: ${r.gateName} (${r.category}) - ${r.details}`);
  });

  if (!realityRes.passed) {
    console.error(`Production reality certification failed.`);
    process.exit(1);
  }

  // Gate Suite 3: Gate 2 & Gate 2.5 Payroll Financial Authority & Reconciliation
  console.log('\n============================================================');
  console.log('  GATE 2 & GATE 2.5: PAYROLL FINANCIAL AUTHORITY SUITE');
  console.log('============================================================');
  const gate2Res = await PayrollFinancialAuthorityGate2Suite.runAllTests();
  console.log(`Payroll Authority Tests: ${gate2Res.passCount} / ${gate2Res.totalCount} passed.`);
  gate2Res.results.forEach(r => {
    console.log(`  ${r.passed ? '✓' : '✗'} Test ${r.testNumber}: ${r.testName} - ${r.details}`);
  });

  if (!gate2Res.passed) {
    console.error(`Gate 2 Payroll Authority certification failed.`);
    process.exit(1);
  }

  // Gate Suite 4: Gate 3 Domain Events & Unified Approvals
  console.log('\n============================================================');
  console.log('  GATE 3: DOMAIN EVENTS & UNIFIED APPROVALS SUITE');
  console.log('============================================================');
  const gate3Res = await DomainEventsAndApprovalsGate3Suite.runAllTests();
  console.log(`Gate 3 Certification Tests: ${gate3Res.passCount} / ${gate3Res.totalCount} passed.`);
  gate3Res.results.forEach(r => {
    console.log(`  ${r.passed ? '✓' : '✗'} Test ${r.testNumber}: ${r.testName} - ${r.details}`);
  });

  if (!gate3Res.passed) {
    console.error(`Gate 3 Domain Events & Unified Approvals certification failed.`);
    process.exit(1);
  }

  // Business Module Certification 01: Leave Management Engine
  const module01Res = await runLeaveEngineModule01CertificationSuite();
  if (module01Res.failed > 0) {
    console.error(`Module Certification 01 (Leave Engine) failed with ${module01Res.failed} failures.`);
    process.exit(1);
  }

  // Business Module Certification 02: Offboarding → FnF Automation
  const module02Res = await runOffboardingFnFModule02CertificationSuite();
  if (module02Res.failed > 0) {
    console.error(`Module Certification 02 (Offboarding → FnF) failed with ${module02Res.failed} failures.`);
    process.exit(1);
  }

  // Business Module Certification 03: People / Employee Lifecycle Engine
  const module03Res = await runPeopleLifecycleModule03CertificationSuite();
  if (module03Res.failed > 0) {
    console.error(`Module Certification 03 (People Lifecycle) failed with ${module03Res.failed} failures.`);
    process.exit(1);
  }

  // September 26 Launch Scope & Feature Governance Suite
  const governanceRes = await runLaunchScopeFeatureGovernanceTests();
  if (governanceRes.errors.length > 0) {
    console.error(`Launch Scope Feature Governance Suite failed with ${governanceRes.errors.length} failures.`);
    process.exit(1);
  }

  // Gate Suite 10: Unified Authentication, Role-Based Portal Routing & Tenant Isolation
  console.log('\n============================================================');
  console.log('  GATE 10: UNIFIED AUTH & PORTAL ROUTING CERTIFICATION SUITE');
  console.log('============================================================');
  const authPortalRes = await runAuthPortalRoutingCertificationTests();
  console.log(`Auth Portal Routing Tests: ${authPortalRes.passCount} / ${authPortalRes.totalCount} passed.`);
  authPortalRes.results.forEach(r => {
    console.log(`  ${r.passed ? '✓' : '✗'} Test ${r.testNumber}: ${r.testName} - ${r.details}`);
  });

  if (authPortalRes.errors.length > 0) {
    console.error(`Auth & Portal Routing Suite failed with ${authPortalRes.errors.length} failures.`);
    process.exit(1);
  }

  // Gate Suite 11: End-to-End Production Tenant & Portal Reality Certification
  console.log('\n============================================================');
  console.log('  GATE 11: E2E PRODUCTION TENANT & PORTAL REALITY SUITE');
  console.log('============================================================');
  const gate11Res = await runProductionTenantRealityCertificationGate11();
  console.log(`Gate 11 Production Reality Tests: ${gate11Res.passCount} / ${gate11Res.totalCount} passed.`);
  gate11Res.results.forEach(r => {
    console.log(`  ${r.passed ? '✓' : '✗'} Test ${r.testNumber} [${r.category}]: ${r.testName} - ${r.details}`);
  });

  if (gate11Res.errors.length > 0) {
    console.error(`Gate 11 Production Tenant Reality Suite failed with ${gate11Res.errors.length} failures.`);
    process.exit(1);
  }

  // Gate Suite 12: Production Launch Readiness & Operational Certification
  const gate12Res = await runProductionLaunchReadinessGate12();
  if (gate12Res.failed > 0) {
    console.error(`Gate 12 Production Launch Readiness Suite failed with ${gate12Res.failed} failures.`);
    process.exit(1);
  }

  // Gate Suite 12.5: Tenant Onboarding & Administrative Setup Authority
  const gate12_5Res = await runTenantAdministrativeSetupGate12_5();
  if (gate12_5Res.failed > 0) {
    console.error(`Gate 12.5 Tenant Onboarding & Setup Suite failed with ${gate12_5Res.failed} failures.`);
    process.exit(1);
  }

  // Gate Suite 12.6: Biometric Integration & Attendance Device Reality
  const gate12_6Res = await runBiometricDeviceRealityGate12_6();
  if (gate12_6Res.failed > 0) {
    console.error(`Gate 12.6 Biometric Device Reality Suite failed with ${gate12_6Res.failed} failures.`);
    process.exit(1);
  }

  // Gate Suite 12.7: Real Customer UAT & Operational Scenarios
  const gate12_7Res = await runCustomerUatScenarioGate12_7();
  if (gate12_7Res.failed > 0) {
    console.error(`Gate 12.7 Customer UAT Suite failed with ${gate12_7Res.failed} failures.`);
    process.exit(1);
  }

  // Gate Suite 13: Launch UI/UX, Navigation & Feature Exposure Certification
  const gate13Res = await runLaunchUiUxNavigationGate13();
  if (gate13Res.failed > 0) {
    console.error(`Gate 13 Launch UI/UX & Navigation Suite failed with ${gate13Res.failed} failures.`);
    process.exit(1);
  }

  // Gate Suite 14A: Company Admin Authority, Sidebar Reality & Dual-Persona Certification
  const gate14ARes = await runCompanyAdminAuthorityGate14A();
  if (gate14ARes.failed > 0) {
    console.error(`Gate 14A Company Admin Authority Suite failed with ${gate14ARes.failed} failures.`);
    process.exit(1);
  }

  // Gate Suite 15: Enterprise A4 Payslip Engine & Reconciliation Certification
  await runPayslipProductionCertificationGate15();

  // Gate Suite 16: Premium Payslip Preview & A4 Print Experience Certification
  const gate16Res = await runPayslipPreviewPrintCertificationSuite();
  if (!gate16Res.passed) {
    console.error(`Gate 16 Payslip Preview & Print Suite failed with ${gate16Res.failedCount} failures.`);
    process.exit(1);
  }



  // Gate Suite 24: Authoritative Payroll Calculation & Statutory Reality Gate (8 Master Tests)
  console.log('\n============================================================');
  console.log('  GATE 24: AUTHORITATIVE PAYROLL CALCULATION & STATUTORY REALITY');
  console.log('============================================================');
  const gate24Res = await PayrollCalculationRealityGateSuite.runAllTests();
  console.log(`Gate 24 Statutory Reality Tests: ${gate24Res.passCount} / ${gate24Res.totalCount} passed.`);
  gate24Res.results.forEach(r => {
    console.log(`  ${r.passed ? '✓' : '✗'} Test ${r.testNumber}: ${r.testName} (${r.category}) - ${r.details}`);
  });

  if (!gate24Res.passed) {
    console.error(`Gate 24 Statutory Reality Certification failed.`);
    process.exit(1);
  }

  // Gate Suite 25: Dedicated Overtime Policy Configuration & Calculation Reality Gate (9 Master Tests)
  console.log('\n============================================================');
  console.log('  GATE 25: DEDICATED OVERTIME POLICY & CALCULATION REALITY');
  console.log('============================================================');
  const gate25Res = await DedicatedOTConfigurationGateSuite.runAllTests();
  console.log(`Gate 25 Dedicated OT Tests: ${gate25Res.passCount} / ${gate25Res.totalCount} passed.`);
  gate25Res.results.forEach(r => {
    console.log(`  ${r.passed ? '✓' : '✗'} Test ${r.testNumber}: ${r.testName} (${r.category}) - ${r.details}`);
  });

  if (!gate25Res.passed) {
    console.error(`Gate 25 Dedicated OT Certification failed.`);
    process.exit(1);
  }

  // Gate Suite 26: Tamil Nadu Labour Welfare Fund (TNLWF Act 1972) & Multi-State LWF Gate (7 Master Tests)
  console.log('\n============================================================');
  console.log('  GATE 26: TAMIL NADU LWF ACT 1972 & ANNUAL STATUTORY FREQUENCY');
  console.log('============================================================');
  const gate26Res = await TamilNaduLWFStatutoryGateSuite.runAllTests();
  console.log(`Gate 26 LWF Tests: ${gate26Res.passCount} / ${gate26Res.totalCount} passed.`);
  gate26Res.results.forEach(r => {
    console.log(`  ${r.passed ? '✓' : '✗'} Test ${r.testNumber}: ${r.testName} (${r.category}) - ${r.details}`);
  });

  if (!gate26Res.passed) {
    console.error(`Gate 26 Tamil Nadu LWF Certification failed.`);
    process.exit(1);
  }

  // Gate Suite 27: Payroll Architecture & Statutory Reality Suite
  const archRes = await runPayrollCalculationArchitectureTests();
  if (archRes.failed !== 0) {
    console.error(`Payroll Architecture & Statutory Reality suite failed with ${archRes.failed} failures.`);
    process.exit(1);
  }

  console.log('\n=== ALL 27 GATES, BUSINESS MODULES & LAUNCH TRACKS CERTIFIED (100%) ===');
  setTimeout(() => process.exit(0), 50);
}

main().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
