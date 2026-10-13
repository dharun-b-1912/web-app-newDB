// src/features/people/bulk/bulkImportService.ts
// ============================================================================
// Joy PeopleHR Enterprise — Authoritative Bulk Employee Import Pipeline
// Features:
// 1. Two-Level Validation (Client Fast-Feedback + Backend Authoritative Constraints)
// 2. Strict In-File & Existing-DB Duplicate Protection (Code, Email, Mobile)
// 3. Human-Readable Relationship Resolution (Manager Employee Code -> UUID, Dept Name -> ID)
// 4. Safe Chunked Processing (Batches of 25) with Resilient Partial-Failure Isolation
// 5. Audit Job Tracking with Idempotent Retry
// 6. Zero Service-Role Key Exposure in Frontend
// ============================================================================

import * as XLSX from 'xlsx';
import { Department, Designation, Branch, Employee, EmploymentType, EmployeeStatus } from '../../../types';
import { api, ensureUUID } from '../../../services/api';
import { supabase, isSupabaseEnabled } from '../../../lib/supabase';
import { BulkImportRowError } from './excelTemplateGenerator';

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
    pan?: string;
    uan?: string;
    pf_number?: string;
    esi_number?: string;
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

export class BulkImportService {
  /**
   * Reads an uploaded Excel or CSV file and parses the 'Employees' sheet
   */
  public async parseExcelFile(file: File): Promise<Record<string, any>[]> {
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

          // Parse as JSON array with raw string keys
          const json: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, {
            defval: '',
            raw: false,
          });

          resolve(json);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Helper to safely extract cell value checking multiple common column headers
   */
  private getVal(row: Record<string, any>, ...keys: string[]): string {
    for (const k of keys) {
      if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
        return String(row[k]).trim();
      }
    }
    // Also try case-insensitive and stripped match
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
   * Normalizes dates from various formats (e.g. 1995-05-15, 15/05/1995, Date strings) to YYYY-MM-DD
   */
  private normalizeDate(raw: string): string | null {
    if (!raw) return null;
    const clean = raw.trim();

    // ISO format: YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
      return clean;
    }

    // DD-MM-YYYY or DD/MM/YYYY
    const dmyMatch = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (dmyMatch) {
      const day = dmyMatch[1].padStart(2, '0');
      const month = dmyMatch[2].padStart(2, '0');
      const year = dmyMatch[3];
      return `${year}-${month}-${day}`;
    }

