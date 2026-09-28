// src/services/vendor/fixtures/arjunaNaturalJuly2026Fixture.ts
// ============================================================================
// Joy PeopleHR — Arjuna Naturals July 2026 Vendor Commercial Test Fixture
// Source: Test Data/ARJUNA NATURALS INVOICE JULY'26.xlsx
// Reproduces exact 23-employee workings, allowances, breakup, and invoice contracts
// ============================================================================

import { EmployeePayrollInput, VendorBillingRuleConfig } from '../vendorManpowerBillingEngine';

export interface ArjunaWorkerFixtureRecord {
  sNo: number;
  workerCode: string;
  workerName: string;
  department: string;
  dailyWages: number;
  payDays: number;
  regularWages: number;
  otHours: number;
  otStipend: number;
  grossWages: number;
  employeePf: number;
  employeeEsi: number;
  canteenDeduction: number;
  otherDeductions: number;
  netPay: number;
  allowanceWorkingDays: number;
  roomAllowance: number;
  transportAllowance: number;
  totalAllowance: number;
}

export const ARJUNA_NATURALS_JULY_2026_WORKERS: ArjunaWorkerFixtureRecord[] = [
  { sNo: 1, workerCode: 'AJ001', workerName: 'LALHRIA TPULA', department: 'BCM', dailyWages: 620, payDays: 4.5, regularWages: 2790, otHours: 19, otStipend: 1473, grossWages: 4263, employeePf: 335, employeeEsi: 21, canteenDeduction: 0, otherDeductions: 0, netPay: 3907, allowanceWorkingDays: 5, roomAllowance: 250, transportAllowance: 150, totalAllowance: 400 },
  { sNo: 2, workerCode: 'AJ002', workerName: 'RANJIT MUHTO', department: 'FO', dailyWages: 620, payDays: 4.5, regularWages: 2790, otHours: 19, otStipend: 1473, grossWages: 4263, employeePf: 335, employeeEsi: 21, canteenDeduction: 0, otherDeductions: 0, netPay: 3907, allowanceWorkingDays: 5, roomAllowance: 250, transportAllowance: 150, totalAllowance: 400 },
  { sNo: 3, workerCode: 'AJ003', workerName: 'RAM VIJAY KUMAR', department: 'BCM', dailyWages: 620, payDays: 4.5, regularWages: 2790, otHours: 19, otStipend: 1473, grossWages: 4263, employeePf: 335, employeeEsi: 21, canteenDeduction: 0, otherDeductions: 0, netPay: 3907, allowanceWorkingDays: 5, roomAllowance: 250, transportAllowance: 150, totalAllowance: 400 },
  { sNo: 4, workerCode: 'AJ004', workerName: 'AKURAI', department: 'BCM', dailyWages: 620, payDays: 4.5, regularWages: 2790, otHours: 19, otStipend: 1473, grossWages: 4263, employeePf: 335, employeeEsi: 21, canteenDeduction: 0, otherDeductions: 0, netPay: 3907, allowanceWorkingDays: 5, roomAllowance: 250, transportAllowance: 150, totalAllowance: 400 },
  { sNo: 5, workerCode: 'AJ005', workerName: 'CHHOTELAL SOREN', department: 'FO', dailyWages: 620, payDays: 4.5, regularWages: 2790, otHours: 19, otStipend: 1473, grossWages: 4263, employeePf: 335, employeeEsi: 21, canteenDeduction: 0, otherDeductions: 0, netPay: 3907, allowanceWorkingDays: 5, roomAllowance: 250, transportAllowance: 150, totalAllowance: 400 },
  { sNo: 6, workerCode: 'AJ006', workerName: 'INDRAJIT REANG', department: 'FO', dailyWages: 620, payDays: 4.5, regularWages: 2790, otHours: 19, otStipend: 1473, grossWages: 4263, employeePf: 335, employeeEsi: 21, canteenDeduction: 0, otherDeductions: 0, netPay: 3907, allowanceWorkingDays: 5, roomAllowance: 250, transportAllowance: 150, totalAllowance: 400 },
  { sNo: 7, workerCode: 'AJ007', workerName: 'UDAI RAM REANG', department: 'BCM', dailyWages: 620, payDays: 4.5, regularWages: 2790, otHours: 19, otStipend: 1473, grossWages: 4263, employeePf: 335, employeeEsi: 21, canteenDeduction: 0, otherDeductions: 0, netPay: 3907, allowanceWorkingDays: 5, roomAllowance: 250, transportAllowance: 150, totalAllowance: 400 },
  { sNo: 8, workerCode: 'AJ008', workerName: 'KARAN HEMBRAM', department: 'BCM', dailyWages: 620, payDays: 4.5, regularWages: 2790, otHours: 19, otStipend: 1473, grossWages: 4263, employeePf: 335, employeeEsi: 21, canteenDeduction: 0, otherDeductions: 0, netPay: 3907, allowanceWorkingDays: 5, roomAllowance: 250, transportAllowance: 150, totalAllowance: 400 },
  { sNo: 9, workerCode: 'AJ009', workerName: 'RAKESH SOREN', department: 'BCM', dailyWages: 620, payDays: 4.5, regularWages: 2790, otHours: 19, otStipend: 1473, grossWages: 4263, employeePf: 335, employeeEsi: 21, canteenDeduction: 0, otherDeductions: 0, netPay: 3907, allowanceWorkingDays: 5, roomAllowance: 250, transportAllowance: 150, totalAllowance: 400 },
  { sNo: 10, workerCode: 'AJ010', workerName: 'BASUDEV SOREN', department: 'BCM', dailyWages: 620, payDays: 4.5, regularWages: 2790, otHours: 19, otStipend: 1473, grossWages: 4263, employeePf: 335, employeeEsi: 21, canteenDeduction: 0, otherDeductions: 0, netPay: 3907, allowanceWorkingDays: 5, roomAllowance: 250, transportAllowance: 150, totalAllowance: 400 },
  { sNo: 11, workerCode: 'AJ011', workerName: 'CHAKBE JOY RENGA', department: 'FO', dailyWages: 620, payDays: 4.5, regularWages: 2790, otHours: 19, otStipend: 1473, grossWages: 4263, employeePf: 335, employeeEsi: 21, canteenDeduction: 0, otherDeductions: 0, netPay: 3907, allowanceWorkingDays: 5, roomAllowance: 250, transportAllowance: 150, totalAllowance: 400 },
  { sNo: 12, workerCode: 'AJ012', workerName: 'PRAMOD PRASAD', department: 'PP3', dailyWages: 620, payDays: 4.5, regularWages: 2790, otHours: 19, otStipend: 1473, grossWages: 4263, employeePf: 335, employeeEsi: 21, canteenDeduction: 0, otherDeductions: 0, netPay: 3907, allowanceWorkingDays: 5, roomAllowance: 250, transportAllowance: 150, totalAllowance: 400 },
  { sNo: 13, workerCode: 'AJ013', workerName: 'DHIRAM MAHALI', department: 'PP3', dailyWages: 620, payDays: 3.5, regularWages: 2170, otHours: 15, otStipend: 1163, grossWages: 3333, employeePf: 260, employeeEsi: 17, canteenDeduction: 0, otherDeductions: 0, netPay: 3056, allowanceWorkingDays: 4, roomAllowance: 200, transportAllowance: 120, totalAllowance: 320 },
  { sNo: 14, workerCode: 'AJ014', workerName: 'MAHADEV MURMA', department: 'PP3', dailyWages: 620, payDays: 4.5, regularWages: 2790, otHours: 19, otStipend: 1473, grossWages: 4263, employeePf: 335, employeeEsi: 21, canteenDeduction: 0, otherDeductions: 0, netPay: 3907, allowanceWorkingDays: 5, roomAllowance: 250, transportAllowance: 150, totalAllowance: 400 },
  { sNo: 15, workerCode: 'AJ015', workerName: 'SUNIL MARANDI', department: 'HERBAL', dailyWages: 620, payDays: 4.5, regularWages: 2790, otHours: 19, otStipend: 1473, grossWages: 4263, employeePf: 335, employeeEsi: 21, canteenDeduction: 0, otherDeductions: 0, netPay: 3907, allowanceWorkingDays: 5, roomAllowance: 250, transportAllowance: 150, totalAllowance: 400 },
  { sNo: 16, workerCode: 'AJ016', workerName: 'SARVAN KUMAR', department: 'PP3', dailyWages: 620, payDays: 4.5, regularWages: 2790, otHours: 19, otStipend: 1473, grossWages: 4263, employeePf: 335, employeeEsi: 21, canteenDeduction: 0, otherDeductions: 0, netPay: 3907, allowanceWorkingDays: 5, roomAllowance: 250, transportAllowance: 150, totalAllowance: 400 },
  { sNo: 17, workerCode: 'AJ017', workerName: 'SUNIL TUDU', department: 'PP3', dailyWages: 620, payDays: 4.5, regularWages: 2790, otHours: 19, otStipend: 1473, grossWages: 4263, employeePf: 335, employeeEsi: 21, canteenDeduction: 0, otherDeductions: 0, netPay: 3907, allowanceWorkingDays: 5, roomAllowance: 250, transportAllowance: 150, totalAllowance: 400 },
  { sNo: 18, workerCode: 'AJ018', workerName: 'AYUSH PASWAN', department: 'HERBAL', dailyWages: 620, payDays: 2.0, regularWages: 1240, otHours: 7, otStipend: 543, grossWages: 1783, employeePf: 149, employeeEsi: 10, canteenDeduction: 0, otherDeductions: 0, netPay: 1624, allowanceWorkingDays: 2, roomAllowance: 100, transportAllowance: 60, totalAllowance: 160 },
  { sNo: 19, workerCode: 'AJ019', workerName: 'BANTI SINGH', department: 'FO', dailyWages: 620, payDays: 2.0, regularWages: 1240, otHours: 7, otStipend: 543, grossWages: 1783, employeePf: 149, employeeEsi: 10, canteenDeduction: 0, otherDeductions: 0, netPay: 1624, allowanceWorkingDays: 2, roomAllowance: 100, transportAllowance: 60, totalAllowance: 160 },
  { sNo: 20, workerCode: 'AJ020', workerName: 'RAJAKUMAR MALIK', department: 'BCM', dailyWages: 620, payDays: 2.0, regularWages: 1240, otHours: 7, otStipend: 543, grossWages: 1783, employeePf: 149, employeeEsi: 10, canteenDeduction: 0, otherDeductions: 0, netPay: 1624, allowanceWorkingDays: 2, roomAllowance: 100, transportAllowance: 60, totalAllowance: 160 },
  { sNo: 21, workerCode: 'AJ021', workerName: 'DHRUVCHAN PASWAN', department: 'BCM', dailyWages: 620, payDays: 1.0, regularWages: 620, otHours: 2, otStipend: 155, grossWages: 775, employeePf: 74, employeeEsi: 5, canteenDeduction: 0, otherDeductions: 0, netPay: 696, allowanceWorkingDays: 1, roomAllowance: 50, transportAllowance: 30, totalAllowance: 80 },
  { sNo: 22, workerCode: 'AJ022', workerName: 'SURJEET', department: 'FO', dailyWages: 620, payDays: 1.0, regularWages: 620, otHours: 2, otStipend: 155, grossWages: 775, employeePf: 74, employeeEsi: 5, canteenDeduction: 0, otherDeductions: 0, netPay: 696, allowanceWorkingDays: 1, roomAllowance: 50, transportAllowance: 30, totalAllowance: 80 },
  { sNo: 23, workerCode: 'AJ023', workerName: 'RAJ GOPAL', department: 'PP3', dailyWages: 620, payDays: 1.0, regularWages: 620, otHours: 2, otStipend: 155, grossWages: 775, employeePf: 74, employeeEsi: 5, canteenDeduction: 0, otherDeductions: 0, netPay: 696, allowanceWorkingDays: 1, roomAllowance: 50, transportAllowance: 30, totalAllowance: 80 },
];

