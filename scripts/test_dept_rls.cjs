require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://ysiajemrqakfngasehhi.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MTQxMDksImV4cCI6MjEwMzk5MDEwOX0.rE1qC5jS0kS6h02jU7mP_Pz2U6n9Y8L5o8Q2u1Y4l0A'
);

async function testDeptInsertAsAnon() {
  const orgId = 'c5ab6b03-adde-47cc-a033-064f4c39b21e';
  const compId = 'c0bbfb28-1500-4ebb-aba8-453b3681f342';

  const { data, error } = await supabase
    .from('departments')
    .insert({
      id: 'd0000000-0000-0000-0000-000000000001',
      organization_id: orgId,
      company_id: compId,
      name: 'B-PACK',
      code: 'BPAC',
      is_active: true
    })
    .select();

  console.log('Anon department insert:', data ? 'SUCCESS' : 'FAILED', error);
}

testDeptInsertAsAnon();

