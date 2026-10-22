// src/features/people/bulk/excelTemplateGenerator.ts
// ============================================================================
// Joy PeopleHR Enterprise — Authoritative Excel Template & Export Generator
// 1. Approved Enterprise 3-Sheet Excel Onboarding Template:
//    - Sheet 1: Employees (All 47 comprehensive onboarding fields with zero SaaS re-edit required)
//    - Sheet 2: Instructions (Clear formatting rules, allowed values, sample values)
//    - Sheet 3: Reference Data (Live DB-driven or offline-safe departments, designations, branches, managers)
// 2. Direct Workforce Master Export:
//    - Exports current workforce with exact matching headers for seamless roundtrip bulk editing
// 3. Error Report XLSX with row-by-row diagnostics
// ============================================================================

import * as XLSX from 'xlsx';
import { Department, Designation, Branch, Employee } from '../../../types';

export interface TemplateMasterData {
  departments: Department[];
  designations: Designation[];
  branches: Branch[];
  existingEmployees: Employee[];
}

export interface BulkImportRowError {
  rowNumber: number;
  employeeCode?: string;
  field: string;
  value?: any;
  message: string;
}

export const PROPER_ONBOARDING_HEADERS = [
  // 1. Mandatory Identity & Core Details
  'Employee Code',
  'First Name',
  'Middle Name',
  'Last Name',
  'Work Email',
  'Personal Email',
  'Mobile Number',
  'Alternate Phone',
  'Gender',
  'Date of Birth',
  'Marital Status',
  'Blood Group',

  // 2. Organization & Work Assignment
  'Date of Joining',
  'Department',
  'Designation',
  'Work Location',
  'Work Mode',
  'Employment Type',
  'Employment Status',
  'Reporting Manager Code',
  'Employment Source',
  'Vendor Name',
  'Probation Months',
  'Notice Period Days',

  // 3. Compensation & Payroll
  'Annual CTC',
  'Monthly Gross',
  'Tax Regime',

  // 4. Bank Information
  'Bank Name',
  'Account Number',
  'IFSC Code',
  'Account Holder Name',
  'Account Type',

  // 5. Statutory & Government Identification
  'PAN Number',
  'UAN Number',
  'PF Number',
  'PF Applicable',
  'ESIC Number',
  'ESI Applicable',
  'Aadhaar Number',

  // 6. Address & Emergency Contacts
  'Current Address',
  'City',
  'State',
  'Postal Code',
  'Permanent Address',
  'Emergency Contact Name',
  'Emergency Contact Phone',
  'Emergency Relationship',
];

export const EMPLOYEE_ONBOARDING_HEADERS = PROPER_ONBOARDING_HEADERS;

/**
 * Export Authoritative Onboarding Template:
 * - Sheet 1: "Employee Onboarding" with all 47 proper headers, plus 1 complete real-world Example Row
 *   demonstrating exact format, reporting manager mapping (e.g. JCS-001), manual department add, and employment type.
 * - Sheet 2: "Predefined Options & Guides" with clear lookup tables for:
 *   1. Available Reporting Managers (Code - Name) for easy supervisor mapping
 *   2. Company Departments (with clear guide: "Type any new department name manually - it will auto-create!")
 *   3. Pre-defined Employment Types (FULL_TIME, PART_TIME, CONTRACT, INTERN)
 *   4. Pre-defined Work Modes (Office, Hybrid, Remote, Field)
 *   5. Pre-defined Employment Statuses (ACTIVE, PROBATION, NOTICE_PERIOD, SUSPENDED)
 *   6. Pre-defined Genders, Tax Regimes, and Banking Rules
 */
