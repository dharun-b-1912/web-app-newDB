// src/features/people/bulk/bulkImportService.ts
// ============================================================================
// Joy PeopleHR Enterprise — Authoritative Bulk Employee Import Pipeline
// Features:
// 1. Zero Reference-Data Dependency:
//    - Any department, designation, or branch in the spreadsheet is accepted directly as-is.
//    - Dynamic custom slugs ensure zero foreign-key lockouts.
// 2. Comprehensive Employee Onboarding Fields (All 47 Headers):
//    - Identity, Contact, Organization, Work Assignment, Compensation, Statutory, Bank, Address, Emergency Contacts.
//    - Headers match 1-to-1 with exported templates for 100% automatic mapping (zero manual SaaS clicks).
// 3. Pre-Flight Verification & Interactive Confirmation:
//    - Row-by-row readiness calculation (Ready, Update, Needs Action).
//    - Inline cell editing with dynamic live re-validation before committing to database.
// 4. Safe Chunked Processing:
//    - Batches of 25 with isolated error boundaries.
// 5. Complete Profile, Employment, Statutory, and Bank Persistence in Database.
// ============================================================================

import * as XLSX from 'xlsx';
import { Department, Designation, Branch, Employee, EmploymentType, EmployeeStatus, WorkMode, EmploymentSource } from '../../../types';
import { api, ensureUUID } from '../../../services/api';
import { supabase, isSupabaseEnabled } from '../../../lib/supabase';
import { BulkImportRowError, EMPLOYEE_ONBOARDING_HEADERS } from './excelTemplateGenerator';

// ============================================================================
// Canonical Field Definitions for Column Mapping
// ============================================================================

export interface CanonicalField {
  key: string;
  label: string;
  category: 'REQUIRED' | 'PERSONAL' | 'CONTACT' | 'ORGANIZATION' | 'COMPENSATION' | 'STATUTORY' | 'BANK' | 'ADDRESS';
  required: boolean;
  description: string;
  sample: string;
  aliases: string[];
}

