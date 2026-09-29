// src/services/vendor/bullPlant1/bullPlant1ColumnMap.ts
// ============================================================================
// Joy PeopleHR — Bull Plant 1 Semantic Header & Column Mapping
// Spec Section 7: Decouples physical Excel column index positions from internal
// component keys. Resolves headers dynamically by canonical component code and aliases.
// ============================================================================

export interface BullColumnDefinition {
  fieldKey: string;
  defaultHeader: string;
  aliases: string[];
  category: 'IDENTITY' | 'ATTENDANCE' | 'EARNINGS' | 'DEDUCTIONS' | 'SUMMARY' | 'EMPLOYER_COST' | 'METADATA';
  format?: 'INR' | 'NUMBER' | 'PERCENT' | 'TEXT' | 'DATE';
  width: number;
}

export const BULL_PLANT_1_COLUMNS: BullColumnDefinition[] = [
  { fieldKey: 's_no', defaultHeader: 'Sl No', aliases: ['SNO', 'SI.NO', 'SL NO'], category: 'IDENTITY', format: 'NUMBER', width: 8 },
  { fieldKey: 'emp_id', defaultHeader: 'Emp ID', aliases: ['EMP ID', 'EMPLOYEE ID', 'EMP NO', 'TOKEN NO'], category: 'IDENTITY', format: 'TEXT', width: 12 },
  { fieldKey: 'emp_name', defaultHeader: 'Employee Name', aliases: ['EMPLOYEE NAME', 'NAME', 'WORKER NAME'], category: 'IDENTITY', format: 'TEXT', width: 24 },
  { fieldKey: 'month_year', defaultHeader: 'Month/ Year', aliases: ['MONTH/YEAR', 'PERIOD', 'CYCLE'], category: 'IDENTITY', format: 'TEXT', width: 14 },
  
  // Attendance metrics
  { fieldKey: 'pay_days', defaultHeader: 'Pay Days', aliases: ['PAY DAYS', 'PAYABLE DAYS', 'PAID DAYS'], category: 'ATTENDANCE', format: 'NUMBER', width: 10 },
  { fieldKey: 'present_days', defaultHeader: 'Present Days', aliases: ['PRESENT DAYS', 'W DAYS', 'WORK DAYS'], category: 'ATTENDANCE', format: 'NUMBER', width: 12 },
  { fieldKey: 'sal_cal_days', defaultHeader: 'Sal Cal Days', aliases: ['SAL CAL DAYS', 'SALARY DAYS', 'CALENDAR DAYS'], category: 'ATTENDANCE', format: 'NUMBER', width: 12 },
  
  // Earnings Breakup
  { fieldKey: 'basic', defaultHeader: 'BASIC', aliases: ['BASIC', 'BASIC 55%', 'BASIC 56%', 'BASIC WAGE'], category: 'EARNINGS', format: 'INR', width: 14 },
  { fieldKey: 'hra', defaultHeader: 'HRA', aliases: ['HRA', 'HRA 45%', 'HRA 10%', 'HOUSE RENT'], category: 'EARNINGS', format: 'INR', width: 14 },
  { fieldKey: 'ta', defaultHeader: 'TA', aliases: ['TA', 'TRANSPORT ALLOWANCE', 'CONVEYANCE'], category: 'EARNINGS', format: 'INR', width: 12 },
  { fieldKey: 'turn_perf', defaultHeader: 'TURNPERF', aliases: ['TURNPERF', 'TURNAROUND', 'TURN PERF'], category: 'EARNINGS', format: 'INR', width: 14 },
  { fieldKey: 'hod_ass_perf', defaultHeader: 'HODASSPERF', aliases: ['HODASSPERF', 'HOD ASSESSMENT', 'HOD PERF'], category: 'EARNINGS', format: 'INR', width: 15 },
  { fieldKey: 'task_perf', defaultHeader: 'TASKPERF', aliases: ['TASKPERF', 'TASK PERFORMANCE', 'TASK PERF'], category: 'EARNINGS', format: 'INR', width: 14 },
  
  // Rate & Overtime
  { fieldKey: 'daily_rate', defaultHeader: 'PER DAY', aliases: ['PER DAY', 'D WAGE', 'DAILY WAGE', 'RATE PER DAY'], category: 'ATTENDANCE', format: 'INR', width: 12 },
  { fieldKey: 'ot_amount', defaultHeader: 'OT AMOUNT', aliases: ['OT AMOUNT', 'OT AMT', 'OVERTIME AMOUNT', 'OT'], category: 'EARNINGS', format: 'INR', width: 14 },
  { fieldKey: 'attd_gift', defaultHeader: 'ATTD GIFT', aliases: ['ATTD GIFT', 'ATTN BONUS', 'ATTENDANCE BONUS', 'GIFT'], category: 'EARNINGS', format: 'INR', width: 13 },
  { fieldKey: 'reward', defaultHeader: 'REWARD', aliases: ['REWARD', 'SPECIAL INCENTIVE', 'BONUS'], category: 'EARNINGS', format: 'INR', width: 12 },
  { fieldKey: 'arrears', defaultHeader: 'ARREARS', aliases: ['ARREARS', 'SALARY ARREARS'], category: 'EARNINGS', format: 'INR', width: 12 },
  { fieldKey: 'ot_hours', defaultHeader: 'OT HOUR', aliases: ['OT HOUR', 'OT HOURS', 'OT HRS'], category: 'ATTENDANCE', format: 'NUMBER', width: 10 },
  { fieldKey: 'ot_rate', defaultHeader: 'OT1 Rate', aliases: ['OT1 RATE', 'OT RATE', 'HOURLY RATE'], category: 'ATTENDANCE', format: 'INR', width: 12 },

  // Deductions
  { fieldKey: 'canteen', defaultHeader: 'CANTEEN', aliases: ['CANTEEN', 'FOOD DEDUCTION', 'MEAL RECOVERY'], category: 'DEDUCTIONS', format: 'INR', width: 12 },
  { fieldKey: 'uniform', defaultHeader: 'UNIFORM', aliases: ['UNIFORM', 'DRESS RECOVERY'], category: 'DEDUCTIONS', format: 'INR', width: 12 },
  { fieldKey: 'shoe', defaultHeader: 'SHOE', aliases: ['SHOE', 'SAFETY SHOE'], category: 'DEDUCTIONS', format: 'INR', width: 12 },
  { fieldKey: 'other_ded', defaultHeader: 'OTHER DED', aliases: ['OTHER DED', 'OTHER DEDUCTION', 'MISC DEDUCTION'], category: 'DEDUCTIONS', format: 'INR', width: 14 },
  { fieldKey: 'leave_waiver', defaultHeader: 'LVE WAIVER', aliases: ['LVE WAIVER', 'LEAVE WAIVER'], category: 'DEDUCTIONS', format: 'INR', width: 12 },
  { fieldKey: 'bonus_per', defaultHeader: 'BONUS Per', aliases: ['BONUS PER', 'BONUS PERCENT'], category: 'DEDUCTIONS', format: 'PERCENT', width: 12 },
  { fieldKey: 'pf_employee', defaultHeader: 'PF', aliases: ['PF', 'PF 12%', 'EPF EMPLOYEE'], category: 'DEDUCTIONS', format: 'INR', width: 12 },
  { fieldKey: 'esi_employee', defaultHeader: 'ESI', aliases: ['ESI', 'ESI 0.75%', 'ESIC EMPLOYEE'], category: 'DEDUCTIONS', format: 'INR', width: 12 },

  // Summary Totals
  { fieldKey: 'total_earning', defaultHeader: 'Total Earning', aliases: ['TOTAL EARNING', 'GROSS', 'TOTAL EARNINGS'], category: 'SUMMARY', format: 'INR', width: 15 },
  { fieldKey: 'total_deduction', defaultHeader: 'Total Deduction', aliases: ['TOTAL DEDUCTION', 'TOTAL DEDUCTIONS'], category: 'SUMMARY', format: 'INR', width: 15 },
  { fieldKey: 'net_amount', defaultHeader: 'Net Amount', aliases: ['NET AMOUNT', 'NET PAY', 'TAKE HOME'], category: 'SUMMARY', format: 'INR', width: 16 },

  // Employer On-Costs & Service Charges
  { fieldKey: 'esi_employer', defaultHeader: 'ESI 3.25%', aliases: ['ESI 3.25%', 'EMPLOYER ESI', 'ESI COMPANY'], category: 'EMPLOYER_COST', format: 'INR', width: 14 },
  { fieldKey: 'pf_employer', defaultHeader: 'PF 13%', aliases: ['PF 13%', 'EMPLOYER PF', 'EPF 13%'], category: 'EMPLOYER_COST', format: 'INR', width: 14 },
  { fieldKey: 'service_charge', defaultHeader: 'SERVICE CHARGES', aliases: ['SERVICE CHARGES', 'SERVICE CHARGE 8%', 'AGENCY FEE'], category: 'EMPLOYER_COST', format: 'INR', width: 16 },

  // HR Master Metadata
  { fieldKey: 'branch', defaultHeader: 'Branch', aliases: ['BRANCH', 'LOCATION', 'SITE'], category: 'METADATA', format: 'TEXT', width: 14 },
  { fieldKey: 'cadre', defaultHeader: 'CADRE', aliases: ['CADRE', 'EMPLOYEE CADRE'], category: 'METADATA', format: 'TEXT', width: 12 },
  { fieldKey: 'department', defaultHeader: 'Department', aliases: ['DEPARTMENT', 'DEPT'], category: 'METADATA', format: 'TEXT', width: 18 },
  { fieldKey: 'designation', defaultHeader: 'Designation', aliases: ['DESIGNATION', 'ROLE'], category: 'METADATA', format: 'TEXT', width: 18 },
  { fieldKey: 'grade', defaultHeader: 'Grade', aliases: ['GRADE', 'LEVEL'], category: 'METADATA', format: 'TEXT', width: 10 },
  { fieldKey: 'doj', defaultHeader: 'Date of Joining', aliases: ['DATE OF JOINING', 'DOJ', 'JOINING DATE'], category: 'METADATA', format: 'DATE', width: 14 },
];

export class BullPlant1ColumnMap {
  private static headerMap: Map<string, BullColumnDefinition> = new Map();

  static {
    // Populate lookup index by canonical key and all aliases
    BULL_PLANT_1_COLUMNS.forEach((col) => {
      this.headerMap.set(col.fieldKey.toLowerCase(), col);
      this.headerMap.set(col.defaultHeader.toLowerCase(), col);
      col.aliases.forEach((alias) => {
        this.headerMap.set(alias.toLowerCase(), col);
      });
    });
  }

  /**
   * Find column definition semantically from header string
   */
  static findHeader(header: string): BullColumnDefinition | undefined {
    const clean = header.trim().toLowerCase();
    return this.headerMap.get(clean);
  }

  /**
   * Get column headers array for designated worksheet
   */
  static getPayrollHeaders(): string[] {
    return BULL_PLANT_1_COLUMNS.map((c) => c.defaultHeader);
  }
}