export function exportOnboardingHeaderTemplate(
  dataOrFilename?: Partial<TemplateMasterData> | string,
  maybeFilename?: string
): void {
  const wb = XLSX.utils.book_new();

  const data: Partial<TemplateMasterData> =
    typeof dataOrFilename === 'object' && dataOrFilename !== null ? dataOrFilename : {};
  const filename = typeof dataOrFilename === 'string' ? dataOrFilename : maybeFilename;

  const existingEmployees = data.existingEmployees || [];
  const departments = data.departments || [];
  const designations = data.designations || [];
  const branches = data.branches || [];

  // Resolve sample manager code or first existing employee
  const sampleManager =
    existingEmployees.find((e) => e.employee_code && !e.employee_code.startsWith('CE0')) ||
    existingEmployees[0];
  const sampleManagerCode = sampleManager?.employee_code || 'JCS-001';
  const sampleDept = departments.length > 0 ? departments[0].name || 'Engineering' : 'Engineering';
  const sampleDesig = designations.length > 0 ? designations[0].title || 'Senior Software Engineer' : 'Senior Software Engineer';
  const sampleBranch = branches.length > 0 ? branches[0].name || 'Coimbatore Campus (HQ)' : 'Coimbatore Campus (HQ)';

  // SHEET 1: Employee Onboarding (Headers + 1 Clear Example Row)
  const sampleExampleRow = [
    'JCS-501',
    'Anand',
    'Kumar',
    'Viswanathan',
    'anand.v@joycorporate.com',
    'anand.personal@gmail.com',
    '9876543210',
    '9845012345',
    'MALE',
    '1994-06-15',
    'Single',
    'O+',
    '2026-10-01',
    sampleDept,
    sampleDesig,
    sampleBranch,
    'Hybrid',
    'FULL_TIME',
    'ACTIVE',
    sampleManagerCode, // Reporting Manager Code mapping example!
    'DIRECT',
    '',
    '6',
    '60',
    '840000',
    '70000',
    'NEW',
    'HDFC Bank',
    '50100456789012',
    'HDFC0001234',
    'Anand Viswanathan',
    'SALARY',
    'ABCDE1234F',
    '100904567812',
    'TN/CBE/0012345/000/0001001',
    'Yes',
    '31000123456789',
    'No',
    '123456789012',
    '42, Avinashi Road, Peelamedu',
    'Coimbatore',
    'Tamil Nadu',
    '641004',
    '42, Avinashi Road, Peelamedu, Coimbatore',
    'Viswanathan R',
    '9845012345',
    'Father',
  ];

  const ws = XLSX.utils.aoa_to_sheet([PROPER_ONBOARDING_HEADERS, sampleExampleRow]);
  ws['!cols'] = PROPER_ONBOARDING_HEADERS.map((header) => ({
    wch: Math.max(header.length + 4, 18),
  }));

  XLSX.utils.book_append_sheet(wb, ws, 'Employee Onboarding');

  // SHEET 2: Predefined Options & Reference Guide
  const refHeaders = [
    'Pre-defined Employment Types',
    'Pre-defined Work Modes',
    'Pre-defined Employment Statuses',
    'Pre-defined Genders',
    'Available Reporting Managers (Code - Name)',
    'Company Departments (Or Add Manually!)',
    'Company Designations (Or Add Manually!)',
    'Company Locations / Branches',
    'Statutory & Tax Rules',
  ];

  const types = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN'];
  const workModes = ['Office', 'Hybrid', 'Remote', 'Field'];
  const statuses = ['ACTIVE', 'PROBATION', 'NOTICE_PERIOD', 'SUSPENDED'];
  const genders = ['MALE', 'FEMALE', 'NON_BINARY', 'PREFER_NOT_TO_SAY'];

  const managers = existingEmployees.slice(0, 100).map((e) =>
    `${e.employee_code} - ${e.first_name || ''} ${e.last_name || ''} (${e.designation_title || e.department_name || 'Lead'})`.trim()
  );

  const deptList = [
    '[Tip: Type ANY new department name manually - auto created!]',
    ...departments.map((d) => d.name || d.id),
  ];

  const desigList = [
    '[Tip: Type ANY new designation title manually!]',
    ...designations.map((d) => d.title || d.id),
  ];

  const branchList = branches.map((b) => b.name || b.id);

  const statutoryRules = [
    'Tax Regime: NEW, OLD',
    'Account Type: SALARY, SAVINGS, CURRENT',
    'PF Applicable: Yes, No',
    'ESI Applicable: Yes, No',
    'Reporting Mapping: Put Employee Code in "Reporting Manager Code"',
    'Manual Department: Type brand new department or choose from list',
  ];

  const maxRows = Math.max(
    types.length,
    workModes.length,
    statuses.length,
    genders.length,
    managers.length,
    deptList.length,
    desigList.length,
    branchList.length,
    statutoryRules.length,
    1
  );

  const refRows: any[][] = [];
  for (let i = 0; i < maxRows; i++) {
    refRows.push([
      types[i] || '',
      workModes[i] || '',
      statuses[i] || '',
      genders[i] || '',
      managers[i] || '',
      deptList[i] || '',
      desigList[i] || '',
      branchList[i] || '',
      statutoryRules[i] || '',
    ]);
  }

  const wsRef = XLSX.utils.aoa_to_sheet([refHeaders, ...refRows]);
  wsRef['!cols'] = [
    { wch: 30 },
    { wch: 24 },
    { wch: 32 },
    { wch: 22 },
    { wch: 44 },
    { wch: 46 },
    { wch: 46 },
    { wch: 32 },
    { wch: 48 },
  ];

  XLSX.utils.book_append_sheet(wb, wsRef, 'Predefined Options & Guides');

  const targetFilename =
    filename || `Joy_PeopleHR_Onboarding_Template_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, targetFilename);
}

export function generateEmployeeImportTemplate(data: Partial<TemplateMasterData> = {}): void {
  const wb = XLSX.utils.book_new();

  const existingEmployees = data.existingEmployees || [];
  const departments = data.departments || [];
  const designations = data.designations || [];
  const branches = data.branches || [];

  // Primary managers or defaults
  const sampleManagerCode = existingEmployees.length > 0 ? existingEmployees[0].employee_code : 'JCS-001';
  const sampleDept = departments.length > 0 ? departments[0].name : 'Operations';
  const sampleDesig = designations.length > 0 ? designations[0].title : 'Associate Developer';
  const sampleBranch = branches.length > 0 ? branches[0].name : 'Coimbatore Campus (HQ)';

  // Sample Rows demonstrating complete real-world employee onboarding
  const sampleRows = [
    [
      'JCS-501',
      'Anand',
      'Kumar',
      'Viswanathan',
      'anand.v@joycorporate.com',
      'anand.personal@gmail.com',
      '9876543210',
      '9845012345',
      'MALE',
      '1994-06-15',
      'Single',
      'O+',
      '2026-10-01',
      sampleDept,
      sampleDesig,
      sampleBranch,
      'Hybrid',
      'FULL_TIME',
      'ACTIVE',
      sampleManagerCode,
      'DIRECT',
      '',
      '6',
      '60',
      '840000',
      '70000',
      'NEW',
      'HDFC Bank',
      '50100456789012',
      'HDFC0001234',
      'Anand Viswanathan',
      'SALARY',
      'ABCDE1234F',
      '100904567812',
      'TN/CBE/0012345/000/0001001',
      'Yes',
      '31000123456789',
      'No',
      '123456789012',
      '42, Avinashi Road, Peelamedu',
      'Coimbatore',
      'Tamil Nadu',
      '641004',
      '42, Avinashi Road, Peelamedu, Coimbatore',
      'Viswanathan R',
      '9845012345',
      'Father',
    ],
    [
      'JCS-502',
      'Priya',
      '',
      'Ranganathan',
      'priya.r@joycorporate.com',
      'priya.ranganathan@gmail.com',
      '9845012345',
      '9876543211',
      'FEMALE',
      '1996-09-22',
      'Married',
      'B+',
      '2026-10-01',
      sampleDept,
      sampleDesig,
      sampleBranch,
      'Office',
      'FULL_TIME',
      'PROBATION',
      sampleManagerCode,
      'DIRECT',
      '',
      '6',
      '60',
      '720000',
      '60000',
      'NEW',
      'ICICI Bank',
      '102003456789',
      'ICIC0001020',
      'Priya Ranganathan',
      'SALARY',
      'PQRST5678K',
      '100908765432',
      'TN/CBE/0012345/000/0001002',
      'Yes',
      '',
      'No',
      '987654321098',
      '15, Trichy Road, Ramanathapuram',
      'Coimbatore',
      'Tamil Nadu',
      '641045',
      '15, Trichy Road, Ramanathapuram, Coimbatore',
      'Ranganathan S',
      '9845099887',
      'Spouse',
    ],
  ];

  const wsEmployees = XLSX.utils.aoa_to_sheet([EMPLOYEE_ONBOARDING_HEADERS, ...sampleRows]);

  // Set generous column widths for clear reading
  wsEmployees['!cols'] = [
    { wch: 18 }, // Employee Code
    { wch: 16 }, // First Name
    { wch: 14 }, // Middle Name
    { wch: 16 }, // Last Name
    { wch: 30 }, // Work Email
    { wch: 30 }, // Personal Email
    { wch: 18 }, // Mobile
    { wch: 18 }, // Alternate Phone
    { wch: 12 }, // Gender
    { wch: 22 }, // DOB
    { wch: 14 }, // Marital Status
    { wch: 12 }, // Blood Group
    { wch: 22 }, // DOJ
    { wch: 26 }, // Department
    { wch: 26 }, // Designation
    { wch: 22 }, // Work Location
    { wch: 14 }, // Work Mode
    { wch: 18 }, // Employment Type
    { wch: 18 }, // Employment Status
    { wch: 24 }, // Reporting Manager Code
    { wch: 18 }, // Employment Source
    { wch: 22 }, // Vendor Name
    { wch: 16 }, // Probation Months
    { wch: 18 }, // Notice Period Days
    { wch: 16 }, // Annual CTC
    { wch: 16 }, // Monthly Gross
    { wch: 14 }, // Tax Regime
    { wch: 18 }, // Bank Name
    { wch: 24 }, // Account Number
    { wch: 16 }, // IFSC Code
    { wch: 24 }, // Account Holder Name
    { wch: 14 }, // Account Type
    { wch: 16 }, // PAN
    { wch: 18 }, // UAN
    { wch: 28 }, // PF Member ID
    { wch: 14 }, // PF Applicable
    { wch: 20 }, // ESI Number
    { wch: 14 }, // ESI Applicable
    { wch: 18 }, // Aadhaar Number
    { wch: 32 }, // Current Address
    { wch: 18 }, // City
    { wch: 18 }, // State
    { wch: 14 }, // Postal Code
    { wch: 36 }, // Permanent Address
    { wch: 24 }, // Emergency Name
    { wch: 20 }, // Emergency Phone
    { wch: 18 }, // Emergency Relation
  ];

  XLSX.utils.book_append_sheet(wb, wsEmployees, 'Employees');

  // --------------------------------------------------------------------------
  // SHEET 2: INSTRUCTIONS & ONBOARDING RULES
  // --------------------------------------------------------------------------
  const instructionsData = [
    ['JOY PeopleHR — Authoritative Employee Onboarding Bulk Import Specification'],
    ['Version: 3.0 (Zero Manual SaaS Editing Required)'],
    [''],
    ['COLUMN HEADER', 'IMPORTANCE', 'ACCEPTED FORMAT / VALUES', 'EXAMPLE / NOTES'],
    [
      'Employee Code *',
      'Mandatory Unique ID',
      'Alphanumeric, e.g. JCS-XXX or WF-XXXX. Must be unique in company.',
      'JCS-101',
    ],
    [
      'First Name *',
      'Mandatory',
      'Employee given name.',
      'Anand',
    ],
    [
      'Last Name *',
      'Mandatory (or fallback dot)',
      'Employee surname or dot "." if single-name employee.',
      'Viswanathan',
    ],
    [
      'Work Email *',
      'Mandatory',
      'Official company email address.',
      'anand.v@joycorporate.com',
    ],
    [
      'Personal Email',
      'Optional',
      'Personal email address for onboarding invites.',
      'anand.personal@gmail.com',
    ],
    [
      'Primary Mobile *',
      'Mandatory',
      '10-digit mobile contact number.',
      '9876543210',
    ],
    [
      'Gender *',
      'Mandatory Statutory',
      'MALE, FEMALE, NON_BINARY, PREFER_NOT_TO_SAY',
      'MALE',
    ],
    [
      'Date of Birth * (YYYY-MM-DD)',
      'Mandatory Statutory',
      'ISO format: YYYY-MM-DD or DD/MM/YYYY.',
      '1994-06-15',
    ],
    [
      'Date of Joining * (YYYY-MM-DD)',
      'Mandatory Organization',
      'ISO format: YYYY-MM-DD or DD/MM/YYYY.',
      '2026-10-01',
    ],
    [
      'Department *',
      'Organization Assignment',
      'Accepted directly as entered (zero reference data constraint).',
      sampleDept,
    ],
    [
      'Designation *',
      'Job Title Assignment',
      'Accepted directly as entered (zero reference data constraint).',
      sampleDesig,
    ],
    [
      'Work Location',
      'Campus / Branch',
      'Office campus or location string.',
      sampleBranch,
    ],
    [
      'Work Mode',
      'Operational Model',
      'Office, Hybrid, Remote, Field',
      'Hybrid',
    ],
    [
      'Employment Type *',
      'Engagement Type',
      'FULL_TIME, PART_TIME, CONTRACT, INTERN',
      'FULL_TIME',
    ],
    [
      'Employment Status *',
      'Employee Status',
      'ACTIVE, PROBATION, NOTICE_PERIOD, SUSPENDED',
      'ACTIVE',
    ],
    [
      'Reporting Manager Code',
      'Supervisor Code',
      'Employee Code of reporting manager (e.g. JCS-001).',
      sampleManagerCode,
    ],
    [
      'Annual CTC',
      'Compensation / Payroll',
      'Annual Gross CTC in INR (numeric).',
      '840000',
    ],
    [
      'Monthly Gross',
      'Compensation / Payroll',
      'Monthly Gross pay in INR (auto-calculated if blank).',
      '70000',
    ],
    [
      'Bank Name & Account Number',
      'Direct Salary Deposit',
      'Salary bank name, account number, and 11-char IFSC code.',
      'HDFC Bank, 50100456789012, HDFC0001234',
    ],
    [
      'PAN & UAN Numbers',
      'Statutory & Tax',
      '10-character PAN and 12-digit UAN for PF auto-filing.',
      'ABCDE1234F, 100904567812',
    ],
  ];

  const wsInstructions = XLSX.utils.aoa_to_sheet(instructionsData);
  wsInstructions['!cols'] = [
    { wch: 30 },
    { wch: 25 },
    { wch: 45 },
    { wch: 35 },
  ];
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');

  // --------------------------------------------------------------------------
  // SHEET 3: REFERENCE DATA (OPTIONAL GUIDE)
  // --------------------------------------------------------------------------
  const refHeaders = [
    'Departments (Name)',
    'Designations (Title)',
    'Work Locations / Branches',
    'Available Reporting Managers (Code - Name)',
    'Allowed Employment Types',
    'Allowed Employment Statuses',
  ];

  const depts = departments.map((d) => d.name || d.id);
  const desigs = designations.map((d) => d.title || d.id);
  const branchList = branches.map((b) => b.name || b.id);
  const managers = existingEmployees.slice(0, 100).map((e) => `${e.employee_code} (${e.first_name} ${e.last_name} - ${e.designation_title || 'Lead'})`);
  const types = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN'];
  const statuses = ['ACTIVE', 'PROBATION', 'NOTICE_PERIOD', 'SUSPENDED'];

  const maxRows = Math.max(depts.length, desigs.length, branchList.length, managers.length, types.length, statuses.length, 1);
  const refRows: any[][] = [];

  for (let i = 0; i < maxRows; i++) {
    refRows.push([
      depts[i] || '',
      desigs[i] || '',
      branchList[i] || '',
      managers[i] || '',
      types[i] || '',
      statuses[i] || '',
    ]);
  }

  const wsReference = XLSX.utils.aoa_to_sheet([refHeaders, ...refRows]);
  wsReference['!cols'] = [
    { wch: 28 },
    { wch: 28 },
    { wch: 25 },
    { wch: 38 },
    { wch: 22 },
    { wch: 22 },
  ];
  XLSX.utils.book_append_sheet(wb, wsReference, 'Reference Data');

  const filename = `Joy_PeopleHR_Employee_Onboarding_Template_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, filename);
}

