// src/services/vendor/vendorManpowerBillingEngine.ts
// ============================================================================
// Joy PeopleHR — Enterprise Vendor Manpower Billing & Payroll Calculation Engine
// Replicates, standardizes, and validates formula-driven Excel billing breakdowns
// (Workings, Allowance, Breakup, INVOICE, Amount-in-Words generator)
// ============================================================================

export interface EmployeePayrollInput {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  dailyWages: number;
  payDays: number;
  otHours: number;
  arrears?: number;
  deductions?: number;
  workingDaysForAllowance?: number;
}

export interface EmployeePayrollResult {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  dailyWages: number;
  payDays: number;
  regularWages: number;
  otHours: number;
  otStipend: number;
  arrears: number;
  grossWages: number;
  employeePf: number;
  employeeEsi: number;
  deductions: number;
  netPay: number;
}

export interface VendorBillingRuleConfig {
  employerPfPct?: number; // Default 13.0%
  employerEsiPct?: number; // Default 3.25%
  serviceChargePct?: number; // Default 8.0%
  roomAllowancePerDay?: number; // Default ₹50/day
  transportAllowancePerDay?: number; // Default ₹30/day
  fixedRoomAllowance?: number; // Explicit override (e.g. ₹7,440.00 from workbook)
  fixedTransportAllowance?: number; // Explicit override (e.g. ₹3,720.00 scenario)
  isRoomAllowanceBillable?: boolean; // Default true
  isTransportAllowanceBillable?: boolean; // Default false (as per workbook benchmark), or true if PO approves
  isContractWagesGross?: boolean; // Default true (Contract Services base = gross wages including OT)
  statutoryBase?: 'REGULAR_WAGES' | 'GROSS_WAGES'; // Default 'GROSS_WAGES' for backward compatibility, or 'REGULAR_WAGES' for statutory compliance
  cgstPct?: number; // Default 9.0%
  sgstPct?: number; // Default 9.0%
  igstPct?: number; // Default 0.0%
  employeePfPct?: number; // Default 12.0%
  employeeEsiPct?: number; // Default 0.75%
  otMultiplier?: number; // Overtime multiplier (e.g. 1.0x ordinary rate or 1.50x / 2.0x company/statutory policy)
  otWorkingHoursPerDay?: number; // Shift hours (default 8)
  otPolicySnapshot?: {
    policyId: string;
    policyName: string;
    version?: string;
    multiplier: number;
    statutoryMultiplier?: number;
    statutoryFramework?: string;
    workingDaysDivisor?: number;
  };
  roundGrandTotalToNearestRupee?: boolean; // Optional nearest rupee rounding
}

export interface VendorBillingLineExplanation {
  category: string;
  description: string;
  quantity?: number;
  unitPrice?: number;
  amount: number;
  isBillable: boolean;
  explanation: string;
}

export interface VendorBillingBreakupResult {
  totalEmployeesCount: number;
  totalRegularWages: number;
  totalOtStipend: number;
  totalGrossWages: number;
  totalEmployeePf: number;
  totalEmployeeEsi: number;
  totalNetPayableToWorkers: number;

  // Breakdown Sheet Details
  manpowerServiceBase: number;
  contractServicesBase: number;
  employerPfAmount: number;
  employerEsiAmount: number;
  serviceChargesAmount: number;

  // Allowances breakdown
  roomAllowanceTotal: number;
  transportAllowanceTotal: number;
  billableRoomAllowance: number;
  billableTransportAllowance: number;
  isRoomAllowanceBillable: boolean;
  isTransportAllowanceBillable: boolean;
  totalAllowances: number;
  totalBillableAllowances: number;

  billingBaseTaxable: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTaxAmount: number;
  grandTotal: number;
  grandTotalRounded: number;
  grandTotalInWords: string;

  lineItemsSummary: VendorBillingLineExplanation[];
  employeeResults: EmployeePayrollResult[];
  otPolicySnapshot?: {
    policyId: string;
    policyName: string;
    version?: string;
    multiplier: number;
    statutoryMultiplier?: number;
    statutoryFramework?: string;
    workingDaysDivisor?: number;
  };
}

