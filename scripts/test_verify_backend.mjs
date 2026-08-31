import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wmqjmyzzamgxyeuotbki.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndtcWpteXp6YW1neHlldW90YmtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2NzU0NjcsImV4cCI6MjEwMjI1MTQ2N30.mRHhiRs7r7q9J3mphaRVyavL4_THkCAzdhD2dqgvnKA';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testBackendVerification() {
  console.log('====================================================');
  console.log('  BACKEND VERIFICATION STATUS AUDIT');
  console.log('====================================================\n');

  // 1. Check Employees
  const { data: emps } = await supabase.from('employees').select('id, employee_code, first_name, last_name');
  const dharun = emps?.find(e => (e.first_name + ' ' + e.last_name).toLowerCase().includes('dharun') || e.employee_code === 'JCS-017');
  console.log('1. Target Employee:', dharun || 'Not found');

  const empId = dharun?.id;

  // 2. Check employee_documents
  console.log('\n2. Checking [employee_documents] table...');
  const { data: empDocs, error: edErr } = await supabase
    .from('employee_documents')
    .select('*');
  
  if (edErr) {
    console.error('Error fetching employee_documents:', edErr);
  } else {
    console.log(`Total employee_documents records: ${empDocs?.length || 0}`);
    const relevantDocs = empDocs?.filter(d => !empId || d.employee_id === empId);
    console.log('Dharun\'s Documents in employee_documents:', JSON.stringify(relevantDocs, null, 2));
  }

  // 3. Check document_requirements
  console.log('\n3. Checking [document_requirements] table...');
  const { data: reqs, error: reqErr } = await supabase
    .from('document_requirements')
    .select('*');

  if (reqErr) {
    console.error('Error fetching document_requirements:', reqErr);
  } else {
    console.log(`Total document_requirements records: ${reqs?.length || 0}`);
    const relevantReqs = reqs?.filter(r => !empId || r.employee_id === empId);
    console.log('Dharun\'s Document Requirements in DB:', JSON.stringify(relevantReqs, null, 2));
  }

  // 4. Check notification_events
  console.log('\n4. Checking [notification_events] table (Flutter push events)...');
  const { data: notifs, error: notifErr } = await supabase
    .from('notification_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (notifErr) {
    console.error('Error fetching notification_events:', notifErr);
  } else {
    console.log('Latest 10 notification_events in DB:');
    console.log(JSON.stringify(notifs, null, 2));
  }

  console.log('\n====================================================');
  console.log('  AUDIT COMPLETE');
  console.log('====================================================');
}

testBackendVerification();
