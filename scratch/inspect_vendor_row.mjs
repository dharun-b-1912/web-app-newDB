import { createClient } from '@supabase/supabase-js';

const URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MTQxMDksImV4cCI6MjEwMzk5MDEwOX0.0tegrR61DZ91R3hFZbp-RPPR3KG8a1cYbilLU5klUTc';

const sb = createClient(URL, KEY);

async function inspectColumns() {
  await sb.auth.signInWithPassword({
    email: 'rameshrajajcs@gmail.com',
    password: 'joypeoplehr'
  });

  // Try select single row or empty limit 0
  const { data, error } = await sb.from('vendors').select('*').limit(1);
  console.log('Vendors row structure:', data);
  if (data && data.length > 0) {
    console.log('Columns from existing row:', Object.keys(data[0]));
  } else {
    console.log('Table is empty. Probing columns...');
  }
}

inspectColumns();
