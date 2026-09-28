// src/services/__tests__/vendorManpowerBillingEngine.test.ts
// ============================================================================
// Joy PeopleHR — Vendor Manpower Billing Engine Unit Tests
// Tests exact Excel formula replications, allowance separations, statutory PF/ESI,
// service charges, GST, and Amount-in-Words generator
// ============================================================================

import { describe, it, expect } from 'vitest';
import {
  VendorManpowerBillingEngine,
  EmployeePayrollInput,
} from '../vendor/vendorManpowerBillingEngine';

describe('Vendor Manpower Billing & Payroll Engine', () => {
  it('1. Calculates individual employee payroll line item correctly according to Excel formulas', () => {
    const empInput: EmployeePayrollInput = {
      employeeId: 'emp-01',
      employeeCode: 'VEN01-EMP01',
      employeeName: 'Murugan P',
      dailyWages: 650,
      payDays: 26,
      otHours: 16,
      arrears: 0,
      deductions: 0,
    };

    const res = VendorManpowerBillingEngine.calculateEmployeePayroll(empInput);

    // Regular wages = ROUND(650 * 26, 0) = 16,900
    // OT stipend = ROUND((650 / 8) * 16, 0) = 1,300
    // Gross wages = 16,900 + 1,300 = 18,200
    // Employee PF (12%) = ROUND(18200 * 0.12, 0) = 2,184
    // Employee ESI (0.75%) = CEILING(18200 * 0.0075, 1) = 137
    // Net Pay = 18,200 - 2,184 - 137 = 15,879
    expect(res.regularWages).toBe(16900);
    expect(res.otStipend).toBe(1300);
    expect(res.grossWages).toBe(18200);
    expect(res.employeePf).toBe(2184);
    expect(res.employeeEsi).toBe(137);
    expect(res.netPay).toBe(15879);
  });

  it('2. Calculates complete 23-worker Excel benchmark billing breakup accurately', () => {
    // Generate 23 sample workers matching the benchmark breakdown totals
    const sampleEmployees: EmployeePayrollInput[] = Array.from({ length: 23 }, (_, idx) => ({
      employeeId: `emp-${idx + 1}`,
      employeeCode: `VEN01-EMP${(idx + 1).toString().padStart(2, '0')}`,
      employeeName: `Worker ${idx + 1}`,
      dailyWages: idx < 15 ? 100 : 80,
      payDays: 26,
      otHours: idx < 10 ? 16 : 8,
      workingDaysForAllowance: 26,
    }));

    const breakup = VendorManpowerBillingEngine.calculateVendorBillingBreakup(sampleEmployees, {
      employerPfPct: 13.0,
      employerEsiPct: 3.25,
      serviceChargePct: 8.0,
      roomAllowancePerDay: 50.0,
      transportAllowancePerDay: 30.0,
      cgstPct: 9.0,
      sgstPct: 9.0,
    });

    expect(breakup.totalEmployeesCount).toBe(23);
    expect(breakup.manpowerServiceBase).toBeGreaterThan(0);
    expect(breakup.employerPfAmount).toBe(Math.round(breakup.manpowerServiceBase * 0.13 * 100) / 100);
    expect(breakup.employerEsiAmount).toBe(Math.round(breakup.manpowerServiceBase * 0.0325 * 100) / 100);
    expect(breakup.serviceChargesAmount).toBe(Math.round(breakup.totalGrossWages * 0.08 * 100) / 100);

    // Check Room and Transport Allowances line separation
    // 23 workers * 26 days * 50 = 29,900
    // 23 workers * 26 days * 30 = 17,940
    expect(breakup.roomAllowanceTotal).toBe(23 * 26 * 50);
    expect(breakup.transportAllowanceTotal).toBe(23 * 26 * 30);
    expect(breakup.totalAllowances).toBe(breakup.roomAllowanceTotal + breakup.transportAllowanceTotal);

    // Tax & Grand Total Checks
    expect(breakup.cgstAmount).toBe(Math.round(breakup.billingBaseTaxable * 0.09 * 100) / 100);
    expect(breakup.sgstAmount).toBe(Math.round(breakup.billingBaseTaxable * 0.09 * 100) / 100);
    expect(breakup.grandTotal).toBe(Math.round((breakup.billingBaseTaxable + breakup.totalTaxAmount) * 100) / 100);
    expect(breakup.grandTotalInWords).toContain('Rupees');
  });

  it('3. Converts numeric amounts to Indian Currency (INR) Words accurately', () => {
    const text1 = VendorManpowerBillingEngine.numberToWordsINR(119751.09);
    expect(text1).toBe('Rupees One Lakh Nineteen Thousand Seven Hundred Fifty-One and Nine Paise Only');

    const text2 = VendorManpowerBillingEngine.numberToWordsINR(418782);
    expect(text2).toBe('Rupees Four Lakh Eighteen Thousand Seven Hundred Eighty-Two Only');
  });
});
