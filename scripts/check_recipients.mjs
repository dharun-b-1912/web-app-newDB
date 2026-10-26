import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://ysiajemrqakfngasehhi.supabase.co',
  SERVICE_KEY
);

async function test() {
  const { data, error } = await supabase.from('mis_report_recipients').select('*');
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Seeded Recipients Count:', data.length);
    console.log(JSON.stringify(data, null, 2));
  }

  const { data: audit, error: auditErr } = await supabase.from('mis_delivery_audit_logs').select('*');
  console.log('Audit table check:', auditErr ? auditErr : `OK (${audit.length} rows)`);
}

test();