export class VendorManpowerBillingEngine {
  /**
   * Calculate employee payroll line items (Workings sheet formulas)
   */
  public static calculateEmployeePayroll(
    input: EmployeePayrollInput,
    config: VendorBillingRuleConfig = {}
  ): EmployeePayrollResult {
    const pfPct = config.employeePfPct ?? 12.0;
    const esiPct = config.employeeEsiPct ?? 0.75;
    const arrears = input.arrears || 0;
    const deductions = input.deductions || 0;

    // Regular wages = ROUND(Daily Wages * Pay Days, 0)
    const regularWages = Math.round(input.dailyWages * input.payDays);

    // OT stipend = ROUND(((Daily Wages / Shift Hours) * OT Multiplier) * OT Hours, 0)
    const otMult = config.otMultiplier ?? 1.0;
    const shiftHours = config.otWorkingHoursPerDay ?? 8;
    const otStipend = Math.round(((input.dailyWages / shiftHours) * otMult) * input.otHours);

    // Gross wages = ROUND(Regular Wages + OT Stipend + Arrears, 0)
    const grossWages = Math.round(regularWages + otStipend + arrears);

    let employeePf = 0;
    let employeeEsi = 0;

    if (config.statutoryBase === 'REGULAR_WAGES') {
      // Statutory EPF / ESI basis: basic/regular wages excluding OT
      employeePf = Math.round(regularWages * (pfPct / 100));
      employeeEsi = Math.ceil(regularWages * (esiPct / 100));
    } else {
      // Gross wages basis
      employeePf = Math.round(grossWages * (pfPct / 100));
      employeeEsi = Math.ceil(grossWages * (esiPct / 100));
    }

    // Net amount = ROUND(Gross - Deductions - PF - ESI, 0)
    const netPay = Math.round(grossWages - deductions - employeePf - employeeEsi);

    return {
      employeeId: input.employeeId,
      employeeCode: input.employeeCode,
      employeeName: input.employeeName,
      dailyWages: input.dailyWages,
      payDays: input.payDays,
      regularWages,
      otHours: input.otHours,
      otStipend,
      arrears,
      grossWages,
      employeePf,
      employeeEsi,
      deductions,
      netPay,
    };
  }

