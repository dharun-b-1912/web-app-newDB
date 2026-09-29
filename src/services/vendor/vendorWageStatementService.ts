// src/services/vendor/vendorWageStatementService.ts
// ============================================================================
// Joy PeopleHR — Comprehensive Wage Statement, Commercial Breakup & Invoice Engine
// Implements 1:1 mathematical fidelity to the statutory D WAGES, BREAKUP, and INVOICE sheets.
// Fully configurable for custom billing cycles (26th-25th, calendar), department rates,
// Sunday/week-off OT treatment, and service charge rates.
// ============================================================================

import * as XLSX from 'xlsx';
import { BillingCycleConfig, DEFAULT_JOY_BILLING_CONFIG } from '../../types/billingCycle';
import { MRReportRecord } from './universalSheetParsers/types';

export interface WageStatementRecord {
  sNo: number;
  workerCode: string;
  workerName: string;
  department: string;
  uanNumber: string;
  esiNumber: string;
  dailyWage: number;
  wDays: number;
  nfh: number;
  payDays: number;
  basic55: number;
  hra45: number;
  wages: number;
  otHours: number;
  otStipend: number;
  fAllowance: number;
  nAllowance: number;
  attnBonus: number;
  arrears: number;
  gross: number;
  esiWages: number;
  pf12: number;
  esi075: number;
  canteen: number;
  rent: number;
  otherDed: number;
  netAmount: number;
  signature?: string;
}

export interface WageStatementTotals {
  totalWorkers: number;
  totalWDays: number;
  totalNfh: number;
  totalPayDays: number;
  totalBasic55: number;
  totalHra45: number;
  totalWages: number;
  totalOtHours: number;
  totalOtStipend: number;
  totalFAllowance: number;
  totalNAllowance: number;
  totalAttnBonus: number;
  totalArrears: number;
  totalGross: number;
  totalEsiWages: number;
  totalPf12: number;
  totalEsi075: number;
  totalCanteen: number;
  totalRent: number;
  totalOtherDed: number;
  totalNetAmount: number;
}

export interface CommercialBreakupData {
  periodDescription: string;
  clientName: string;
  vendorName: string;
  grossManpowerWages: number;
  pfBase: number;
  pfEmployerPct: number;
  pfEmployerAmount: number;
  esiBase: number;
  esiEmployerPct: number;
  esiEmployerAmount: number;
  serviceChargePct: number;
  serviceChargeAmount: number;
  subtotalTaxable: number;
  cgstPct: number;
  cgstAmount: number;
  sgstPct: number;
  sgstAmount: number;
  grandTotal: number;
  grandTotalRounded: number;
  amountInWords: string;
  // Deductions & Allowances for reconciliation
  canteenDeductionTotal: number;
  roomRentDeductionTotal: number;
  roomAllowanceTotal: number;
}

export interface TaxInvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  vendorName: string;
  vendorAddress: string[];
  vendorMobile: string;
  vendorGstin: string;
  vendorPan: string;
  clientName: string;
  clientAddress: string[];
  clientGstin: string;
  sacCode: string;
  pfCode: string;
  esicCode: string;
  periodDescription: string;
  taxableAmount: number;
  cgstPct: number;
  cgstAmount: number;
  sgstPct: number;
  sgstAmount: number;
  totalInvoiceAmount: number;
  amountInWords: string;
}

export interface CompleteWageStatementResult {
  config: BillingCycleConfig;
  records: WageStatementRecord[];
  totals: WageStatementTotals;
  breakup: CommercialBreakupData;
  invoice: TaxInvoiceData;
}

