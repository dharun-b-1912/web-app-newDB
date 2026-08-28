import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wmqjmyzzamgxyeuotbki.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndtcWpteXp6YW1neHlldW90YmtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2NzU0NjcsImV4cCI6MjEwMjI1MTQ2N30.mRHhiRs7r7q9J3mphaRVyavL4_THkCAzdhD2dqgvnKA';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function inspectSchema() {
  console.log('--- 1. Testing insert into employee_documents ---');
  const testDoc = {
    id: 'test-doc-001',
    employee_id: 'emp-admin-001',
    document_category: 'PERSONAL',
    document_type: 'DRIVING_LICENSE',
    file_name: 'Resume.pdf',
    file_url: 'https://wmqjmyzzamgxyeuotbki.supabase.co/storage/v1/object/public/employee-documents/employees/emp-admin-001/documents/doc-req-1787676092443-t30e/1787722837419_Resume.pdf',
    verification_status: 'VERIFIED',
    uploaded_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from('employee_documents').insert(testDoc).select();
  console.log('Insert test result:', data, error);

  console.log('--- 2. Querying all employees columns ---');
  const { data: emps, error: eErr } = await supabase.from('employees').select('*').limit(2);
  console.log('employees row sample:', emps, eErr);
}

inspectSchema();
