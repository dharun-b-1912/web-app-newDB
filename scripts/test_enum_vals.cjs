const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function findEnumValues() {
  // Let's test different possible values: ACTIVE, TERMINATED, RESIGNED, ON_LEAVE, SUSPENDED, PROBATION, NOTICE_PERIOD, EXITED, INACTIVE
  const testValues = ['ACTIVE', 'RESIGNED', 'TERMINATED', 'EXITED', 'SUSPENDED', 'ON_LEAVE', 'PROBATION', 'NOTICE_PERIOD', 'RETIRED'];
  for (const v of testValues) {
    const { error } = await supabase.from('employees').select('id').eq('employment_status', v).limit(1);
    console.log(`Testing status '${v}':`, error ? error.message : 'VALID!');
  }
}

findEnumValues();
