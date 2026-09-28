const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjE5Mzg3NywiZXhwIjoyMDg3NzY5ODc3fQ.0N2vLpms1s4F7qL_eOsnOecbT0AdVz29r54qC0198qE';

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

async function testServiceKey() {
  console.log('Testing service key...');
  const { data, error } = await admin.from('employees').select('id, first_name, display_name');
  if (error) {
    console.error('Service key error:', error.message);
  } else {
    console.log('Service key works! Employees count:', data.length);
  }
}

testServiceKey().catch(console.error);
