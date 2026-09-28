const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://ysiajemrqakfngasehhi.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MTQxMDksImV4cCI6MjEwMzk5MDEwOX0.0tegrR61DZ91R3hFZbp-RPPR3KG8a1cYbilLU5klUTc'
);

async function check() {
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'dharun@joyglobalcorp.com',
    password: 'joypeoplehr'
  });
  if (authErr) {
    console.error('Auth error:', authErr);
    return;
  }
  console.log('Logged in as:', auth.user.id);
  
  const emp = await supabase.from('employees').select('*').limit(1);
  console.log('employees count:', emp.data?.length, 'error:', emp.error?.message);
  if (emp.data?.[0]) {
    console.log('Employee columns:', Object.keys(emp.data[0]));
  }
}
check();
