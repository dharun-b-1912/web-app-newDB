import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MTQxMDksImV4cCI6MjEwMzk5MDEwOX0.0tegrR61DZ91R3hFZbp-RPPR3KG8a1cYbilLU5klUTc';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testConnection() {
  console.log('Testing live connection to https://ysiajemrqakfngasehhi.supabase.co...');
  
  try {
    const { data: plans, error: plansError } = await supabase
      .from('platform_plans')
      .select('code, name, base_price, billing_interval');
      
    if (plansError) {
      console.error('Error fetching platform_plans:', plansError);
    } else {
      console.log('✅ Successfully connected to Supabase project ysiajemrqakfngasehhi!');
      console.log('✅ Seeded SaaS Plans fetched live:', plans);
    }

    const { data: permissions, error: permError } = await supabase
      .from('permissions')
      .select('module, action, code')
      .limit(5);

    if (permError) {
      console.error('Error fetching permissions:', permError);
    } else {
      console.log('✅ Sample System Permissions fetched live:', permissions);
    }

  } catch (err) {
    console.error('Unexpected error during test:', err);
  }
}

testConnection();