export const ARJUNA_NATURALS_WORKBOOK_BENCHMARK = {
  vendor: {
    vendorCode: 'VEN-JOY-001',
    legalName: 'JOY MANPOWER SERVICE',
    address: 'No.16, Krishna complex, Avinashi main road, Thennampalayam, Arasur PO, Coimbatore - 641 407',
    pan: 'AOAPR4773D',
    gstin: '33AOAPR4773D1Z2',
    sacCode: '998519',
  },
  company: {
    clientCompanyId: 'comp-arjuna-01',
    legalName: 'Arjuna Natural Pvt Ltd',
    address: '15/4B, Sirambarayampalayam Road, Sennappachetty Pudur Post, Karumathampatty Via, Coimbatore-641659',
    gstin: '33AACCA8648K1ZG',
    pfCode: 'CB/CBE/1724259000',
    esicCode: '56001195190001001',
    siteName: 'Factory Premises, Karumathampatty, Coimbatore',
  },
  commercialTerms: {
    periodMonth: '2026-07',
    servicePeriod: '01.07.2026 TO 31.07.2026',
    invoiceNumber: '134/2026-27',
    invoiceDate: '2026-07-31',
    standardDailyWage: 620,
    employerPfPct: 13.0,
    employerEsiPct: 3.25,
    serviceChargePct: 8.0,
    roomAllowanceRatePerDay: 50.0,
    transportAllowanceRatePerDay: 30.0,
    isRoomAllowanceBillable: true,
    isTransportAllowanceBillable: false, // Default in workbook: not in billing subtotal
    cgstPct: 9.0,
    sgstPct: 9.0,
  },
  employeePayrollTotals: {
    totalEmployees: 23,
    totalPayDays: 84.5,
    totalRegularWages: 52390,
    totalOtHours: 346,
    totalOtStipend: 26825,
    totalGrossWages: 79215,
    totalEmployeePf: 6289,
    totalEmployeeEsi: 398,
    totalNetPayToWorkers: 72528,
  },
  allowancesTotals: {
    totalAllowanceWorkingDays: 93,
    totalRoomAllowance: 4650,
    totalTransportAllowance: 2790,
    totalCalculatedAllowance: 7440,
    breakupRoomAllowanceBilled: 7440, // Workbook Breakup Line 5 used 7440
  },
  billingBreakupTotals: {
    contractServicesBase: 79215.0, // Gross wages (Regular + OT)
    employerPfAmount: 6810.7, // 52,390 * 13%
    employerEsiAmount: 1702.675, // 52,390 * 3.25% (rounds to 1,702.68)
    serviceChargeAmount: 6337.2, // 79,215 * 8%
    roomAllowanceAmount: 7440.0,
    billingSubtotal: 101505.575, // 101,505.58
    cgstAmount: 9135.50175, // 9,135.50
    sgstAmount: 9135.50175, // 9,135.50
    grandTotal: 119776.5785, // 119,776.58
    grandTotalRounded: 119777,
    amountInWords: 'Rupees One Lakh Nineteen Thousand Seven Hundred And Seventy Seven Only',
  },
  transportInclusiveScenario: {
    additionalTransportAllowance: 3720.0,
    subtotal: 105225.575, // 101,505.575 + 3,720 = 105,225.58
    cgstAmount: 9470.30175, // 9,470.30
    sgstAmount: 9470.30175, // 9,470.30
    grandTotal: 124166.1785, // 124,166.18
  },
};

/**
 * Maps the 23 Arjuna workers into EmployeePayrollInput array for the Billing Engine
 */
export function getArjunaPayrollInputs(): EmployeePayrollInput[] {
  return ARJUNA_NATURALS_JULY_2026_WORKERS.map((w) => ({
    employeeId: `emp-arjuna-${w.workerCode.toLowerCase()}`,
    employeeCode: w.workerCode,
    employeeName: w.workerName,
    dailyWages: w.dailyWages,
    payDays: w.payDays,
    otHours: w.otHours,
    workingDaysForAllowance: w.allowanceWorkingDays,
  }));
}
