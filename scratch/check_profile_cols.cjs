const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://ysiajemrqakfngasehhi.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MTQxMDksImV4cCI6MjEwMzk5MDEwOX0.0tegrR61DZ91R3hFZbp-RPPR3KG8a1cYbilLU5klUTc'
);

async function check() {
  await supabase.auth.signInWithPassword({
    email: 'dharun@joyglobalcorp.com',
    password: 'joypeoplehr'
  });

  const ep = await supabase.from('employee_profiles').select('*').limit(1);
  console.log('employee_profiles columns:', ep.data?.[0] ? Object.keys(ep.data[0]) : 'empty: ' + JSON.stringify(ep));

  const up = await supabase.from('user_profiles').select('*').limit(1);
  console.log('user_profiles columns:', up.data?.[0] ? Object.keys(up.data[0]) : 'empty: ' + JSON.stringify(up));
}
check();
