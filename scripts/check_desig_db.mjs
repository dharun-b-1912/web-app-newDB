import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

async function checkDesigRls() {
  // Let's inspect designations columns
  const { data: cols } = await admin.from('designations').select('*').limit(1);
  console.log('Designations columns sample:', cols);

  // Check if HR EXECUTIVE is in designations now
  const { data: hrExec } = await admin.from('designations').select('*').ilike('title', '%HR EXECUTIVE%');
  console.log('HR EXECUTIVE in DB:', hrExec);
}

checkDesigRls();
