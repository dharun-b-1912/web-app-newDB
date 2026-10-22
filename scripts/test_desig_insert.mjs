import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MTQxMDksImV4cCI6MjEwMzk5MDEwOX0.0tegrR61DZ91R3hFZbp-RPPR3KG8a1cYbilLU5klUTc';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';

const admin = createClient(SUPABASE_URL, SERVICE_KEY);
const anon = createClient(SUPABASE_URL, ANON_KEY);

async function testDesig() {
  const { data: desigs, error } = await admin.from('designations').select('*');
  console.log('Existing designations in DB:', desigs?.map(d => `${d.title} (${d.id})`));
  
  // Test insert via anon client (what the web app uses)
  const testId = '44444444-4444-4444-4444-444444444444';
  const { data: insData, error: insErr } = await anon.from('designations').insert({
    id: testId,
    organization_id: '0c621892-e938-4707-9957-13534ea32c19',
    company_id: '2030277f-a6a1-427f-beaf-4fc677a3bae2',
    title: 'HR EXECUTIVE',
    code: 'HREXEC',
    grade: 'L1 - Entry Level',
    is_active: true
  }).select();
  console.log('Anon insert HR EXECUTIVE result:', insData, 'Error:', insErr);

  // Clean up test if inserted
  if (insData) {
    await admin.from('designations').delete().eq('id', testId);
  }
}

testDesig();