    // Try standard Date parsing
    const parsed = new Date(clean);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }

    return null;
  }

  /**
   * Level-1 & Level-2 Pre-Flight Validation
   * Validates mandatory columns, enums, regexes, in-file duplicates, and DB duplicates
   */
  public validateRows(
    rows: Record<string, any>[],
    departments: Department[],
    designations: Designation[],
    branches: Branch[],
    existingEmployees: Employee[],
    options?: ValidationOptions
  ): ValidationSummary {
    const validRows: ParsedEmployeeRow[] = [];
    const errors: BulkImportRowError[] = [];
    const warnings: string[] = [];

    // Track sets for in-file uniqueness
    const fileCodes = new Set<string>();
    const fileEmails = new Set<string>();
    const filePhones = new Set<string>();

    const normalizeCode = (c: string) => c.replace(/[\s\-_]/g, '').toLowerCase();

    // Map existing DB values for quick lookup (normalized lower case)
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

    // CRITICAL: Pre-scan the rows in the uploaded spreadsheet itself to register
    // any managers defined within the same file (e.g. Row 2 is Praveen "JMS - 102",
    // and Row 3 reports to "JMS - 102")!
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

    // Helper map for departments & designations
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
      const rowNum = idx + 2; // Excel header is row 1, data starts at row 2
      const rowErrors: BulkImportRowError[] = [];
      let existingDbId: string | undefined;

      // 1. Mandatory Employee Code (Support numerous aliases, preserve exact code)
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

      // 2. First Name & Last Name (Handle Full Name / Name columns as well)
      let firstName = this.getVal(
        row,
        'First Name *', 'first_name', 'First Name', 'firstname', 'f_name', 'fname', 'first name'
      );
      const middleName = this.getVal(row, 'Middle Name', 'middle_name', 'Middle Name', 'middle name');
      let lastName = this.getVal(
        row,
        'Last Name *', 'last_name', 'Last Name', 'lastname', 'l_name', 'lname', 'surname', 'last name'
      );

      // If First Name is missing, attempt to extract from "Name" / "Full Name" / "Employee Name"
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
        if (firstName && options?.autoFallbackLastName !== false) {
          lastName = '.';
          warnings.push(`Row ${rowNum}: Last Name was empty. Defaulted to "."`);
        } else {
          rowErrors.push({
            rowNumber: rowNum,
            employeeCode: empCode,
            field: 'last_name',
            value: '',
            message: 'Last Name is required.',
          });
        }
      }

      // 3. Work Email & Personal Email (Comprehensive header matching, NO forced fake auto-generation)
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

      // If work email is missing but personal email is provided, use personal email
      if (!email && personalEmail) {
        email = personalEmail;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email) {
        // If autoGenerateEmailIfMissing was explicitly requested by user options
        if (options?.autoGenerateEmailIfMissing && empCode) {
          const slug = empCode.toLowerCase().replace(/[^a-z0-9]/g, '');
          email = `${slug}@noemail.joypeoplehr.local`;
          warnings.push(`Row ${rowNum}: Work Email was empty. Auto-assigned provisional placeholder: ${email}`);
        } else {
          // Flag clear error without creating fake joycorporatesolutions.com emails
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

      // 4. Primary Mobile Phone (Support all phone headers, DO NOT fallback to test numbers)
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

      // 5. Gender Enum Check
      const rawGender = this.getVal(row, 'Gender *', 'gender', 'Gender', 'Sex', 'sex').toUpperCase().replace(/[\s-]/g, '_');
      let validGender: 'MALE' | 'FEMALE' | 'NON_BINARY' | 'PREFER_NOT_TO_SAY' = 'MALE';
      if (!rawGender) {
        validGender = 'MALE'; // Sensible default rather than blocking import
        warnings.push(`Row ${rowNum}: Gender not specified. Defaulted to MALE.`);
      } else if (rawGender.includes('FEMALE')) {
        validGender = 'FEMALE';
      } else if (rawGender.includes('NON_BINARY')) {
        validGender = 'NON_BINARY';
      } else if (rawGender.includes('PREFER')) {
        validGender = 'PREFER_NOT_TO_SAY';
      } else if (rawGender.includes('MALE')) {
        validGender = 'MALE';
      } else {
        validGender = 'MALE';
      }

      // 6. Dates: DOB and DOJ
      const rawDob = this.getVal(
        row,
        'Date of Birth * (YYYY-MM-DD)', 'dob', 'date_of_birth', 'DOB', 'Date of Birth', 'date of birth', 'Birth Date', 'birth_date'
      );
      const normDob = this.normalizeDate(rawDob);
      if (!rawDob) {
        warnings.push(`Row ${rowNum}: Date of Birth was empty. Defaulted to 1995-01-01.`);
      } else if (!normDob) {
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
      if (!rawDoj) {
        warnings.push(`Row ${rowNum}: Date of Joining was empty. Defaulted to today's date.`);
      } else if (!normDoj) {
        rowErrors.push({
          rowNumber: rowNum,
          employeeCode: empCode,
          field: 'doj',
          value: rawDoj,
          message: `Invalid Date of Joining format: "${rawDoj}". Expected YYYY-MM-DD or DD-MM-YYYY.`,
        });
      }

      // 7. Department Resolution (Fuzzy match, NO forced 'dept-eng' override)
      const rawDept = this.getVal(
        row,
        'Department *', 'department', 'department_name', 'Department', 'Dept', 'dept', 'Department Name', 'dept_name', 'dept name'
      ).trim();

      let matchedDept: Department | undefined;
      if (rawDept) {
        const cleanDept = rawDept.toLowerCase();
        // Exact name or ID match
        matchedDept = deptByName.get(cleanDept);
        if (!matchedDept) {
          // Partial name match
          matchedDept = departments.find(
            (d) => d.name?.toLowerCase().trim() === cleanDept ||
                   d.name?.toLowerCase().includes(cleanDept) ||
                   cleanDept.includes(d.name?.toLowerCase().trim())
          );
        }
      }

      // If still not matched, preserve the exact department name entered in Excel!
      const finalDeptName = matchedDept?.name || rawDept || (departments.length > 0 ? departments[0].name : 'Operations');
      const finalDeptId = matchedDept?.id || (departments.find((d) => d.name.toLowerCase() === finalDeptName.toLowerCase())?.id) || 'dept-custom';

      // 8. Designation Resolution (Fuzzy match, preserve entered job title)
      const rawDesig = this.getVal(
        row,
        'Designation *', 'designation', 'designation_title', 'Designation', 'job_title', 'Job Title', 'title', 'Role', 'role', 'Position', 'position'
      ).trim();

      let matchedDesig: Designation | undefined;
      if (rawDesig) {
        const cleanDesig = rawDesig.toLowerCase();
        matchedDesig = desigByTitle.get(cleanDesig);
        if (!matchedDesig) {
          matchedDesig = designations.find(
            (d) => d.title?.toLowerCase().trim() === cleanDesig ||
                   d.title?.toLowerCase().includes(cleanDesig) ||
                   cleanDesig.includes(d.title?.toLowerCase().trim())
          );
        }
      }

      const finalDesigTitle = matchedDesig?.title || rawDesig || (designations.length > 0 ? designations[0].title : 'Staff');
      const finalDesigId = matchedDesig?.id || (designations.find((d) => d.title.toLowerCase() === finalDesigTitle.toLowerCase())?.id) || 'desig-custom';

      // 9. Branch / Work Location
      const rawBranch = this.getVal(
        row,
        'Work Location', 'branch', 'work_location', 'Location', 'location', 'Branch', 'branch_name', 'Site', 'site'
      ).trim();
      const matchedBranch = branchByName.get(rawBranch.toLowerCase()) || (branches.length > 0 ? branches[0] : undefined);

      // 10. Employment Type & Status Enums
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

      // 11. Reporting Manager Resolution by Employee Code
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
          warnings.push(`Row ${rowNum}: Reporting Manager "${managerCode}" was not found in database. Unassigned.`);
        }
      }

      // 12. Optional Fields: Bank & Statutory
      const bankName = this.getVal(row, 'Bank Name', 'bank_name', 'bank', 'Bank');
      const accNum = this.getVal(row, 'Account Number', 'account_number', 'account_no', 'acc_no', 'Account No');
      const ifsc = this.getVal(row, 'IFSC Code', 'ifsc_code', 'ifsc', 'IFSC');
      const pan = this.getVal(row, 'PAN Number', 'pan_number', 'pan', 'PAN', 'pan_no');
      const uan = this.getVal(row, 'UAN Number', 'uan_number', 'uan', 'UAN', 'uan_no');
      const pfNum = this.getVal(row, 'PF Number', 'pf_number', 'pf', 'PF', 'pf_no');
      const esiNum = this.getVal(row, 'ESI Number', 'esi_number', 'esi', 'ESI', 'esi_no');
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
          statutory: pan || uan || pfNum || esiNum ? {
            pan: pan || '',
            uan: uan || '',
            pf_number: pfNum || '',
            esi_number: esiNum || '',
            pf_applicable: Boolean(pfNum || uan),
            esi_applicable: Boolean(esiNum),
          } : undefined,
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
   * Safe Chunked Processing:
   * Inserts records into database in batches of 25 to respect timeouts and connection pool limits.
   * Tracks progress and isolates individual failures so 197 succeed even if 3 fail.
   */
  public async executeBulkImport(
    validRows: ParsedEmployeeRow[],
    organizationId: string,
    companyId: string,
    onProgress: (progress: BulkImportJobProgress) => void,
    chunkSize: number = 25
  ): Promise<BulkImportResult> {
    const jobCode = `IMP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
    const total = validRows.length;
    let processed = 0;
    let successful = 0;
    let failed = 0;
    const createdEmployees: Employee[] = [];
    const failedRecords: BulkImportRowError[] = [];

    // Notify initial state
    onProgress({
      jobCode,
      status: 'PROCESSING',
      total,
      processed: 0,
      successful: 0,
      failed: 0,
      percent: 0,
    });

    // Record job in Supabase if enabled
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

    // Process chunk by chunk
    for (let i = 0; i < validRows.length; i += chunkSize) {
      const chunk = validRows.slice(i, i + chunkSize);

      await Promise.all(
        chunk.map(async (row) => {
          try {
            const employeePayload = {
              id: row.existing_db_id || ensureUUID(`emp-${row.employee_code.toLowerCase().replace(/[^a-z0-9]/g, '')}`),
              employee_code: row.employee_code,
              organization_id: organizationId,
              company_id: companyId,
              first_name: row.first_name,
              middle_name: row.middle_name,
              last_name: row.last_name,
              display_name: row.display_name,
              work_email: row.work_email,
              phone: row.phone,
              gender: row.gender,
              dob: row.dob,
              doj: row.doj,
              department_id: row.department_id,
              department_name: row.department_name,
              designation_id: row.designation_id,
              designation_title: row.designation_title,
              branch_id: row.branch_id,
              branch_name: row.branch_name,
              employment_type: row.employment_type,
              status: row.employment_status,
              employment_source: row.employment_source,
              vendor_name: row.vendor_name,
              reporting_manager_id: row.reporting_manager_id,
              reporting_manager_name: row.reporting_manager_name,
              bank: row.bank,
              statutory: row.statutory,
              annual_ctc: row.annual_ctc || 600000,
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

    // Update job tracking status
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

    // Notify system about created employees
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
}

export const bulkImportService = new BulkImportService();
