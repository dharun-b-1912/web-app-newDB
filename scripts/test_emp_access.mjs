import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MTQxMDksImV4cCI6MjEwMzk5MDEwOX0.0tegrR61DZ91R3hFZbp-RPPR3KG8a1cYbilLU5klUTc';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';

const admin = createClient(SUPABASE_URL, SERVICE_KEY);
const empClient = createClient(SUPABASE_URL, ANON_KEY);

async function checkEmpAccess() {
  // Sign in as Thirumalai
  const { data: auth, error: authErr } = await empClient.auth.signInWithPassword({
    email: 'thirumalai@joyglobalcorp.com',
    password: 'joypeoplehr'
  });
  console.log('Thirumalai sign in:', auth?.user?.id, 'Error:', authErr);

  const thirumalaiEmpId = '0dc8993f-c0cc-4143-aedc-d4893e41b001';

  // Try reading employee row
  const { data: emp, error: empErr } = await empClient.from('employees').select('*').eq('id', thirumalaiEmpId);
  console.log('Thirumalai read employees:', emp?.length, 'Error:', empErr);

  // Try reading bank details
  const { data: bank, error: bankErr } = await empClient.from('employee_bank_details').select('*').eq('employee_id', thirumalaiEmpId);
  console.log('Thirumalai read bank details:', bank, 'Error:', bankErr);

  // Try reading statutory details
  const { data: stat, error: statErr } = await empClient.from('employee_statutory_details').select('*').eq('employee_id', thirumalaiEmpId);
  console.log('Thirumalai read statutory details:', stat, 'Error:', statErr);

  // Try reading attendance_daily
  const { data: daily, error: dailyErr } = await empClient.from('attendance_daily').select('*').eq('employee_id', thirumalaiEmpId);
  console.log('Thirumalai read attendance_daily:', daily, 'Error:', dailyErr);

  // Try reading shifts
  const { data: shifts, error: shiftsErr } = await empClient.from('shifts').select('*');
  console.log('Thirumalai read shifts:', shifts, 'Error:', shiftsErr);
}

checkEmpAccess();
