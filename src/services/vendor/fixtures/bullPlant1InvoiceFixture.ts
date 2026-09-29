// src/services/vendor/fixtures/bullPlant1InvoiceFixture.ts
// ============================================================================
// Joy PeopleHR — Benchmark Bull Machines Plant 1 July 2026 Invoice Workings
// Source: Bull PLANT 1 Invoice Workings July 2026.xlsx
// Sheets: 'INVOICE' and 'PLANT 1'
// ============================================================================

export interface BullPlant1WorkerWorking {
  sNo: number;
  empId: string;
  employeeName: string;
  monthYear: string;
  payDays: number;
  presentDays: number;
  salCalDays: number;
  dailyRate: number;
  
  // Earnings Components (100% split: 56% Basic, 10% HRA, 4% TA, 15% Turn, 6% HOD, 9% Task)
  basic: number;
  hra: number;
  ta: number;
  turnPerf: number;
  hodAssPerf: number;
  taskPerf: number;
  
  // Additional Allowances
  attdGift: number;
  reward: number;
  arrears: number;
  
  // Total Earning
  totalEarning: number;
  
  // Overtime
  otHours: number;
  otRate: number;
  otAmount: number;
  
  // Deductions
  canteen: number;
  uniform: number;
  shoe: number;
  otherDed: number;
  leaveWaiver: number;
  bonusPercent: number;
  pfEmployee: number;
  esiEmployee: number;
  totalDeduction: number;
  
  // Net Payable to Employee
  netAmount: number;
  
  // Employer Statutory Contributions & Service Charges
  pfEmployer13: number;
  esiEmployer325: number;
  serviceCharge8: number;
  
  // HR Master Metadata
  branch: string;
  cadre: string;
  department: string;
  designation: string;
  grade: string;
  dateOfJoining: string;
}

export interface BullPlant1InvoiceSummary {
  invoiceNo: string;
  invoiceDate: string;
  periodStart: string;
  periodEnd: string;
  clientName: string;
  clientAddress: string;
  clientGst: string;
  clientPan: string;
  vendorName: string;
  vendorCode: string;
  vendorGst: string;
  vendorPan: string;
  sacCode: string;
  categoryOfService: string;
  
  totalEarnings: number;
  totalOtEarnings: number;
  employerPf13: number;
  employerEsi325: number;
  serviceCharge8: number;
  taxableAmount: number;
  sgst9: number;
  cgst9: number;
  grandTotal: number;
  amountInWords: string;
}