export class VendorWageStatementService {
  /**
   * Generates complete wage statement, commercial breakup, and tax invoice
   * from parsed MR / Attendance records and configurable policy.
   */
  public static calculateStatement(
    sourceRecords: MRReportRecord[] | any[],
    customConfig?: Partial<BillingCycleConfig>,
    customOverrides?: Record<string, { dailyWage?: number; uan?: string; esiNumber?: string; canteen?: number; rent?: number; attnBonus?: number; arrears?: number }>
  ): CompleteWageStatementResult {
    const config: BillingCycleConfig = { ...DEFAULT_JOY_BILLING_CONFIG, ...customConfig };

    const records: WageStatementRecord[] = [];

    let totalWDays = 0;
    let totalNfh = 0;
    let totalPayDays = 0;
    let totalBasic55 = 0;
    let totalHra45 = 0;
    let totalWages = 0;
    let totalOtHours = 0;
    let totalOtStipend = 0;
    let totalFAllowance = 0;
    let totalNAllowance = 0;
    let totalAttnBonus = 0;
    let totalArrears = 0;
    let totalGross = 0;
    let totalEsiWages = 0;
    let totalPf12 = 0;
    let totalEsi075 = 0;
    let totalCanteen = 0;
    let totalRent = 0;
    let totalOtherDed = 0;
    let totalNetAmount = 0;

    sourceRecords.forEach((rec, idx) => {
      const empId = String(rec.employeeId || rec.workerCode || rec.punchingNo || rec.empCode || '').trim();
      const empName = String(rec.employeeName || rec.workerName || rec.name || `Employee ${empId}`).trim();
      const dept = String(rec.department || rec.dept || 'Operations').trim();

      const override = customOverrides?.[empId] || {};

      // 1. Daily Wage rate (default 605, or from override, or source)
      const dailyWage = override.dailyWage ?? (rec.dailyWage || rec.rate || rec.dailyWages || 605);

      // 2. Days
      const wDays = rec.presentDays ?? rec.wDays ?? rec.workingDays ?? rec.payDays ?? 0;
      const nfh = rec.nfh ?? 0;
      // Formula J = H + I (W Days + NFH)
      const payDays = wDays + nfh;

      // 3. Basic & HRA
      // Formula K = ROUND((G * J) * 55%, 0)
      const basic55 = Math.round(dailyWage * payDays * (config.basicPercentage / 100));
      // Formula L = ROUND((G * J) * 45%, 0)
      const hra45 = Math.round(dailyWage * payDays * (config.hraPercentage / 100));
      // Formula M = K + L
      const wages = basic55 + hra45;

      // 4. Overtime & Allowances
      const otHours = rec.otHours ?? 0;
      // Formula O = ROUND((+G * 55% / 8 * 2) * N, 0)
      const basicHourlyRate = (dailyWage * (config.basicPercentage / 100)) / config.shiftHours;
      const otRate = basicHourlyRate * config.otMultiplier;
      const otStipend = Math.round(otRate * otHours);

      // Food Allowance (FA)
      // If FA is already provided in rec (e.g. 460), use it; else if faQualifyingDays is given, days * 20
      let fAllowance = 0;
      if (rec.faAmount !== undefined && rec.faAmount > 0) {
        fAllowance = rec.faAmount;
      } else if (rec.fAllowance !== undefined && rec.fAllowance > 0) {
        fAllowance = rec.fAllowance;
      } else if (rec.faQualifyingDays !== undefined && rec.faQualifyingDays > 0) {
        fAllowance = rec.faQualifyingDays * config.foodAllowancePerDay;
      } else if (rec.otGte4hDays !== undefined && rec.otGte4hDays > 0) {
        fAllowance = rec.otGte4hDays * config.foodAllowancePerDay;
      }

      // Night / Sunday Allowance (NA)
      let nAllowance = 0;
      if (rec.naAmount !== undefined && rec.naAmount > 0) {
        nAllowance = rec.naAmount;
      } else if (rec.nAllowance !== undefined && rec.nAllowance > 0) {
        nAllowance = rec.nAllowance;
      } else if (rec.naQualifyingDays !== undefined && rec.naQualifyingDays > 0) {
        nAllowance = rec.naQualifyingDays * config.nightAllowancePerDay;
      } else if (rec.otGte8hDays !== undefined && rec.otGte8hDays > 0) {
        nAllowance = rec.otGte8hDays * config.nightAllowancePerDay;
      }

      const attnBonus = override.attnBonus ?? (rec.attnBonus || 0);
      const arrears = override.arrears ?? (rec.arrears || 0);

      // 5. GROSS
      // Formula T = ROUND(K + L + O + P + Q + R + S, 0)
      const gross = Math.round(basic55 + hra45 + otStipend + fAllowance + nAllowance + attnBonus + arrears);

      // 6. ESI WAGES
      // Formula U = T - L (Gross - HRA)
      const esiWages = config.esiWagesBasis === 'GROSS_MINUS_HRA' ? gross - hra45 : gross;

      // 7. Deductions
      // Formula V = ROUND(+K * 12%, 0)
      const pf12 = Math.round(basic55 * (config.pfEmployeePct / 100));
      // Formula W = CEILING(U * 0.75%, 1)
      const esi075 = Math.ceil(esiWages * (config.esiEmployeePct / 100));

      const canteen = override.canteen ?? (rec.canteenDeduction ?? rec.canteen ?? 0);
      const rent = override.rent ?? (rec.rentDeduction ?? rec.rent ?? 0);
      const otherDed = rec.otherDed ?? 0;

      // 8. NET AMOUNT
      // Formula AA = ROUND(T - X - Y - V - W - Z, 0)
      const netAmount = Math.round(gross - canteen - rent - pf12 - esi075 - otherDed);

      // Accumulate totals
      totalWDays += wDays;
      totalNfh += nfh;
      totalPayDays += payDays;
      totalBasic55 += basic55;
      totalHra45 += hra45;
      totalWages += wages;
      totalOtHours += otHours;
      totalOtStipend += otStipend;
      totalFAllowance += fAllowance;
      totalNAllowance += nAllowance;
      totalAttnBonus += attnBonus;
      totalArrears += arrears;
      totalGross += gross;
      totalEsiWages += esiWages;
      totalPf12 += pf12;
      totalEsi075 += esi075;
      totalCanteen += canteen;
      totalRent += rent;
      totalOtherDed += otherDed;
      totalNetAmount += netAmount;

      records.push({
        sNo: idx + 1,
        workerCode: empId,
        workerName: empName,
        department: dept,
        uanNumber: override.uan ?? (rec.uan || rec.uanNumber || '—'),
        esiNumber: override.esiNumber ?? (rec.esiNumber || rec.esicNumber || '—'),
        dailyWage,
        wDays,
        nfh,
        payDays,
        basic55,
        hra45,
        wages,
        otHours,
        otStipend,
        fAllowance,
        nAllowance,
        attnBonus,
        arrears,
        gross,
        esiWages,
        pf12,
        esi075,
        canteen,
        rent,
        otherDed,
        netAmount,
      });
    });

    const totals: WageStatementTotals = {
      totalWorkers: records.length,
      totalWDays,
      totalNfh,
      totalPayDays,
      totalBasic55,
      totalHra45,
      totalWages,
      totalOtHours,
      totalOtStipend,
      totalFAllowance,
      totalNAllowance,
      totalAttnBonus,
      totalArrears,
      totalGross,
      totalEsiWages,
      totalPf12,
      totalEsi075,
      totalCanteen,
      totalRent,
      totalOtherDed,
      totalNetAmount,
    };

    // Calculate Commercial Breakup matching BREAKUP sheet
    const pfEmployerAmount = Math.round(totalBasic55 * (config.pfEmployerPct / 100) * 100) / 100;
    const esiEmployerAmount = Math.round(totalEsiWages * (config.esiEmployerPct / 100) * 100) / 100;
    const serviceChargeAmount = Math.round(totalGross * (config.serviceChargePct / 100) * 100) / 100;

    const subtotalTaxable = Math.round((totalGross + pfEmployerAmount + esiEmployerAmount + serviceChargeAmount) * 100) / 100;
    const cgstAmount = Math.round(subtotalTaxable * (config.cgstPct / 100) * 100) / 100;
    const sgstAmount = Math.round(subtotalTaxable * (config.sgstPct / 100) * 100) / 100;
    const grandTotal = Math.round((subtotalTaxable + cgstAmount + sgstAmount) * 100) / 100;
    const grandTotalRounded = Math.round(grandTotal);

    const roomAllowanceTotal = records.filter(r => r.rent > 0 || r.department === 'IMD' || r.department === 'AUTOMATION').length * config.roomAllowancePerMonth;

    const breakup: CommercialBreakupData = {
      periodDescription: config.periodDescription,
      clientName: config.clientName || 'Watertec India Private Limited - Unit - Ill',
      vendorName: 'JOY MANPOWER SERVICE',
      grossManpowerWages: totalGross,
      pfBase: totalBasic55,
      pfEmployerPct: config.pfEmployerPct,
      pfEmployerAmount,
      esiBase: totalEsiWages,
      esiEmployerPct: config.esiEmployerPct,
      esiEmployerAmount,
      serviceChargePct: config.serviceChargePct,
      serviceChargeAmount,
      subtotalTaxable,
      cgstPct: config.cgstPct,
      cgstAmount,
      sgstPct: config.sgstPct,
      sgstAmount,
      grandTotal,
      grandTotalRounded,
      amountInWords: this.numberToIndianWords(grandTotalRounded),
      canteenDeductionTotal: totalCanteen,
      roomRentDeductionTotal: totalRent,
      roomAllowanceTotal,
    };

    const invoice: TaxInvoiceData = {
      invoiceNumber: config.invoiceNumberFormat,
      invoiceDate: '27/09/2026',
      vendorName: 'JOY MANPOWER SERVICE',
      vendorAddress: [
        'No.16, Krishna complex, Avinashi main road,',
        'Thennampalayam, Arasur PO,',
        'Coimbatore - 641 407.',
      ],
      vendorMobile: '9080776580',
      vendorGstin: '33AOAPR4773D1Z2',
      vendorPan: 'AOAPR4773D',
      clientName: config.clientName || 'Watertec India Private Limited - Unit - Ill',
      clientAddress: [
        'S.F. NO 129/2, Karavali Madhapur,',
        'Sulur Taluk, Coimbatore – 641668',
      ],
      clientGstin: '33AAACW1645G1ZM',
      sacCode: config.sacCode,
      pfCode: 'CB/CBE/1724259000',
      esicCode: '56001195190001001',
      periodDescription: `Being the Contract Services for supply of manpower at your Factory permises from ${config.periodDescription}`,
      taxableAmount: subtotalTaxable,
      cgstPct: config.cgstPct,
      cgstAmount,
      sgstPct: config.sgstPct,
      sgstAmount,
      totalInvoiceAmount: grandTotal,
      amountInWords: this.numberToIndianWords(grandTotalRounded),
    };

    return {
      config,
      records,
      totals,
      breakup,
      invoice,
    };
  }

