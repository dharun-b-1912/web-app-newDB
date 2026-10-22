import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

async function run() {
  const { data: assets, error: errA } = await admin.from('assets').select('*');
  const { data: asgns, error: errB } = await admin.from('asset_assignments').select('*');
  
  console.log('=== ASSETS TABLE ===');
  console.log('Total count:', assets?.length ?? 0);
  console.log('Error:', errA);
  if (assets?.length) {
    console.log('Columns:', Object.keys(assets[0]));
    console.log('Assets list:', JSON.stringify(assets, null, 2));
  }

  console.log('\n=== ASSET_ASSIGNMENTS TABLE ===');
  console.log('Total count:', asgns?.length ?? 0);
  console.log('Error:', errB);
  if (asgns?.length) {
    console.log('Columns:', Object.keys(asgns[0]));
    console.log('Assignments list:', JSON.stringify(asgns, null, 2));
  }
}

run();