export const CANONICAL_IMPORT_FIELDS: CanonicalField[] = [
  // 1. Mandatory Identity & Core Details
  {
    key: 'employee_code',
    label: 'Employee Code / ID',
    category: 'REQUIRED',
    required: true,
    description: 'Unique business identifier for employee in company',
    sample: 'JCS-101',
    aliases: [
      'Employee Code', 'Employee Code *', 'employee code', 'employee code *', 'employee_code', 'code', 'emp_code', 'emp code',
      'empid', 'emp_id', 'employee_id', 'employee id', 'staff_id', 'staff id', 'staff_no',
      'staff no', 'empno', 'emp no', 'employee no', 'worker id', 'badge id', 'id'
    ],
  },
  {
    key: 'first_name',
    label: 'First Name',
    category: 'REQUIRED',
    required: true,
    description: 'Given name of the employee',
    sample: 'Arun',
    aliases: [
      'First Name', 'First Name *', 'first name', 'first name *', 'first_name', 'firstname', 'f_name', 'fname', 'given name'
    ],
  },
  {
    key: 'middle_name',
    label: 'Middle Name',
    category: 'PERSONAL',
    required: false,
    description: 'Middle name of the employee',
    sample: 'Kumar',
    aliases: [
      'Middle Name', 'middle_name', 'middle name', 'm_name', 'mname'
    ],
  },
  {
    key: 'last_name',
    label: 'Last Name',
    category: 'REQUIRED',
    required: false,
    description: 'Surname / family name (falls back to dot if empty)',
    sample: 'Viswanathan',
    aliases: [
      'Last Name', 'Last Name *', 'last name', 'last name *', 'last_name', 'lastname', 'l_name', 'lname', 'surname', 'family name'
    ],
  },
  {
    key: 'full_name',
    label: 'Full Name (Fallback)',
    category: 'PERSONAL',
    required: false,
    description: 'Full name used to extract first & last name if separate columns are absent',
    sample: 'Arun Kumar',
    aliases: [
      'Full Name', 'Name', 'name', 'full name', 'employee name', 'staff name', 'candidate name', 'full_name', 'employee_name'
    ],
  },
  {
    key: 'work_email',
    label: 'Work / Official Email',
    category: 'REQUIRED',
    required: true,
    description: 'Official communication email address',
    sample: 'arun.v@company.com',
    aliases: [
      'Work Email', 'Work Email *', 'work email', 'work email *', 'work_email', 'email', 'email id', 'email_id',
      'official email', 'official_email', 'official mail', 'official_mail',
      'work email id', 'work_email_id', 'work mail', 'work_mail',
      'e-mail', 'mail', 'mail id', 'mail_id', 'email address', 'email_address'
    ],
  },
  {
    key: 'personal_email',
    label: 'Personal Email',
    category: 'CONTACT',
    required: false,
    description: 'Personal email address for onboarding invites',
    sample: 'arun.personal@gmail.com',
    aliases: [
      'Personal Email', 'personal_email', 'personal email', 'personal mail', 'personal_mail', 'alternate email'
    ],
  },
  {
    key: 'phone',
    label: 'Primary Mobile Number',
    category: 'REQUIRED',
    required: true,
    description: '10-digit primary mobile contact number',
    sample: '9876543210',
    aliases: [
      'Mobile Number', 'Primary Mobile', 'Primary Mobile *', 'primary mobile *', 'phone', 'mobile', 'mobile number', 'mobile_number',
      'mobile no', 'mobile_no', 'phone number', 'phone_number', 'phone no', 'phone_no',
      'contact number', 'contact_number', 'contact no', 'contact_no', 'contact', 'cell', 'whatsapp number'
    ],
  },
  {
    key: 'alternate_phone',
    label: 'Alternate Phone',
    category: 'CONTACT',
    required: false,
    description: 'Secondary or landline phone number',
    sample: '9845012345',
    aliases: [
      'Alternate Phone', 'alternate_phone', 'alternate phone', 'alt phone', 'alt_phone', 'secondary phone'
    ],
  },
  {
    key: 'gender',
    label: 'Gender',
    category: 'PERSONAL',
    required: false,
    description: 'MALE, FEMALE, NON_BINARY, or PREFER_NOT_TO_SAY',
    sample: 'MALE',
    aliases: [
      'Gender', 'Gender *', 'gender *', 'gender', 'sex'
    ],
  },
  {
    key: 'dob',
    label: 'Date of Birth',
    category: 'PERSONAL',
    required: false,
    description: 'Date of birth (YYYY-MM-DD or DD/MM/YYYY)',
    sample: '1994-06-15',
    aliases: [
      'Date of Birth', 'Date of Birth * (YYYY-MM-DD)', 'date of birth * (yyyy-mm-dd)', 'dob', 'date_of_birth', 'date of birth', 'birth date', 'birth_date'
    ],
  },
  {
    key: 'marital_status',
    label: 'Marital Status',
    category: 'PERSONAL',
    required: false,
    description: 'Single, Married, Divorced, Widowed',
    sample: 'Single',
    aliases: [
      'Marital Status', 'marital_status', 'marital status', 'marital'
    ],
  },
  {
    key: 'blood_group',
    label: 'Blood Group',
    category: 'PERSONAL',
    required: false,
    description: 'A+, B+, O+, AB+, A-, B-, O-, AB-',
    sample: 'O+',
    aliases: [
      'Blood Group', 'blood_group', 'blood group', 'blood'
    ],
  },

  // 2. Organization & Work Assignment
  {
    key: 'doj',
    label: 'Date of Joining',
    category: 'ORGANIZATION',
    required: false,
    description: 'Date of joining (YYYY-MM-DD or DD/MM/YYYY)',
    sample: '2026-10-01',
    aliases: [
      'Date of Joining', 'Date of Joining * (YYYY-MM-DD)', 'date of joining', 'date of joining * (yyyy-mm-dd)', 'doj', 'date_of_joining', 'joining date', 'joining_date', 'hire date'
    ],
  },
  {
    key: 'department_name',
    label: 'Department',
    category: 'ORGANIZATION',
    required: false,
    description: 'Department name (accepted directly as-is without requiring reference data)',
    sample: 'Engineering',
    aliases: [
      'Department', 'Department *', 'department', 'department *', 'department_name', 'dept', 'dept_name', 'function', 'division', 'business unit'
    ],
  },
  {
    key: 'designation_title',
    label: 'Designation / Job Title',
    category: 'ORGANIZATION',
    required: false,
    description: 'Designation or job role (accepted directly as-is)',
    sample: 'Senior Developer',
    aliases: [
      'Designation', 'Designation *', 'designation', 'designation *', 'designation_title', 'job title', 'job_title', 'role', 'position', 'title'
    ],
  },
  {
    key: 'branch_name',
    label: 'Work Location / Branch',
    category: 'ORGANIZATION',
    required: false,
    description: 'Work location or campus name',
    sample: 'Coimbatore HQ',
    aliases: [
      'Work Location', 'work location', 'location', 'branch', 'branch_name', 'work_location', 'site', 'office', 'city'
    ],
  },
  {
    key: 'work_mode',
    label: 'Work Mode',
    category: 'ORGANIZATION',
    required: false,
    description: 'Office, Hybrid, Remote, Field',
    sample: 'Hybrid',
    aliases: [
      'Work Mode', 'work_mode', 'work mode', 'working mode'
    ],
  },
  {
    key: 'employment_type',
    label: 'Employment Type',
    category: 'ORGANIZATION',
    required: false,
    description: 'Full Time, Part Time, Contract, Intern',
    sample: 'Full Time',
    aliases: [
      'Employment Type', 'Employment Type *', 'employment type', 'employment type *', 'employment_type', 'type', 'job type'
    ],
  },
  {
    key: 'employment_status',
    label: 'Employment Status',
    category: 'ORGANIZATION',
    required: false,
    description: 'Active, Probation, Notice Period, etc.',
    sample: 'Active',
    aliases: [
      'Employment Status', 'Employment Status *', 'employment status', 'employment status *', 'employment_status', 'status'
    ],
  },
  {
    key: 'reporting_manager_code',
    label: 'Reporting Manager Code',
    category: 'ORGANIZATION',
    required: false,
    description: 'Employee code of the reporting manager',
    sample: 'JCS-001',
    aliases: [
      'Reporting Manager Code', 'reporting manager code', 'reporting_manager_code', 'manager_code', 'reporting manager', 'manager_id', 'rm_code'
    ],
  },
  {
    key: 'employment_source',
    label: 'Employment Source',
    category: 'ORGANIZATION',
    required: false,
    description: 'DIRECT or VENDOR',
    sample: 'DIRECT',
    aliases: [
      'Employment Source', 'employment_source', 'employment source', 'source'
    ],
  },
  {
    key: 'vendor_name',
    label: 'Vendor / Agency Name',
    category: 'ORGANIZATION',
    required: false,
    description: 'Name of contractor or manpower provider (if vendor)',
    sample: 'TalentPro Staffing',
    aliases: [
      'Vendor Name', 'vendor_name', 'vendor name', 'agency', 'contractor'
    ],
  },
  {
    key: 'probation_months',
    label: 'Probation Months',
    category: 'ORGANIZATION',
    required: false,
    description: 'Probation duration in months (default 6)',
    sample: '6',
    aliases: [
      'Probation Months', 'probation_months', 'probation months', 'probation period'
    ],
  },
  {
    key: 'notice_period_days',
    label: 'Notice Period Days',
    category: 'ORGANIZATION',
    required: false,
    description: 'Notice period in days (default 60)',
    sample: '60',
    aliases: [
      'Notice Period Days', 'notice_period_days', 'notice period days', 'notice period'
    ],
  },

  // 3. Compensation & Payroll
  {
    key: 'annual_ctc',
    label: 'Annual CTC',
    category: 'COMPENSATION',
    required: false,
    description: 'Annual Cost to Company in INR',
    sample: '840000',
    aliases: [
      'Annual CTC', 'annual ctc', 'annual_ctc', 'ctc', 'gross salary', 'salary', 'annual salary', 'package'
    ],
  },
  {
    key: 'monthly_gross',
    label: 'Monthly Gross Pay',
    category: 'COMPENSATION',
    required: false,
    description: 'Monthly gross salary in INR',
    sample: '70000',
    aliases: [
      'Monthly Gross', 'monthly_gross', 'monthly gross', 'monthly pay', 'gross pay'
    ],
  },
  {
    key: 'tax_regime',
    label: 'Tax Regime',
    category: 'COMPENSATION',
    required: false,
    description: 'NEW or OLD regime',
    sample: 'NEW',
    aliases: [
      'Tax Regime', 'tax_regime', 'tax regime', 'regime'
    ],
  },

  // 4. Bank Information
  {
    key: 'bank_name',
    label: 'Bank Name',
    category: 'BANK',
    required: false,
    description: 'Salary account bank name',
    sample: 'HDFC Bank',
    aliases: [
      'Bank Name', 'bank name', 'bank_name', 'bank'
    ],
  },
  {
    key: 'account_number',
    label: 'Bank Account Number',
    category: 'BANK',
    required: false,
    description: 'Salary account number',
    sample: '50100456789012',
    aliases: [
      'Account Number', 'account number', 'account_number', 'account no', 'account_no', 'acc no', 'acc_no'
    ],
  },
  {
    key: 'ifsc',
    label: 'IFSC Code',
    category: 'BANK',
    required: false,
    description: '11-character Indian Financial System Code',
    sample: 'HDFC0001234',
    aliases: [
      'IFSC Code', 'ifsc code', 'ifsc_code', 'ifsc'
    ],
  },
  {
    key: 'account_holder_name',
    label: 'Account Holder Name',
    category: 'BANK',
    required: false,
    description: 'Name as registered with the bank',
    sample: 'Anand Viswanathan',
    aliases: [
      'Account Holder Name', 'account_holder_name', 'account holder name', 'holder name'
    ],
  },
  {
    key: 'account_type',
    label: 'Account Type',
    category: 'BANK',
    required: false,
    description: 'SALARY, SAVINGS, or CURRENT',
    sample: 'SALARY',
    aliases: [
      'Account Type', 'account_type', 'account type'
    ],
  },

  // 5. Statutory & Government Identification
  {
    key: 'pan',
    label: 'PAN Number',
    category: 'STATUTORY',
    required: false,
    description: '10-character Permanent Account Number',
    sample: 'ABCDE1234F',
    aliases: [
      'PAN Number', 'PAN', 'pan number', 'pan_number', 'pan', 'pan no', 'pan_no', 'PAN No', 'PAN Card', 'pan card'
    ],
  },
  {
    key: 'uan',
    label: 'UAN Number',
    category: 'STATUTORY',
    required: false,
    description: '12-digit Universal Account Number for PF',
    sample: '100904567812',
    aliases: [
      'UAN Number', 'UAN', 'uan number', 'uan_number', 'uan', 'uan no', 'uan_no', 'UAN No', 'PF UAN', 'pf uan', 'pf_uan'
    ],
  },
  {
    key: 'pf_number',
    label: 'PF Number',
    category: 'STATUTORY',
    required: false,
    description: 'Establishment PF Member ID / PF Number',
    sample: 'TN/CBE/0012345/000/0001001',
    aliases: [
      'PF Number', 'PF Member ID', 'PF No', 'PF', 'pf number', 'pf_number', 'pf no', 'pf_no', 'pf member id', 'pf_member_id', 'pf id', 'member id', 'pf', 'Provident Fund Number', 'Provident Fund No', 'PF ID'
    ],
  },
  {
    key: 'pf_applicable',
    label: 'PF Applicable',
    category: 'STATUTORY',
    required: false,
    description: 'Yes or No',
    sample: 'Yes',
    aliases: [
      'PF Applicable', 'pf_applicable', 'pf applicable', 'is pf eligible', 'is_pf_eligible'
    ],
  },
  {
    key: 'esi',
    label: 'ESIC Number',
    category: 'STATUTORY',
    required: false,
    description: '17-digit Employee State Insurance Number',
    sample: '31000123456789',
    aliases: [
      'ESIC Number', 'ESI Number', 'ESIC', 'ESI', 'ESIC No', 'ESI No', 'esic number', 'esi number', 'esic_number', 'esi_number', 'esic no', 'esi no', 'esic', 'esi', 'Employee State Insurance Number'
    ],
  },
  {
    key: 'esi_applicable',
    label: 'ESI Applicable',
    category: 'STATUTORY',
    required: false,
    description: 'Yes or No',
    sample: 'No',
    aliases: [
      'ESI Applicable', 'ESIC Applicable', 'esi_applicable', 'esic_applicable', 'esi applicable', 'esic applicable', 'is esi eligible', 'is_esi_eligible'
    ],
  },
  {
    key: 'aadhaar_number',
    label: 'Aadhaar Number',
    category: 'STATUTORY',
    required: false,
    description: '12-digit Aadhaar / National ID',
    sample: '123456789012',
    aliases: [
      'Aadhaar Number', 'Aadhar Number', 'AAdhar Number', 'Aadhaar', 'Aadhar', 'AAdhar', 'aadhaar_number', 'aadhar_number', 'aadhaar', 'aadhar', 'aadhaar no', 'aadhar no', 'Aadhaar No', 'Aadhar No', 'Aadhaar Card', 'Aadhar Card', 'UID', 'UIDAI', 'national id', 'National ID'
    ],
  },

  // 6. Address & Emergency Contacts
  {
    key: 'current_address',
    label: 'Current Address',
    category: 'ADDRESS',
    required: false,
    description: 'Street address / residential address',
    sample: '42, Avinashi Road, Peelamedu',
    aliases: [
      'Current Address', 'current_address', 'current address', 'address'
    ],
  },
  {
    key: 'city',
    label: 'City',
    category: 'ADDRESS',
    required: false,
    description: 'Residential city',
    sample: 'Coimbatore',
    aliases: [
      'City', 'city'
    ],
  },
  {
    key: 'state',
    label: 'State',
    category: 'ADDRESS',
    required: false,
    description: 'Residential state',
    sample: 'Tamil Nadu',
    aliases: [
      'State', 'state'
    ],
  },
  {
    key: 'postal_code',
    label: 'Postal Code',
    category: 'ADDRESS',
    required: false,
    description: '6-digit PIN code',
    sample: '641004',
    aliases: [
      'Postal Code', 'postal_code', 'postal code', 'pin code', 'pincode', 'zip'
    ],
  },
  {
    key: 'permanent_address',
    label: 'Permanent Address',
    category: 'ADDRESS',
    required: false,
    description: 'Permanent residential address',
    sample: '42, Avinashi Road, Peelamedu, Coimbatore',
    aliases: [
      'Permanent Address', 'permanent_address', 'permanent address'
    ],
  },
  {
    key: 'emergency_name',
    label: 'Emergency Contact Name',
    category: 'CONTACT',
    required: false,
    description: 'Name of emergency contact person',
    sample: 'Viswanathan R',
    aliases: [
      'Emergency Contact Name', 'emergency_contact_name', 'emergency name', 'emergency contact'
    ],
  },
  {
    key: 'emergency_phone',
    label: 'Emergency Contact Phone',
    category: 'CONTACT',
    required: false,
    description: 'Contact number for emergency',
    sample: '9845012345',
    aliases: [
      'Emergency Contact Phone', 'emergency_contact_phone', 'emergency phone', 'emergency mobile'
    ],
  },
  {
    key: 'emergency_relation',
    label: 'Emergency Relationship',
    category: 'CONTACT',
    required: false,
    description: 'Father, Mother, Spouse, Friend, Sibling',
    sample: 'Father',
    aliases: [
      'Emergency Relationship', 'emergency_relationship', 'emergency relation', 'relation'
    ],
  },
];