  /**
   * Convert numbers to Indian Rupees Words
   */
  public static numberToIndianWords(num: number): string {
    if (num === 0) return 'Rupees Zero Only';

    const a = [
      '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
      'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
    ];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const formatTens = (n: number): string => {
      if (n < 20) return a[n];
      return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
    };

    const formatHundreds = (n: number): string => {
      let str = '';
      if (Math.floor(n / 100) > 0) {
        str += a[Math.floor(n / 100)] + ' Hundred ';
        n %= 100;
        if (n > 0) {
          str += 'And ';
        }
      }
      if (n > 0) {
        str += formatTens(n);
      }
      return str.trim();
    };

    let n = Math.floor(Math.abs(num));
    const crores = Math.floor(n / 10000000);
    n %= 10000000;
    const lakhs = Math.floor(n / 100000);
    n %= 100000;
    const thousands = Math.floor(n / 1000);
    n %= 1000;
    const remainder = n;

    let res = '';
    if (crores > 0) res += formatHundreds(crores) + (crores > 1 ? ' Crores ' : ' Crore ');
    if (lakhs > 0) res += formatHundreds(lakhs) + (lakhs > 1 ? ' Lakhs ' : ' Lakh ');
    if (thousands > 0) res += formatHundreds(thousands) + ' Thousand ';
    if (remainder > 0) res += formatHundreds(remainder);

    return `Rupees : ${res.trim()} Only /-`;
  }