/**
 * Direct Workforce Master Export:
 * Exports current workforce with 100% matching headers for seamless roundtrip bulk editing.
 * Exhaustive field fallbacks ensure every onboarding detail (manager code, bank, statutory, comp, address)
 * is exported cleanly without needing manual edits on SaaS.
 */
export function exportEmployeeMasterData(employees: Employee[], filename?: string): void {
  const wb = XLSX.utils.book_new();

  // Create lookup maps for instant manager resolution
  const empById = new Map<string, Employee>();
  employees.forEach((e) => {
    if (e.id) empById.set(e.id, e);
  });

  const exportRows = employees.map((rawEmp) => {
    const emp = rawEmp as any;
    const prof = (emp.profile || {}) as any;
    const empl = (emp.employment || {}) as any;
    const bank = (emp.bank || prof.bank || emp.bank_details || {}) as any;
    const stat = (emp.statutory || prof.statutory || emp.statutory_details || {}) as any;
    const statAndBank = (prof.statutory_and_bank || {}) as any;
    const currAddr = (prof.current_address || {}) as any;
    const permAddr = (prof.permanent_address || {}) as any;
    const emg = (prof.emergency_contacts?.[0] || {}) as any;

    const annualCtc = emp.annual_ctc || empl.annual_ctc || (emp as any).ctc || '';
    const monthlyGross = empl.monthly_gross || emp.monthly_ctc || (annualCtc ? Math.round(Number(annualCtc) / 12) : '');

    // Resolve real manager code
    const rawMgrId = emp.reporting_manager_id || empl.reporting_manager_id;
    let resolvedMgrCode = '';
    if (rawMgrId && empById.has(rawMgrId)) {
      resolvedMgrCode = empById.get(rawMgrId)!.employee_code;
    }
    if (!resolvedMgrCode) {
      resolvedMgrCode = (emp as any).reporting_manager_code || (empl as any).reporting_manager_code || emp.reporting_manager_name || empl.reporting_manager_name || '';
    }

    return [
      emp.employee_code || '',
      emp.first_name || prof.first_name || '',
      prof.middle_name || emp.middle_name || '',
      emp.last_name || prof.last_name || '',
      emp.work_email || prof.work_email || '',
      prof.personal_email || emp.personal_email || '',
      prof.primary_mobile || prof.phone || emp.primary_mobile || emp.phone || '',
      prof.alternate_phone || (emp as any).alternate_phone || '',
      (emp.gender || prof.gender || 'MALE').toUpperCase(),
      emp.dob || prof.date_of_birth || (emp as any).date_of_birth || '',
      prof.marital_status || (emp as any).marital_status || 'Single',
      prof.blood_group || (emp as any).blood_group || '',
      emp.doj || empl.doj || (emp as any).joining_date || '',
      emp.department_name || emp.department || empl.department_name || '',
      emp.designation_title || emp.designation || empl.designation_title || '',
      emp.branch_name || empl.branch_name || empl.work_location || (emp as any).branch || (emp as any).work_location || 'Headquarters',
      empl.work_mode || (emp as any).work_mode || 'Hybrid',
      emp.employment_type || empl.employment_type || 'FULL_TIME',
      emp.status || emp.employment_status || empl.status || 'ACTIVE',
      resolvedMgrCode,
      emp.employment_source || empl.employment_source || 'DIRECT',
      emp.vendor_name || empl.vendor_name || '',
      empl.probation_period_months ?? (emp as any).probation_months ?? 6,
      empl.notice_period_days ?? (emp as any).notice_period_days ?? 60,
      annualCtc,
      monthlyGross,
      empl.tax_regime || stat.tax_regime || statAndBank.tax_regime || (emp as any).tax_regime || 'NEW',
      bank.bank_name || statAndBank.bank_name || (emp as any).bank_name || '',
      bank.account_number || statAndBank.bank_account_masked || (emp as any).account_number || '',
      bank.ifsc || bank.ifsc_code || statAndBank.ifsc_code || (emp as any).ifsc || '',
      bank.account_holder_name || `${emp.first_name || prof.first_name || ''} ${emp.last_name || prof.last_name || ''}`.trim(),
      bank.account_type || (emp as any).account_type || 'SALARY',
      stat.pan || stat.pan_number || statAndBank.pan_number_masked || (emp as any).pan || '',
      stat.uan || stat.uan_number || stat.pf_uan || statAndBank.pf_uan || (emp as any).uan || '',
      stat.pf_number || stat.pf_id || (emp as any).pf_number || '',
      stat.pf_applicable !== false && stat.is_pf_eligible !== false ? 'Yes' : 'No',
      stat.esi_number || stat.esic_number || statAndBank.esi_number || (emp as any).esi_number || (emp as any).esic_number || '',
      stat.esi_applicable || stat.is_esi_eligible ? 'Yes' : 'No',
      stat.aadhaar_masked || stat.aadhaar_number || prof.national_id_masked || statAndBank.aadhaar_masked || (emp as any).aadhaar || '',
      currAddr.line1 || prof.address || (emp as any).address || (emp as any).current_address || '',
      currAddr.city || (emp as any).city || 'Coimbatore',
      currAddr.state || (emp as any).state || 'Tamil Nadu',
      currAddr.postal_code || (emp as any).postal_code || (emp as any).pincode || '641001',
      permAddr.line1 || (emp as any).permanent_address || currAddr.line1 || prof.address || '',
      emg.name || prof.emergency_contact_name || (emp as any).emergency_contact_name || (emp as any).emergency_name || '',
      emg.phone || prof.emergency_contact_phone || (emp as any).emergency_contact_phone || (emp as any).emergency_phone || '',
      emg.relationship || (emp as any).emergency_relationship || (emp as any).emergency_relation || 'Family',
    ];
  });

  const ws = XLSX.utils.aoa_to_sheet([EMPLOYEE_ONBOARDING_HEADERS, ...exportRows]);
  ws['!cols'] = [
    { wch: 18 }, { wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 30 }, { wch: 30 },
    { wch: 18 }, { wch: 18 }, { wch: 12 }, { wch: 22 }, { wch: 14 }, { wch: 12 },
    { wch: 22 }, { wch: 26 }, { wch: 26 }, { wch: 22 }, { wch: 14 }, { wch: 18 },
    { wch: 18 }, { wch: 24 }, { wch: 18 }, { wch: 22 }, { wch: 16 }, { wch: 18 },
    { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 18 }, { wch: 24 }, { wch: 16 },
    { wch: 24 }, { wch: 14 }, { wch: 16 }, { wch: 18 }, { wch: 28 }, { wch: 14 },
    { wch: 20 }, { wch: 14 }, { wch: 18 }, { wch: 32 }, { wch: 18 }, { wch: 18 },
    { wch: 14 }, { wch: 36 }, { wch: 24 }, { wch: 20 }, { wch: 18 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Workforce Master');
  const targetFilename = filename || `Joy_PeopleHR_Workforce_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, targetFilename);
}

/**
 * Generates and downloads a dedicated Error Report workbook containing failed rows and specific error reasons.
 */
export function downloadBulkImportErrorReport(
  errors: BulkImportRowError[],
  rawRows: Record<string, any>[]
): void {
  const wb = XLSX.utils.book_new();

  const reportRows = errors.map((err) => {
    const original = rawRows[err.rowNumber - 2] || {};
    return {
      'Excel Row #': err.rowNumber,
      'Employee Code': err.employeeCode || original['Employee Code *'] || original.employee_code || 'N/A',
      'Failed Field': err.field,
      'Invalid Value': String(err.value !== undefined ? err.value : ''),
      'Failure Reason': err.message,
      'First Name': original['First Name *'] || original.first_name || '',
      'Last Name': original['Last Name *'] || original.last_name || '',
      'Work Email': original['Work Email *'] || original.work_email || '',
      'Mobile Number': original['Primary Mobile *'] || original.phone || '',
    };
  });

  const ws = XLSX.utils.json_to_sheet(reportRows);
  ws['!cols'] = [
    { wch: 12 },
    { wch: 18 },
    { wch: 20 },
    { wch: 22 },
    { wch: 45 },
    { wch: 16 },
    { wch: 16 },
    { wch: 28 },
    { wch: 16 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Import Errors');
  const filename = `Joy_PeopleHR_Import_Error_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, filename);
}