// ============================================================================
// Types
// ============================================================================

export interface CandidateIssue {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface CandidateEmployeeRow {
  id: string; // React key
  rowNumber: number;
  selected: boolean;
  status: 'READY' | 'UPDATE' | 'NEEDS_ACTION';
  issues: CandidateIssue[];

  // 1. Identity & Contact
  employee_code: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  display_name: string;
  work_email: string;
  personal_email?: string;
  phone: string;
  alternate_phone?: string;
  gender: 'MALE' | 'FEMALE' | 'NON_BINARY' | 'PREFER_NOT_TO_SAY';
  dob: string;
  marital_status?: string;
  blood_group?: string;

  // 2. Organization & Work Assignment
  doj: string;
  department_name: string;
  designation_title: string;
  branch_name: string;
  work_mode?: WorkMode;
  reporting_manager_code?: string;
  employment_type: EmploymentType;
  employment_status: EmployeeStatus;
  employment_source?: EmploymentSource;
  vendor_name?: string;
  probation_months?: number;
  notice_period_days?: number;

  // 3. Compensation & Payroll
  annual_ctc?: number;
  monthly_gross?: number;
  tax_regime?: string;

  // 4. Bank Information
  bank_name?: string;
  account_number?: string;
  ifsc?: string;
  account_holder_name?: string;
  account_type?: string;

  // 5. Statutory & Identification
  pan?: string | null;
  uan?: string | null;
  pf_number?: string | null;
  pf_applicable?: boolean;
  esi?: string | null;
  esi_applicable?: boolean;
  aadhaar_number?: string | null;

  // 6. Address & Emergency
  current_address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  permanent_address?: string;
  emergency_name?: string;
  emergency_phone?: string;
  emergency_relation?: string;

  // Metadata
  raw: Record<string, any>;
  existing_db_id?: string;
}

export interface CandidateValidationSummary {
  total: number;
  readyCount: number;
  updateCount: number;
  needsActionCount: number;
  candidates: CandidateEmployeeRow[];
}

export interface ParsedEmployeeRow {
  rowNumber: number;
  raw: Record<string, any>;
  employee_code: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  display_name: string;
  work_email: string;
  personal_email?: string;
  phone: string;
  gender: 'MALE' | 'FEMALE' | 'NON_BINARY' | 'PREFER_NOT_TO_SAY';
  dob: string;
  doj: string;
  department_id: string;
  department_name: string;
  designation_id: string;
  designation_title: string;
  branch_id?: string;
  branch_name?: string;
  employment_type: EmploymentType;
  employment_status: EmployeeStatus;
  reporting_manager_id?: string;
  reporting_manager_name?: string;
  employment_source: 'DIRECT' | 'VENDOR';
  vendor_name?: string;
  annual_ctc?: number;
  bank?: {
    bank_name: string;
    account_number: string;
    ifsc: string;
  };
  statutory?: {
    pan?: string | null;
    uan?: string | null;
    pf_number?: string | null;
    esi_number?: string | null;
    aadhaar_number?: string | null;
    aadhaar_masked?: string | null;
    pf_applicable?: boolean;
    esi_applicable?: boolean;
  };
  existing_db_id?: string;
}

export interface ValidationOptions {
  upsertExisting?: boolean;
  autoFallbackLastName?: boolean;
  autoGenerateEmailIfMissing?: boolean;
}

export interface ValidationSummary {
  totalRows: number;
  validRows: ParsedEmployeeRow[];
  errors: BulkImportRowError[];
  warnings: string[];
}

export interface BulkImportJobProgress {
  jobCode: string;
  status: 'UPLOADED' | 'VALIDATING' | 'READY' | 'PROCESSING' | 'COMPLETED' | 'COMPLETED_WITH_ERRORS' | 'FAILED';
  total: number;
  processed: number;
  successful: number;
  failed: number;
  percent: number;
}

export interface BulkImportResult {
  jobCode: string;
  totalRows: number;
  successfulRows: number;
  failedRows: number;
  createdEmployees: Employee[];
  failedRecords: BulkImportRowError[];
}

// ============================================================================
// Service Class
// ============================================================================

export class BulkImportService {
  /**
   * Reads an uploaded Excel or CSV file and extracts column headers and preview rows
   */
  public async extractSheetData(file: File): Promise<{
    headers: string[];
    rawRows: Record<string, any>[];
  }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array', cellDates: true });

          // Pick the first sheet or one named 'Employees'
          const sheetName = workbook.SheetNames.includes('Employees')
            ? 'Employees'
            : workbook.SheetNames[0];

          const worksheet = workbook.Sheets[sheetName];
          if (!worksheet) {
            throw new Error('No valid worksheet found in the uploaded workbook.');
          }

          // Parse as raw JSON array
          const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, {
            defval: '',
            raw: false,
          });

          // Extract headers from the sheet range or keys of raw rows
          const headers: string[] = [];
          if (rawRows.length > 0) {
            Object.keys(rawRows[0]).forEach((k) => {
              if (k && !k.startsWith('__EMPTY') && !headers.includes(k)) {
                headers.push(k);
              }
            });
          }

          if (headers.length === 0 && worksheet['!ref']) {
            const range = XLSX.utils.decode_range(worksheet['!ref']);
            for (let c = range.s.c; c <= range.e.c; c++) {
              const cell = worksheet[XLSX.utils.encode_cell({ r: range.s.r, c })];
              if (cell && cell.v) {
                headers.push(String(cell.v).trim());
              }
            }
          }

          resolve({ headers, rawRows });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Backwards-compatible parser
   */
  public async parseExcelFile(file: File): Promise<Record<string, any>[]> {
    const { rawRows } = await this.extractSheetData(file);
    return rawRows;
  }

  /**
   * Intelligent Auto-Detection of Column Mapping:
   * Maps canonical fields to uploaded headers using multi-level matching:
   * 1. Exact match against aliases (primary alias is exact template header!)
   * 2. Alphanumeric normalized match
   * 3. Substring match
   */
  public autoDetectColumnMapping(headers: string[]): Record<string, string> {
    const mapping: Record<string, string> = {};
    const usedHeaders = new Set<string>();

    const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');

    CANONICAL_IMPORT_FIELDS.forEach((field) => {
      // 1. Check exact match among aliases
      for (const h of headers) {
        if (usedHeaders.has(h)) continue;
        const normH = normalize(h);
        if (field.aliases.some((a) => normalize(a) === normH)) {
          mapping[field.key] = h;
          usedHeaders.add(h);
          return;
        }
      }

      // 2. Check contains match
      for (const h of headers) {
        if (usedHeaders.has(h)) continue;
        const normH = normalize(h);
        const normKey = normalize(field.key);
        if (normH.includes(normKey) || normKey.includes(normH)) {
          mapping[field.key] = h;
          usedHeaders.add(h);
          return;
        }
      }
    });

    return mapping;
  }

  /**
   * Safe helper to normalize dates into YYYY-MM-DD format
   */
  public normalizeDate(raw: any): string | null {
    if (!raw) return null;
    const clean = String(raw).trim();
    if (!clean) return null;

    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
      return clean;
    }

    const dmyMatch = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (dmyMatch) {
      const day = dmyMatch[1].padStart(2, '0');
      const month = dmyMatch[2].padStart(2, '0');
      const year = dmyMatch[3];
      return `${year}-${month}-${day}`;
    }