  /**
   * Export complete workbook (D WAGES, BREAKUP, INVOICE) to an Excel XLSX file
   */
  public static exportToExcel(result: CompleteWageStatementResult, filename = 'Salary_Statement.xlsx'): void {
    const wb = XLSX.utils.book_new();

    // 1. D WAGES SHEET
    const dWagesRows: any[][] = [
      ['JOY MANPOWER SERVICE WAGES FOR THE MONTH OF SEPTEMBER 2026'],
      [
        'S NO', 'PUNCHING NO', 'NAME', 'DEPT', 'UAN Number', 'ESI Number',
        'D WAGES', 'W DAYS', 'NFH', 'PAY DAYS', 'BASIC 55%', 'HRA 45%', 'Wages',
        'OT', 'OT STIPEND', 'F.ALLOW', 'N.ALLOW', 'ATTN BONUS', 'ARREARS', 'GROSS',
        'ESI WAGES', 'PF 12%', 'ESI 0.75%', 'CANTEEN', 'RENT', 'OTHER DED', 'NET AMOUNT'
      ]
    ];

    result.records.forEach((r) => {
      dWagesRows.push([
        r.sNo,
        r.workerCode,
        r.workerName,
        r.department,
        r.uanNumber,
        r.esiNumber,
        r.dailyWage,
        r.wDays,
        r.nfh,
        r.payDays,
        r.basic55,
        r.hra45,
        r.wages,
        r.otHours,
        r.otStipend,
        r.fAllowance,
        r.nAllowance,
        r.attnBonus,
        r.arrears,
        r.gross,
        r.esiWages,
        r.pf12,
        r.esi075,
        r.canteen,
        r.rent,
        r.otherDed,
        r.netAmount,
      ]);
    });

    const tot = result.totals;
    dWagesRows.push([
      'TOTAL', '*', '*', '*', '*', '*', '*',
      tot.totalWDays, tot.totalNfh, tot.totalPayDays,
      tot.totalBasic55, tot.totalHra45, tot.totalWages,
      tot.totalOtHours, tot.totalOtStipend, tot.totalFAllowance, tot.totalNAllowance,
      tot.totalAttnBonus, tot.totalArrears, tot.totalGross,
      tot.totalEsiWages, tot.totalPf12, tot.totalEsi075,
      tot.totalCanteen, tot.totalRent, tot.totalOtherDed, tot.totalNetAmount
    ]);

    const wsD = XLSX.utils.aoa_to_sheet(dWagesRows);
    XLSX.utils.book_append_sheet(wb, wsD, 'D WAGES');

    // 2. BREAKUP SHEET
    const brk = result.breakup;
    const breakupRows: any[][] = [
      ['WAGES BREAKUP FOR THE MONTH OF SEPTEMBER 2026'],
      [],
      ['S.NO.', 'PARTICULARS', 'BASE', 'AMOUNT'],
      [1, `Being the Contract Services for supply of manpower at your Factory permises from ${brk.periodDescription}`, '', brk.grossManpowerWages],
      [2, `P.F.Employer Contribution @ ${brk.pfEmployerPct}% Rs.`, brk.pfBase, brk.pfEmployerAmount],
      [3, `E.S.I Employer Contribution @ ${brk.esiEmployerPct}% Rs.`, brk.esiBase, brk.esiEmployerAmount],
      [4, `Service Charges @ ${brk.serviceChargePct}% on Gross`, brk.grossManpowerWages, brk.serviceChargeAmount],
      ['', 'TOTAL TAXABLE', '', brk.subtotalTaxable],
      [5, `CGST @ ${brk.cgstPct}% on Billing Amount`, '', brk.cgstAmount],
      [6, `SGST @ ${brk.sgstPct}% on Billing Amount`, '', brk.sgstAmount],
      ['', 'GRAND TOTAL', '', brk.grandTotal],
      [brk.amountInWords],
      [],
      [1, 'Canteen Deduction', brk.canteenDeductionTotal],
      [2, 'Room Rent deduction', brk.roomRentDeductionTotal],
      [3, 'ADD Room Rent', brk.roomAllowanceTotal],
    ];

    const wsB = XLSX.utils.aoa_to_sheet(breakupRows);
    XLSX.utils.book_append_sheet(wb, wsB, 'BREAKUP');

    // 3. INVOICE SHEET
    const inv = result.invoice;
    const invoiceRows: any[][] = [
      ['TAX INVOICE'],
      ['Mobile - ' + inv.vendorMobile],
      ['GSTIN Number - ' + inv.vendorGstin],
      [],
      ['From:', inv.vendorName, '', 'Invoice Number:', inv.invoiceNumber],
      [inv.vendorAddress[0], '', '', 'Invoice Date:', inv.invoiceDate],
      [inv.vendorAddress[1], '', '', 'PAN Number:', inv.vendorPan],
      [inv.vendorAddress[2], '', '', 'SAC Code:', inv.sacCode],
      ['GSTIN Number: ' + inv.vendorGstin, '', '', 'PF Code:', inv.pfCode],
      ['', '', '', 'ESIC Code:', inv.esicCode],
      [],
      ['To:', inv.clientName],
      [inv.clientAddress[0]],
      [inv.clientAddress[1]],
      ['GSTIN Number: ' + inv.clientGstin],
      [],
      ['S.No', 'Particulars', 'Amount (INR)'],
      [1, inv.periodDescription, inv.taxableAmount],
      [2, `CGST @ ${inv.cgstPct}% on Billing Amount`, inv.cgstAmount],
      [3, `SGST @ ${inv.sgstPct}% on Billing Amount`, inv.sgstAmount],
      ['', 'TOTAL AMOUNT', inv.totalInvoiceAmount],
      [inv.amountInWords]
    ];

    const wsI = XLSX.utils.aoa_to_sheet(invoiceRows);
    XLSX.utils.book_append_sheet(wb, wsI, 'INVOICE');

    XLSX.writeFile(wb, filename);
  }
}
