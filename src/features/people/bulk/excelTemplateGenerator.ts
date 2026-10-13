// src/features/people/bulk/excelTemplateGenerator.ts
// ============================================================================
// Joy PeopleHR Enterprise — Authoritative Excel Template & Error Report Generator
// Generates:
// 1. Approved Enterprise 3-Sheet Excel Template:
//    - Sheet 1: Employees (Columns derived directly from Supabase schema)
//    - Sheet 2: Instructions (Clear formatting rules, required fields, date formats)
//    - Sheet 3: Reference Data (Live DB-driven departments, designations, branches, managers)
// 2. Error Report XLSX with row-by-row error reasons for rapid remediation
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

export function generateEmployeeImportTemplate(data: TemplateMasterData): void {
  const wb = XLSX.utils.book_new();

  // --------------------------------------------------------------------------
  // SHEET 1: EMPLOYEES
  // --------------------------------------------------------------------------
  const headers = [
    'Employee Code *',
    'First Name *',
    'Middle Name',
    'Last Name *',
    'Work Email *',
    'Primary Mobile *',
    'Gender *',
    'Date of Birth * (YYYY-MM-DD)',
    'Date of Joining * (YYYY-MM-DD)',
    'Department *',
    'Designation *',
    'Work Location',
    'Employment Type *',
    'Employment Status *',
    'Reporting Manager Code',
    'Employment Source',
    'Vendor Name',
    'Annual CTC',
    'Bank Name',
    'Account Number',
    'IFSC Code',
    'PAN Number',
    'UAN Number',
  ];

  // Primary managers or defaults
  const sampleManagerCode = data.existingEmployees.length > 0 ? data.existingEmployees[0].employee_code : 'JCS-001';
  const sampleDept = data.departments.length > 0 ? data.departments[0].name : 'Engineering & Technology';
  const sampleDesig = data.designations.length > 0 ? data.designations[0].title : 'Software Engineer';
  const sampleBranch = data.branches.length > 0 ? data.branches[0].name : 'Coimbatore HQ';

  // Sample Rows demonstrating correct formats
  const sampleRows = [
    [
      'JCS-501',
      'Anand',
      'Kumar',
      'Viswanathan',
      'anand.v@joycorporate.com',
      '9876543210',
      'MALE',
      '1994-06-15',
      '2026-10-01',
      sampleDept,
      sampleDesig,
      sampleBranch,
      'FULL_TIME',
      'ACTIVE',
      sampleManagerCode,
      'DIRECT',
      '',
      '840000',
      'HDFC Bank',
      '50100456789012',
      'HDFC0001234',
      'ABCDE1234F',
      '100904567812',
    ],
    [
      'JCS-502',
      'Priya',
      '',
      'Ranganathan',
      'priya.r@joycorporate.com',
      '9845012345',
      'FEMALE',
      '1996-09-22',
      '2026-10-01',
      sampleDept,
      sampleDesig,
      sampleBranch,
      'FULL_TIME',
      'PROBATION',
      sampleManagerCode,
      'DIRECT',
      '',
      '720000',
      'ICICI Bank',
      '102003456789',
      'ICIC0001020',
      'PQRST5678K',
      '100908765432',
    ],
  ];

  const wsEmployees = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);

  // Set column widths for easy reading
  wsEmployees['!cols'] = [
    { wch: 18 }, // Employee Code
    { wch: 16 }, // First Name
    { wch: 14 }, // Middle Name
    { wch: 16 }, // Last Name
    { wch: 30 }, // Work Email
    { wch: 18 }, // Mobile
    { wch: 12 }, // Gender
    { wch: 22 }, // DOB
    { wch: 22 }, // DOJ
    { wch: 26 }, // Department
    { wch: 26 }, // Designation
    { wch: 20 }, // Work Location
    { wch: 18 }, // Employment Type
    { wch: 18 }, // Employment Status
    { wch: 24 }, // Reporting Manager Code
    { wch: 18 }, // Employment Source
    { wch: 20 }, // Vendor Name
    { wch: 14 }, // Annual CTC
    { wch: 16 }, // Bank Name
    { wch: 22 }, // Account Number
    { wch: 16 }, // IFSC Code
    { wch: 16 }, // PAN
    { wch: 18 }, // UAN
  ];

  XLSX.utils.book_append_sheet(wb, wsEmployees, 'Employees');

  // --------------------------------------------------------------------------
  // SHEET 2: INSTRUCTIONS
  // --------------------------------------------------------------------------
  const instructionsData = [
    ['JOY PeopleHR — Enterprise Bulk Employee Import Instructions'],
    ['Version: 2.0 (Authoritative Supabase Schema Compliant)'],
    [''],
    ['RULE', 'REQUIREMENT', 'ACCEPTED VALUES / FORMAT', 'EXAMPLE'],
    [
      'Mandatory Fields',
      'Columns marked with * must not be blank',
      'Employee Code, First Name, Last Name, Work Email, Mobile, Gender, DOB, DOJ, Department, Designation, Type, Status',
      'Must contain non-empty values',
    ],
    [
      'Employee Code',
      'Unique business identifier for employee',
      'Alphanumeric format, e.g., JCS-XXX or WF-XXXX. Must be unique across all company employees.',
      'JCS-101',
    ],
    [
      'Work Email',
      'Official company email address',
      'Valid email format. Must be unique across all organization employees.',
      'user@joycorporate.com',
    ],
    [
      'Primary Mobile',
      'Primary contact for OTP / notifications',
      '10-digit numeric format without country code or spaces.',
      '9876543210',
    ],
    [
      'Gender',
      'Standard statutory gender identifier',
      'MALE, FEMALE, NON_BINARY, PREFER_NOT_TO_SAY',
      'FEMALE',
    ],
    [
      'Dates (DOB & DOJ)',
      'Date of Birth and Date of Joining',
      'Strict ISO format: YYYY-MM-DD. (Do not use DD/MM/YYYY)',
      '1995-05-15',
    ],
    [
      'Department',
      'Department name or valid code',
      'Match values in Sheet 3 (Reference Data).',
      sampleDept,
    ],
    [
      'Designation',
      'Designation title or valid code',
      'Match values in Sheet 3 (Reference Data).',
      sampleDesig,
    ],
    [
      'Employment Type',
      'Type of engagement',
      'FULL_TIME, PART_TIME, CONTRACT, INTERN',
      'FULL_TIME',
    ],
    [
      'Employment Status',
      'Current employment status',
      'ACTIVE, PROBATION, NOTICE_PERIOD, SUSPENDED',
      'ACTIVE',
    ],
    [
      'Reporting Manager Code',
      'Employee Code of reporting supervisor',
      'Enter the Manager’s Employee Code (NOT database UUID). System automatically resolves the hierarchy.',
      sampleManagerCode,
    ],
    [
      'Employment Source',
      'Direct employee vs Contractor/Vendor',
      'DIRECT or VENDOR. If VENDOR, provide the Vendor Name.',
      'DIRECT',
    ],
    [
      'Documents Notice',
      'Identity & qualification documents',
      'Do not include binary document files in Excel. Documents are linked in Phase 2 via the Employee Portal or Document Vault.',
      'N/A',
    ],
  ];

  const wsInstructions = XLSX.utils.aoa_to_sheet(instructionsData);
  wsInstructions['!cols'] = [
    { wch: 22 },
    { wch: 35 },
    { wch: 45 },
    { wch: 25 },
  ];
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');

  // --------------------------------------------------------------------------
  // SHEET 3: REFERENCE DATA
  // --------------------------------------------------------------------------
  const refHeaders = [
    'Departments (Name)',
    'Designations (Title)',
    'Work Locations / Branches',
    'Available Reporting Managers (Code - Name)',
    'Allowed Employment Types',
    'Allowed Employment Statuses',
  ];

  const depts = data.departments.map((d) => d.name || d.id);
  const desigs = data.designations.map((d) => d.title || d.id);
  const branches = data.branches.map((b) => b.name || b.id);
  const managers = data.existingEmployees.slice(0, 100).map((e) => `${e.employee_code} (${e.first_name} ${e.last_name} - ${e.designation_title || 'Lead'})`);
  const types = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN'];
  const statuses = ['ACTIVE', 'PROBATION', 'NOTICE_PERIOD', 'SUSPENDED'];

  const maxRows = Math.max(depts.length, desigs.length, branches.length, managers.length, types.length, statuses.length, 1);
  const refRows: any[][] = [];

  for (let i = 0; i < maxRows; i++) {
    refRows.push([
      depts[i] || '',
      desigs[i] || '',
      branches[i] || '',
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

  // Trigger download in browser
  const filename = `Joy_PeopleHR_Employee_Bulk_Import_Template_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, filename);
}

/**
 * Generates and downloads a dedicated Error Report workbook containing failed rows and specific error reasons.
 */
export function downloadBulkImportErrorReport(
  errors: BulkImportRowError[],
  rawRows: Record<string, any>[]
): void {
  const wb = XLSX.utils.book_new();

  // Map each error to row data
  const reportRows = errors.map((err) => {
    const original = rawRows[err.rowNumber - 2] || {}; // accounting for header row at row 1
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