    const mdyMatch = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
    if (mdyMatch && parseInt(mdyMatch[1], 10) <= 12) {
      const month = mdyMatch[1].padStart(2, '0');
      const day = mdyMatch[2].padStart(2, '0');
      const year = mdyMatch[3].length === 2 ? `20${mdyMatch[3]}` : mdyMatch[3];
      return `${year}-${month}-${day}`;
    }

    const parsed = new Date(clean);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }

    return null;
  }

  /**
   * Helper to safely extract cell value checking multiple column headers
   */
  private getVal(row: Record<string, any>, ...keys: string[]): string {
    for (const k of keys) {
      if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
        return String(row[k]).trim();
      }
    }
    const lowerKeys = Object.keys(row).reduce((acc, current) => {
      const norm = current.toLowerCase().replace(/[^a-z0-9]/g, '');
      acc[norm] = row[current];
      return acc;
    }, {} as Record<string, any>);

    for (const k of keys) {
      const norm = k.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (lowerKeys[norm] !== undefined && String(lowerKeys[norm]).trim() !== '') {
        return String(lowerKeys[norm]).trim();
      }
    }

    return '';
  }

  /**
   * Builds Candidate Employee Rows grabbing ALL onboarding details accurately
   * Zero Reference Data Dependency: All department, designation, and branch strings are preserved.
   */
  public buildCandidateRows(
    rawRows: Record<string, any>[],
    columnMapping: Record<string, string>,
    existingEmployees: Employee[],
    options?: ValidationOptions
  ): CandidateValidationSummary {
    const candidates: CandidateEmployeeRow[] = [];
    const fileCodes = new Map<string, number>();
    const fileEmails = new Map<string, number>();
    const normalizeCode = (c: string) => c.replace(/[\s\-_]/g, '').toLowerCase();

    const existingCodeMap = new Map<string, Employee>();
    const existingEmailMap = new Map<string, Employee>();

    existingEmployees.forEach((e) => {
      if (e.employee_code) {
        existingCodeMap.set(e.employee_code.toLowerCase().trim(), e);
        existingCodeMap.set(normalizeCode(e.employee_code), e);
      }
      if (e.work_email) {
        existingEmailMap.set(e.work_email.toLowerCase().trim(), e);
      }
    });

    const getMapped = (row: Record<string, any>, key: string): string => {
      const mappedHeader = columnMapping[key];
      if (mappedHeader && row[mappedHeader] !== undefined && row[mappedHeader] !== null) {
        return String(row[mappedHeader]).trim();
      }
      const fieldDef = CANONICAL_IMPORT_FIELDS.find((f) => f.key === key);
      if (fieldDef) {
        return this.getVal(row, ...fieldDef.aliases);
      }
      return '';
    };

    // First pass for file duplicates
    rawRows.forEach((row) => {
      const code = getMapped(row, 'employee_code').toLowerCase().trim();
      if (code) {
        fileCodes.set(code, (fileCodes.get(code) || 0) + 1);
      }
      const email = getMapped(row, 'work_email').toLowerCase().trim();
      if (email) {
        fileEmails.set(email, (fileEmails.get(email) || 0) + 1);
      }
    });

    // Second pass: construct complete candidate row
    rawRows.forEach((row, idx) => {
      const rowNumber = idx + 2;
      const issues: CandidateIssue[] = [];
      let status: 'READY' | 'UPDATE' | 'NEEDS_ACTION' = 'READY';
      let existingDbId: string | undefined;

      // 1. Employee Code
      const empCode = getMapped(row, 'employee_code').trim();
      if (!empCode) {
        issues.push({ field: 'employee_code', message: 'Employee Code is required.', severity: 'error' });
      } else {
        const lowerCode = empCode.toLowerCase();
        if ((fileCodes.get(lowerCode) || 0) > 1) {
          issues.push({ field: 'employee_code', message: `Duplicate code "${empCode}" appears multiple times in file.`, severity: 'error' });
        }
        const matched = existingCodeMap.get(lowerCode) || existingCodeMap.get(normalizeCode(empCode));
        if (matched) {
          existingDbId = matched.id;
          if (options?.upsertExisting !== false) {
            status = 'UPDATE';
            issues.push({ field: 'employee_code', message: `Code "${empCode}" already exists in DB. Record will be updated.`, severity: 'warning' });
          } else {
            issues.push({ field: 'employee_code', message: `Employee Code "${empCode}" already exists in the system.`, severity: 'error' });
          }
        }
      }

      // 2. Name Handling
      let firstName = getMapped(row, 'first_name');
      const middleName = getMapped(row, 'middle_name');
      let lastName = getMapped(row, 'last_name');
      const fullName = getMapped(row, 'full_name');

      if (!firstName && fullName) {
        const parts = fullName.trim().split(/\s+/);
        firstName = parts[0] || '';
        if (!lastName && parts.length > 1) {
          lastName = parts.slice(1).join(' ');
        }
      }

      if (!firstName) {
        issues.push({ field: 'first_name', message: 'First Name is required.', severity: 'error' });
      }
      if (!lastName) {
        lastName = '.';
      }

      // 3. Work Email & Personal Email
      const email = getMapped(row, 'work_email').trim();
      const personalEmail = getMapped(row, 'personal_email').trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email) {
        issues.push({ field: 'work_email', message: 'Email address is required.', severity: 'error' });
      } else if (!emailRegex.test(email)) {
        issues.push({ field: 'work_email', message: `Invalid email format: "${email}".`, severity: 'error' });
      } else {
        const lowerEmail = email.toLowerCase();
        if ((fileEmails.get(lowerEmail) || 0) > 1) {
          issues.push({ field: 'work_email', message: `Duplicate email "${email}" in file.`, severity: 'error' });
        }
        const matchedEmail = existingEmailMap.get(lowerEmail);
        if (matchedEmail && (!existingDbId || matchedEmail.id !== existingDbId)) {
          issues.push({ field: 'work_email', message: `Email "${email}" is registered to another employee (${matchedEmail.employee_code}).`, severity: 'error' });
        }
      }

      // 4. Phone & Alternate Phone
      const rawPhone = getMapped(row, 'phone').trim();
      const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
      const altPhone = getMapped(row, 'alternate_phone').trim().replace(/[^0-9]/g, '');

      if (!rawPhone) {
        issues.push({ field: 'phone', message: 'Mobile phone number is required.', severity: 'error' });
      } else if (cleanPhone.length < 10) {
        issues.push({ field: 'phone', message: `Invalid phone "${rawPhone}". 10 digits required.`, severity: 'error' });
      }

      // 5. Gender & Personal Details
      const rawGender = getMapped(row, 'gender').toUpperCase().replace(/[\s-]/g, '_');
      let validGender: 'MALE' | 'FEMALE' | 'NON_BINARY' | 'PREFER_NOT_TO_SAY' = 'MALE';
      if (rawGender.includes('FEMALE')) validGender = 'FEMALE';
      else if (rawGender.includes('NON_BINARY')) validGender = 'NON_BINARY';
      else if (rawGender.includes('PREFER')) validGender = 'PREFER_NOT_TO_SAY';
      else validGender = 'MALE';

      const maritalStatus = getMapped(row, 'marital_status') || 'Single';
      const bloodGroup = getMapped(row, 'blood_group');

      // 6. Dates
      const rawDob = getMapped(row, 'dob');
      const normDob = this.normalizeDate(rawDob) || '1994-06-15';

      const rawDoj = getMapped(row, 'doj');
      const normDoj = this.normalizeDate(rawDoj) || new Date().toISOString().split('T')[0];

      // 7. Organization & Work Assignment
      const deptName = getMapped(row, 'department_name') || 'Operations';
      const desigTitle = getMapped(row, 'designation_title') || 'Staff';
      const branchName = getMapped(row, 'branch_name') || 'Headquarters';
      const rawMode = getMapped(row, 'work_mode').toUpperCase();
      let workMode: WorkMode = 'Hybrid';
      if (rawMode.includes('OFFICE')) workMode = 'Office';
      else if (rawMode.includes('REMOTE')) workMode = 'Remote';
      else if (rawMode.includes('FIELD')) workMode = 'Field';

      const rawType = getMapped(row, 'employment_type').toUpperCase();
      let normType: EmploymentType = 'Full Time';
      if (rawType.includes('PART')) normType = 'Part Time';
      else if (rawType.includes('CONTRACT')) normType = 'Contract';
      else if (rawType.includes('INTERN')) normType = 'Intern';

      const rawStatus = getMapped(row, 'employment_status').toUpperCase();
      let normStatus: EmployeeStatus = 'Active';
      if (rawStatus.includes('PROBATION')) normStatus = 'Probation';
      else if (rawStatus.includes('NOTICE')) normStatus = 'Notice Period';
      else if (rawStatus.includes('INACTIVE') || rawStatus.includes('SUSPEND')) normStatus = 'Suspended';

      const managerCode = getMapped(row, 'reporting_manager_code');
      const source = getMapped(row, 'employment_source').toUpperCase() === 'VENDOR' ? 'VENDOR' : 'DIRECT';
      const vendorName = getMapped(row, 'vendor_name');
      const probationMonths = parseInt(getMapped(row, 'probation_months'), 10) || 6;
      const noticePeriodDays = parseInt(getMapped(row, 'notice_period_days'), 10) || 60;

      // 8. Compensation & Payroll
      const rawCtc = getMapped(row, 'annual_ctc');
      const annualCtc = rawCtc ? parseFloat(rawCtc.replace(/[^0-9.]/g, '')) || undefined : undefined;
      const rawMonthlyGross = getMapped(row, 'monthly_gross');
      const monthlyGross = rawMonthlyGross ? parseFloat(rawMonthlyGross.replace(/[^0-9.]/g, '')) : (annualCtc ? Math.round(annualCtc / 12) : undefined);
      const taxRegime = getMapped(row, 'tax_regime').toUpperCase().includes('OLD') ? 'Old Regime' : 'New Regime';

      // 9. Bank Information
      const bankName = getMapped(row, 'bank_name');
      const accNum = getMapped(row, 'account_number');
      const ifsc = getMapped(row, 'ifsc');
      const accHolder = getMapped(row, 'account_holder_name') || `${firstName} ${lastName}`.trim();
      const accType = getMapped(row, 'account_type').toUpperCase() === 'SAVINGS' ? 'SAVINGS' : 'SALARY';

      // 10. Statutory Details
      // 10. Statutory Details & Identification (pan, aadhaar, uan, pf, esi)
      const pan = getMapped(row, 'pan');
      const uan = getMapped(row, 'uan');
      const pfNum = getMapped(row, 'pf_number');
      const pfAppRaw = getMapped(row, 'pf_applicable').toLowerCase();
      const pfApplicable = pfAppRaw === 'no' || pfAppRaw === 'false' ? false : (pfAppRaw === 'yes' || pfAppRaw === 'true' || Boolean(pfNum || uan));
      const esiNum = getMapped(row, 'esi');
      const esiAppRaw = getMapped(row, 'esi_applicable').toLowerCase();
      const esiApplicable = esiAppRaw === 'yes' || esiAppRaw === 'true' || Boolean(esiNum);
      const aadhaar = getMapped(row, 'aadhaar_number');

      // 11. Address & Emergency Contacts
      const currAddr = getMapped(row, 'current_address');
      const city = getMapped(row, 'city') || 'Coimbatore';
      const state = getMapped(row, 'state') || 'Tamil Nadu';
      const postal = getMapped(row, 'postal_code') || '641001';
      const permAddr = getMapped(row, 'permanent_address') || currAddr;

      const emgName = getMapped(row, 'emergency_name');
      const emgPhone = getMapped(row, 'emergency_phone');
      const emgRelation = getMapped(row, 'emergency_relation') || 'Family';

      const hasErrors = issues.some((i) => i.severity === 'error');
      if (hasErrors) {
        status = 'NEEDS_ACTION';
      } else if (!existingDbId) {
        status = 'READY';
      }

      candidates.push({
        id: `candidate-${idx + 1}`,
        rowNumber,
        selected: status !== 'NEEDS_ACTION',
        status,
        issues,

        // Core
        employee_code: empCode,
        first_name: firstName,
        middle_name: middleName || undefined,
        last_name: lastName,
        display_name: `${firstName} ${lastName}`.trim(),
        work_email: email,
        personal_email: personalEmail || undefined,
        phone: cleanPhone.slice(-10),
        alternate_phone: altPhone || undefined,
        gender: validGender,
        dob: normDob,
        marital_status: maritalStatus,
        blood_group: bloodGroup || undefined,

        // Organization
        doj: normDoj,
        department_name: deptName,
        designation_title: desigTitle,
        branch_name: branchName,
        work_mode: workMode,
        reporting_manager_code: managerCode || undefined,
        employment_type: normType,
        employment_status: normStatus,
        employment_source: source as EmploymentSource,
        vendor_name: vendorName || undefined,
        probation_months: probationMonths,
        notice_period_days: noticePeriodDays,

        // Compensation
        annual_ctc: annualCtc,
        monthly_gross: monthlyGross,
        tax_regime: taxRegime,

        // Bank
        bank_name: bankName || undefined,
        account_number: accNum || undefined,
        ifsc: ifsc || undefined,
        account_holder_name: accHolder,
        account_type: accType,

        // Statutory (Proper null/nil fallback if not provided in file)
        pan: pan ? pan.trim() : null,
        uan: uan ? uan.trim() : null,
        pf_number: pfNum ? pfNum.trim() : null,
        pf_applicable: pfApplicable,
        esi: esiNum ? esiNum.trim() : null,
        esi_applicable: esiApplicable,
        aadhaar_number: aadhaar ? aadhaar.trim() : null,

        // Address & Emergency
        current_address: currAddr || undefined,
        city: city || undefined,
        state: state || undefined,
        postal_code: postal || undefined,
        permanent_address: permAddr || undefined,
        emergency_name: emgName || undefined,
        emergency_phone: emgPhone || undefined,
        emergency_relation: emgRelation || undefined,

        raw: row,
        existing_db_id: existingDbId,
      });
    });

    const readyCount = candidates.filter((c) => c.status === 'READY').length;
    const updateCount = candidates.filter((c) => c.status === 'UPDATE').length;
    const needsActionCount = candidates.filter((c) => c.status === 'NEEDS_ACTION').length;

    return {
      total: candidates.length,
      readyCount,
      updateCount,
      needsActionCount,
      candidates,
    };
  }

  /**
   * Re-validates a single candidate row in-memory when edited inline by HR
   */
  public revalidateCandidate(
    candidate: CandidateEmployeeRow,
    allCandidates: CandidateEmployeeRow[],
    existingEmployees: Employee[]
  ): CandidateEmployeeRow {
    const issues: CandidateIssue[] = [];
    const code = candidate.employee_code.trim();

    if (!code) {
      issues.push({ field: 'employee_code', message: 'Employee Code is required.', severity: 'error' });
    } else {
      const duplicateCount = allCandidates.filter(
        (c) => c.id !== candidate.id && c.employee_code.toLowerCase().trim() === code.toLowerCase()
      ).length;
      if (duplicateCount > 0) {
        issues.push({ field: 'employee_code', message: `Duplicate code "${code}" exists in this list.`, severity: 'error' });
      }
    }

    if (!candidate.first_name.trim()) {
      issues.push({ field: 'first_name', message: 'First Name is required.', severity: 'error' });
    }

    const email = candidate.work_email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      issues.push({ field: 'work_email', message: 'Email address is required.', severity: 'error' });
    } else if (!emailRegex.test(email)) {
      issues.push({ field: 'work_email', message: `Invalid email format: "${email}".`, severity: 'error' });
    } else {
      const duplicateEmailCount = allCandidates.filter(
        (c) => c.id !== candidate.id && c.work_email.toLowerCase().trim() === email.toLowerCase()
      ).length;
      if (duplicateEmailCount > 0) {
        issues.push({ field: 'work_email', message: `Duplicate email "${email}" exists in this list.`, severity: 'error' });
      }
    }

    const cleanPhone = candidate.phone.replace(/[^0-9]/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      issues.push({ field: 'phone', message: 'Valid 10-digit mobile number required.', severity: 'error' });
    }

    const hasErrors = issues.some((i) => i.severity === 'error');
    const matchedExisting = existingEmployees.find(
      (e) => e.employee_code?.toLowerCase().trim() === code.toLowerCase()
    );

    let newStatus: 'READY' | 'UPDATE' | 'NEEDS_ACTION' = 'READY';
    if (hasErrors) {
      newStatus = 'NEEDS_ACTION';
    } else if (matchedExisting) {
      newStatus = 'UPDATE';
    }

    return {
      ...candidate,
      display_name: `${candidate.first_name.trim()} ${candidate.last_name?.trim() || ''}`.trim(),
      phone: cleanPhone.slice(-10),
      issues,
      status: newStatus,
      existing_db_id: matchedExisting?.id,
    };
  }

  /**
   * Backwards-compatible Level-1 & Level-2 Pre-Flight Validation for unit tests
   */
  public validateRows(
    rows: Record<string, any>[],
    departments: Department[] = [],
    designations: Designation[] = [],
    branches: Branch[] = [],
    existingEmployees: Employee[] = [],
    options?: ValidationOptions
  ): ValidationSummary {
    const validRows: ParsedEmployeeRow[] = [];
    const errors: BulkImportRowError[] = [];
    const warnings: string[] = [];

    const fileCodes = new Set<string>();
    const fileEmails = new Set<string>();
    const filePhones = new Set<string>();

    const normalizeCode = (c: string) => c.replace(/[\s\-_]/g, '').toLowerCase();

    const existingCodeMap = new Map<string, Employee>();
    const existingEmailMap = new Map<string, Employee>();
    const existingManagerMap = new Map<string, Employee>();

    existingEmployees.forEach((e) => {
      if (e.employee_code) {
        existingCodeMap.set(e.employee_code.toLowerCase().trim(), e);
        existingCodeMap.set(normalizeCode(e.employee_code), e);
        existingManagerMap.set(e.employee_code.toLowerCase().trim(), e);
        existingManagerMap.set(normalizeCode(e.employee_code), e);
      }
      if (e.work_email) {
        existingEmailMap.set(e.work_email.toLowerCase().trim(), e);
      }
    });

    rows.forEach((r) => {
      const rowCode = this.getVal(r, 'Employee Code *', 'employee_code', 'code');
      const fName = this.getVal(r, 'First Name *', 'first_name');
      const lName = this.getVal(r, 'Last Name *', 'last_name');
      if (rowCode) {
        const candidateMgr: any = {
          id: ensureUUID(`emp-${rowCode.toLowerCase().replace(/[^a-z0-9]/g, '')}`),
          employee_code: rowCode,
          first_name: fName,
          last_name: lName,
          display_name: `${fName} ${lName}`.trim(),
        };
        existingManagerMap.set(rowCode.toLowerCase().trim(), candidateMgr);
        existingManagerMap.set(normalizeCode(rowCode), candidateMgr);
      }
    });

    const deptByName = new Map<string, Department>();
    departments.forEach((d) => {
      if (d.name) deptByName.set(d.name.toLowerCase().trim(), d);
      if (d.id) deptByName.set(d.id.toLowerCase().trim(), d);
    });

    const desigByTitle = new Map<string, Designation>();
    designations.forEach((d) => {
      if (d.title) desigByTitle.set(d.title.toLowerCase().trim(), d);
      if (d.id) desigByTitle.set(d.id.toLowerCase().trim(), d);
    });

    const branchByName = new Map<string, Branch>();
    branches.forEach((b) => {
      if (b.name) branchByName.set(b.name.toLowerCase().trim(), b);
      if (b.id) branchByName.set(b.id.toLowerCase().trim(), b);
    });

    rows.forEach((row, idx) => {
      const rowNum = idx + 2;
      const rowErrors: BulkImportRowError[] = [];
      let existingDbId: string | undefined;

      const empCode = this.getVal(
        row,
        'Employee Code *', 'employee_code', 'Employee Code', 'code', 'emp_code', 'emp code',
        'empid', 'emp_id', 'employee_id', 'employee id', 'staff_id', 'staff id', 'staff_no',
        'staff no', 'empno', 'emp no', 'employee no', 'Worker ID'
      ).trim();

      if (!empCode) {
        rowErrors.push({
          rowNumber: rowNum,
          field: 'employee_code',
          value: '',
          message: 'Employee Code is mandatory.',
        });
      } else {
        const lowerCode = empCode.toLowerCase();
        if (fileCodes.has(lowerCode)) {
          rowErrors.push({
            rowNumber: rowNum,
            employeeCode: empCode,
            field: 'employee_code',
            value: empCode,
            message: `Duplicate Employee Code "${empCode}" detected within this uploaded file.`,
          });
        } else {
          fileCodes.add(lowerCode);
        }

        const matchedExistingByCode = existingCodeMap.get(lowerCode) || existingCodeMap.get(normalizeCode(empCode));
        if (matchedExistingByCode) {
          existingDbId = matchedExistingByCode.id;
          if (options?.upsertExisting) {
            warnings.push(`Row ${rowNum}: Employee Code "${empCode}" already exists in DB. Record will be updated.`);
          } else {
            rowErrors.push({
              rowNumber: rowNum,
              employeeCode: empCode,
              field: 'employee_code',
              value: empCode,
              message: `Employee Code "${empCode}" already exists in the organization database.`,
            });
          }
        }
      }

      let firstName = this.getVal(
        row,
        'First Name *', 'first_name', 'First Name', 'firstname', 'f_name', 'fname', 'first name'
      );
      const middleName = this.getVal(row, 'Middle Name', 'middle_name', 'Middle Name', 'middle name');
      let lastName = this.getVal(
        row,
        'Last Name *', 'last_name', 'Last Name', 'lastname', 'l_name', 'lname', 'surname', 'last name'
      );

      if (!firstName) {
        const fullName = this.getVal(
          row,
          'Name', 'Full Name', 'Employee Name', 'Staff Name', 'Candidate Name', 'full_name', 'employee_name', 'name'
        );
        if (fullName) {
          const parts = fullName.trim().split(/\s+/);
          firstName = parts[0] || '';
          if (!lastName && parts.length > 1) {
            lastName = parts.slice(1).join(' ');
          }
        }
      }

      if (!firstName) {
        rowErrors.push({
          rowNumber: rowNum,
          employeeCode: empCode,
          field: 'first_name',
          value: '',
          message: 'First Name is required (or provide a "Name" / "Full Name" column).',
        });
      }
      if (!lastName) {
        lastName = '.';
      }

      let email = this.getVal(
        row,
        'Work Email *', 'work_email', 'Work Email', 'email', 'Email ID', 'email_id', 'email id',
        'Official Email', 'official_email', 'official email', 'Official Mail', 'official_mail', 'official mail',
        'Work Email ID', 'work_email_id', 'work email id', 'Work Mail', 'work_mail', 'work mail',
        'E-mail', 'e-mail', 'Mail', 'mail', 'Mail ID', 'mail_id', 'mail id', 'Email Address', 'email_address', 'email address'
      ).trim();

      const personalEmail = this.getVal(
        row,
        'Personal Email', 'personal_email', 'personal email', 'Personal Mail', 'personal_mail'
      ).trim();

      if (!email && personalEmail) {
        email = personalEmail;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email) {
        if (options?.autoGenerateEmailIfMissing && empCode) {
          const slug = empCode.toLowerCase().replace(/[^a-z0-9]/g, '');
          email = `${slug}@noemail.joypeoplehr.local`;
          warnings.push(`Row ${rowNum}: Work Email was empty. Auto-assigned provisional placeholder: ${email}`);
        } else {
          rowErrors.push({
            rowNumber: rowNum,
            employeeCode: empCode,
            field: 'work_email',
            value: '',
            message: 'Email address is required. Please provide a work or personal email column.',
          });
        }
      } else if (!emailRegex.test(email)) {
        rowErrors.push({
          rowNumber: rowNum,
          employeeCode: empCode,
          field: 'work_email',
          value: email,
          message: `Invalid email format: "${email}".`,
        });
      } else {
        const lowerEmail = email.toLowerCase();
        if (fileEmails.has(lowerEmail)) {
          rowErrors.push({
            rowNumber: rowNum,
            employeeCode: empCode,
            field: 'work_email',
            value: email,
            message: `Duplicate Work Email "${email}" detected within this uploaded file.`,
          });
        } else {
          fileEmails.add(lowerEmail);
        }

        const matchedExistingByEmail = existingEmailMap.get(lowerEmail);
        if (matchedExistingByEmail) {
          existingDbId = existingDbId || matchedExistingByEmail.id;
          if (options?.upsertExisting) {
            warnings.push(`Row ${rowNum}: Work Email "${email}" already registered to ${matchedExistingByEmail.employee_code}. Record will be updated.`);
          } else {
            rowErrors.push({
              rowNumber: rowNum,
              employeeCode: empCode,
              field: 'work_email',
              value: email,
              message: `Work Email "${email}" is already registered to an existing employee.`,
            });
          }
        }
      }

      const rawPhone = this.getVal(
        row,
        'Primary Mobile *', 'phone', 'Primary Mobile', 'mobile', 'Mobile', 'Mobile Number', 'mobile_number',
        'Mobile No', 'mobile_no', 'mobile no', 'Phone Number', 'phone_number', 'phone number',
        'Phone No', 'phone_no', 'phone no', 'Contact Number', 'contact_number', 'contact number',
        'Contact No', 'contact_no', 'Contact', 'contact', 'Cell', 'cell', 'WhatsApp Number', 'whatsapp'
      );
      const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
      if (!rawPhone) {
        rowErrors.push({
          rowNumber: rowNum,
          employeeCode: empCode,
          field: 'phone',
          value: '',
          message: 'Primary Mobile number is required.',
        });
      } else if (cleanPhone.length < 10 || cleanPhone.length > 13) {
        rowErrors.push({
          rowNumber: rowNum,
          employeeCode: empCode,
          field: 'phone',
          value: rawPhone,
          message: `Invalid mobile number: "${rawPhone}". Expected a 10-digit phone number.`,
        });
      } else {
        const standardizedPhone = cleanPhone.slice(-10);
        if (filePhones.has(standardizedPhone)) {
          warnings.push(`Row ${rowNum}: Mobile number ${standardizedPhone} occurs multiple times in file.`);
        }
        filePhones.add(standardizedPhone);
      }

      const rawGender = this.getVal(row, 'Gender *', 'gender', 'Gender', 'Sex', 'sex').toUpperCase().replace(/[\s-]/g, '_');
      let validGender: 'MALE' | 'FEMALE' | 'NON_BINARY' | 'PREFER_NOT_TO_SAY' = 'MALE';
      if (rawGender.includes('FEMALE')) validGender = 'FEMALE';
      else if (rawGender.includes('NON_BINARY')) validGender = 'NON_BINARY';
      else if (rawGender.includes('PREFER')) validGender = 'PREFER_NOT_TO_SAY';
      else validGender = 'MALE';

      const rawDob = this.getVal(
        row,
        'Date of Birth * (YYYY-MM-DD)', 'dob', 'date_of_birth', 'DOB', 'Date of Birth', 'date of birth', 'Birth Date', 'birth_date'
      );
      const normDob = this.normalizeDate(rawDob);
      if (rawDob && !normDob) {
        rowErrors.push({
          rowNumber: rowNum,
          employeeCode: empCode,
          field: 'dob',
          value: rawDob,
          message: `Invalid Date of Birth format: "${rawDob}". Expected YYYY-MM-DD or DD-MM-YYYY.`,
        });
      }

      const rawDoj = this.getVal(
        row,
        'Date of Joining * (YYYY-MM-DD)', 'doj', 'date_of_joining', 'DOJ', 'Date of Joining', 'date of joining', 'Joining Date', 'joining_date'
      );
      const normDoj = this.normalizeDate(rawDoj);
      if (rawDoj && !normDoj) {
        rowErrors.push({
          rowNumber: rowNum,
          employeeCode: empCode,
          field: 'doj',
          value: rawDoj,
          message: `Invalid Date of Joining format: "${rawDoj}". Expected YYYY-MM-DD or DD-MM-YYYY.`,
        });
      }

      const rawDept = this.getVal(
        row,
        'Department *', 'department', 'department_name', 'Department', 'Dept', 'dept', 'Department Name', 'dept_name', 'dept name'
      ).trim();
      const matchedDept = deptByName.get(rawDept.toLowerCase());
      const finalDeptName = matchedDept?.name || rawDept || 'Operations';
      const finalDeptId = matchedDept?.id || 'dept-custom';

      const rawDesig = this.getVal(
        row,
        'Designation *', 'designation', 'designation_title', 'Designation', 'job_title', 'Job Title', 'title', 'Role', 'role', 'Position', 'position'
      ).trim();
      const matchedDesig = desigByTitle.get(rawDesig.toLowerCase());
      const finalDesigTitle = matchedDesig?.title || rawDesig || 'Staff';
      const finalDesigId = matchedDesig?.id || 'desig-custom';

      const rawBranch = this.getVal(
        row,
        'Work Location', 'branch', 'work_location', 'Location', 'location', 'Branch', 'branch_name', 'Site', 'site'
      ).trim();
      const matchedBranch = branchByName.get(rawBranch.toLowerCase());

      const rawType = this.getVal(row, 'Employment Type *', 'employment_type', 'type', 'Employment Type', 'job_type').toUpperCase();
      let normType: EmploymentType = 'Full Time';
      if (rawType.includes('PART')) normType = 'Part Time';
      else if (rawType.includes('CONTRACT')) normType = 'Contract';
      else if (rawType.includes('INTERN')) normType = 'Intern';

      const rawStatus = this.getVal(row, 'Employment Status *', 'employment_status', 'status', 'Employment Status').toUpperCase();
      let normStatus: EmployeeStatus = 'Active';
      if (rawStatus.includes('PROBATION')) normStatus = 'Probation';
      else if (rawStatus.includes('NOTICE')) normStatus = 'Notice Period';
      else if (rawStatus.includes('SUSPEND')) normStatus = 'Suspended';

      const managerCode = this.getVal(
        row,
        'Reporting Manager Code', 'reporting_manager_code', 'manager_code', 'Reporting Manager', 'manager_id', 'rm_code'
      ).trim();
      let managerId: string | undefined;
      let managerName: string | undefined;

      if (managerCode) {
        const cleanMgr = managerCode.toLowerCase().trim();
        const normMgr = normalizeCode(managerCode);
        const matchedManager = existingManagerMap.get(cleanMgr) || existingManagerMap.get(normMgr);
        if (matchedManager) {
          managerId = matchedManager.id;
          managerName = `${matchedManager.first_name || ''} ${matchedManager.last_name || ''}`.trim();
        } else {
          rowErrors.push({
            rowNumber: rowNum,
            employeeCode: empCode,
            field: 'reporting_manager_code',
            value: managerCode,
            message: `Reporting Manager with Code "${managerCode}" was not found in database or uploaded file.`,
          });
          warnings.push(`Row ${rowNum}: Reporting Manager "${managerCode}" was not found in database. Unassigned.`);
        }
      }

      const bankName = this.getVal(row, 'Bank Name', 'bank_name', 'bank', 'Bank');
      const accNum = this.getVal(row, 'Account Number', 'account_number', 'account_no', 'acc_no', 'Account No');
      const ifsc = this.getVal(row, 'IFSC Code', 'ifsc_code', 'ifsc', 'IFSC');
      const pan = this.getVal(row, 'PAN Number', 'PAN', 'pan_number', 'pan', 'pan_no', 'PAN No');
      const uan = this.getVal(row, 'UAN Number', 'UAN', 'uan_number', 'uan', 'uan_no', 'UAN No', 'PF UAN');
      const pfNum = this.getVal(row, 'PF Number', 'PF Member ID', 'PF No', 'pf_number', 'pf', 'PF', 'pf_no', 'pf member id');
      const esiNum = this.getVal(row, 'ESIC Number', 'ESI Number', 'ESIC', 'ESI', 'esi_number', 'esic_number', 'esi', 'esic', 'esi_no', 'esic no');
      const aadhaar = this.getVal(row, 'Aadhaar Number', 'Aadhar Number', 'AAdhar Number', 'Aadhaar', 'Aadhar', 'AAdhar', 'aadhaar_number', 'aadhar_number', 'aadhaar', 'aadhar', 'UID', 'National ID');
      const annualCtcStr = this.getVal(row, 'Annual CTC', 'annual_ctc', 'ctc', 'CTC', 'Annual CTC', 'Gross Salary', 'salary');
      const annualCtc = annualCtcStr ? parseFloat(annualCtcStr.replace(/[^0-9.]/g, '')) : undefined;

      const empSource = this.getVal(row, 'Employment Source', 'employment_source').toUpperCase() === 'VENDOR' ? 'VENDOR' : 'DIRECT';
      const vendorName = this.getVal(row, 'Vendor Name', 'vendor_name');

      if (rowErrors.length > 0) {
        errors.push(...rowErrors);
      } else {
        validRows.push({
          rowNumber: rowNum,
          raw: row,
          existing_db_id: existingDbId,
          employee_code: empCode,
          first_name: firstName,
          middle_name: middleName || undefined,
          last_name: lastName,
          display_name: `${firstName} ${lastName}`.trim(),
          work_email: email,
          phone: cleanPhone.slice(-10),
          gender: validGender,
          dob: normDob || '1995-01-01',
          doj: normDoj || new Date().toISOString().split('T')[0],
          department_id: finalDeptId,
          department_name: finalDeptName,
          designation_id: finalDesigId,
          designation_title: finalDesigTitle,
          branch_id: matchedBranch?.id,
          branch_name: matchedBranch?.name,
          employment_type: normType,
          employment_status: normStatus,
          reporting_manager_id: managerId,
          reporting_manager_name: managerName,
          employment_source: empSource,
          vendor_name: vendorName || undefined,
          annual_ctc: annualCtc,
          bank: bankName || accNum ? { bank_name: bankName || 'Bank', account_number: accNum || '', ifsc: ifsc || '' } : undefined,
          statutory: {
            pan: pan ? pan.trim() : null,
            uan: uan ? uan.trim() : null,
            pf_number: pfNum ? pfNum.trim() : null,
            esi_number: esiNum ? esiNum.trim() : null,
            aadhaar_number: aadhaar ? aadhaar.trim() : null,
            aadhaar_masked: aadhaar ? aadhaar.trim() : null,
            pf_applicable: Boolean(pfNum || uan),
            esi_applicable: Boolean(esiNum),
          },
        });
      }
    });

    return {
      totalRows: rows.length,
      validRows,
      errors,
      warnings,
    };
  }

  /**
   * Safe Chunked Execution of Confirmed Candidates:
   * Only imports selected rows with valid status
   */
  public async executeImportCandidates(
    candidates: CandidateEmployeeRow[],
    organizationId: string,
    companyId: string,
    onProgress: (progress: BulkImportJobProgress) => void,
    chunkSize: number = 25,
    existingEmployees: Employee[] = []
  ): Promise<BulkImportResult> {
    const confirmedToImport = candidates.filter((c) => c.selected && c.status !== 'NEEDS_ACTION');
    const jobCode = `IMP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
    const total = confirmedToImport.length;
    let processed = 0;
    let successful = 0;
    let failed = 0;
    const createdEmployees: Employee[] = [];
    const failedRecords: BulkImportRowError[] = [];

    onProgress({
      jobCode,
      status: 'PROCESSING',
      total,
      processed: 0,
      successful: 0,
      failed: 0,
      percent: 0,
    });

    if (isSupabaseEnabled) {
      try {
        await supabase.from('employee_import_jobs').insert({
          import_code: jobCode,
          organization_id: organizationId,
          company_id: companyId,
          file_name: `Bulk_Import_${total}_Employees.xlsx`,
          total_rows: total,
          valid_rows: total,
          invalid_rows: 0,
          status: 'PROCESSING',
        });
      } catch (jobErr) {
        console.warn('[BulkImportService] Import job tracking notice:', jobErr);
      }
    }

    for (let i = 0; i < confirmedToImport.length; i += chunkSize) {
      const chunk = confirmedToImport.slice(i, i + chunkSize);

      await Promise.all(
        chunk.map(async (row) => {
          try {
            // Accurately resolve reporting manager id & name from live database / list
            let resolvedMgrId: string | undefined;
            let resolvedMgrName: string | undefined = row.reporting_manager_code;

            if (row.reporting_manager_code) {
              const normMgr = row.reporting_manager_code.toLowerCase().trim();
              const matchedMgr = existingEmployees.find(
                (e) =>
                  e.employee_code?.toLowerCase().trim() === normMgr ||
                  e.display_name?.toLowerCase().trim() === normMgr ||
                  `${e.first_name || ''} ${e.last_name || ''}`.trim().toLowerCase() === normMgr
              );
              if (matchedMgr) {
                resolvedMgrId = matchedMgr.id;
                resolvedMgrName = `${matchedMgr.first_name} ${matchedMgr.last_name}`.trim();
              } else {
                resolvedMgrId = ensureUUID(`emp-${row.reporting_manager_code.toLowerCase().replace(/[^a-z0-9]/g, '')}`);
              }
            }

            const employeePayload = {
              id: row.existing_db_id || ensureUUID(`emp-${row.employee_code.toLowerCase().replace(/[^a-z0-9]/g, '')}`),
              employee_code: row.employee_code,
              organization_id: organizationId,
              company_id: companyId,
              first_name: row.first_name,
              middle_name: row.middle_name,
              last_name: row.last_name || '.',
              display_name: row.display_name,
              work_email: row.work_email,
              phone: row.phone,
              gender: row.gender,
              dob: row.dob,
              doj: row.doj,
              department_id: `dept-${row.department_name.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'ops'}`,
              department_name: row.department_name,
              designation_id: `desig-${row.designation_title.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'staff'}`,
              designation_title: row.designation_title,
              branch_name: row.branch_name,
              branch_id: `branch-${row.branch_name.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'hq'}`,
              work_location: row.branch_name,
              work_mode: row.work_mode || 'Hybrid',
              employment_type: row.employment_type,
              status: row.employment_status,
              employment_source: row.employment_source || 'DIRECT',
              vendor_name: row.vendor_name,
              reporting_manager_id: resolvedMgrId,
              reporting_manager_name: resolvedMgrName,
              probation_period_months: row.probation_months || 6,
              notice_period_days: row.notice_period_days || 60,
              annual_ctc: row.annual_ctc || 600000,
              monthly_ctc: row.monthly_gross || (row.annual_ctc ? Math.round(row.annual_ctc / 12) : 50000),

              profile: {
                first_name: row.first_name,
                middle_name: row.middle_name,
                last_name: row.last_name || '.',
                personal_email: row.personal_email,
                phone: row.phone,
                alternate_phone: row.alternate_phone,
                date_of_birth: row.dob,
                gender: row.gender,
                marital_status: row.marital_status || 'Single',
                blood_group: row.blood_group,
                current_address: row.current_address ? {
                  line1: row.current_address,
                  city: row.city || 'Coimbatore',
                  state: row.state || 'Tamil Nadu',
                  country: 'India',
                  postal_code: row.postal_code || '641001',
                } : undefined,
                permanent_address: row.permanent_address ? {
                  line1: row.permanent_address,
                  city: row.city || 'Coimbatore',
                  state: row.state || 'Tamil Nadu',
                  country: 'India',
                  postal_code: row.postal_code || '641001',
                } : undefined,
                emergency_contacts: row.emergency_name ? [{
                  name: row.emergency_name,
                  phone: row.emergency_phone || '',
                  relationship: row.emergency_relation || 'Family',
                  is_primary: true,
                  priority: 1,
                }] : undefined,
              },

              employment: {
                doj: row.doj,
                employment_type: row.employment_type,
                employment_source: row.employment_source || 'DIRECT',
                vendor_name: row.vendor_name,
                work_location: row.branch_name,
                work_mode: row.work_mode || 'Hybrid',
                probation_period_months: row.probation_months || 6,
                notice_period_days: row.notice_period_days || 60,
                annual_ctc: row.annual_ctc,
                monthly_gross: row.monthly_gross,
                tax_regime: row.tax_regime,
              },

              bank: row.bank_name || row.account_number ? {
                bank_name: row.bank_name || 'Bank',
                account_number: row.account_number || '',
                ifsc: row.ifsc || '',
                account_holder_name: row.account_holder_name || row.display_name,
                account_type: row.account_type || 'SALARY',
              } : undefined,

              statutory: {
                pan: row.pan ? row.pan.trim() : null,
                pan_number: row.pan ? row.pan.trim() : null,
                uan: row.uan ? row.uan.trim() : null,
                uan_number: row.uan ? row.uan.trim() : null,
                pf_number: row.pf_number ? row.pf_number.trim() : null,
                esi_number: row.esi ? row.esi.trim() : null,
                aadhaar_number: row.aadhaar_number ? row.aadhaar_number.trim() : null,
                aadhaar_masked: row.aadhaar_number ? row.aadhaar_number.trim() : null,
                pf_applicable: row.pf_applicable !== undefined ? row.pf_applicable : Boolean(row.pf_number || row.uan),
                esi_applicable: row.esi_applicable !== undefined ? row.esi_applicable : Boolean(row.esi),
                tax_regime: row.tax_regime || 'NEW',
              },
            };

            const created = await api.createEmployee(employeePayload);
            createdEmployees.push(created);
            successful++;
          } catch (insertError: any) {
            failed++;
            failedRecords.push({
              rowNumber: row.rowNumber,
              employeeCode: row.employee_code,
              field: 'database_insert',
              value: row.employee_code,
              message: insertError?.message || 'Failed to persist employee record to database.',
            });
          } finally {
            processed++;
          }
        })
      );

      const currentPercent = Math.min(100, Math.round((processed / total) * 100));
      onProgress({
        jobCode,
        status: 'PROCESSING',
        total,
        processed,
        successful,
        failed,
        percent: currentPercent,
      });
    }

    const finalStatus = failed === 0 ? 'COMPLETED' : failed === total ? 'FAILED' : 'COMPLETED_WITH_ERRORS';

    if (isSupabaseEnabled) {
      try {
        await supabase
          .from('employee_import_jobs')
          .update({
            status: finalStatus,
            processed_rows: processed,
            successful_rows: successful,
            failed_rows: failed,
            error_summary: failedRecords,
            completed_at: new Date().toISOString(),
          })
          .eq('import_code', jobCode);
      } catch (jobUpdateErr) {
        console.warn('[BulkImportService] Final job update notice:', jobUpdateErr);
      }
    }

    onProgress({
      jobCode,
      status: finalStatus,
      total,
      processed,
      successful,
      failed,
      percent: 100,
    });

    if (typeof window !== 'undefined' && createdEmployees.length > 0) {
      window.dispatchEvent(new CustomEvent('employees:bulk_created', { detail: createdEmployees }));
    }

    return {
      jobCode,
      totalRows: total,
      successfulRows: successful,
      failedRows: failed,
      createdEmployees,
      failedRecords,
    };
  }

  /**
   * Backwards-compatible batch executor
   */
  public async executeBulkImport(
    validRows: ParsedEmployeeRow[],
    organizationId: string,
    companyId: string,
    onProgress: (progress: BulkImportJobProgress) => void,
    chunkSize: number = 25
  ): Promise<BulkImportResult> {
    const candidates: CandidateEmployeeRow[] = validRows.map((v, i) => ({
      id: `c-${i}`,
      rowNumber: v.rowNumber,
      selected: true,
      status: 'READY',
      issues: [],
      employee_code: v.employee_code,
      first_name: v.first_name,
      middle_name: v.middle_name,
      last_name: v.last_name,
      display_name: v.display_name,
      work_email: v.work_email,
      phone: v.phone,
      gender: v.gender,
      dob: v.dob,
      doj: v.doj,
      department_name: v.department_name,
      designation_title: v.designation_title,
      branch_name: v.branch_name || 'Headquarters',
      reporting_manager_code: v.reporting_manager_name,
      employment_type: v.employment_type,
      employment_status: v.employment_status,
      annual_ctc: v.annual_ctc,
      pan: v.statutory?.pan,
      uan: v.statutory?.uan,
      esi: v.statutory?.esi_number,
      bank_name: v.bank?.bank_name,
      account_number: v.bank?.account_number,
      ifsc: v.bank?.ifsc,
      raw: v.raw,
      existing_db_id: v.existing_db_id,
    }));

    return this.executeImportCandidates(candidates, organizationId, companyId, onProgress, chunkSize);
  }
}

export const bulkImportService = new BulkImportService();