  /**
   * Calculate complete vendor billing breakup (Breakup & Allowance sheets)
   */
  public static calculateVendorBillingBreakup(
    employees: EmployeePayrollInput[],
    config: VendorBillingRuleConfig = {}
  ): VendorBillingBreakupResult {
    const employerPfPct = config.employerPfPct ?? 13.0;
    const employerEsiPct = config.employerEsiPct ?? 3.25;
    const serviceChargePct = config.serviceChargePct ?? 8.0;
    const roomRate = config.roomAllowancePerDay ?? 50.0;
    const transportRate = config.transportAllowancePerDay ?? 30.0;
    const cgstPct = config.cgstPct ?? 9.0;
    const sgstPct = config.sgstPct ?? 9.0;
    const igstPct = config.igstPct ?? 0.0;

    const employeeResults = employees.map((emp) => this.calculateEmployeePayroll(emp, config));

    let totalRegularWages = 0;
    let totalOtStipend = 0;
    let totalGrossWages = 0;
    let totalEmployeePf = 0;
    let totalEmployeeEsi = 0;
    let totalNetPayableToWorkers = 0;
    let calculatedRoomAllowance = 0;
    let calculatedTransportAllowance = 0;

    employeeResults.forEach((res, idx) => {
      totalRegularWages += res.regularWages;
      totalOtStipend += res.otStipend;
      totalGrossWages += res.grossWages;
      totalEmployeePf += res.employeePf;
      totalEmployeeEsi += res.employeeEsi;
      totalNetPayableToWorkers += res.netPay;

      const workingDays = employees[idx].workingDaysForAllowance ?? res.payDays;
      calculatedRoomAllowance += Math.round(workingDays * roomRate * 100) / 100;
      calculatedTransportAllowance += Math.round(workingDays * transportRate * 100) / 100;
    });

    const roomAllowanceTotal =
      config.fixedRoomAllowance !== undefined ? config.fixedRoomAllowance : calculatedRoomAllowance;
    const transportAllowanceTotal =
      config.fixedTransportAllowance !== undefined ? config.fixedTransportAllowance : calculatedTransportAllowance;
    const totalAllowances = roomAllowanceTotal + transportAllowanceTotal;

    // Billability decisions
    const isRoomAllowanceBillable = config.isRoomAllowanceBillable !== false;
    const isTransportAllowanceBillable =
      config.isTransportAllowanceBillable !== undefined
        ? config.isTransportAllowanceBillable
        : config.fixedTransportAllowance !== undefined; // Billable if explicitly configured or fixed

    const billableRoomAllowance = isRoomAllowanceBillable ? roomAllowanceTotal : 0;
    const billableTransportAllowance = isTransportAllowanceBillable ? transportAllowanceTotal : 0;
    const totalBillableAllowances = billableRoomAllowance + billableTransportAllowance;

    // Base wages
    const manpowerServiceBase = totalRegularWages;
    const contractServicesBase = totalGrossWages;

    // Employer PF = Regular Wages * 13%
    const employerPfAmount = Math.round(totalRegularWages * (employerPfPct / 100) * 100) / 100;

    // Employer ESI = Regular Wages * 3.25%
    const employerEsiAmount = Math.round(totalRegularWages * (employerEsiPct / 100) * 100) / 100;

    // Service charges = Gross Wages * 8%
    const serviceChargesAmount = Math.round(totalGrossWages * (serviceChargePct / 100) * 100) / 100;

    // Determine taxable billing base
    const isContractWagesGross = config.isContractWagesGross !== false;
    const billableManpowerLine = isContractWagesGross ? contractServicesBase : manpowerServiceBase;

    // Taxable Billing Base = Manpower Service Base + Employer PF + Employer ESI + Service Charges + Billable Allowances
    const billingBaseTaxable =
      Math.round(
        (billableManpowerLine +
          employerPfAmount +
          employerEsiAmount +
          serviceChargesAmount +
          totalBillableAllowances) *
          100
      ) / 100;

    // Taxes
    const cgstAmount = Math.round(billingBaseTaxable * (cgstPct / 100) * 100) / 100;
    const sgstAmount = Math.round(billingBaseTaxable * (sgstPct / 100) * 100) / 100;
    const igstAmount = Math.round(billingBaseTaxable * (igstPct / 100) * 100) / 100;
    const totalTaxAmount = cgstAmount + sgstAmount + igstAmount;

    // Grand Total
    const grandTotal = Math.round((billingBaseTaxable + totalTaxAmount) * 100) / 100;
    const grandTotalRounded = Math.round(grandTotal);
    const grandTotalInWords = this.numberToWordsINR(grandTotal);

    // Line items summary with detailed transparency
    const lineItemsSummary: VendorBillingLineExplanation[] = [
      {
        category: 'WAGES',
        description: 'Being the Contract Services for supply of manpower',
        amount: billableManpowerLine,
        isBillable: true,
        explanation: `Contract workforce gross wages (₹${totalRegularWages.toLocaleString('en-IN')} regular + ₹${totalOtStipend.toLocaleString('en-IN')} approved OT stipend across ${employees.length} workers)`,
      },
      {
        category: 'EMPLOYER_PF',
        description: `P.F. Employer Contribution @ ${employerPfPct}%`,
        amount: employerPfAmount,
        isBillable: true,
        explanation: `Calculated as ₹${totalRegularWages.toLocaleString('en-IN')} regular wages × ${employerPfPct}% = ₹${employerPfAmount.toFixed(2)}`,
      },
      {
        category: 'EMPLOYER_ESI',
        description: `E.S.I Employer Contribution @ ${employerEsiPct}%`,
        amount: employerEsiAmount,
        isBillable: true,
        explanation: `Calculated as ₹${totalRegularWages.toLocaleString('en-IN')} regular wages × ${employerEsiPct}% = ₹${employerEsiAmount.toFixed(2)}`,
      },
      {
        category: 'SERVICE_CHARGE',
        description: `Service Charges @ ${serviceChargePct}% on Gross`,
        amount: serviceChargesAmount,
        isBillable: true,
        explanation: `Calculated as ₹${totalGrossWages.toLocaleString('en-IN')} gross wages × ${serviceChargePct}% = ₹${serviceChargesAmount.toFixed(2)}`,
      },
      {
        category: 'ROOM_ALLOWANCE',
        description: 'ADD Room Allowance',
        amount: roomAllowanceTotal,
        isBillable: isRoomAllowanceBillable,
        explanation: isRoomAllowanceBillable
          ? `Approved billable room allowance under PO terms: ₹${roomAllowanceTotal.toFixed(2)}`
          : `Room allowance excluded from client billing as per PO commercial terms`,
      },
      {
        category: 'TRANSPORT_ALLOWANCE',
        description: 'ADD Transport Allowance',
        amount: transportAllowanceTotal,
        isBillable: isTransportAllowanceBillable,
        explanation: isTransportAllowanceBillable
          ? `Approved billable transport allowance under PO terms: ₹${transportAllowanceTotal.toFixed(2)}`
          : `Transport allowance excluded from client billing subtotal (retained in employee payroll / benefits)`,
      },
      {
        category: 'TAX_CGST',
        description: `CGST @ ${cgstPct}% on Billing Amount`,
        amount: cgstAmount,
        isBillable: true,
        explanation: `Central GST: ₹${billingBaseTaxable.toFixed(2)} taxable subtotal × ${cgstPct}% = ₹${cgstAmount.toFixed(2)}`,
      },
      {
        category: 'TAX_SGST',
        description: `SGST @ ${sgstPct}% on Billing Amount`,
        amount: sgstAmount,
        isBillable: true,
        explanation: `State GST: ₹${billingBaseTaxable.toFixed(2)} taxable subtotal × ${sgstPct}% = ₹${sgstAmount.toFixed(2)}`,
      },
    ];

    return {
      totalEmployeesCount: employees.length,
      totalRegularWages,
      totalOtStipend,
      totalGrossWages,
      totalEmployeePf,
      totalEmployeeEsi,
      totalNetPayableToWorkers,
      manpowerServiceBase,
      contractServicesBase,
      employerPfAmount,
      employerEsiAmount,
      serviceChargesAmount,
      roomAllowanceTotal,
      transportAllowanceTotal,
      billableRoomAllowance,
      billableTransportAllowance,
      isRoomAllowanceBillable,
      isTransportAllowanceBillable,
      totalAllowances,
      totalBillableAllowances,
      billingBaseTaxable,
      cgstAmount,
      sgstAmount,
      igstAmount,
      totalTaxAmount,
      grandTotal,
      grandTotalRounded,
      grandTotalInWords,
      lineItemsSummary,
      employeeResults,
      otPolicySnapshot: config.otPolicySnapshot,
    };
  }