export const BULL_PLANT_1_WORKERS: BullPlant1WorkerWorking[] = [
  {
    sNo: 1,
    empId: '57741',
    employeeName: 'ANSE GEORGE',
    monthYear: 'July 2026',
    payDays: 24,
    presentDays: 24,
    salCalDays: 27,
    dailyRate: 1400,
    basic: 18816,
    hra: 3360,
    ta: 1344,
    turnPerf: 5040,
    hodAssPerf: 2016,
    taskPerf: 3024,
    attdGift: 0,
    reward: 0,
    arrears: 0,
    totalEarning: 33600,
    otHours: 65,
    otRate: 175,
    otAmount: 11380,
    canteen: 832.5,
    uniform: 0,
    shoe: 0,
    otherDed: 0,
    leaveWaiver: 1,
    bonusPercent: 8.33,
    pfEmployee: 1800,
    esiEmployee: 0, // > 21,000 gross limit: exempt
    totalDeduction: 2632.5,
    netAmount: 30970,
    pfEmployer13: 1950,
    esiEmployer325: 0,
    serviceCharge8: 3598,
    branch: 'PLANT-I & H-DIV',
    cadre: 'LABOUR',
    department: 'WELDSHOP',
    designation: 'TECHNICIAN TRAINEE',
    grade: 'Back-Office',
    dateOfJoining: '07/07/2025',
  },
  {
    sNo: 2,
    empId: '58790',
    employeeName: 'NISHIKANT MAHTO',
    monthYear: 'July 2026',
    payDays: 27,
    presentDays: 27,
    salCalDays: 27,
    dailyRate: 675,
    basic: 10206,
    hra: 1822.5,
    ta: 729,
    turnPerf: 2733.75,
    hodAssPerf: 1093.5,
    taskPerf: 1640.25,
    attdGift: 500,
    reward: 0,
    arrears: 0,
    totalEarning: 18725,
    otHours: 167,
    otRate: 84.38,
    otAmount: 14090,
    canteen: 843,
    uniform: 0,
    shoe: 0,
    otherDed: 0,
    leaveWaiver: 1,
    bonusPercent: 8.33,
    pfEmployee: 1225,
    esiEmployee: 137,
    totalDeduction: 2205,
    netAmount: 16520,
    pfEmployer13: 1326.78,
    esiEmployer325: 608.56,
    serviceCharge8: 2585,
    branch: 'PLANT-I & H-DIV',
    cadre: 'LABOUR',
    department: 'WELDSHOP',
    designation: 'TECHNICIAN TRAINEE',
    grade: 'Back-Office',
    dateOfJoining: '01/08/2025',
  },
  {
    sNo: 3,
    empId: '5000252',
    employeeName: 'SANJAY REANG',
    monthYear: 'July 2026',
    payDays: 27,
    presentDays: 27,
    salCalDays: 27,
    dailyRate: 700,
    basic: 10584,
    hra: 1890,
    ta: 756,
    turnPerf: 2835,
    hodAssPerf: 1134,
    taskPerf: 1701,
    attdGift: 500,
    reward: 0,
    arrears: 0,
    totalEarning: 19400,
    otHours: 137,
    otRate: 87.5,
    otAmount: 11990,
    canteen: 0,
    uniform: 0,
    shoe: 0,
    otherDed: 0,
    leaveWaiver: 1,
    bonusPercent: 8.33,
    pfEmployee: 1270,
    esiEmployee: 142,
    totalDeduction: 1412,
    netAmount: 17990,
    pfEmployer13: 1375.92,
    esiEmployer325: 630.50,
    serviceCharge8: 2471,
    branch: 'PLANT-I & H-DIV',
    cadre: 'LABOUR',
    department: 'WELDSHOP',
    designation: 'TECHNICIAN TRAINEE',
    grade: 'Back-Office',
    dateOfJoining: '15/09/2025',
  },
  {
    sNo: 4,
    empId: '5000254',
    employeeName: 'NORENDRA REANG',
    monthYear: 'July 2026',
    payDays: 27,
    presentDays: 27,
    salCalDays: 27,
    dailyRate: 700,
    basic: 10584,
    hra: 1890,
    ta: 756,
    turnPerf: 2835,
    hodAssPerf: 1134,
    taskPerf: 1701,
    attdGift: 500,
    reward: 0,
    arrears: 0,
    totalEarning: 19400,
    otHours: 132,
    otRate: 87.5,
    otAmount: 11550,
    canteen: 18,
    uniform: 0,
    shoe: 0,
    otherDed: 0,
    leaveWaiver: 1,
    bonusPercent: 8.33,
    pfEmployee: 1270,
    esiEmployee: 142,
    totalDeduction: 1430,
    netAmount: 17970,
    pfEmployer13: 1375.92,
    esiEmployer325: 630.50,
    serviceCharge8: 2436,
    branch: 'PLANT-I & H-DIV',
    cadre: 'LABOUR',
    department: 'WELDSHOP',
    designation: 'TECHNICIAN TRAINEE',
    grade: 'Back-Office',
    dateOfJoining: '15/09/2025',
  },
  {
    sNo: 5,
    empId: '5001053',
    employeeName: 'KARTIK KUMAR REANG',
    monthYear: 'July 2026',
    payDays: 27,
    presentDays: 27,
    salCalDays: 27,
    dailyRate: 700,
    basic: 10584,
    hra: 1890,
    ta: 756,
    turnPerf: 2835,
    hodAssPerf: 1134,
    taskPerf: 1701,
    attdGift: 500,
    reward: 0,
    arrears: 0,
    totalEarning: 19400,
    otHours: 140,
    otRate: 87.5,
    otAmount: 12250,
    canteen: 0,
    uniform: 0,
    shoe: 0,
    otherDed: 0,
    leaveWaiver: 1,
    bonusPercent: 8.33,
    pfEmployee: 1270,
    esiEmployee: 142,
    totalDeduction: 1412,
    netAmount: 17990,
    pfEmployer13: 1375.92,
    esiEmployer325: 630.50,
    serviceCharge8: 2492,
    branch: 'PLANT-I & H-DIV',
    cadre: 'LABOUR',
    department: 'WELDSHOP',
    designation: 'TECHNICIAN TRAINEE',
    grade: 'Back-Office',
    dateOfJoining: '01/10/2025',
  },
  {
    sNo: 6,
    empId: '5001054',
    employeeName: 'BIBIKA REANG',
    monthYear: 'July 2026',
    payDays: 26,
    presentDays: 26,
    salCalDays: 27,
    dailyRate: 700,
    basic: 10192,
    hra: 1820,
    ta: 728,
    turnPerf: 2730,
    hodAssPerf: 1092,
    taskPerf: 1638,
    attdGift: 0,
    reward: 0,
    arrears: 0,
    totalEarning: 18200,
    otHours: 136,
    otRate: 87.5,
    otAmount: 11900,
    canteen: 0,
    uniform: 0,
    shoe: 0,
    otherDed: 0,
    leaveWaiver: 1,
    bonusPercent: 8.33,
    pfEmployee: 1223,
    esiEmployee: 137,
    totalDeduction: 1360,
    netAmount: 16840,
    pfEmployer13: 1324.96,
    esiEmployer325: 591.50,
    serviceCharge8: 2408,
    branch: 'PLANT-I & H-DIV',
    cadre: 'LABOUR',
    department: 'WELDSHOP',
    designation: 'TECHNICIAN TRAINEE',
    grade: 'Back-Office',
    dateOfJoining: '01/10/2025',
  },
];

export const BULL_PLANT_1_INVOICE: BullPlant1InvoiceSummary = {
  invoiceNo: '103/2026-27',
  invoiceDate: '01-08-2026',
  periodStart: '01-07-2026',
  periodEnd: '31-07-2026',
  clientName: 'BULL MACHINES PVT LTD Plant 1',
  clientAddress: '5, 1 A, Trichy Rd, Chinthamanipudur, Coimbatore - 641 103, Tamilnadu, India.',
  clientGst: '33AAGCJ6200N1ZL',
  clientPan: 'AAGCJ6200N',
  vendorName: 'JOY MANPOWER SERVICES',
  vendorCode: '700323',
  vendorGst: '33AAACB8772D1ZV',
  vendorPan: 'AAACB8772D',
  sacCode: '998519',
  categoryOfService: 'Other Employment and Labour Supply Services',
  
  totalEarnings: 128725,
  totalOtEarnings: 73160,
  employerPf13: 8729.50,
  employerEsi325: 3091.56,
  serviceCharge8: 15990,
  taxableAmount: 229696.06,
  sgst9: 20672.65,
  cgst9: 20672.65,
  grandTotal: 271041.35,
  amountInWords: 'RUPEES: TWO LAKH SEVENTY ONE THOUSAND AND FORTY ONE ONLY',
};
