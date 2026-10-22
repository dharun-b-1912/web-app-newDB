import dotenv from 'dotenv';
dotenv.config();

import * as XLSX from 'xlsx';
import { bulkImportService } from '../src/features/people/bulk/bulkImportService';
import { supabase } from '../src/lib/supabase';

import fs from 'fs';

async function testValidateExcel() {
  const filePath = 'D:\\web-app (2)\\Joy PeopleHR\\Test Data\\Joy_PeopleHR_Employee_Bulk_Import_Template_2026-10-09 (1).xlsx';
  console.log('Reading:', filePath);

  const buf = fs.readFileSync(filePath);
  const xlsxLib: any = (XLSX as any).default || XLSX;
  const workbook = xlsxLib.read(buf, { type: 'buffer', cellDates: true });
  const sheetName = workbook.SheetNames.includes('Employees') ? 'Employees' : workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as Record<string, any>[];

  console.log(`Parsed ${rows.length} rows from sheet "${sheetName}".`);
  console.log('First row headers/keys:', Object.keys(rows[0] || {}));

  // Fetch departments, designations, branches, and employees from Supabase
  const { data: departments } = await supabase.from('departments').select('*');
  const { data: designations } = await supabase.from('designations').select('*');
  const { data: branches } = await supabase.from('branches').select('*');
  const { data: existingEmployees } = await supabase.from('employees').select('*');

  console.log(`Database Context:`);
  console.log(`- Existing Employees Count: ${existingEmployees?.length || 0}`);
  console.log(`- Departments:        ${departments?.length || 0}`);
  console.log(`- Designations:       ${designations?.length || 0}`);
  console.log(`- Branches:           ${branches?.length || 0}`);

  console.log('\n--- 1. STANDARD VALIDATION (Strict Existing DB Duplicates) ---');
  const stdValidation = bulkImportService.validateRows(
    rows,
    departments || [],
    designations || [],
    branches || [],
    existingEmployees || []
  );

  console.log(`Total Rows:   ${stdValidation.totalRows}`);
  console.log(`Valid Rows:   ${stdValidation.validRows.length}`);
  console.log(`Error Count:  ${stdValidation.errors.length}`);
  console.log(`Warning Count:${stdValidation.warnings.length}`);
  stdValidation.errors.forEach(err => {
    console.log(`- [Row ${err.rowNumber}] [${err.employeeCode || 'N/A'}] ${err.field}: ${err.message} (value: "${err.value}")`);
  });

  console.log('\n--- 2. UPSERT & RESILIENT MODE (options: upsertExisting=true, autoFallbackLastName=true) ---');
  const upsertValidation = bulkImportService.validateRows(
    rows,
    departments || [],
    designations || [],
    branches || [],
    existingEmployees || [],
    { upsertExisting: true, autoFallbackLastName: true }
  );

  console.log(`Total Rows:   ${upsertValidation.totalRows}`);
  console.log(`Valid Rows:   ${upsertValidation.validRows.length}`);
  console.log(`Error Count:  ${upsertValidation.errors.length}`);
  console.log(`Warning Count:${upsertValidation.warnings.length}`);
  if (upsertValidation.errors.length > 0) {
    console.log('Remaining Errors in Upsert Mode:');
    upsertValidation.errors.forEach(err => {
      console.log(`- [Row ${err.rowNumber}] [${err.employeeCode || 'N/A'}] ${err.field}: ${err.message} (value: "${err.value}")`);
    });
  }
  if (upsertValidation.warnings.length > 0) {
    console.log('\nWarnings:');
    upsertValidation.warnings.forEach(w => console.log(`  * ${w}`));
  }

  console.log('======================================================\n');

}

testValidateExcel().catch(console.error);