  /**
   * Converts a numeric INR monetary value to words (Lakhs / Thousands / Hundreds / Paise)
   */
  public static numberToWordsINR(amount: number): string {
    if (amount <= 0) return 'Rupees Zero Only';

    const rupees = Math.floor(amount);
    const paise = Math.round((amount - rupees) * 100);

    const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = [
      'Ten',
      'Eleven',
      'Twelve',
      'Thirteen',
      'Fourteen',
      'Fifteen',
      'Sixteen',
      'Seventeen',
      'Eighteen',
      'Nineteen',
    ];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const convertBelowThousand = (num: number): string => {
      let str = '';
      if (num >= 100) {
        str += units[Math.floor(num / 100)] + ' Hundred ';
        num %= 100;
      }
      if (num >= 20) {
        const tensDigit = Math.floor(num / 10);
        const unitDigit = num % 10;
        if (unitDigit > 0) {
          str += tens[tensDigit] + '-' + units[unitDigit] + ' ';
        } else {
          str += tens[tensDigit] + ' ';
        }
        num = 0;
      } else if (num >= 10) {
        str += teens[num - 10] + ' ';
        num = 0;
      }
      if (num > 0) {
        str += units[num] + ' ';
      }
      return str.trim();
    };

    let result = '';
    let currentRupees = rupees;

    if (currentRupees >= 10000000) {
      const crore = Math.floor(currentRupees / 10000000);
      result += convertBelowThousand(crore) + ' Crore ';
      currentRupees %= 10000000;
    }
    if (currentRupees >= 100000) {
      const lakh = Math.floor(currentRupees / 100000);
      result += convertBelowThousand(lakh) + ' Lakh ';
      currentRupees %= 100000;
    }
    if (currentRupees >= 1000) {
      const thousand = Math.floor(currentRupees / 1000);
      result += convertBelowThousand(thousand) + ' Thousand ';
      currentRupees %= 1000;
    }
    if (currentRupees > 0) {
      result += convertBelowThousand(currentRupees);
    }

    result = result.trim();
    let words = `Rupees ${result}`;

    if (paise > 0) {
      const paiseWords = convertBelowThousand(paise);
      words += ` and ${paiseWords} Paise`;
    }

    return `${words} Only`;
  }
}