// src/services/payroll/payrollRoundingService.ts
// ============================================================================
// JOY PeopleHR — Centralized Payroll & Statutory Rounding Service
// Ensures consistent rounding across Payroll, Registers, Payslips, and Exports
// ============================================================================

export type PayrollRoundingMode =
  | 'ROUND_HALF_UP'    // Standard mathematical rounding (>= 0.5 rounds up)
  | 'ROUND_HALF_DOWN'  // Half down
  | 'ROUND_UP'         // Ceil to next unit
  | 'ROUND_DOWN'       // Floor to lower unit
  | 'TRUNCATE'         // Truncate decimals
  | 'NEAREST_TEN'      // Round to nearest 10
  | 'EXACT';           // Retain exact floating point value

export interface RoundingResult {
  rawValue: number;
  roundedValue: number;
  roundingDifference: number;
  roundingRule: PayrollRoundingMode;
  precision: number;
}

export class PayrollRoundingService {
  /**
   * Applies configured rounding rule to an amount at a specific precision.
   * @param amount The raw decimal amount
   * @param mode Rounding mode (default: ROUND_HALF_UP)
   * @param precision Decimal places (default: 0 for currency rupees, 2 for paise)
   */
  public static round(
    amount: number,
    mode: PayrollRoundingMode = 'ROUND_HALF_UP',
    precision: number = 0
  ): RoundingResult {
    if (isNaN(amount) || !isFinite(amount)) {
      return {
        rawValue: 0,
        roundedValue: 0,
        roundingDifference: 0,
        roundingRule: mode,
        precision,
      };
    }

    const factor = Math.pow(10, precision);
    let rounded: number;

    switch (mode) {
      case 'ROUND_UP':
        rounded = Math.ceil(amount * factor) / factor;
        break;
      case 'ROUND_DOWN':
      case 'TRUNCATE':
        rounded = Math.floor(amount * factor) / factor;
        break;
      case 'ROUND_HALF_DOWN':
        // If exact half (0.5), round down; otherwise round normally
        const multiplied = amount * factor;
        const floorVal = Math.floor(multiplied);
        const frac = multiplied - floorVal;
        rounded = (frac <= 0.5 ? floorVal : Math.ceil(multiplied)) / factor;
        break;
      case 'NEAREST_TEN':
        rounded = Math.round(amount / 10) * 10;
        break;
      case 'EXACT':
        rounded = Number(amount.toFixed(precision));
        break;
      case 'ROUND_HALF_UP':
      default:
        rounded = Math.round(amount * factor) / factor;
        break;
    }

    const diff = Number((rounded - amount).toFixed(6));

    return {
      rawValue: Number(amount.toFixed(4)),
      roundedValue: rounded,
      roundingDifference: diff,
      roundingRule: mode,
      precision,
    };
  }

  /**
   * Statutory EPF Rounding: Nearest Indian Rupee per employee (precision = 0)
   */
  public static roundEPF(amount: number): RoundingResult {
    return this.round(amount, 'ROUND_HALF_UP', 0);
  }

  /**
   * Statutory ESIC Rounding: Round to next higher rupee or standard round per employee
   */
  public static roundESI(amount: number, useCeil: boolean = false): RoundingResult {
    return this.round(amount, useCeil ? 'ROUND_UP' : 'ROUND_HALF_UP', 0);
  }

  /**
   * Currency display format (e.g. ₹12,225.00)
   */
  public static formatINR(amount: number, showDecimals: boolean = true): string {
    const formatted = Math.abs(amount).toLocaleString('en-IN', {
      minimumFractionDigits: showDecimals ? 2 : 0,
      maximumFractionDigits: showDecimals ? 2 : 0,
    });
    return `${amount < 0 ? '-' : ''}₹${formatted}`;
  }

  /**
   * Converts numerical amount to Indian Rupee Words (with Lakhs, Crores and Paise)
   * Example: 258367.50 -> "Rupees Two Lakh Fifty-Eight Thousand Three Hundred Sixty-Seven and Fifty Paise Only"
   */
  public static amountInWordsINR(amount: number): string {
    const absVal = Math.abs(amount);
    const rupees = Math.floor(absVal);
    const paise = Math.round((absVal - rupees) * 100);

    const ones = [
      '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
      'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
    ];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const formatTwoDigits = (n: number): string => {
      if (n === 0) return '';
      if (n < 20) return ones[n];
      const t = tens[Math.floor(n / 10)];
      const o = ones[n % 10];
      return o ? `${t}-${o}` : t;
    };

    const formatThreeDigits = (n: number): string => {
      let str = '';
      if (n >= 100) {
        str += `${ones[Math.floor(n / 100)]} Hundred `;
        n %= 100;
      }
      if (n > 0) {
        str += formatTwoDigits(n);
      }
      return str.trim();
    };

    if (rupees === 0 && paise === 0) return 'Zero Rupees Only';

    let words = '';
    const crore = Math.floor(rupees / 10000000);
    let rem = rupees % 10000000;
    const lakh = Math.floor(rem / 100000);
    rem = rem % 100000;
    const thousand = Math.floor(rem / 1000);
    rem = rem % 1000;

    if (crore > 0) words += `${formatThreeDigits(crore)} Crore `;
    if (lakh > 0) words += `${formatThreeDigits(lakh)} Lakh `;
    if (thousand > 0) words += `${formatThreeDigits(thousand)} Thousand `;
    if (rem > 0) words += `${formatThreeDigits(rem)} `;

    words = words.trim();
    let result = words.length > 0 ? `Rupees ${words}` : '';

    if (paise > 0) {
      const paiseStr = `${formatTwoDigits(paise)} Paise`;
      result = result.length > 0 ? `${result} and ${paiseStr} Only` : `${paiseStr} Only`;
    } else {
      result += ' Only';
    }

    return result.replace(/\s+/g, ' ');
  }
}
