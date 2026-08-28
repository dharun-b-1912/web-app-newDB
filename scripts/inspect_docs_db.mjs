import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wmqjmyzzamgxyeuotbki.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndtcWpteXp6YW1neHlldW90YmtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2NzU0NjcsImV4cCI6MjEwMjI1MTQ2N30.mRHhiRs7r7q9J3mphaRVyavL4_THkCAzdhD2dqgvnKA';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function inspectTables() {
  console.log('--- 1. App Users / Auth Identity ---');
  const { data: users, error: uErr } = await supabase.from('app_users').select('*');
  console.log('app_users:', users, uErr);

  console.log('--- 2. Employees ---');
  const { data: emps, error: eErr } = await supabase.from('employees').select('id, employee_code, first_name, last_name, email');
  console.log('employees:', emps, eErr);

  console.log('--- 3. document_requirements ---');
  const { data: reqs, error: rErr } = await supabase.from('document_requirements').select('*');
  console.log('document_requirements count:', reqs?.length, reqs, rErr);

  console.log('--- 4. employee_documents ---');
  const { data: empDocs, error: edErr } = await supabase.from('employee_documents').select('*');
  console.log('employee_documents count:', empDocs?.length, empDocs, edErr);

  console.log('--- 5. documents table ---');
  const { data: docs, error: dErr } = await supabase.from('documents').select('*');
  console.log('documents table count:', docs?.length, docs, dErr);
}

inspectTables();
