const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://ysiajemrqakfngasehhi.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MTQxMDksImV4cCI6MjEwMzk5MDEwOX0.0tegrR61DZ91R3hFZbp-RPPR3KG8a1cYbilLU5klUTc'
);

async function check() {
  const t1 = await supabase.from('employee_device_tokens').select('*').limit(1);
  console.log('employee_device_tokens:', t1.error ? t1.error.message : 'EXISTS');
  const t2 = await supabase.from('push_subscriptions').select('*').limit(1);
  console.log('push_subscriptions:', t2.error ? t2.error.message : 'EXISTS');
  const t3 = await supabase.from('profiles').select('*').limit(1);
  console.log('profiles:', t3.error ? t3.error.message : 'EXISTS');
  const t4 = await supabase.from('employees').select('id, employee_id, user_id, email, organization_id').eq('email', 'dharun@joyglobalcorp.com');
  console.log('employees:', t4.data);
}
check();
