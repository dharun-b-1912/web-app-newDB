const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://ysiajemrqakfngasehhi.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MTQxMDksImV4cCI6MjEwMzk5MDEwOX0.0tegrR61DZ91R3hFZbp-RPPR3KG8a1cYbilLU5klUTc'
);

async function check() {
  const { data: auth } = await supabase.auth.signInWithPassword({
    email: 'dharun@joyglobalcorp.com',
    password: 'joypeoplehr'
  });
  
  // Test common tables in this HR project
  const candidateTables = [
    'attendance', 'attendances', 'attendance_logs', 'leaves', 'departments', 
    'branches', 'organizations', 'companies', 'roles', 'user_roles', 
    'settings', 'system_settings', 'company_settings', 'audit_logs',
    'app_settings', 'push_notifications', 'notification_preferences',
    'employee_profiles', 'user_profiles', 'devices', 'tokens',
    'employee_documents', 'payroll', 'pay_slips', 'holidays', 'shifts'
  ];

  for (const t of candidateTables) {
    const res = await supabase.from(t).select('*').limit(1);
    if (!res.error) {
      console.log('FOUND TABLE:', t);
    }
  }
}
check();
