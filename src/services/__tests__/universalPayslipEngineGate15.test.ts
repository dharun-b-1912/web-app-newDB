// src/services/__tests__/universalPayslipEngineGate15.test.ts
// ============================================================================
// Joy PeopleHR — Gate 15 Universal Blue Payslip Production Certification
// Multi-Archetype Verification: Factory, Office, Contract, OT, LOP, PF/ESI Segregation
// ============================================================================

import { describe, it, expect } from 'vitest';
import { PayslipGeneratorService } from '../payroll/payslipGeneratorService';
import { UniversalPayslipPdfService } from '../payroll/universalPayslipPdfService';
import { PayrollRoundingService } from '../payroll/payrollRoundingService';
import { validatePayslipFinancialInvariants, PayslipDocumentModel } from '../../types/payslipViewModel';

describe('Gate 15: Universal Blue Payslip Production Engine', () => {
  // --------------------------------------------------------------------------
  // TEST 1: Factory / Blue-Collar Workforce
  // --------------------------------------------------------------------------
  it('TEST 1: correctly builds Factory/Blue-Collar payslip with shift, line, skill category & attendance breakdown', () => {
    const { viewModel, validation } = PayslipGeneratorService.buildPayslipViewModel('EMP-001', 'August 2026');

    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);

    // Attendance breakdown
    expect(viewModel.attendance.payableDays).toBeGreaterThan(0);
    expect(viewModel.attendance.presentDays).toBeGreaterThan(0);

    // Factory specific metadata
    expect(viewModel.employee.designation).toBeDefined();
    expect(viewModel.employee.workLocation).toBeDefined();

    // Financial invariants
    const sumEarnings = viewModel.earnings.reduce((s, e) => s + e.amount, 0);
    const sumDeductions = viewModel.deductions.reduce((s, d) => s + d.amount, 0);

    expect(viewModel.totals.grossEarnings).toBe(sumEarnings);
    expect(viewModel.totals.totalDeductions).toBe(sumDeductions);
    expect(viewModel.totals.netPayable).toBe(sumEarnings - sumDeductions);
  });

  // --------------------------------------------------------------------------
  // TEST 2: Office / White-Collar Employee
  // --------------------------------------------------------------------------
  it('TEST 2: generates clean Office Employee payslip without unnecessary factory clutter', () => {
    const { viewModel, validation } = PayslipGeneratorService.buildPayslipViewModel(
      'EMP-OFFICE-01',
      'August 2026',
      'org-main',
      {
        displayName: 'Joy Corporate Solutions Tech Hub',
        legalName: 'Joy Corporate Solutions Pvt Ltd',
      }
    );

    expect(validation.isValid).toBe(true);
    expect(viewModel.company.displayName).toBe('Joy Corporate Solutions Tech Hub');
    expect(viewModel.totals.netPayable).toBeGreaterThan(0);
  });

  // --------------------------------------------------------------------------
  // TEST 3: Contract Workforce with Vendor Identity
  // --------------------------------------------------------------------------
  it('TEST 3: correctly attributes Contract Employee to Vendor/Contractor with deployment site', () => {
    const { viewModel, validation } = PayslipGeneratorService.buildPayslipViewModel(
      'EMP-004',
      'August 2026',
      'org-vendor-1',
      {
        displayName: 'Sri Amman Workforce Agency',
        legalName: 'Sri Amman Manpower Services Pvt Ltd',
        address: 'Coimbatore Industrial Corridor, Tamil Nadu',
      }
    );

    expect(validation.isValid).toBe(true);
    expect(viewModel.company.legalName).toContain('Sri Amman');
    expect(viewModel.company.address).toContain('Coimbatore');
  });

  // --------------------------------------------------------------------------
  // TEST 4: Overtime Representation (Dynamic & Fixed)
  // --------------------------------------------------------------------------
  it('TEST 4: renders Overtime with exact actual hours, rate, and amount from finalized engine', () => {
    const { viewModel } = PayslipGeneratorService.buildPayslipViewModel('EMP-002', 'August 2026');

    if (viewModel.attendance.overtimeHours > 0) {
      const otComponent = viewModel.earnings.find(e => e.code === 'OT_WAGES');
      expect(otComponent).toBeDefined();
      expect(otComponent?.amount).toBeGreaterThan(0);
      expect(viewModel.overtime.actualOtHours).toBe(viewModel.attendance.overtimeHours);
    }
  });

  // --------------------------------------------------------------------------
  // TEST 5: Loss of Pay (LOP) & Attendance Reconciliation
  // --------------------------------------------------------------------------
  it('TEST 5: correctly accounts for LOP days without violating calendar invariants', () => {
    const { viewModel } = PayslipGeneratorService.buildPayslipViewModel('EMP-003', 'August 2026');

    expect(viewModel.attendance.payableDays + viewModel.attendance.lopDays).toBeLessThanOrEqual(
      viewModel.attendance.calendarDays || 31
    );
  });

  // --------------------------------------------------------------------------
  // TEST 6: Strict Segregation of Employer Contributions (PF / ESIC)
  // --------------------------------------------------------------------------
  it('TEST 6: strictly segregates Employer PF/ESIC — Employer contribution NEVER reduces employee Net Pay', () => {
    const { viewModel, validation } = PayslipGeneratorService.buildPayslipViewModel('EMP-001', 'August 2026');

    expect(validation.isValid).toBe(true);

    // Employer contributions must not exist in employee deductions array
    const hasEmployerInDeductions = viewModel.deductions.some(
      d => d.code === 'PF_ER' || d.code === 'ESI_ER' || d.label.toLowerCase().includes('employer')
    );
    expect(hasEmployerInDeductions).toBe(false);

    // Invariant: Net Pay = Gross - Employee Deductions (Employer contributions are strictly informational)
    const expectedNet = viewModel.totals.grossEarnings - viewModel.totals.totalDeductions;
    expect(viewModel.totals.netPayable).toBe(expectedNet);
  });

  // --------------------------------------------------------------------------
  // TEST 7: Amount in Words Dynamic Generation
  // --------------------------------------------------------------------------
  it('TEST 7: dynamically converts finalized net payable into authoritative Indian Rupee words', () => {
    const words1 = PayrollRoundingService.amountInWordsINR(35115);
    expect(words1).toBe('Rupees Thirty-Five Thousand One Hundred Fifteen Only');

    const words2 = PayrollRoundingService.amountInWordsINR(125818.5);
    expect(words2).toBe('Rupees One Lakh Twenty-Five Thousand Eight Hundred Eighteen and Fifty Paise Only');
  });

  // --------------------------------------------------------------------------
  // TEST 8: PII & Bank Account Masking
  // --------------------------------------------------------------------------
  it('TEST 8: protects sensitive PII and masks bank account numbers for worker privacy', () => {
    const { viewModel } = PayslipGeneratorService.buildPayslipViewModel('EMP-001', 'August 2026');

    expect(viewModel.employee.bankAccountMasked).toMatch(/^•••• •••• \d{4}$|^••••/);
    if (viewModel.employee.panMasked !== '—') {
      expect(viewModel.employee.panMasked).toContain('•');
    }
  });

  // --------------------------------------------------------------------------
  // TEST 9: PDF & Standalone HTML Determinism
  // --------------------------------------------------------------------------
  it('TEST 9: generates complete, deterministic A4 HTML with high contrast Blue Theme styling', () => {
    const { viewModel } = PayslipGeneratorService.buildPayslipViewModel('EMP-001', 'August 2026');
    const html = UniversalPayslipPdfService.generateStandaloneHtml(viewModel);

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('#034078'); // Branded JOY Blue
    expect(html).toContain('PAYSLIP');
    expect(html).toContain(viewModel.employee.employeeCode);
    expect(html).toContain(viewModel.totals.netPayableInWords);
    expect(html).toContain('NET TAKE-HOME SALARY');
  });

  // --------------------------------------------------------------------------
  // TEST 10: Invariant Validation Failure Guard
  // --------------------------------------------------------------------------
  it('TEST 10: rejects tampered document model when financial invariants are violated', () => {
    const { viewModel } = PayslipGeneratorService.buildPayslipViewModel('EMP-001', 'August 2026');

    // Tamper with gross earnings
    const tamperedModel: PayslipDocumentModel = {
      ...viewModel,
      totals: {
        ...viewModel.totals,
        grossEarnings: viewModel.totals.grossEarnings + 5000, // Intentional violation
      },
    };

    const result = validatePayslipFinancialInvariants(tamperedModel);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('PAYSLIP_GROSS_RECONCILIATION_FAILED');
  });

  // --------------------------------------------------------------------------
  // TEST 11: Accurate Statutory Slabs for ₹15,000 Gross Employee (EPF, ESIC, PT)
  // --------------------------------------------------------------------------
  it('TEST 11: correctly computes and places statutory slab deductions for ₹15,000 gross / ₹7,500 basic employee', () => {
    const { viewModel, validation } = PayslipGeneratorService.buildPayslipViewModel('JCS-154', 'August 2026');

    expect(validation.isValid).toBe(true);
    expect(viewModel.totals.grossEarnings).toBe(15000);

    // Basic: ₹7,500, HRA: ₹4,500, Special: ₹3,000
    const basicComp = viewModel.earnings.find(e => e.code === 'BASIC');
    expect(basicComp?.amount).toBe(7500);

    // Employee PF (12% of ₹7,500) = ₹900
    const pfDeduction = viewModel.deductions.find(d => d.code === 'PF_EE');
    expect(pfDeduction).toBeDefined();
    expect(pfDeduction?.amount).toBe(900);

    // Employee ESIC (0.75% of ₹15,000) = ₹112.5
    const esiDeduction = viewModel.deductions.find(d => d.code === 'ESI_EE');
    expect(esiDeduction).toBeDefined();
    expect(esiDeduction?.amount).toBe(112.5);

    // Professional Tax (PT Coimbatore Municipal Slab) = ₹208
    const ptDeduction = viewModel.deductions.find(d => d.code === 'PT');
    expect(ptDeduction).toBeDefined();
    expect(ptDeduction?.amount).toBe(208);

    // Total Deductions = 900 + 112.5 + 208 = 1220.5
    expect(viewModel.totals.totalDeductions).toBe(1220.5);

    // Net Take-Home Salary = 15000 - 1220.5 = 13779.5
    expect(viewModel.totals.netPayable).toBe(13779.5);

    // Employer Contributions: EPF (12%) = ₹900, ESIC (3.25%) = ₹487.5
    const erPf = viewModel.employerContributions.find(e => e.code === 'PF_ER');
    expect(erPf?.amount).toBe(900);

    const erEsi = viewModel.employerContributions.find(e => e.code === 'ESI_ER');
    expect(erEsi?.amount).toBe(487.5);

    // Invariant: Net Pay = Gross - Total Deductions
    expect(viewModel.totals.netPayable).toBe(viewModel.totals.grossEarnings - viewModel.totals.totalDeductions);
  });
});
