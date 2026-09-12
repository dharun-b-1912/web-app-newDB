import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://pmimukwhasbdkocgdayy.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtaW11a3doYXNiZGtvc2dkYXl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEyMzQxMzYsImV4cCI6MjA1NjgxMDEzNn0.8mF8VvCg0bUjA9N5H1L2y8fT0rK3s6W4q7X9z2_1A5c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function probeTableColumns(tableName, candidateColumns) {
  const existing = [];
  const missing = [];
  for (const col of candidateColumns) {
    const { data, error } = await supabase.from(tableName).select(col).limit(1);
    if (!error) {
      existing.push(col);
    } else {
      missing.push(col);
    }
  }
  return { existing, missing };
}

async function run() {
  console.log('=== PROBING EMPLOYEES TABLE COLUMNS ===');
  const employeeCandidates = [
    'id',
    'organization_id',
    'company_id',
    'branch_id',
    'department_id',
    'designation_id',
    'user_id',
    'employee_code',
    'first_name',
    'last_name',
    'middle_name',
    'display_name',
    'work_email',
    'personal_email',
    'phone',
    'avatar_url',
    'status',
    'employment_status',
    'employment_type',
    'hire_date',
    'date_of_joining',
    'probation_end_date',
    'confirmation_date',
    'last_working_day',
    'last_working_date',
    'exit_date',
    'termination_date',
    'reporting_manager_id',
    'manager_id',
    'profile',
    'employment',
    'statutory',
    'bank',
    'deleted_at',
    'is_active',
    'created_at',
    'updated_at'
  ];

  const empRes = await probeTableColumns('employees', employeeCandidates);
  console.log('Employees existing columns:', empRes.existing);
  console.log('Employees missing columns:', empRes.missing);

  console.log('\n=== PROBING USER_PROFILES TABLE COLUMNS ===');
  const userProfileCandidates = [
    'id',
    'organization_id',
    'auth_user_id',
    'user_id',
    'employee_id',
    'email',
    'first_name',
    'last_name',
    'display_name',
    'avatar_url',
    'phone',
    'role',
    'roles',
    'status',
    'is_active',
    'created_at',
    'updated_at'
  ];
  const profRes = await probeTableColumns('user_profiles', userProfileCandidates);
  console.log('user_profiles existing columns:', profRes.existing);
  console.log('user_profiles missing columns:', profRes.missing);

  console.log('\n=== PROBING EMPLOYEE_LIFECYCLE_EVENTS COLUMNS ===');
  const lifecycleCandidates = [
    'id',
    'organization_id',
    'employee_id',
    'event_type',
    'previous_value',
    'new_value',
    'effective_date',
    'reason',
    'remarks',
    'metadata',
    'created_by',
    'created_at',
    'updated_at'
  ];
  const lifeRes = await probeTableColumns('employee_lifecycle_events', lifecycleCandidates);
  console.log('employee_lifecycle_events existing columns:', lifeRes.existing);
  console.log('employee_lifecycle_events missing columns:', lifeRes.missing);

  console.log('\n=== PROBING DEPARTMENTS TABLE COLUMNS ===');
  const deptCandidates = [
    'id',
    'organization_id',
    'company_id',
    'name',
    'code',
    'parent_department_id',
    'head_employee_id',
    'manager_id',
    'is_active',
    'created_at',
    'updated_at'
  ];
  const deptRes = await probeTableColumns('departments', deptCandidates);
  console.log('departments existing columns:', deptRes.existing);

  console.log('\n=== PROBING DESIGNATIONS TABLE COLUMNS ===');
  const desigCandidates = [
    'id',
    'organization_id',
    'company_id',
    'title',
    'name',
    'code',
    'grade',
    'department_id',
    'created_at',
    'updated_at'
  ];
  const desigRes = await probeTableColumns('designations', desigCandidates);
  console.log('designations existing columns:', desigRes.existing);
}

run().catch(console.error);
